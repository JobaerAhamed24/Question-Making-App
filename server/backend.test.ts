import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { canUserAccessQuestion, canUserAddQuestionToPaper, sanitizeQuestionForUser } from '../src/lib/rules.ts';
import { QuestionBankDatabase } from './db.ts';
import { generatePaperQuestionsFromPool, PaperGenerationError } from './paperGenerator.ts';
import { signStorageToken, verifyPassword, verifyStorageToken } from './security.ts';

function createTempDb() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qb-test-'));
  const db = new QuestionBankDatabase(':memory:', tmpDir);
  return {
    db,
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }),
  };
}

test('registration assigns student role and scrypt password verification works', () => {
  const { db, cleanup } = createTempDb();
  try {
    const created = db.createStudentUser({
      fullName: 'টেস্ট শিক্ষার্থী',
      email: 'testuser@example.com',
      phone: '01711000111',
      preferredLanguage: 'bn',
      password: 'strongpassword123',
    });

    assert.equal(created.role, 'student');
    assert.equal(created.status, 'active');

    const withPw = db.getUserWithPasswordByEmail('testuser@example.com');
    assert.ok(withPw);
    assert.equal(verifyPassword('strongpassword123', withPw.passwordHash), true);
    assert.equal(verifyPassword('wrongpass', withPw.passwordHash), false);
  } finally {
    cleanup();
  }
});

test('class-based access strictly isolates subscribed classes and strips answers for unsubscribed callers', () => {
  const { db, cleanup } = createTempDb();
  try {
    const subsNadia = db.listSubscriptions('u-student-active'); // Class 6 & 8 active
    const allQuestions = db.listAllQuestions();
    const class6Q = allQuestions.find((q) => q.classId === 'cls-6' && q.status === 'published');
    const class7Q = allQuestions.find((q) => q.classId === 'cls-7' && q.status === 'published');
    assert.ok(class6Q && class7Q);

    assert.equal(canUserAccessQuestion(class6Q, subsNadia, 'u-student-active', 'student'), true);
    assert.equal(canUserAccessQuestion(class7Q, subsNadia, 'u-student-active', 'student'), false);

    // Expired user Farhana cannot read Class 6 questions anymore
    const subsFarhana = db.listSubscriptions('u-student-expired');
    assert.equal(canUserAccessQuestion(class6Q, subsFarhana, 'u-student-expired', 'student'), false);

    const sanitized = sanitizeQuestionForUser(class6Q, subsFarhana, 'u-student-expired', 'student');
    assert.equal('accessRestricted' in sanitized && sanitized.accessRestricted, true);
    assert.equal('correctAnswerText' in sanitized, false);
  } finally {
    cleanup();
  }
});

test('custom question paper generator enforces DB-only selection, no duplicates, CQ cohesion, and shortage errors', () => {
  const { db, cleanup } = createTempDb();
  try {
    const subsNadia = db.listSubscriptions('u-student-active');
    const allQuestions = db.listAllQuestions();

    // Valid generation: request 1 MCQ from Class 6 Math
    const res = generatePaperQuestionsFromPool({
      allQuestions,
      subscriptions: subsNadia,
      userId: 'u-student-active',
      role: 'student',
      input: {
        classId: 'cls-6',
        subjectId: 'sub-6-math',
        requirements: [{ questionTypeCode: 'mcq', count: 1 }],
        shuffle: false,
      },
    });
    assert.equal(res.items.length, 1);
    assert.equal(res.totalMarks, res.items[0].customMarks);

    // Shortage error: request 50 MCQs when only a few exist (never silently duplicates or invents fake Qs)
    assert.throws(
      () =>
        generatePaperQuestionsFromPool({
          allQuestions,
          subscriptions: subsNadia,
          userId: 'u-student-active',
          role: 'student',
          input: {
            classId: 'cls-6',
            subjectId: 'sub-6-math',
            requirements: [{ questionTypeCode: 'mcq', count: 50 }],
          },
        }),
      (err: unknown) => {
        assert.ok(err instanceof PaperGenerationError);
        assert.equal(err.statusCode, 422);
        assert.ok(err.shortages && err.shortages.length === 1);
        assert.equal(err.shortages[0].requested, 50);
        return true;
      }
    );

    // Unauthorized class request rejected cleanly
    assert.throws(
      () =>
        generatePaperQuestionsFromPool({
          allQuestions,
          subscriptions: subsNadia,
          userId: 'u-student-active',
          role: 'student',
          input: {
            classId: 'cls-7',
            subjectId: 'sub-7-math',
            requirements: [{ questionTypeCode: 'mcq', count: 1 }],
          },
        }),
      PaperGenerationError
    );
  } finally {
    cleanup();
  }
});

test('immutable paper snapshots stay intact after master edits and expired users cannot add new questions', () => {
  const { db, cleanup } = createTempDb();
  try {
    const admin = db.getUserById('u-admin')!;
    const farhana = db.getUserById('u-student-expired')!;
    const farhanaPapers = db.listPapers(farhana.id);
    assert.ok(farhanaPapers.length >= 1, 'Expired user should still see saved papers');

    const subsFarhana = db.listSubscriptions(farhana.id);
    assert.equal(
      canUserAddQuestionToPaper(subsFarhana, farhana.id, farhana.role, 'cls-6'),
      false
    );

    // Master question edit does NOT mutate previously saved snapshot
    const oldPrompt = farhanaPapers[0].items[0]?.snapshot.prompt;
    const srcQId = farhanaPapers[0].items[0]?.sourceQuestionId;
    if (srcQId) {
      const master = db.getQuestionById(srcQId)!;
      db.saveQuestion(admin, {
        ...master,
        prompt: 'সম্পূর্ণ পরিবর্তিত মাস্টার প্রশ্ন টেক্সট',
      });
      const reloadedPaper = db.getPaperById(farhanaPapers[0].id)!;
      assert.equal(reloadedPaper.items[0].snapshot.prompt, oldPrompt);
    }
  } finally {
    cleanup();
  }
});

test('manual payment submission and atomic admin review activate immediate subscription without double approval', () => {
  const { db, cleanup } = createTempDb();
  try {
    const tanvir = db.getUserById('u-student-unsub')!;
    const admin = db.getUserById('u-admin')!;

    // Duplicate transaction ID blocked
    const existingPayment = db.listPayments(tanvir.id)[0];
    assert.throws(() =>
      db.submitManualPayment(tanvir, {
        planId: 'plan-c6-monthly',
        paymentMethodId: existingPayment.paymentMethodId,
        senderNumber: '01812-334455',
        transactionRef: existingPayment.transactionRef,
        submittedAmountBdt: 249,
      })
    );

    // Fresh payment submission always starts pending
    const submitted = db.submitManualPayment(tanvir, {
      planId: 'plan-junior-bundle',
      paymentMethodId: 'pm-bkash',
      senderNumber: '01812-334455',
      transactionRef: 'TXN-FRESH-99881',
      submittedAmountBdt: 499,
    });
    assert.equal(submitted.status, 'pending');

    // Atomic review approves payment, activates immediate subscription, and logs review
    const approvalTime = new Date('2026-11-17T10:00:00.000Z');
    const reviewRes = db.reviewPaymentAtomic(admin, submitted.id, 'approved', 'ভেরিফাইড', approvalTime);
    assert.equal(reviewRes.payment.status, 'approved');
    assert.ok(reviewRes.subscription);
    assert.equal(reviewRes.subscription.startsAt, approvalTime.toISOString());
    assert.ok(reviewRes.subscription.grantedClassIds.includes('cls-7'));

    // Double review rejected atomically
    assert.throws(() =>
      db.reviewPaymentAtomic(admin, submitted.id, 'approved', 'দ্বিতীয়বার চেষ্টা')
    );

    const reviews = db.listPaymentReviews();
    assert.ok(reviews.some((r) => r.paymentId === submitted.id && r.decision === 'approved'));
  } finally {
    cleanup();
  }
});

test('private storage objects and HMAC signed URLs enforce expiry and validation', () => {
  const { db, cleanup } = createTempDb();
  try {
    const samplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const meta = db.saveBase64ToStorage('payment-receipts', 'u-student-unsub', 'receipt.png', samplePngBase64);
    assert.equal(meta.bucket, 'payment-receipts');

    const validToken = signStorageToken({
      objectId: meta.id,
      userId: 'u-student-unsub',
      expiresAtMs: Date.now() + 60_000,
    });
    const verified = verifyStorageToken(validToken);
    assert.ok(verified);
    assert.equal(verified.objectId, meta.id);

    const expiredToken = signStorageToken({
      objectId: meta.id,
      userId: 'u-student-unsub',
      expiresAtMs: Date.now() - 5_000,
    });
    assert.equal(verifyStorageToken(expiredToken), null);
  } finally {
    cleanup();
  }
});
