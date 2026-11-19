import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { mockDb } from '../lib/mockDb';
import type {
  ExamAnswerReview,
  ExamAttempt,
  LiveExam,
  LiveExamComputedStatus,
  LiveExamQuestionPublic,
  Question,
} from '../types/domain';

export type ExamSummary = Omit<LiveExam, 'accessCode'> & {
  hasAccessCode: boolean;
  participantCount: number;
  computedStatus: LiveExamComputedStatus;
};

export interface CreateLiveExamInput {
  title: string;
  description: string;
  classId: string;
  subjectId: string;
  questionIds: string[];
  durationMinutes: number;
  marksPerQuestion: number;
  negativeMarkingPerWrong: number;
  startsAt: string;
  endsAt: string;
  accessMode: 'public' | 'private';
  accessCode?: string;
}

export function getExamComputedStatus(exam: Pick<LiveExam, 'startsAt' | 'endsAt'>, nowMs = Date.now()): LiveExamComputedStatus {
  const start = new Date(exam.startsAt).getTime();
  const end = new Date(exam.endsAt).getTime();
  if (nowMs < start) return 'upcoming';
  if (nowMs > end) return 'ended';
  return 'live';
}

function sanitizeExamSummary(exam: LiveExam, attempts: ExamAttempt[]): ExamSummary {
  const { accessCode, ...rest } = exam;
  return {
    ...rest,
    hasAccessCode: Boolean(accessCode && accessCode.trim().length > 0),
    participantCount: attempts.filter((a) => a.examId === exam.id).length,
    computedStatus: getExamComputedStatus(exam),
  };
}

function stripQuestionAnswers(q: Question): LiveExamQuestionPublic {
  return {
    id: q.id,
    prompt: q.prompt,
    equationLatex: q.equationLatex,
    imageUrl: q.imageUrl,
    options: (q.options ?? []).map((opt) => ({
      id: opt.id,
      label: opt.label,
      text: opt.text,
    })),
  };
}

function buildReviewsForAttempt(
  examQuestions: Question[],
  answers: Record<string, string>
): ExamAnswerReview[] {
  return examQuestions.map((q) => {
    const selectedOptionId = answers[q.id] ?? null;
    const correctOption = (q.options ?? []).find((opt) => opt.isCorrect) ?? null;
    const correctOptionId = correctOption?.id ?? null;
    const isCorrect = Boolean(selectedOptionId && correctOptionId && selectedOptionId === correctOptionId);
    return {
      questionId: q.id,
      prompt: q.prompt,
      options: structuredClone(q.options ?? []),
      selectedOptionId,
      correctOptionId,
      isCorrect,
      explanation: q.explanation,
    };
  });
}

export const examService = {
  async listExams(filters?: {
    classId?: string;
    subjectId?: string;
    status?: 'all' | LiveExamComputedStatus;
    search?: string;
  }): Promise<{ exams: ExamSummary[] }> {
    // Supabase integration point: query `live_exams` & `exam_attempts` count RPC when configured.
    if (isSupabaseConfigured) {
      // Fallback safely if live_exams table isn't provisioned yet in Supabase schema.
      try {
        const { data } = await supabase.from('live_exams').select('*').limit(50);
        if (data && data.length > 0) {
          // Reserved for production table mapping
        }
      } catch {
        // Use local prototype store
      }
    }

    const state = mockDb.getState();
    const statusOrder: Record<LiveExamComputedStatus, number> = { live: 0, upcoming: 1, ended: 2 };
    const search = filters?.search?.trim().toLowerCase() ?? '';

    const mapped = state.exams
      .map((exam) => sanitizeExamSummary(exam, state.examAttempts))
      .filter((exam) => {
        if (filters?.classId && exam.classId !== filters.classId) return false;
        if (filters?.subjectId && exam.subjectId !== filters.subjectId) return false;
        if (filters?.status && filters.status !== 'all' && exam.computedStatus !== filters.status) return false;
        if (search) {
          const hay = `${exam.title} ${exam.description}`.toLowerCase();
          if (!hay.includes(search)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const orderDiff = statusOrder[a.computedStatus] - statusOrder[b.computedStatus];
        if (orderDiff !== 0) return orderDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    return { exams: mapped };
  },

  async listBankMcqsForBuilder(filters?: {
    classId?: string;
    subjectId?: string;
    difficulty?: string;
    search?: string;
  }): Promise<{ questions: Array<Pick<Question, 'id' | 'classId' | 'subjectId' | 'difficulty' | 'language' | 'prompt' | 'marks'>> }> {
    const state = mockDb.getState();
    const search = filters?.search?.trim().toLowerCase() ?? '';
    const items = state.questions
      .filter((q) => q.status === 'published' && q.questionTypeCode === 'mcq' && (q.options?.length ?? 0) >= 2)
      .filter((q) => {
        if (filters?.classId && q.classId !== filters.classId) return false;
        if (filters?.subjectId && q.subjectId !== filters.subjectId) return false;
        if (filters?.difficulty && q.difficulty !== filters.difficulty) return false;
        if (search && !q.prompt.toLowerCase().includes(search)) return false;
        return true;
      })
      .map((q) => ({
        id: q.id,
        classId: q.classId,
        subjectId: q.subjectId,
        difficulty: q.difficulty,
        language: q.language,
        prompt: q.prompt,
        marks: q.marks,
      }));
    return { questions: items };
  },

  pickRandomMcqIds(filters: { classId?: string; subjectId?: string; difficulty?: string }, count: number): string[] {
    const state = mockDb.getState();
    let pool = state.questions.filter(
      (q) => q.status === 'published' && q.questionTypeCode === 'mcq' && (q.options?.length ?? 0) >= 2
    );
    if (filters.classId) {
      const byClass = pool.filter((q) => q.classId === filters.classId);
      if (byClass.length > 0) pool = byClass;
    }
    if (filters.subjectId) {
      const bySubject = pool.filter((q) => q.subjectId === filters.subjectId);
      if (bySubject.length > 0) pool = bySubject;
    }
    if (filters.difficulty) {
      const byDiff = pool.filter((q) => q.difficulty === filters.difficulty);
      if (byDiff.length > 0) pool = byDiff;
    }

    // If filtered subject/class has fewer than requested, top up from remaining published MCQs if needed
    const remainingPool = state.questions.filter(
      (q) =>
        q.status === 'published' &&
        q.questionTypeCode === 'mcq' &&
        (q.options?.length ?? 0) >= 2 &&
        !pool.some((p) => p.id === q.id)
    );

    const shuffle = <T,>(arr: T[]): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const combined = [...shuffle(pool), ...shuffle(remainingPool)];
    const target = Math.max(1, Math.min(100, count, combined.length));
    return combined.slice(0, target).map((q) => q.id);
  },

  async createExam(input: CreateLiveExamInput): Promise<{ exam: ExamSummary }> {
    const currentUser = mockDb.getCurrentUser();
    if (!currentUser) {
      throw new Error('নতুন পরীক্ষা তৈরি করতে অনুগ্রহ করে লগইন করুন।');
    }
    if (!input.title.trim()) throw new Error('পরীক্ষার শিরোনাম লিখুন।');
    if (input.questionIds.length < 1 || input.questionIds.length > 100) {
      throw new Error('কমপক্ষে ১টি এবং সর্বোচ্চ ১০০টি প্রশ্ন নির্বাচন করুন।');
    }
    if (input.durationMinutes < 1 || input.durationMinutes > 300) {
      throw new Error('পরীক্ষার সময় ১ থেকে ৩০০ মিনিটের মধ্যে হতে হবে।');
    }
    if (new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
      throw new Error('সমাপ্তির সময় শুরুর সময়ের পরে হতে হবে।');
    }
    if (input.accessMode === 'private' && (!input.accessCode || input.accessCode.trim().length < 3)) {
      throw new Error('প্রাইভেট পরীক্ষার জন্য কমপক্ষে ৩ অক্ষরের অ্যাক্সেস কোড দিন।');
    }

    const state = mockDb.getState();
    const totalMarks = Number((input.questionIds.length * input.marksPerQuestion).toFixed(2));
    const exam: LiveExam = {
      id: mockDb.uid('exam'),
      title: input.title.trim(),
      description: input.description.trim() || 'প্রশ্নব্যাংক থেকে বাছাইকৃত লাইভ পরীক্ষা।',
      classId: input.classId,
      subjectId: input.subjectId,
      questionIds: [...input.questionIds],
      durationMinutes: input.durationMinutes,
      marksPerQuestion: input.marksPerQuestion,
      negativeMarkingPerWrong: input.negativeMarkingPerWrong,
      totalMarks,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      accessMode: input.accessMode,
      accessCode: input.accessMode === 'private' ? input.accessCode?.trim() : undefined,
      createdByUserId: currentUser.id,
      createdByName: currentUser.fullName,
      createdAt: new Date().toISOString(),
    };

    state.exams.unshift(exam);
    mockDb.logActivity(currentUser, 'LIVE_EXAM_CREATED', 'exam', exam.id, `Created live exam "${exam.title}"`);
    mockDb.save();
    return { exam: sanitizeExamSummary(exam, state.examAttempts) };
  },

  async getExamForTaking(
    examId: string,
    accessCode?: string
  ): Promise<{ exam: ExamSummary; questions: LiveExamQuestionPublic[] }> {
    const state = mockDb.getState();
    const exam = state.exams.find((e) => e.id === examId);
    if (!exam) throw new Error('পরীক্ষাটি পাওয়া যায়নি।');

    const status = getExamComputedStatus(exam);
    if (status === 'upcoming') {
      throw new Error('এই পরীক্ষাটি এখনো শুরু হয়নি। নির্ধারিত সময়ে চেষ্টা করুন।');
    }
    if (status === 'ended') {
      throw new Error('এই পরীক্ষার সময়সীমা শেষ হয়ে গেছে।');
    }
    if (exam.accessMode === 'private') {
      const provided = (accessCode ?? '').trim().toLowerCase();
      const expected = (exam.accessCode ?? '').trim().toLowerCase();
      if (!provided || provided !== expected) {
        throw new Error('প্রাইভেট পরীক্ষার অ্যাক্সেস কোড সঠিক নয়।');
      }
    }

    const questionMap = new Map(state.questions.map((q) => [q.id, q]));
    const sanitizedQuestions = exam.questionIds
      .map((qid) => questionMap.get(qid))
      .filter((q): q is Question => Boolean(q))
      .map(stripQuestionAnswers);

    return {
      exam: sanitizeExamSummary(exam, state.examAttempts),
      questions: sanitizedQuestions,
    };
  },

  async submitExamAttempt(
    examId: string,
    answers: Record<string, string>,
    timeTakenSeconds: number,
    guestName?: string
  ): Promise<{
    attempt: ExamAttempt;
    reviews: ExamAnswerReview[];
    rank: number;
    totalParticipants: number;
  }> {
    const state = mockDb.getState();
    const exam = state.exams.find((e) => e.id === examId);
    if (!exam) throw new Error('পরীক্ষাটি পাওয়া যায়নি।');

    const currentUser = mockDb.getCurrentUser();
    const participantId = currentUser?.id ?? mockDb.uid('guest');
    const participantName = currentUser?.fullName ?? (guestName?.trim() || 'অতিথি পরীক্ষার্থী');

    const questionMap = new Map(state.questions.map((q) => [q.id, q]));
    const examQuestions = exam.questionIds
      .map((qid) => questionMap.get(qid))
      .filter((q): q is Question => Boolean(q));

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    for (const q of examQuestions) {
      const chosen = answers[q.id];
      if (!chosen) {
        unansweredCount += 1;
        continue;
      }
      const correctOpt = (q.options ?? []).find((opt) => opt.isCorrect);
      if (correctOpt && chosen === correctOpt.id) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    }

    const rawScore = Number((correctCount * exam.marksPerQuestion).toFixed(2));
    const negativeDeducted = Number((wrongCount * exam.negativeMarkingPerWrong).toFixed(2));
    const finalScore = Number(Math.max(0, rawScore - negativeDeducted).toFixed(2));
    const totalQuestions = examQuestions.length;
    const accuracyPercent =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const attempt: ExamAttempt = {
      id: mockDb.uid('att'),
      examId: exam.id,
      examTitle: exam.title,
      classId: exam.classId,
      subjectId: exam.subjectId,
      userId: participantId,
      userName: participantName,
      answers: { ...answers },
      totalQuestions,
      correctCount,
      wrongCount,
      unansweredCount,
      rawScore,
      negativeDeducted,
      finalScore,
      totalMarks: exam.totalMarks,
      accuracyPercent,
      timeTakenSeconds: Math.max(1, Math.round(timeTakenSeconds)),
      submittedAt: new Date().toISOString(),
    };

    state.examAttempts.unshift(attempt);
    if (currentUser) {
      mockDb.logActivity(
        currentUser,
        'LIVE_EXAM_SUBMITTED',
        'exam',
        exam.id,
        `Submitted "${exam.title}" with score ${finalScore}/${exam.totalMarks}`
      );
    }
    mockDb.save();

    const examAttempts = state.examAttempts
      .filter((a) => a.examId === exam.id)
      .sort((a, b) => {
        if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
        return a.timeTakenSeconds - b.timeTakenSeconds;
      });
    const rank = examAttempts.findIndex((a) => a.id === attempt.id) + 1;

    return {
      attempt: structuredClone(attempt),
      reviews: buildReviewsForAttempt(examQuestions, answers),
      rank: Math.max(1, rank),
      totalParticipants: examAttempts.length,
    };
  },

  async getAttemptResult(attemptId: string): Promise<{
    exam: ExamSummary;
    attempt: ExamAttempt;
    reviews: ExamAnswerReview[];
    rank: number;
    totalParticipants: number;
  }> {
    const state = mockDb.getState();
    const attempt = state.examAttempts.find((a) => a.id === attemptId);
    if (!attempt) throw new Error('ফলাফল পাওয়া যায়নি।');
    const exam = state.exams.find((e) => e.id === attempt.examId);
    if (!exam) throw new Error('সংশ্লিষ্ট পরীক্ষাটি পাওয়া যায়নি।');

    const questionMap = new Map(state.questions.map((q) => [q.id, q]));
    const examQuestions = exam.questionIds
      .map((qid) => questionMap.get(qid))
      .filter((q): q is Question => Boolean(q));

    const examAttempts = state.examAttempts
      .filter((a) => a.examId === exam.id)
      .sort((a, b) => {
        if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
        return a.timeTakenSeconds - b.timeTakenSeconds;
      });
    const rank = examAttempts.findIndex((a) => a.id === attempt.id) + 1;

    return {
      exam: sanitizeExamSummary(exam, state.examAttempts),
      attempt: structuredClone(attempt),
      reviews: buildReviewsForAttempt(examQuestions, attempt.answers),
      rank: Math.max(1, rank),
      totalParticipants: examAttempts.length,
    };
  },

  async listMyAttempts(userId?: string): Promise<{ attempts: ExamAttempt[] }> {
    const state = mockDb.getState();
    const targetId = userId ?? mockDb.getCurrentUser()?.id;
    if (!targetId) return { attempts: [] };
    const attempts = state.examAttempts
      .filter((a) => a.userId === targetId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return { attempts: structuredClone(attempts) };
  },
};
