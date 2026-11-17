import { canUserAccessQuestion } from '../src/lib/rules.ts';
import type {
  Question,
  QuestionDifficulty,
  QuestionPaperItem,
  QuestionTypeCode,
  Subscription,
  UserRole,
} from '../src/types/domain.ts';
import { generateUid } from './security.ts';

export interface TypeRequirement {
  questionTypeCode: QuestionTypeCode;
  count: number;
}

export interface GeneratePaperRequestInput {
  classId: string;
  groupId?: string | null;
  subjectId: string;
  chapterIds?: string[];
  topicIds?: string[];
  difficulty?: QuestionDifficulty | 'all';
  marksFilter?: number | 'all';
  search?: string;
  requirements?: TypeRequirement[];
  selectedQuestionIds?: string[];
  customMarksByQuestionId?: Record<string, number>;
  shuffle?: boolean;
}

export interface InsufficientTypeShortage {
  questionTypeCode: QuestionTypeCode;
  requested: number;
  available: number;
}

export class PaperGenerationError extends Error {
  statusCode: number;
  shortages?: InsufficientTypeShortage[];

  constructor(message: string, statusCode = 400, shortages?: InsufficientTypeShortage[]) {
    super(message);
    this.name = 'PaperGenerationError';
    this.statusCode = statusCode;
    this.shortages = shortages;
  }
}

function deterministicOrRandomShuffle<T>(arr: T[], shuffle: boolean): T[] {
  if (!shuffle) return arr;
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildImmutableQuestionSnapshot(
  question: Question,
  orderIndex: number,
  overrideMarks?: number
): QuestionPaperItem {
  const safeMarks =
    overrideMarks !== undefined && Number.isFinite(overrideMarks) && overrideMarks > 0
      ? Number(overrideMarks)
      : question.marks;

  return {
    id: generateUid('pi'),
    sourceQuestionId: question.id,
    orderIndex,
    customMarks: safeMarks,
    snapshot: {
      classId: question.classId,
      subjectId: question.subjectId,
      chapterId: question.chapterId,
      questionTypeCode: question.questionTypeCode,
      language: question.language,
      prompt: question.prompt,
      stimulus: question.stimulus,
      equationLatex: question.equationLatex,
      imageUrl: question.imageUrl,
      options: question.options ? structuredClone(question.options) : undefined,
      subParts: question.subParts ? structuredClone(question.subParts) : undefined,
      correctAnswerText: question.correctAnswerText,
      explanation: question.explanation,
    },
  };
}

/**
 * Authoritative custom question paper generator.
 * Rules enforced:
 * 1. Never generates fake questions.
 * 2. Never returns questions from an unauthorized class or unpublished status.
 * 3. Never exceeds requested counts and never silently duplicates a question.
 * 4. Fails clearly when database has fewer matching questions than requested.
 * 5. Preserves CQ stimulus + subparts together and computes authoritative total marks.
 */
export function generatePaperQuestionsFromPool(params: {
  allQuestions: Question[];
  subscriptions: Subscription[];
  userId: string;
  role: UserRole;
  input: GeneratePaperRequestInput;
  now?: Date;
}): {
  items: QuestionPaperItem[];
  totalMarks: number;
  selectedQuestions: Question[];
} {
  const { allQuestions, subscriptions, userId, role, input, now = new Date() } = params;

  if (!input.classId || !input.subjectId) {
    throw new PaperGenerationError('শ্রেণি এবং বিষয় নির্বাচন করা বাধ্যতামূলক।', 400);
  }

  // Strictly filter accessible + published questions first
  const authorizedQuestions = allQuestions.filter((q) => {
    if (q.status !== 'published' && role !== 'admin') return false;
    if (q.status === 'archived') return false;
    return canUserAccessQuestion(q, subscriptions, userId, role, now);
  });

  const pickedIds = new Set<string>();
  const selectedQuestions: Question[] = [];

  // Path A: Manual selection by IDs (ordered by caller)
  if (Array.isArray(input.selectedQuestionIds) && input.selectedQuestionIds.length > 0) {
    const byId = new Map(authorizedQuestions.map((q) => [q.id, q]));
    for (const qId of input.selectedQuestionIds) {
      if (pickedIds.has(qId)) continue;
      const found = byId.get(qId);
      if (!found) {
        throw new PaperGenerationError(
          'নির্বাচিত একটি প্রশ্ন পাওয়া যায়নি অথবা আপনার সক্রিয় সাবস্ক্রিপশনের অন্তর্ভুক্ত নয়।',
          403
        );
      }
      if (found.classId !== input.classId) {
        throw new PaperGenerationError(
          'নির্বাচিত প্রশ্নটি প্রশ্নপত্রের শ্রেণির সাথে সামঞ্জস্যপূর্ণ নয়।',
          400
        );
      }
      pickedIds.add(qId);
      selectedQuestions.push(found);
    }
  }

  // Path B: Requirement-based filtered selection (MCQ: X, SQ: Y, CQ: Z, etc.)
  const reqs = (input.requirements || []).filter((r) => Number(r.count) > 0);
  if (reqs.length > 0) {
    const searchLower = (input.search || '').trim().toLowerCase();
    const matchingPool = authorizedQuestions.filter((q) => {
      if (q.classId !== input.classId) return false;
      if (q.subjectId !== input.subjectId) return false;
      if (input.groupId && input.groupId !== 'all' && q.groupId && q.groupId !== input.groupId) {
        return false;
      }
      if (Array.isArray(input.chapterIds) && input.chapterIds.length > 0) {
        if (!input.chapterIds.includes(q.chapterId)) return false;
      }
      if (Array.isArray(input.topicIds) && input.topicIds.length > 0) {
        if (!q.topicId || !input.topicIds.includes(q.topicId)) return false;
      }
      if (input.difficulty && input.difficulty !== 'all' && q.difficulty !== input.difficulty) {
        return false;
      }
      if (input.marksFilter && input.marksFilter !== 'all' && q.marks !== Number(input.marksFilter)) {
        return false;
      }
      if (searchLower) {
        const hay = `${q.prompt} ${q.stimulus || ''} ${q.equationLatex || ''}`.toLowerCase();
        if (!hay.includes(searchLower)) return false;
      }
      return true;
    });

    const shortages: InsufficientTypeShortage[] = [];
    const stagedAdditions: Question[] = [];
    const workingPicked = new Set(pickedIds);

    for (const reqItem of reqs) {
      const requestedCount = Math.floor(Number(reqItem.count));
      if (!Number.isFinite(requestedCount) || requestedCount <= 0) continue;

      const candidates = deterministicOrRandomShuffle(
        matchingPool.filter(
          (q) => q.questionTypeCode === reqItem.questionTypeCode && !workingPicked.has(q.id)
        ),
        Boolean(input.shuffle)
      );

      if (candidates.length < requestedCount) {
        shortages.push({
          questionTypeCode: reqItem.questionTypeCode,
          requested: requestedCount,
          available: candidates.length,
        });
        continue;
      }

      for (let i = 0; i < requestedCount; i++) {
        workingPicked.add(candidates[i].id);
        stagedAdditions.push(candidates[i]);
      }
    }

    if (shortages.length > 0) {
      const details = shortages
        .map((s) => `${s.questionTypeCode.toUpperCase()}: চাওয়া হয়েছে ${s.requested}টি, ডাটাবেজে আছে ${s.available}টি`)
        .join('; ');
      throw new PaperGenerationError(
        `ডাটাবেজে পর্যাপ্ত প্রশ্ন নেই (${details})। অনুগ্রহ করে প্রশ্নের সংখ্যা কমান বা আরও অধ্যায় যুক্ত করুন।`,
        422,
        shortages
      );
    }

    selectedQuestions.push(...stagedAdditions);
  }

  if (selectedQuestions.length === 0) {
    throw new PaperGenerationError(
      'প্রশ্নপত্র তৈরির জন্য কমপক্ষে একটি প্রশ্ন বা প্রশ্নের ধরন অনুযায়ী সংখ্যা নির্বাচন করুন।',
      400
    );
  }

  const items = selectedQuestions.map((q, index) => {
    const custom = input.customMarksByQuestionId?.[q.id];
    return buildImmutableQuestionSnapshot(q, index, custom);
  });

  const totalMarks = items.reduce((sum, item) => sum + item.customMarks, 0);
  return { items, totalMarks, selectedQuestions };
}
