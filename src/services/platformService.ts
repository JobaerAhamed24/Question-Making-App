import {
  ADMISSION_CATEGORIES,
  ADMISSION_INSTITUTIONS,
  ADMISSION_SUBJECTS,
  ADMISSION_TOPICS,
  DEFAULT_PAPER_DESIGN,
  EXTENDED_NCTB_CHAPTERS,
  EXTENDED_NCTB_TOPICS,
  KIDS_GAME_CONFIGS_SEED,
  LEARNING_COMMENTS_SEED,
  LEARNING_HUB_SEED,
  PLATFORM_SEED_QUESTIONS,
} from '../data/platformSeedData';
import type {
  AdmissionCategoryCode,
  AdmissionCategoryInfo,
  AdmissionInstitution,
  AdmissionSubject,
  AdmissionTopic,
  Chapter,
  KidsGameCategory,
  KidsGameConfig,
  KidsGameLevel,
  KidsGameProgress,
  KidsGameQuestion,
  LearningComment,
  LearningContent,
  OmrSheetConfig,
  PaperDesignConfig,
  Question,
  QuestionPaper,
  QuestionPaperItem,
  SavedFilterPreset,
  Subject,
  Topic,
  UserProfile,
  WorkspaceFilterState,
} from '../types/domain';
import { questionBankService } from './questionBankService';

const STORAGE_KEY = 'qb_platform_ext_v1';
const KIDS_PROGRESS_KEY = 'qb_kids_progress_v1';

interface PlatformExtState {
  extraChapters: Chapter[];
  extraTopics: Topic[];
  extraQuestions: Question[];
  admissionCategories: AdmissionCategoryInfo[];
  admissionInstitutions: AdmissionInstitution[];
  admissionSubjects: AdmissionSubject[];
  admissionTopics: AdmissionTopic[];
  savedFilters: SavedFilterPreset[];
  draftPapers: QuestionPaper[];
  learningContents: LearningContent[];
  learningComments: LearningComment[];
  kidsGames: KidsGameConfig[];
  activityFeed: Array<{ id: string; actor: string; action: string; domain: string; createdAt: string }>;
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function createInitialState(): PlatformExtState {
  return {
    extraChapters: [...EXTENDED_NCTB_CHAPTERS],
    extraTopics: [...EXTENDED_NCTB_TOPICS],
    extraQuestions: [...PLATFORM_SEED_QUESTIONS],
    admissionCategories: [...ADMISSION_CATEGORIES],
    admissionInstitutions: [...ADMISSION_INSTITUTIONS],
    admissionSubjects: [...ADMISSION_SUBJECTS],
    admissionTopics: [...ADMISSION_TOPICS],
    savedFilters: [],
    draftPapers: [],
    learningContents: [...LEARNING_HUB_SEED],
    learningComments: [...LEARNING_COMMENTS_SEED],
    kidsGames: [...KIDS_GAME_CONFIGS_SEED],
    activityFeed: [
      {
        id: 'act-1',
        actor: 'অ্যাডমিন পর্ষদ',
        action: 'বোর্ড (২০১০–২০২৬) ও ভর্তি পরীক্ষার প্রশ্নব্যাংক সংস্করণ যুক্ত করা হয়েছে',
        domain: 'question_bank',
        createdAt: '2026-02-05T09:00:00Z',
      },
      {
        id: 'act-2',
        actor: 'লার্নিং হাব টিম',
        action: 'অষ্টম শ্রেণি গণিত অধ্যায় ৩ এবং বুয়েট কণিক সমাধান প্রকাশিত হয়েছে',
        domain: 'learning',
        createdAt: '2026-02-04T15:30:00Z',
      },
    ],
  };
}

function loadState(): PlatformExtState {
  if (typeof window === 'undefined') return createInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<PlatformExtState>;
    const defaults = createInitialState();
    return {
      extraChapters: parsed.extraChapters ?? defaults.extraChapters,
      extraTopics: parsed.extraTopics ?? defaults.extraTopics,
      extraQuestions: parsed.extraQuestions ?? defaults.extraQuestions,
      admissionCategories: parsed.admissionCategories ?? defaults.admissionCategories,
      admissionInstitutions: parsed.admissionInstitutions ?? defaults.admissionInstitutions,
      admissionSubjects: parsed.admissionSubjects ?? defaults.admissionSubjects,
      admissionTopics: parsed.admissionTopics ?? defaults.admissionTopics,
      savedFilters: parsed.savedFilters ?? defaults.savedFilters,
      draftPapers: parsed.draftPapers ?? defaults.draftPapers,
      learningContents: parsed.learningContents ?? defaults.learningContents,
      learningComments: parsed.learningComments ?? defaults.learningComments,
      kidsGames: parsed.kidsGames ?? defaults.kidsGames,
      activityFeed: parsed.activityFeed ?? defaults.activityFeed,
    };
  } catch {
    return createInitialState();
  }
}

function saveState(state: PlatformExtState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function createInitialKidsProgress(): KidsGameProgress {
  return {
    totalStars: 0,
    totalScore: 0,
    soundEnabled: true,
    completedLessons: [],
    completedLevelsByCategory: {
      addition: [],
      subtraction: [],
      multiplication: [],
      division: [],
    },
    highScoresByMode: {},
    recentRewards: [],
  };
}

function logActivity(state: PlatformExtState, actor: string, action: string, domain: string): void {
  state.activityFeed = [
    { id: uid('act'), actor, action, domain, createdAt: new Date().toISOString() },
    ...state.activityFeed.slice(0, 29),
  ];
}

export function createDefaultOmrConfig(questionCount = 30): OmrSheetConfig {
  return {
    enabled: false,
    questionCount: Math.max(10, Math.min(100, questionCount)),
    optionsCount: 4,
    optionStyle: 'bn',
    includeRollGrid: true,
    includeRegGrid: true,
    includeSetCode: true,
  };
}

export const platformService = {
  // --- Chapters & Topics (Merged with existing questionBankService catalogue) ---
  getMergedChaptersForSubject(subject: Subject): Chapter[] {
    const base = questionBankService.getAcademicCatalogue().chapters;
    const ext = loadState().extraChapters;

    const matchSubject = (ch: Chapter) => {
      if (ch.subjectId === subject.id) return true;
      // Match extended NCTB chapters by class + subject slug/name when IDs differ across seeds
      const subName = `${subject.name} ${subject.nameBn}`.toLowerCase();
      if (subject.classId === 'cls-6' && (subName.includes('math') || subName.includes('গণিত')) && ch.subjectId === 'sub-c6-math') return true;
      if (subject.classId === 'cls-8' && (subName.includes('math') || subName.includes('গণিত')) && ch.subjectId === 'sub-c8-math') return true;
      if ((subject.classId === 'cls-9' || subject.classId === 'cls-10') && (subName.includes('physics') || subName.includes('পদার্থ')) && ch.subjectId === 'sub-c9-physics') return true;
      return false;
    };

    const byKey = new Map<string, Chapter>();
    [...base, ...ext]
      .filter((ch) => ch.isActive && matchSubject(ch))
      .forEach((ch) => {
        const key = `${ch.chapterNumber}-${ch.nameBn.trim()}`;
        if (!byKey.has(key)) byKey.set(key, ch);
      });

    const found = Array.from(byKey.values()).sort(
      (a, b) => (a.displayOrder ?? a.chapterNumber) - (b.displayOrder ?? b.chapterNumber)
    );

    if (found.length > 0) return found;

    // Clean, transparent pending-verification fallback chapters for classes whose detailed official chapter/topic breakdown awaits admin verification
    return [
      {
        id: `ch-pend-${subject.id}-1`,
        subjectId: subject.id,
        chapterNumber: 1,
        name: 'Chapter 1 (Curriculum Pending Admin Verification)',
        nameBn: `অধ্যায় ১: ${subject.nameBn} — মৌলিক ধারণা`,
        displayOrder: 1,
        sourceRef: 'NCTB পাঠ্যবই (অ্যাডমিন যাচাইকরণ অপেক্ষমাণ)',
        curriculumVersion: 'NCTB-2025',
        pendingVerification: true,
        isActive: true,
      },
      {
        id: `ch-pend-${subject.id}-2`,
        subjectId: subject.id,
        chapterNumber: 2,
        name: 'Chapter 2 (Curriculum Pending Admin Verification)',
        nameBn: `অধ্যায় ২: ${subject.nameBn} — অনুশীলন ও প্রয়োগ`,
        displayOrder: 2,
        sourceRef: 'NCTB পাঠ্যবই (অ্যাডমিন যাচাইকরণ অপেক্ষমাণ)',
        curriculumVersion: 'NCTB-2025',
        pendingVerification: true,
        isActive: true,
      },
    ];
  },

  getMergedTopicsForChapters(chapterIds: string[]): Topic[] {
    if (chapterIds.length === 0) return [];
    const base = questionBankService.getAcademicCatalogue().topics;
    const ext = loadState().extraTopics;
    const set = new Set(chapterIds);
    const matched = [...base, ...ext]
      .filter((t) => t.isActive && set.has(t.chapterId))
      .sort((a, b) => (a.displayOrder ?? 1) - (b.displayOrder ?? 1));

    const coveredChapters = new Set(matched.map((t) => t.chapterId));
    const fallbacks: Topic[] = [];
    chapterIds.forEach((chId) => {
      if (!coveredChapters.has(chId)) {
        fallbacks.push({
          id: `top-pend-${chId}-1`,
          chapterId: chId,
          name: 'Core Concepts & Practice',
          nameBn: 'মূল আলোচনা ও অনুশীলন (অ্যাডমিন যাচাইকরণ অপেক্ষমাণ)',
          displayOrder: 1,
          pendingVerification: true,
          isActive: true,
        });
      }
    });

    return [...matched, ...fallbacks];
  },

  addExtraChapter(input: Omit<Chapter, 'id'>, actorName = 'অ্যাডমিন'): Chapter {
    const state = loadState();
    const created: Chapter = { ...input, id: uid('ch-ext') };
    state.extraChapters.push(created);
    logActivity(state, actorName, `নতুন অধ্যায় যুক্ত হয়েছে: ${created.nameBn}`, 'academic');
    saveState(state);
    return created;
  },

  reorderExtraChapter(chapterId: string, direction: 'up' | 'down'): void {
    const state = loadState();
    const idx = state.extraChapters.findIndex((c) => c.id === chapterId);
    if (idx < 0) return;
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= state.extraChapters.length) return;
    const copy = [...state.extraChapters];
    [copy[idx], copy[swap]] = [copy[swap], copy[idx]];
    copy.forEach((ch, i) => {
      ch.displayOrder = i + 1;
    });
    state.extraChapters = copy;
    saveState(state);
  },

  // --- Unified Question Pool (Existing + Extended Academic & Admission) ---
  getAllQuestions(user: UserProfile | null): Question[] {
    const state = loadState();
    const existing: Question[] = [];
    if (user) {
      try {
        const res = questionBankService.listQuestionsForUser(user);
        res.forEach((q: Question) => {
          existing.push({
            ...q,
            domain: q.domain || 'academic',
            approvalStatus: q.approvalStatus || 'approved',
          });
        });
      } catch {
        // ignore if unauthorized
      }
    }
    const seen = new Set(existing.map((q) => q.id));
    const merged = [...existing];
    state.extraQuestions.forEach((q) => {
      if (!seen.has(q.id)) {
        merged.push(q);
        seen.add(q.id);
      }
    });
    return merged;
  },

  getPreviouslyUsedQuestionIds(user: UserProfile | null): Set<string> {
    const used = new Set<string>();
    const state = loadState();
    state.draftPapers.forEach((p) => {
      if (!user || p.userId === user.id || user.role === 'admin') {
        p.items.forEach((item) => used.add(item.sourceQuestionId));
      }
    });
    if (user) {
      try {
        questionBankService.getUserPapers(user.id).forEach((p) => {
          p.items.forEach((item) => used.add(item.sourceQuestionId));
        });
      } catch {
        // ignore
      }
    }
    return used;
  },

  queryWorkspaceQuestions(user: UserProfile | null, filters: WorkspaceFilterState): Question[] {
    const all = this.getAllQuestions(user);
    const usedIds = this.getPreviouslyUsedQuestionIds(user);
    const savedIds = user
      ? new Set(questionBankService.getUserFavoritesAndSaved(user.id).savedIds)
      : new Set<string>();

    let list = all.filter((q) => {
      if (q.status === 'archived') return false;
      const qDomain = q.domain || 'academic';
      if (qDomain !== filters.domain) return false;

      // Source filters (if any selected, question must satisfy at least one selected source)
      if (filters.sources.length > 0) {
        const matchesSource = filters.sources.some((src) => {
          if (src === 'platform') return true;
          if (src === 'saved') return savedIds.has(q.id);
          if (src === 'previously_used') return usedIds.has(q.id);
          if (src === 'admin_approved') return (q.approvalStatus ?? 'approved') === 'approved';
          if (src === 'previous_admission') return qDomain === 'admission' && Boolean(q.boardYear);
          return true;
        });
        if (!matchesSource) return false;
      }

      if (filters.domain === 'academic') {
        if (filters.classId) {
          // Match cls-9/cls-10 merged selection seamlessly
          const isSscPair =
            (filters.classId === 'cls-9' || filters.classId === 'cls-10') &&
            (q.classId === 'cls-9' || q.classId === 'cls-10');
          const isHscPair =
            (filters.classId === 'cls-11' || filters.classId === 'cls-12') &&
            (q.classId === 'cls-11' || q.classId === 'cls-12');
          if (q.classId !== filters.classId && !isSscPair && !isHscPair) return false;
        }
        if (filters.subjectId && q.subjectId !== filters.subjectId) {
          // Also check subject name alignment for extended NCTB subjects
          const catSubjects = questionBankService.getAcademicCatalogue().subjects;
          const selectedSub = catSubjects.find((s) => s.id === filters.subjectId);
          const qSub = catSubjects.find((s) => s.id === q.subjectId);
          const selectedName = selectedSub?.nameBn.toLowerCase() || '';
          const qName = qSub?.nameBn.toLowerCase() || q.subjectId.toLowerCase();
          const looseMatch =
            (selectedName.includes('গণিত') && q.subjectId.includes('math')) ||
            (selectedName.includes('পদার্থ') && q.subjectId.includes('physics')) ||
            (qName && selectedName && qName === selectedName);
          if (!looseMatch) return false;
        }
        if (filters.chapterIds.length > 0) {
          // Allow pending placeholder chapters to still surface subject questions cleanly
          const onlyPending = filters.chapterIds.every((id) => id.startsWith('ch-pend-'));
          if (!onlyPending && !filters.chapterIds.includes(q.chapterId)) return false;
        }
        if (filters.topicIds.length > 0) {
          const onlyPendingTopics = filters.topicIds.every((id) => id.startsWith('top-pend-'));
          if (!onlyPendingTopics && q.topicId && !filters.topicIds.includes(q.topicId)) return false;
        }
      } else {
        // Admission mode — strictly separate from Academic Class/NCTB Chapter
        if (filters.admissionCategory && q.admissionCategory !== filters.admissionCategory) return false;
        if (filters.institutionIds.length > 0 && (!q.institutionId || !filters.institutionIds.includes(q.institutionId))) {
          return false;
        }
        if (filters.admissionSubjectId && q.admissionSubjectId !== filters.admissionSubjectId) return false;
        if (filters.admissionTopicIds.length > 0 && (!q.admissionTopicId || !filters.admissionTopicIds.includes(q.admissionTopicId))) {
          return false;
        }
      }

      if (filters.difficulties.length > 0 && !filters.difficulties.includes(q.difficulty)) return false;
      if (filters.questionTypes.length > 0 && !filters.questionTypes.includes(q.questionTypeCode)) return false;
      if (filters.boards.length > 0 && (!q.board || !filters.boards.includes(q.board))) return false;

      if (filters.years.length > 0 && (!q.boardYear || !filters.years.includes(q.boardYear))) return false;
      if (filters.yearFrom && (!q.boardYear || q.boardYear < filters.yearFrom)) return false;
      if (filters.yearTo && (!q.boardYear || q.boardYear > filters.yearTo)) return false;

      const hasAnswer = Boolean(
        q.correctAnswerText?.trim() ||
          q.options?.some((o) => o.isCorrect) ||
          q.subParts?.some((sp) => sp.answer?.trim())
      );
      if (filters.answerFilter === 'with_answer' && !hasAnswer) return false;
      if (filters.answerFilter === 'without_answer' && hasAnswer) return false;

      if (filters.usageFilter === 'used' && !usedIds.has(q.id)) return false;
      if (filters.usageFilter === 'unused' && usedIds.has(q.id)) return false;

      if (filters.search.trim()) {
        const needle = filters.search.trim().toLowerCase();
        const hay = `${q.prompt} ${q.stimulus || ''} ${q.equationLatex || ''} ${q.explanation || ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }

      return true;
    });

    if (filters.sortBy === 'recent') {
      list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (filters.sortBy === 'year_desc') {
      list = [...list].sort((a, b) => (b.boardYear || 0) - (a.boardYear || 0));
    } else if (filters.sortBy === 'random') {
      list = [...list].sort(() => Math.random() - 0.5);
    }

    return list;
  },

  upsertExtraQuestion(question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }, actorName = 'অ্যাডমিন'): Question {
    const state = loadState();
    const now = new Date().toISOString();
    if (question.id) {
      const idx = state.extraQuestions.findIndex((q) => q.id === question.id);
      if (idx >= 0) {
        const updated: Question = { ...state.extraQuestions[idx], ...question, id: question.id, updatedAt: now };
        state.extraQuestions[idx] = updated;
        logActivity(state, actorName, `প্রশ্ন হালনাগাদ করা হয়েছে (${updated.id})`, 'question_bank');
        saveState(state);
        return updated;
      }
    }
    const created: Question = {
      ...question,
      id: question.id || uid(question.domain === 'admission' ? 'pq-adm' : 'pq-acad'),
      createdAt: now,
      updatedAt: now,
    };
    state.extraQuestions.unshift(created);
    logActivity(state, actorName, `নতুন প্রশ্ন যোগ করা হয়েছে (${created.domain === 'admission' ? 'ভর্তি' : 'একাডেমিক'})`, 'question_bank');
    saveState(state);
    return created;
  },

  updateQuestionApproval(questionId: string, approvalStatus: 'approved' | 'rejected' | 'pending_ai', actorName = 'অ্যাডমিন'): void {
    const state = loadState();
    const target = state.extraQuestions.find((q) => q.id === questionId);
    if (target) {
      target.approvalStatus = approvalStatus;
      target.updatedAt = new Date().toISOString();
      logActivity(state, actorName, `প্রশ্ন অনুমোদন অবস্থা: ${approvalStatus}`, 'question_bank');
      saveState(state);
    }
  },

  deleteExtraQuestion(questionId: string, actorName = 'অ্যাডমিন'): void {
    const state = loadState();
    state.extraQuestions = state.extraQuestions.filter((q) => q.id !== questionId);
    logActivity(state, actorName, `প্রশ্ন মুছে ফেলা হয়েছে (${questionId})`, 'question_bank');
    saveState(state);
  },

  // --- Saved Filter Presets ---
  listSavedFilters(userId: string, domain: 'academic' | 'admission'): SavedFilterPreset[] {
    return loadState().savedFilters.filter((f) => f.userId === userId && f.domain === domain);
  },

  saveFilterPreset(userId: string, name: string, filters: WorkspaceFilterState): SavedFilterPreset {
    const state = loadState();
    const preset: SavedFilterPreset = {
      id: uid('flt'),
      userId,
      name: name.trim(),
      domain: filters.domain,
      filters,
      createdAt: new Date().toISOString(),
    };
    state.savedFilters.unshift(preset);
    saveState(state);
    return preset;
  },

  deleteFilterPreset(id: string): void {
    const state = loadState();
    state.savedFilters = state.savedFilters.filter((f) => f.id !== id);
    saveState(state);
  },

  // --- Papers (Workspace -> Separate Document-Style Paper Editor) ---
  saveWorkspacePaper(paper: Omit<QuestionPaper, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): QuestionPaper {
    const state = loadState();
    const now = new Date().toISOString();
    const id = paper.id || uid('paper-studio');
    const fullPaper: QuestionPaper = {
      ...paper,
      id,
      designConfig: paper.designConfig ?? { ...DEFAULT_PAPER_DESIGN },
      omrConfig: paper.omrConfig ?? createDefaultOmrConfig(paper.items.length || 30),
      createdAt: paper.id
        ? state.draftPapers.find((p) => p.id === paper.id)?.createdAt || now
        : now,
      updatedAt: now,
    };

    const existingIdx = state.draftPapers.findIndex((p) => p.id === id);
    if (existingIdx >= 0) {
      state.draftPapers[existingIdx] = fullPaper;
    } else {
      state.draftPapers.unshift(fullPaper);
    }
    logActivity(state, 'ব্যবহারকারী', `প্রশ্নপত্র সংরক্ষণ: ${fullPaper.title}`, 'paper');
    saveState(state);
    return fullPaper;
  },

  getPaperForEditor(paperId: string, user: UserProfile | null): QuestionPaper | null {
    const state = loadState();
    const foundDraft = state.draftPapers.find((p) => p.id === paperId);
    if (foundDraft) return foundDraft;

    if (user) {
      try {
        const legacy = questionBankService.getPaperById(paperId, user);
        if (legacy) {
          return {
            ...legacy,
            designConfig: legacy.designConfig ?? { ...DEFAULT_PAPER_DESIGN },
            omrConfig: legacy.omrConfig ?? createDefaultOmrConfig(legacy.items.length || 30),
          };
        }
      } catch {
        // ignore
      }
    }
    return null;
  },

  listStudioPapers(userId?: string): QuestionPaper[] {
    const papers = loadState().draftPapers;
    if (!userId) return papers;
    return papers.filter((p) => p.userId === userId || p.userId === 'guest');
  },

  deleteStudioPaper(paperId: string): void {
    const state = loadState();
    state.draftPapers = state.draftPapers.filter((p) => p.id !== paperId);
    saveState(state);
  },

  buildPaperItemFromQuestion(q: Question, orderIndex: number): QuestionPaperItem {
    return {
      id: uid('pi'),
      sourceQuestionId: q.id,
      orderIndex,
      customMarks: q.marks || 1,
      snapshot: {
        classId: q.classId,
        subjectId: q.subjectId,
        chapterId: q.chapterId,
        questionTypeCode: q.questionTypeCode,
        difficulty: q.difficulty,
        language: q.language,
        prompt: q.prompt,
        stimulus: q.stimulus,
        equationLatex: q.equationLatex,
        imageUrl: q.imageUrl,
        options: q.options ? q.options.map((o) => ({ ...o })) : undefined,
        subParts: q.subParts ? q.subParts.map((sp) => ({ ...sp })) : undefined,
        correctAnswerText: q.correctAnswerText,
        explanation: q.explanation,
        board: q.board,
        boardYear: q.boardYear,
      },
    };
  },

  // --- Admission Catalogue Management ---
  getAdmissionCatalogue() {
    const state = loadState();
    return {
      categories: state.admissionCategories,
      institutions: state.admissionInstitutions,
      subjects: state.admissionSubjects,
      topics: state.admissionTopics,
    };
  },

  addAdmissionInstitution(input: Omit<AdmissionInstitution, 'id'>, actorName = 'অ্যাডমিন'): AdmissionInstitution {
    const state = loadState();
    const created: AdmissionInstitution = { ...input, id: uid('inst') };
    state.admissionInstitutions.push(created);
    logActivity(state, actorName, `নতুন ভর্তি প্রতিষ্ঠান যুক্ত: ${created.nameBn}`, 'admission');
    saveState(state);
    return created;
  },

  deleteAdmissionInstitution(id: string): void {
    const state = loadState();
    state.admissionInstitutions = state.admissionInstitutions.filter((i) => i.id !== id);
    saveState(state);
  },

  addAdmissionSubject(input: Omit<AdmissionSubject, 'id'>, actorName = 'অ্যাডমিন'): AdmissionSubject {
    const state = loadState();
    const created: AdmissionSubject = { ...input, id: uid('asub') };
    state.admissionSubjects.push(created);
    logActivity(state, actorName, `ভর্তি বিষয় যুক্ত: ${created.nameBn}`, 'admission');
    saveState(state);
    return created;
  },

  addAdmissionTopic(input: Omit<AdmissionTopic, 'id'>, actorName = 'অ্যাডমিন'): AdmissionTopic {
    const state = loadState();
    const created: AdmissionTopic = { ...input, id: uid('atop') };
    state.admissionTopics.push(created);
    logActivity(state, actorName, `ভর্তি টপিক যুক্ত: ${created.nameBn}`, 'admission');
    saveState(state);
    return created;
  },

  // --- Learning Hub & Comments ---
  listLearningContents(includeUnpublished = false): LearningContent[] {
    const list = loadState().learningContents;
    return includeUnpublished ? list : list.filter((item) => item.isPublished);
  },

  getLearningContentByPath(params: {
    classSlug?: string;
    subjectSlug?: string;
    chapterSlug?: string;
    exerciseSlug?: string;
    problemSlug?: string;
    categorySlug?: string;
  }): LearningContent | null {
    const list = loadState().learningContents;
    if (params.categorySlug && params.problemSlug) {
      return (
        list.find(
          (c) =>
            c.domain === 'admission' &&
            c.classSlug === params.categorySlug &&
            c.problemSlug === params.problemSlug
        ) || null
      );
    }
    return (
      list.find(
        (c) =>
          c.classSlug === params.classSlug &&
          c.subjectSlug === params.subjectSlug &&
          c.chapterSlug === params.chapterSlug &&
          c.exerciseSlug === params.exerciseSlug &&
          c.problemSlug === params.problemSlug
      ) || null
    );
  },

  getLearningContentUrl(item: LearningContent): string {
    if (item.domain === 'admission') {
      return `/learning/admission/${item.classSlug}/${item.problemSlug}`;
    }
    return `/learning/${item.classSlug}/${item.subjectSlug}/${item.chapterSlug}/${item.exerciseSlug}/${item.problemSlug}`;
  },

  upsertLearningContent(
    input: Omit<LearningContent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    actorName = 'অ্যাডমিন'
  ): LearningContent {
    const state = loadState();
    const now = new Date().toISOString();
    if (input.id) {
      const idx = state.learningContents.findIndex((c) => c.id === input.id);
      if (idx >= 0) {
        const updated: LearningContent = { ...state.learningContents[idx], ...input, id: input.id, updatedAt: now };
        state.learningContents[idx] = updated;
        logActivity(state, actorName, `লার্নিং হাব কনটেন্ট হালনাগাদ: ${updated.title}`, 'learning');
        saveState(state);
        return updated;
      }
    }
    const created: LearningContent = { ...input, id: uid('lh'), createdAt: now, updatedAt: now };
    state.learningContents.unshift(created);
    logActivity(state, actorName, `নতুন লার্নিং হাব সমাধান প্রকাশিত: ${created.title}`, 'learning');
    saveState(state);
    return created;
  },

  toggleLearningPublish(id: string): void {
    const state = loadState();
    const item = state.learningContents.find((c) => c.id === id);
    if (item) {
      item.isPublished = !item.isPublished;
      item.updatedAt = new Date().toISOString();
      saveState(state);
    }
  },

  deleteLearningContent(id: string): void {
    const state = loadState();
    state.learningContents = state.learningContents.filter((c) => c.id !== id);
    saveState(state);
  },

  listComments(contentId?: string, includeHidden = false): LearningComment[] {
    return loadState()
      .learningComments.filter((c) => (!contentId || c.contentId === contentId) && (includeHidden || !c.isHidden))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  addComment(contentId: string, user: UserProfile, body: string): LearningComment {
    const state = loadState();
    const now = new Date().toISOString();
    const created: LearningComment = {
      id: uid('lcm'),
      contentId,
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      body: body.trim(),
      likedByUserIds: [],
      reportedByUserIds: [],
      createdAt: now,
      updatedAt: now,
    };
    state.learningComments.unshift(created);
    logActivity(state, user.fullName, 'লার্নিং হাবে নতুন মন্তব্য যুক্ত করেছেন', 'learning');
    saveState(state);
    return created;
  },

  editComment(commentId: string, user: UserProfile, body: string): void {
    const state = loadState();
    const item = state.learningComments.find((c) => c.id === commentId);
    if (!item) return;
    if (item.userId !== user.id && user.role !== 'admin') return;
    item.body = body.trim();
    item.updatedAt = new Date().toISOString();
    saveState(state);
  },

  deleteComment(commentId: string, user: UserProfile): void {
    const state = loadState();
    const item = state.learningComments.find((c) => c.id === commentId);
    if (!item) return;
    if (item.userId !== user.id && user.role !== 'admin') return;
    state.learningComments = state.learningComments.filter((c) => c.id !== commentId);
    saveState(state);
  },

  toggleLikeComment(commentId: string, userId: string): void {
    const state = loadState();
    const item = state.learningComments.find((c) => c.id === commentId);
    if (!item) return;
    if (item.likedByUserIds.includes(userId)) {
      item.likedByUserIds = item.likedByUserIds.filter((id) => id !== userId);
    } else {
      item.likedByUserIds.push(userId);
    }
    saveState(state);
  },

  reportComment(commentId: string, userId: string): void {
    const state = loadState();
    const item = state.learningComments.find((c) => c.id === commentId);
    if (!item) return;
    if (!item.reportedByUserIds.includes(userId)) {
      item.reportedByUserIds.push(userId);
    }
    saveState(state);
  },

  clearCommentReports(commentId: string): void {
    const state = loadState();
    const item = state.learningComments.find((c) => c.id === commentId);
    if (item) {
      item.reportedByUserIds = [];
      item.isHidden = false;
      saveState(state);
    }
  },

  // --- Kids Games & Progress ---
  listKidsGames(includeInactive = false): KidsGameConfig[] {
    const games = loadState().kidsGames;
    return includeInactive ? games : games.filter((g) => g.isActive);
  },

  upsertKidsGame(game: Omit<KidsGameConfig, 'id'> & { id?: string }, actorName = 'অ্যাডমিন'): KidsGameConfig {
    const state = loadState();
    if (game.id) {
      const idx = state.kidsGames.findIndex((g) => g.id === game.id);
      if (idx >= 0) {
        const updated: KidsGameConfig = { ...game, id: game.id };
        state.kidsGames[idx] = updated;
        logActivity(state, actorName, `কিডস গেম হালনাগাদ: ${updated.titleBn}`, 'kids_game');
        saveState(state);
        return updated;
      }
    }
    const created: KidsGameConfig = { ...game, id: uid('kg') };
    state.kidsGames.push(created);
    logActivity(state, actorName, `নতুন কিডস গেম যুক্ত: ${created.titleBn}`, 'kids_game');
    saveState(state);
    return created;
  },

  toggleKidsGameActive(gameId: string): void {
    const state = loadState();
    const g = state.kidsGames.find((item) => item.id === gameId);
    if (g) {
      g.isActive = !g.isActive;
      saveState(state);
    }
  },

  addKidsGameLevel(gameId: string, level: Omit<KidsGameLevel, 'id'>): void {
    const state = loadState();
    const g = state.kidsGames.find((item) => item.id === gameId);
    if (g) {
      g.levels.push({ ...level, id: uid('lvl') });
      saveState(state);
    }
  },

  addKidsGameQuestion(gameId: string, q: Omit<KidsGameQuestion, 'id'>): void {
    const state = loadState();
    const g = state.kidsGames.find((item) => item.id === gameId);
    if (g) {
      g.customQuestions.push({ ...q, id: uid('kgq') });
      saveState(state);
    }
  },

  getKidsProgress(): KidsGameProgress {
    if (typeof window === 'undefined') return createInitialKidsProgress();
    try {
      const raw = window.localStorage.getItem(KIDS_PROGRESS_KEY);
      if (!raw) return createInitialKidsProgress();
      return { ...createInitialKidsProgress(), ...(JSON.parse(raw) as Partial<KidsGameProgress>) };
    } catch {
      return createInitialKidsProgress();
    }
  },

  saveKidsProgress(progress: KidsGameProgress): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(KIDS_PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // ignore
    }
  },

  markKidsLessonComplete(category: KidsGameCategory): KidsGameProgress {
    const p = this.getKidsProgress();
    if (!p.completedLessons.includes(category)) {
      p.completedLessons.push(category);
      p.totalStars += 2;
      p.recentRewards.unshift({
        id: uid('rew'),
        titleBn: 'পাঠ সম্পূর্ণ করার বোনাস (+২ স্টার)',
        stars: 2,
        earnedAt: new Date().toISOString(),
      });
    }
    this.saveKidsProgress(p);
    return p;
  },

  recordKidsGameWin(params: {
    category: KidsGameCategory;
    modeId: string;
    levelNumber: number;
    score: number;
    starsEarned: number;
    titleBn: string;
  }): KidsGameProgress {
    const p = this.getKidsProgress();
    p.totalScore += params.score;
    p.totalStars += params.starsEarned;
    const key = `${params.category}:${params.modeId}`;
    p.highScoresByMode[key] = Math.max(p.highScoresByMode[key] || 0, params.score);
    const completed = p.completedLevelsByCategory[params.category] || [];
    if (!completed.includes(params.levelNumber)) {
      p.completedLevelsByCategory[params.category] = [...completed, params.levelNumber];
    }
    p.recentRewards = [
      { id: uid('rew'), titleBn: params.titleBn, stars: params.starsEarned, earnedAt: new Date().toISOString() },
      ...p.recentRewards.slice(0, 9),
    ];
    this.saveKidsProgress(p);
    return p;
  },

  toggleKidsSound(): KidsGameProgress {
    const p = this.getKidsProgress();
    p.soundEnabled = !p.soundEnabled;
    this.saveKidsProgress(p);
    return p;
  },

  // --- Admin Dashboard Aggregate Metrics ---
  getAdminPlatformMetrics(adminUser: UserProfile) {
    const state = loadState();
    const allQ = this.getAllQuestions(adminUser);
    const academicQuestions = allQ.filter((q) => (q.domain || 'academic') === 'academic');
    const admissionQuestions = allQ.filter((q) => q.domain === 'admission');
    const pendingAiApprovals = allQ.filter((q) => q.approvalStatus === 'pending_ai').length;
    const reportedComments = state.learningComments.filter((c) => c.reportedByUserIds.length > 0).length;

    let totalStudents = 0;
    let pendingPayments = 0;
    let existingPapersCount = 0;
    try {
      const snap = questionBankService.getAdminDashboardSnapshot(adminUser);
      if (snap) {
        totalStudents = snap.users.filter((u) => u.role === 'student').length;
        pendingPayments = snap.payments.filter((p) => p.status === 'pending').length;
        existingPapersCount = snap.papers.length;
      }
    } catch {
      // fallback
    }

    return {
      totalQuestions: allQ.length,
      totalAcademicQuestions: academicQuestions.length,
      totalAdmissionQuestions: admissionQuestions.length,
      totalLearningPages: state.learningContents.length,
      publishedLearningPages: state.learningContents.filter((l) => l.isPublished).length,
      totalStudents,
      totalSavedPapers: existingPapersCount + state.draftPapers.length,
      totalComments: state.learningComments.length,
      reportedComments,
      pendingApprovals: pendingPayments + pendingAiApprovals + reportedComments,
      pendingAiApprovals,
      pendingPayments,
      recentActivities: state.activityFeed.slice(0, 8),
    };
  },

  // --- Bulk Export / Import Helpers ---
  exportAcademicBundleJson(): string {
    const state = loadState();
    const base = questionBankService.getAcademicCatalogue();
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        classes: base.classes,
        subjects: base.subjects,
        chapters: [...base.chapters, ...state.extraChapters],
        topics: [...base.topics, ...state.extraTopics],
      },
      null,
      2
    );
  },

  importChaptersJson(rawJson: string, actorName = 'অ্যাডমিন'): number {
    const parsed = JSON.parse(rawJson) as { chapters?: Chapter[]; topics?: Topic[] };
    const state = loadState();
    let count = 0;
    if (Array.isArray(parsed.chapters)) {
      parsed.chapters.forEach((ch) => {
        if (ch.subjectId && (ch.nameBn || ch.name)) {
          state.extraChapters.push({
            id: ch.id || uid('ch-imp'),
            subjectId: ch.subjectId,
            chapterNumber: Number(ch.chapterNumber) || 1,
            name: ch.name || ch.nameBn,
            nameBn: ch.nameBn || ch.name,
            displayOrder: ch.displayOrder ?? state.extraChapters.length + 1,
            sourceRef: ch.sourceRef || 'JSON ইমপোর্ট',
            curriculumVersion: ch.curriculumVersion || 'NCTB-2025',
            isActive: ch.isActive ?? true,
          });
          count++;
        }
      });
    }
    if (Array.isArray(parsed.topics)) {
      parsed.topics.forEach((t) => {
        if (t.chapterId && (t.nameBn || t.name)) {
          state.extraTopics.push({
            id: t.id || uid('top-imp'),
            chapterId: t.chapterId,
            name: t.name || t.nameBn,
            nameBn: t.nameBn || t.name,
            displayOrder: t.displayOrder ?? state.extraTopics.length + 1,
            isActive: t.isActive ?? true,
          });
        }
      });
    }
    logActivity(state, actorName, `JSON থেকে ${count}টি অধ্যায় ইমপোর্ট করা হয়েছে`, 'academic');
    saveState(state);
    return count;
  },
};

export function getAdmissionCategoryLabelBn(code?: AdmissionCategoryCode): string {
  switch (code) {
    case 'university':
      return 'বিশ্ববিদ্যালয় ভর্তি';
    case 'engineering':
      return 'প্রকৌশল ও প্রযুক্তি ভর্তি';
    case 'medical':
      return 'মেডিকেল ও ডেন্টাল ভর্তি';
    default:
      return 'ভর্তি পরীক্ষা';
  }
}
