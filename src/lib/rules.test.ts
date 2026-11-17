import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNewSubscriptionWindow,
  calculatePaperTotalMarks,
  canUserAccessClass,
  canUserAccessQuestion,
  canUserAddQuestionToPaper,
  getRemainingDays,
  getUserPermittedClassIds,
  isDuplicateTransactionRef,
  isSubscriptionCurrentlyActive,
  sanitizeQuestionForUser,
} from './rules';
import type { Payment, Question, QuestionPaperItem, Subscription } from '../types/domain';

const now = new Date('2026-11-16T12:00:00.000Z');

const activeClass6Sub: Subscription = {
  id: 'sub-1',
  userId: 'u-1',
  planId: 'plan-1',
  planNameSnapshot: 'Class 6 Monthly',
  priceSnapshotBdt: 250,
  durationDaysSnapshot: 30,
  grantedClassIds: ['cls-6'],
  status: 'active',
  startsAt: '2026-11-01T00:00:00.000Z',
  expiresAt: '2026-12-01T00:00:00.000Z',
  createdAt: '2026-11-01T00:00:00.000Z',
};

const expiredClass7Sub: Subscription = {
  id: 'sub-2',
  userId: 'u-1',
  planId: 'plan-2',
  planNameSnapshot: 'Class 7 Monthly',
  priceSnapshotBdt: 250,
  durationDaysSnapshot: 30,
  grantedClassIds: ['cls-7'],
  status: 'active',
  startsAt: '2026-10-01T00:00:00.000Z',
  expiresAt: '2026-11-01T00:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
};

const futureSub: Subscription = {
  id: 'sub-3',
  userId: 'u-2',
  planId: 'plan-1',
  planNameSnapshot: 'Class 6 Monthly',
  priceSnapshotBdt: 250,
  durationDaysSnapshot: 30,
  grantedClassIds: ['cls-6'],
  status: 'active',
  startsAt: '2026-11-20T00:00:00.000Z',
  expiresAt: '2026-12-20T00:00:00.000Z',
  createdAt: '2026-11-16T00:00:00.000Z',
};

const sampleQuestionClass6: Question = {
  id: 'q-6',
  classId: 'cls-6',
  subjectId: 'sub-math-6',
  chapterId: 'ch-1',
  questionTypeCode: 'mcq',
  language: 'en',
  difficulty: 'easy',
  marks: 1,
  status: 'published',
  prompt: 'What is 12 x 12?',
  options: [
    { id: 'o1', label: 'A', text: '124', isCorrect: false },
    { id: 'o2', label: 'B', text: '144', isCorrect: true },
  ],
  correctAnswerText: '144',
  explanation: '12 squared equals 144.',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

const sampleQuestionClass7: Question = {
  ...sampleQuestionClass6,
  id: 'q-7',
  classId: 'cls-7',
};

test('subscription validity respects status, start time, and expiry time', () => {
  assert.equal(isSubscriptionCurrentlyActive(activeClass6Sub, now), true);
  assert.equal(isSubscriptionCurrentlyActive(expiredClass7Sub, now), false);
  assert.equal(isSubscriptionCurrentlyActive(futureSub, now), false);
});

test('class-based access allows subscribed class and blocks wrong/expired classes', () => {
  const subs = [activeClass6Sub, expiredClass7Sub];
  assert.deepEqual(getUserPermittedClassIds(subs, 'u-1', now), ['cls-6']);
  assert.equal(canUserAccessClass(subs, 'u-1', 'cls-6', 'student', now), true);
  assert.equal(canUserAccessClass(subs, 'u-1', 'cls-7', 'student', now), false);
  assert.equal(canUserAccessClass(subs, 'u-unsub', 'cls-6', 'student', now), false);
  assert.equal(canUserAccessClass(subs, 'admin-1', 'cls-7', 'admin', now), true);
});

test('question sanitization hides answers and prompt when user lacks class access', () => {
  const subs = [activeClass6Sub];
  const allowed = sanitizeQuestionForUser(sampleQuestionClass6, subs, 'u-1', 'student', now);
  assert.equal('explanation' in allowed && allowed.explanation, '12 squared equals 144.');

  const blocked = sanitizeQuestionForUser(sampleQuestionClass7, subs, 'u-1', 'student', now);
  assert.equal('accessRestricted' in blocked && blocked.accessRestricted, true);
  assert.equal('correctAnswerText' in blocked, false);
  assert.equal('explanation' in blocked, false);

  const draftQuestion: Question = { ...sampleQuestionClass6, status: 'draft' };
  assert.equal(canUserAccessQuestion(draftQuestion, subs, 'u-1', 'student', now), false);
  assert.equal(canUserAccessQuestion(draftQuestion, subs, 'admin-1', 'admin', now), true);
});

test('immediate renewal starts at approval timestamp without carrying forward old days', () => {
  const approvalTime = new Date('2026-11-16T10:30:00.000Z');
  const win = calculateNewSubscriptionWindow(30, approvalTime);
  assert.equal(win.startsAt, '2026-11-16T10:30:00.000Z');
  assert.equal(win.expiresAt, '2026-12-16T10:30:00.000Z');
  assert.equal(getRemainingDays(win.expiresAt, approvalTime), 30);
});

test('paper marks calculation and expired user add-question restrictions', () => {
  const items: QuestionPaperItem[] = [
    {
      id: 'pi-1',
      sourceQuestionId: 'q-6',
      orderIndex: 0,
      customMarks: 10,
      snapshot: {
        classId: 'cls-6',
        subjectId: 'sub-math-6',
        chapterId: 'ch-1',
        questionTypeCode: 'cq',
        language: 'en',
        prompt: 'CQ Stem',
      },
    },
    {
      id: 'pi-2',
      sourceQuestionId: 'q-6',
      orderIndex: 1,
      customMarks: 2,
      snapshot: {
        classId: 'cls-6',
        subjectId: 'sub-math-6',
        chapterId: 'ch-1',
        questionTypeCode: 'short',
        language: 'en',
        prompt: 'Short Q',
      },
    },
  ];
  assert.equal(calculatePaperTotalMarks(items), 12);

  const subs = [activeClass6Sub, expiredClass7Sub];
  assert.equal(canUserAddQuestionToPaper(subs, 'u-1', 'student', 'cls-6', now), true);
  assert.equal(canUserAddQuestionToPaper(subs, 'u-1', 'student', 'cls-7', now), false);
});

test('duplicate transaction reference detection ignores rejected payments and normalizes case', () => {
  const payments: Payment[] = [
    {
      id: 'pay-1',
      userId: 'u-1',
      planId: 'plan-1',
      planNameSnapshot: 'Class 6 Monthly',
      expectedAmountBdt: 250,
      submittedAmountBdt: 250,
      paymentMethodId: 'pm-bkash',
      paymentMethodNameSnapshot: 'bKash',
      senderNumber: '01711111111',
      transactionRef: 'TRX9988AA',
      status: 'pending',
      createdAt: '2026-11-15T00:00:00.000Z',
    },
    {
      id: 'pay-2',
      userId: 'u-2',
      planId: 'plan-1',
      planNameSnapshot: 'Class 6 Monthly',
      expectedAmountBdt: 250,
      submittedAmountBdt: 250,
      paymentMethodId: 'pm-bkash',
      paymentMethodNameSnapshot: 'bKash',
      senderNumber: '01722222222',
      transactionRef: 'TRXREJECTED',
      status: 'rejected',
      createdAt: '2026-11-14T00:00:00.000Z',
    },
  ];

  assert.equal(isDuplicateTransactionRef(payments, 'pm-bkash', ' trx9988aa '), true);
  assert.equal(isDuplicateTransactionRef(payments, 'pm-nagad', 'TRX9988AA'), false);
  assert.equal(isDuplicateTransactionRef(payments, 'pm-bkash', 'TRXREJECTED'), false);
});
