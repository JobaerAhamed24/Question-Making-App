import type { AppDatabaseState } from '../data/seedData';
import {
  canUserAccessQuestion,
  canUserAddQuestionToPaper,
  getUserPermittedClassIds,
  isDuplicateTransactionRef,
  sanitizeQuestionForUser,
} from '../lib/rules';
import type {
  AcademicClass,
  AcademicGroup,
  Chapter,
  ContactMessage,
  ExportRecord,
  FaqItem,
  Notice,
  Payment,
  PaymentMethod,
  Plan,
  PublicSafeQuestion,
  Question,
  QuestionPaper,
  QuestionPaperItem,
  QuestionType,
  SiteSettings,
  Subject,
  Subscription,
  Topic,
  UserProfile,
} from '../types/domain';
import { academicService } from './academicService';
import { adminService } from './adminService';
import { questionService } from './questionService';
import { subscriptionService } from './subscriptionService';
import { authService } from './authService';
import { favoriteService } from './favoriteService';
import { paperService, type GenerateCustomPaperInput } from './paperService';
import { paymentService } from './paymentService';
import { userService } from './userService';

interface BootstrapPayload {
  user: UserProfile | null;
  academic: {
    classes: AcademicClass[];
    groups: AcademicGroup[];
    subjects: Subject[];
    chapters: Chapter[];
    topics: Topic[];
    questionTypes: QuestionType[];
  };
  publicData: {
    siteSettings: SiteSettings;
    classes: AcademicClass[];
    subjects: Subject[];
    plans: Plan[];
    faqs: FaqItem[];
    notices: Notice[];
    paymentMethods: PaymentMethod[];
    questionTypes: QuestionType[];
  };
  subscriptions: Subscription[];
  permittedClassIds: string[];
  questions: Question[];
  favorites: string[];
  saved: string[];
  papers: QuestionPaper[];
  exports: ExportRecord[];
  payments: Payment[];
  adminSnapshot: Omit<AppDatabaseState, 'passwordsByUserId'> | null;
}

function createInitialEmptyPublicStore(): BootstrapPayload {
  const emptySettings: SiteSettings = {
    brandName: 'প্রশ্নঘর', heroHeadline: '', heroSubheadline: '', supportEmail: '', supportPhone: '',
    officeAddress: '', renewalRuleNotice: '', demoDisclaimer: '',
  };
  return {
    user: null,
    academic: { classes: [], groups: [], subjects: [], chapters: [], topics: [], questionTypes: [] },
    publicData: {
      siteSettings: emptySettings, classes: [], subjects: [], plans: [], faqs: [], notices: [],
      paymentMethods: [], questionTypes: [],
    },
    subscriptions: [], permittedClassIds: [], questions: [], favorites: [], saved: [], papers: [],
    exports: [], payments: [], adminSnapshot: null,
  };
}

let store: BootstrapPayload = createInitialEmptyPublicStore();
let syncListener: (() => void) | null = null;

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function assertAdmin(user: UserProfile | null): asserts user is UserProfile {
  if (!user || user.role !== 'admin') {
    throw new Error('অননুমোদিত প্রবেশাধিকার: অ্যাডমিন অনুমতি প্রয়োজন।');
  }
}

function notifySync(): void {
  if (syncListener) {
    syncListener();
  }
}

function runWriteThrough(fn: () => Promise<unknown>): void {
  fn()
    .then(() => questionBankService.hydrateFromServer())
    .then(() => notifySync())
    .catch((err) => {
      console.error('Backend sync failed:', err);
      // Re-hydrate from Supabase so local UI state stays aligned with persisted data.
      questionBankService.hydrateFromServer().then(() => notifySync()).catch(() => undefined);
    });
}

export const questionBankService = {
  setSyncListener(listener: (() => void) | null): void {
    syncListener = listener;
  },

  async hydrateFromServer(): Promise<UserProfile | null> {
    console.log('[v0] Supabase hydration started');
    const [{ user }, academic, publicData] = await Promise.all([
      authService.getSessionUser(),
      academicService.getAcademicCatalogue(),
      academicService.getPublicSiteData(),
    ]);
    console.log('[v0] Supabase catalogue hydrated', {
      classes: academic.classes.length,
      questionTypes: academic.questionTypes.length,
      plans: publicData.plans.length,
    });
    if (!user) {
      store = { ...createInitialEmptyPublicStore(), academic, publicData };
      return null;
    }

    const [subscriptionsPayload, collections, papersPayload, exportsPayload, paymentsPayload, questionsPayload, adminSnapshot] = await Promise.all([
      subscriptionService.getMySubscriptions(),
      favoriteService.getCollections(),
      paperService.listMyPapers(),
      paperService.listMyExports(),
      paymentService.getMyPayments(),
      questionService.listPaginatedQuestions({ page: 1, pageSize: 100 }),
      user.role === 'admin' ? adminService.getSnapshot() : Promise.resolve(null),
    ]);
    const permittedClassIds = user.role === 'admin'
      ? academic.classes.map((item) => item.id)
      : getUserPermittedClassIds(subscriptionsPayload.subscriptions, user.id);
    store = {
      user,
      academic,
      publicData,
      subscriptions: subscriptionsPayload.subscriptions,
      permittedClassIds,
      questions: questionsPayload.items,
      favorites: collections.favoriteIds,
      saved: collections.savedIds,
      papers: papersPayload.papers,
      exports: exportsPayload.exports,
      payments: paymentsPayload.payments,
      adminSnapshot,
    };
    return user;
  },


  // --- Session & Auth ---
  getCurrentUser(): UserProfile | null {
    return store.user;
  },

  async login(email: string, password: string): Promise<UserProfile> {
    const { user } = await authService.login(email, password);
    await this.hydrateFromServer();
    notifySync();
    return user;
  },

  async register(input: {
    fullName: string;
    email: string;
    phone: string;
    institution?: string;
    preferredLanguage: 'en' | 'bn';
    password: string;
  }): Promise<UserProfile> {
    const { user } = await authService.register(input);
    await this.hydrateFromServer();
    notifySync();
    return user;
  },

  async logout(): Promise<void> {
    await authService.logout();
    await this.hydrateFromServer();
    notifySync();
  },

  async updateProfile(
    _userId: string,
    patch: { fullName: string; phone: string; institution?: string; preferredLanguage: 'en' | 'bn' }
  ): Promise<UserProfile> {
    const { user } = await userService.updateMyProfile(patch);
    store.user = user;
    notifySync();
    return user;
  },

  // --- Public Catalogue & CMS Data ---
  getPublicSiteData() {
    return store.publicData;
  },

  getAcademicCatalogue() {
    return store.academic;
  },

  submitContactMessage(input: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): ContactMessage {
    const optimistic: ContactMessage = {
      id: uid('msg'),
      name: input.name.trim(),
      email: input.email.trim(),
      subject: input.subject.trim(),
      message: input.message.trim(),
      status: 'unread',
      createdAt: new Date().toISOString(),
    };
    runWriteThrough(() => academicService.submitContactMessage(input));
    return optimistic;
  },

  // --- User Subscription & Access Queries ---
  getUserSubscriptions(_userId: string): Subscription[] {
    return store.subscriptions;
  },

  getUserPermittedClasses(userId: string): string[] {
    if (store.user && store.user.id === userId) {
      if (store.user.role === 'admin') {
        return store.academic.classes.map((c) => c.id);
      }
      return getUserPermittedClassIds(store.subscriptions, userId);
    }
    return [];
  },

  // --- Question Bank (Access Controlled) ---
  listQuestionsForUser(user: UserProfile | null): Question[] {
    if (!user) return [];
    const permitted = this.getUserPermittedClasses(user.id);
    if (user.role === 'admin') {
      return store.adminSnapshot ? store.adminSnapshot.questions : store.questions;
    }
    return store.questions.filter((q) => q.status === 'published' && permitted.includes(q.classId));
  },

  getQuestionByIdForUser(
    questionId: string,
    user: UserProfile | null
  ): { question: Question | PublicSafeQuestion; hasAccess: boolean } {
    const pool = user?.role === 'admin' && store.adminSnapshot ? store.adminSnapshot.questions : store.questions;
    const question = pool.find((q) => q.id === questionId);
    if (!question) {
      throw new Error('প্রশ্নটি পাওয়া যায়নি বা এই শ্রেণিতে আপনার সাবস্ক্রিপশন নেই।');
    }
    const hasAccess = canUserAccessQuestion(question, store.subscriptions, user?.id, user?.role);
    return {
      question: sanitizeQuestionForUser(question, store.subscriptions, user?.id, user?.role),
      hasAccess,
    };
  },

  canUserBrowseClass(user: UserProfile | null, classId: string): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return this.getUserPermittedClasses(user.id).includes(classId);
  },

  // --- Favorites & Saved Questions ---
  getUserFavoritesAndSaved(_userId: string) {
    return {
      favoriteIds: store.favorites,
      savedIds: store.saved,
    };
  },

  toggleFavorite(user: UserProfile, questionId: string): string[] {
    const question = this.listQuestionsForUser(user).find((q) => q.id === questionId);
    if (!question || !canUserAccessQuestion(question, store.subscriptions, user.id, user.role)) {
      throw new Error('এই শ্রেণির জন্য সক্রিয় সাবস্ক্রিপশন প্রয়োজন।');
    }
    const exists = store.favorites.includes(questionId);
    const next = exists
      ? store.favorites.filter((id) => id !== questionId)
      : [questionId, ...store.favorites];
    store.favorites = next;
    runWriteThrough(() => favoriteService.toggleFavorite(questionId));
    return next;
  },

  toggleSaved(user: UserProfile, questionId: string): string[] {
    const question = this.listQuestionsForUser(user).find((q) => q.id === questionId);
    if (!question || !canUserAccessQuestion(question, store.subscriptions, user.id, user.role)) {
      throw new Error('এই শ্রেণির জন্য সক্রিয় সাবস্ক্রিপশন প্রয়োজন।');
    }
    const exists = store.saved.includes(questionId);
    const next = exists
      ? store.saved.filter((id) => id !== questionId)
      : [questionId, ...store.saved];
    store.saved = next;
    runWriteThrough(() => favoriteService.toggleSaved(questionId));
    return next;
  },

  // --- Question Papers, Custom Generator & Immutable Snapshots ---
  async generateCustomPaperAsync(input: GenerateCustomPaperInput): Promise<QuestionPaper> {
    const { paper } = await paperService.generateCustomPaper(input);
    await this.hydrateFromServer();
    notifySync();
    return paper;
  },

  getUserPapers(_userId: string): QuestionPaper[] {
    return store.papers;
  },

  getPaperById(paperId: string, user: UserProfile): QuestionPaper {
    const paper = store.papers.find((p) => p.id === paperId);
    if (!paper) throw new Error('প্রশ্নপত্রটি পাওয়া যায়নি।');
    if (paper.userId !== user.id && user.role !== 'admin') {
      throw new Error('অনুমতি নেই: আপনি এই প্রশ্নপত্রের স্বত্বাধিকারী নন।');
    }
    return paper;
  },

  savePaper(
    user: UserProfile,
    input: Omit<QuestionPaper, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): QuestionPaper {
    const now = new Date().toISOString();

    if (input.id) {
      const idx = store.papers.findIndex((p) => p.id === input.id);
      if (idx === -1) throw new Error('প্রশ্নপত্রটি পাওয়া যায়নি।');
      const existing = store.papers[idx];
      if (existing.userId !== user.id && user.role !== 'admin') {
        throw new Error('অনুমতি নেই।');
      }
      const existingSourceIds = new Set(existing.items.map((item) => item.sourceQuestionId));
      const addedNewQuestion = input.items.some(
        (item) => item.sourceQuestionId && !existingSourceIds.has(item.sourceQuestionId)
      );
      if (
        addedNewQuestion &&
        !canUserAddQuestionToPaper(store.subscriptions, user.id, user.role, input.classId)
      ) {
        throw new Error(
          'প্রশ্নব্যাংক থেকে নতুন প্রশ্ন যুক্ত করতে সংশ্লিষ্ট শ্রেণির সক্রিয় সাবস্ক্রিপশন প্রয়োজন।'
        );
      }

      const updated: QuestionPaper = {
        ...existing,
        ...input,
        id: existing.id,
        userId: existing.userId,
        updatedAt: now,
      };
      store.papers[idx] = updated;
      runWriteThrough(() => paperService.savePaper(input));
      return updated;
    }

    if (
      input.items.length > 0 &&
      !canUserAddQuestionToPaper(store.subscriptions, user.id, user.role, input.classId)
    ) {
      throw new Error(
        'প্রশ্নব্যাংকের প্রশ্ন দিয়ে নতুন প্রশ্নপত্র তৈরি করতে এই শ্রেণির সক্রিয় সাবস্ক্রিপশন প্রয়োজন।'
      );
    }

    const created: QuestionPaper = {
      ...input,
      id: uid('paper'),
      userId: user.id,
      createdAt: now,
      updatedAt: now,
    };
    store.papers = [created, ...store.papers];
    runWriteThrough(() => paperService.savePaper(input));
    return created;
  },

  deletePaper(user: UserProfile, paperId: string): void {
    const paper = store.papers.find((p) => p.id === paperId);
    if (!paper) throw new Error('প্রশ্নপত্রটি পাওয়া যায়নি।');
    if (paper.userId !== user.id && user.role !== 'admin') {
      throw new Error('অনুমতি নেই।');
    }
    store.papers = store.papers.filter((p) => p.id !== paperId);
    runWriteThrough(() => paperService.deletePaper(paperId));
  },

  buildSnapshotItemFromQuestion(question: Question, orderIndex: number): QuestionPaperItem {
    return {
      id: uid('pi'),
      sourceQuestionId: question.id,
      orderIndex,
      customMarks: question.marks,
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
  },

  recordExport(
    user: UserProfile,
    paper: QuestionPaper,
    format: 'pdf' | 'docx',
    includedAnswerKey: boolean
  ): ExportRecord {
    if (paper.userId !== user.id && user.role !== 'admin') {
      throw new Error('অনুমতি নেই।');
    }
    const record: ExportRecord = {
      id: uid('exp'),
      userId: user.id,
      paperId: paper.id,
      paperTitle: paper.title,
      format,
      includedAnswerKey,
      createdAt: new Date().toISOString(),
    };
    store.exports = [record, ...store.exports];
    runWriteThrough(() => paperService.exportPaper(paper.id, format, includedAnswerKey));
    return record;
  },

  getUserExports(_userId: string): ExportRecord[] {
    return store.exports;
  },

  // --- Manual Payments (User) ---
  getUserPayments(_userId: string): Payment[] {
    return store.payments;
  },

  async submitManualPayment(
    user: UserProfile,
    input: {
      planId: string;
      paymentMethodId: string;
      senderNumber: string;
      transactionRef: string;
      submittedAmountBdt: number;
      receiptDataUrl?: string;
      receiptFileName?: string;
    }
  ): Promise<Payment> {
    const plan = store.publicData.plans.find((p) => p.id === input.planId && p.isActive);
    if (!plan) throw new Error('নির্বাচিত সাবস্ক্রিপশন প্ল্যানটি সক্রিয় নয়।');

    const method = store.publicData.paymentMethods.find(
      (m) => m.id === input.paymentMethodId && m.isActive
    );
    if (!method) throw new Error('নির্বাচিত পেমেন্ট মাধ্যমটি পাওয়া যায়নি।');

    if (store.payments.some((payment) => payment.userId === user.id && payment.status === 'approved')) {
      throw new Error('আপনি ইতিমধ্যে একবার পেমেন্ট করেছেন। এই অ্যাকাউন্ট থেকে আর পেমেন্ট করা যাবে না।');
    }

    if (isDuplicateTransactionRef(store.payments, method.id, input.transactionRef)) {
      throw new Error('এই পেমেন্ট মাধ্যমে এই ট্রানজেকশন আইডি ইতিমধ্যেই জমা দেওয়া হয়েছে।');
    }

    const { payment } = await paymentService.submitManualPayment(input);
    await this.hydrateFromServer();
    notifySync();
    return payment;
  },

  // --- Admin Snapshot & Operations ---
  getAdminDashboardSnapshot(admin: UserProfile) {
    assertAdmin(admin);
    return store.adminSnapshot || null;
  },

  reviewPayment(
    admin: UserProfile,
    paymentId: string,
    decision: 'approved' | 'rejected',
    reviewNote: string
  ): { payment: Payment; subscription?: Subscription } {
    assertAdmin(admin);
    const snap = store.adminSnapshot;
    if (!snap) throw new Error('অ্যাডমিন ডাটা লোড হচ্ছে।');
    const idx = snap.payments.findIndex((p) => p.id === paymentId);
    if (idx === -1) throw new Error('পেমেন্ট তথ্য পাওয়া যায়নি।');
    const existing = snap.payments[idx];
    if (existing.status !== 'pending') {
      throw new Error('এই পেমেন্টটি ইতিমধ্যেই যাচাই করা হয়েছে।');
    }

    const nowIso = new Date().toISOString();
    const updatedPayment: Payment = {
      ...existing,
      status: decision,
      reviewedByAdminId: admin.id,
      reviewedAt: nowIso,
      reviewNote:
        reviewNote.trim() ||
        (decision === 'approved' ? 'যাচাইকৃত ও সক্রিয় করা হয়েছে।' : 'পেমেন্ট যাচাই ব্যর্থ হয়েছে।'),
    };
    snap.payments[idx] = updatedPayment;
    runWriteThrough(() => adminService.reviewPayment(paymentId, decision, reviewNote));
    return { payment: updatedPayment };
  },

  adminManualActivateSubscription(
    admin: UserProfile,
    userId: string,
    planId: string
  ): Subscription {
    assertAdmin(admin);
    const snap = store.adminSnapshot;
    const plan = snap?.plans.find((p) => p.id === planId);
    if (!plan) throw new Error('প্ল্যান পাওয়া যায়নি।');
    const now = new Date();
    const optimistic: Subscription = {
      id: uid('sub'),
      userId,
      planId: plan.id,
      planNameSnapshot: `${plan.nameBn || plan.name} (অ্যাডমিন প্রদত্ত)`,
      priceSnapshotBdt: plan.priceBdt,
      durationDaysSnapshot: plan.durationDays,
      grantedClassIds: [...plan.includedClassIds],
      status: 'active',
      startsAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + plan.durationDays * 86400000).toISOString(),
      activatedByAdminId: admin.id,
      createdAt: now.toISOString(),
    };
    snap?.subscriptions.unshift(optimistic);
    runWriteThrough(() => adminService.manualActivateSubscription(userId, planId));
    return optimistic;
  },

  adminUpdateSubscriptionStatus(
    admin: UserProfile,
    subscriptionId: string,
    status: Subscription['status']
  ): void {
    assertAdmin(admin);
    const snap = store.adminSnapshot;
    const target = snap?.subscriptions.find((s) => s.id === subscriptionId);
    if (target) target.status = status;
    runWriteThrough(() => adminService.updateSubscriptionStatus(subscriptionId, status));
  },

  adminAddClass(admin: UserProfile, input: Omit<AcademicClass, 'id'>): AcademicClass {
    assertAdmin(admin);
    const item: AcademicClass = { ...input, id: uid('cls') };
    store.adminSnapshot?.classes.push(item);
    store.academic.classes.push(item);
    runWriteThrough(() => adminService.addClass(input));
    return item;
  },

  adminAddGroup(admin: UserProfile, input: Omit<AcademicGroup, 'id'>): AcademicGroup {
    assertAdmin(admin);
    const item: AcademicGroup = { ...input, id: uid('grp') };
    store.adminSnapshot?.groups.push(item);
    store.academic.groups.push(item);
    runWriteThrough(() => adminService.addGroup(input));
    return item;
  },

  adminAddSubject(admin: UserProfile, input: Omit<Subject, 'id'>): Subject {
    assertAdmin(admin);
    const item: Subject = { ...input, id: uid('sub') };
    store.adminSnapshot?.subjects.push(item);
    store.academic.subjects.push(item);
    runWriteThrough(() => adminService.addSubject(input));
    return item;
  },

  adminAddChapter(admin: UserProfile, input: Omit<Chapter, 'id'>): Chapter {
    assertAdmin(admin);
    const item: Chapter = { ...input, id: uid('ch') };
    store.adminSnapshot?.chapters.push(item);
    store.academic.chapters.push(item);
    runWriteThrough(() => adminService.addChapter(input));
    return item;
  },

  adminAddTopic(admin: UserProfile, input: Omit<Topic, 'id'>): Topic {
    assertAdmin(admin);
    const item: Topic = { ...input, id: uid('top') };
    store.adminSnapshot?.topics.push(item);
    store.academic.topics.push(item);
    runWriteThrough(() => adminService.addTopic(input));
    return item;
  },

  adminSaveQuestion(
    admin: UserProfile,
    input: Omit<Question, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Question {
    assertAdmin(admin);
    const now = new Date().toISOString();
    const q: Question = {
      ...input,
      id: input.id || uid('q'),
      createdAt: now,
      updatedAt: now,
    };
    if (store.adminSnapshot) {
      const idx = store.adminSnapshot.questions.findIndex((item) => item.id === q.id);
      if (idx !== -1) store.adminSnapshot.questions[idx] = q;
      else store.adminSnapshot.questions.unshift(q);
    }
    runWriteThrough(() => adminService.saveQuestion(input));
    return q;
  },

  adminDeleteQuestion(admin: UserProfile, questionId: string): void {
    assertAdmin(admin);
    if (store.adminSnapshot) {
      store.adminSnapshot.questions = store.adminSnapshot.questions.filter((q) => q.id !== questionId);
    }
    store.questions = store.questions.filter((q) => q.id !== questionId);
    runWriteThrough(() => adminService.deleteQuestion(questionId));
  },

  adminBulkImportQuestions(
    admin: UserProfile,
    items: Array<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>
  ): number {
    assertAdmin(admin);
    const now = new Date().toISOString();
    const created = items.map((q) => ({ ...q, id: uid('q'), createdAt: now, updatedAt: now }));
    if (store.adminSnapshot) {
      store.adminSnapshot.questions.unshift(...created);
    }
    runWriteThrough(() => adminService.bulkImportQuestions(items));
    return created.length;
  },

  adminSavePlan(admin: UserProfile, input: Omit<Plan, 'id'> & { id?: string }): Plan {
    assertAdmin(admin);
    const plan: Plan = { ...input, id: input.id || uid('plan') };
    if (store.adminSnapshot) {
      const idx = store.adminSnapshot.plans.findIndex((p) => p.id === plan.id);
      if (idx !== -1) store.adminSnapshot.plans[idx] = plan;
      else store.adminSnapshot.plans.push(plan);
    }
    runWriteThrough(() => adminService.savePlan(input));
    return plan;
  },

  adminSavePaymentMethod(
    admin: UserProfile,
    input: Omit<PaymentMethod, 'id'> & { id?: string }
  ): PaymentMethod {
    assertAdmin(admin);
    const pm: PaymentMethod = { ...input, id: input.id || uid('pm') };
    if (store.adminSnapshot) {
      const idx = store.adminSnapshot.paymentMethods.findIndex((m) => m.id === pm.id);
      if (idx !== -1) store.adminSnapshot.paymentMethods[idx] = pm;
      else store.adminSnapshot.paymentMethods.push(pm);
    }
    runWriteThrough(() => adminService.savePaymentMethod(input));
    return pm;
  },

  adminUpdateUserStatus(
    admin: UserProfile,
    userId: string,
    status: UserProfile['status']
  ): void {
    assertAdmin(admin);
    if (userId === admin.id) {
      throw new Error('আপনি নিজের অ্যাডমিন অ্যাকাউন্ট স্থগিত করতে পারবেন না।');
    }
    const target = store.adminSnapshot?.users.find((u) => u.id === userId);
    if (target) target.status = status;
    runWriteThrough(() => adminService.updateUserStatus(userId, status));
  },

  adminUpdateSiteSettings(admin: UserProfile, settings: SiteSettings): SiteSettings {
    assertAdmin(admin);
    if (store.adminSnapshot) store.adminSnapshot.siteSettings = settings;
    store.publicData.siteSettings = settings;
    runWriteThrough(() => adminService.updateSiteSettings(settings));
    return settings;
  },

  adminSaveNotice(
    admin: UserProfile,
    input: Omit<Notice, 'id' | 'createdAt'> & { id?: string }
  ): Notice {
    assertAdmin(admin);
    const notice: Notice = { ...input, id: input.id || uid('not'), createdAt: new Date().toISOString() };
    store.adminSnapshot?.notices.unshift(notice);
    runWriteThrough(() => adminService.saveNotice(input));
    return notice;
  },

  adminSaveFaq(admin: UserProfile, input: Omit<FaqItem, 'id'> & { id?: string }): FaqItem {
    assertAdmin(admin);
    const faq: FaqItem = { ...input, id: input.id || uid('faq') };
    store.adminSnapshot?.faqs.push(faq);
    runWriteThrough(() => adminService.saveFaq(input));
    return faq;
  },

  adminResolveContactMessage(admin: UserProfile, messageId: string): void {
    assertAdmin(admin);
    const msg = store.adminSnapshot?.contactMessages.find((m) => m.id === messageId);
    if (msg) msg.status = 'resolved';
    runWriteThrough(() => adminService.resolveContactMessage(messageId));
  },
};
