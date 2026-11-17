import type {
  Payment,
  PublicSafeQuestion,
  Question,
  QuestionPaperItem,
  Subscription,
  UserRole,
} from '../types/domain';

/**
 * Checks whether a subscription record is valid right now:
 * status === 'active', startsAt <= now, and expiresAt > now.
 */
export function isSubscriptionCurrentlyActive(
  subscription: Subscription,
  now: Date = new Date()
): boolean {
  if (subscription.status !== 'active') return false;
  const nowMs = now.getTime();
  const startMs = new Date(subscription.startsAt).getTime();
  const expiryMs = new Date(subscription.expiresAt).getTime();
  return Number.isFinite(startMs) && Number.isFinite(expiryMs) && startMs <= nowMs && nowMs < expiryMs;
}

/**
 * Returns the deduplicated list of class IDs currently permitted for a user
 * across all active, non-expired subscriptions.
 */
export function getUserPermittedClassIds(
  subscriptions: Subscription[],
  userId: string,
  now: Date = new Date()
): string[] {
  const classSet = new Set<string>();
  for (const sub of subscriptions) {
    if (sub.userId === userId && isSubscriptionCurrentlyActive(sub, now)) {
      for (const cid of sub.grantedClassIds) {
        classSet.add(cid);
      }
    }
  }
  return Array.from(classSet);
}

/**
 * Checks if a user (or admin) can access questions belonging to a specific class.
 */
export function canUserAccessClass(
  subscriptions: Subscription[],
  userId: string | null | undefined,
  classId: string,
  role: UserRole | null | undefined,
  now: Date = new Date()
): boolean {
  if (!userId || !role) return false;
  if (role === 'admin') return true;
  const permitted = getUserPermittedClassIds(subscriptions, userId, now);
  return permitted.includes(classId);
}

/**
 * Checks if a user can read a specific master Question Bank question.
 * Non-admins can only read published questions for classes in their active subscription.
 */
export function canUserAccessQuestion(
  question: Question,
  subscriptions: Subscription[],
  userId: string | null | undefined,
  role: UserRole | null | undefined,
  now: Date = new Date()
): boolean {
  if (!userId || !role) return false;
  if (role === 'admin') return true;
  if (question.status !== 'published') return false;
  return canUserAccessClass(subscriptions, userId, question.classId, role, now);
}

/**
 * Strips sensitive answer/explanation fields when a caller does not have access.
 * Mirrors backend RLS / Edge Function behavior.
 */
export function sanitizeQuestionForUser(
  question: Question,
  subscriptions: Subscription[],
  userId: string | null | undefined,
  role: UserRole | null | undefined,
  now: Date = new Date()
): PublicSafeQuestion | Question {
  if (canUserAccessQuestion(question, subscriptions, userId, role, now)) {
    return question;
  }

  return {
    id: question.id,
    classId: question.classId,
    groupId: question.groupId,
    subjectId: question.subjectId,
    chapterId: question.chapterId,
    topicId: question.topicId,
    questionTypeCode: question.questionTypeCode,
    language: question.language,
    difficulty: question.difficulty,
    marks: question.marks,
    status: question.status,
    title: question.title,
    prompt: 'Subscription required to view this question.',
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
    accessRestricted: true,
  };
}

/**
 * Calculates immediate renewal subscription dates.
 * README Rule: Renewal is immediate when Admin approves; remaining time on
 * any previous subscription is NOT carried forward.
 */
export function calculateNewSubscriptionWindow(
  durationDays: number,
  approvalTime: Date = new Date()
): { startsAt: string; expiresAt: string } {
  const safeDays = Math.max(1, Math.floor(durationDays));
  const startsAt = new Date(approvalTime.getTime());
  const expiresAt = new Date(approvalTime.getTime() + safeDays * 24 * 60 * 60 * 1000);
  return {
    startsAt: startsAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Calculates remaining whole days (rounded up) for an active subscription.
 */
export function getRemainingDays(expiresAtIso: string, now: Date = new Date()): number {
  const diffMs = new Date(expiresAtIso).getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Computes total marks for a Question Paper from its items.
 */
export function calculatePaperTotalMarks(items: QuestionPaperItem[]): number {
  return items.reduce((sum, item) => sum + (Number.isFinite(item.customMarks) ? Math.max(0, item.customMarks) : 0), 0);
}

/**
 * Checks if a user can add new Question Bank questions to a paper for a given class.
 * Expired users can still view/export existing paper snapshots, but cannot add new QB questions.
 */
export function canUserAddQuestionToPaper(
  subscriptions: Subscription[],
  userId: string | null | undefined,
  role: UserRole | null | undefined,
  classId: string,
  now: Date = new Date()
): boolean {
  return canUserAccessClass(subscriptions, userId, classId, role, now);
}

/**
 * Checks for duplicate transaction reference within the same payment method
 * (case-insensitive, trimmed).
 */
export function isDuplicateTransactionRef(
  payments: Payment[],
  paymentMethodId: string,
  transactionRef: string
): boolean {
  const normalized = transactionRef.trim().toUpperCase();
  if (!normalized) return false;
  return payments.some(
    (p) =>
      p.paymentMethodId === paymentMethodId &&
      p.transactionRef.trim().toUpperCase() === normalized &&
      p.status !== 'rejected'
  );
}
