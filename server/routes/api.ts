import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  canUserAccessClass,
  canUserAccessQuestion,
  canUserAddQuestionToPaper,
  getUserPermittedClassIds,
  sanitizeQuestionForUser,
} from '../../src/lib/rules.ts';
import type {
  AcademicClass,
  AcademicGroup,
  Chapter,
  FaqItem,
  Notice,
  PaymentMethod,
  Plan,
  Question,
  QuestionPaper,
  QuestionPaperItem,
  SiteSettings,
  Subject,
  Subscription,
  Topic,
  UserProfile,
  UserRole,
} from '../../src/types/domain.ts';
import { QuestionBankDatabase, type StorageBucket } from '../db.ts';
import {
  buildImmutableQuestionSnapshot,
  generatePaperQuestionsFromPool,
  PaperGenerationError,
  type GeneratePaperRequestInput,
} from '../paperGenerator.ts';
import {
  hashPassword,
  parseCookies,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  signSessionToken,
  signStorageToken,
  verifyPassword,
  verifySignedSessionToken,
  verifyStorageToken,
} from '../security.ts';

interface AuthenticatedRequest extends Request {
  currentUser?: UserProfile | null;
  sessionId?: string | null;
}

function setSessionCookie(res: Response, sessionId: string): void {
  const token = signSessionToken(sessionId);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
}

export function createApiRouter(db: QuestionBankDatabase) {
  const router = express.Router();

  // Populate req.currentUser strictly from server-side signed session cookie
  router.use((req: Request, _res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    authReq.currentUser = null;
    authReq.sessionId = null;

    const cookies = parseCookies(req);
    const rawToken = cookies[SESSION_COOKIE_NAME];
    if (rawToken) {
      const sessionId = verifySignedSessionToken(rawToken);
      if (sessionId) {
        const user = db.getUserBySessionId(sessionId);
        if (user) {
          authReq.currentUser = user;
          authReq.sessionId = sessionId;
        }
      }
    }
    next();
  });

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.currentUser) {
      res.status(401).json({ error: 'অননুমোদিত প্রবেশাধিকার। অনুগ্রহ করে লগইন করুন।' });
      return;
    }
    next();
  };

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.currentUser) {
      res.status(401).json({ error: 'অননুমোদিত প্রবেশাধিকার।' });
      return;
    }
    if (authReq.currentUser.role !== 'admin') {
      res.status(403).json({ error: 'অ্যাডমিন অনুমতি প্রয়োজন।' });
      return;
    }
    next();
  };

  // --- Health ---
  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'questionbank-backend', timestamp: new Date().toISOString() });
  });

  // --- Bootstrap (Strict least-privilege payload per session role/entitlement) ---
  router.get('/bootstrap', (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.currentUser;
    const catalogue = db.getAcademicCatalogue();
    const cms = db.getPublicCmsData();
    const plans = db.listPlans();
    const paymentMethods = db.listPaymentMethods();

    if (!user) {
      res.json({
        user: null,
        academic: catalogue,
        publicData: {
          siteSettings: cms.siteSettings,
          classes: catalogue.classes.filter((c) => c.isActive),
          subjects: catalogue.subjects.filter((s) => s.isActive),
          plans: plans.filter((p) => p.isActive),
          faqs: cms.faqs.filter((f) => f.isPublished),
          notices: cms.notices.filter((n) => n.isPublished),
          paymentMethods: paymentMethods.filter((pm) => pm.isActive),
          questionTypes: catalogue.questionTypes.filter((qt) => qt.isActive),
        },
        subscriptions: [],
        permittedClassIds: [],
        questions: [],
        favorites: [],
        saved: [],
        papers: [],
        exports: [],
        payments: [],
        adminSnapshot: null,
      });
      return;
    }

    const allSubs = db.listSubscriptions(user.id);
    const permittedClassIds =
      user.role === 'admin'
        ? catalogue.classes.map((c) => c.id)
        : getUserPermittedClassIds(allSubs, user.id);

    const allQuestions = db.listAllQuestions();
    const authorizedQuestions =
      user.role === 'admin'
        ? allQuestions
        : allQuestions.filter(
            (q) => q.status === 'published' && permittedClassIds.includes(q.classId)
          );

    const collections = db.getUserFavoritesAndSaved(user.id);
    const papers = db.listPapers(user.id);
    const exports = db.listExports(user.id);
    const payments = db.listPayments(user.id);
    const adminSnapshot = user.role === 'admin' ? db.getAdminSnapshot() : null;

    res.json({
      user,
      academic: catalogue,
      publicData: {
        siteSettings: cms.siteSettings,
        classes: catalogue.classes.filter((c) => c.isActive),
        subjects: catalogue.subjects.filter((s) => s.isActive),
        plans: plans.filter((p) => p.isActive),
        faqs: cms.faqs.filter((f) => f.isPublished),
        notices: cms.notices.filter((n) => n.isPublished),
        paymentMethods: paymentMethods.filter((pm) => pm.isActive),
        questionTypes: catalogue.questionTypes.filter((qt) => qt.isActive),
      },
      subscriptions: allSubs,
      permittedClassIds,
      questions: authorizedQuestions,
      favorites: collections.favoriteIds,
      saved: collections.savedIds,
      papers,
      exports,
      payments,
      adminSnapshot,
    });
  });

  // --- Auth & Users ---
  router.get('/auth/me', (req, res) => {
    const authReq = req as AuthenticatedRequest;
    res.json({ user: authReq.currentUser });
  });

  router.post('/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'ইমেইল এবং পাসওয়ার্ড উভয়ই আবশ্যক।' });
      return;
    }
    const found = db.getUserWithPasswordByEmail(String(email));
    if (!found) {
      res.status(401).json({ error: 'এই ইমেইল ঠিকানায় কোনো অ্যাকাউন্ট পাওয়া যায়নি।' });
      return;
    }
    if (found.user.status === 'suspended') {
      res.status(403).json({ error: 'এই অ্যাকাউন্টটি স্থগিত করা হয়েছে। অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন।' });
      return;
    }
    if (!verifyPassword(String(password), found.passwordHash)) {
      res.status(401).json({ error: 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।' });
      return;
    }
    const sessionId = db.createSession(found.user.id, SESSION_TTL_MS);
    setSessionCookie(res, sessionId);
    res.json({ user: found.user });
  });

  router.post('/auth/demo-login', (req, res) => {
    const { userId } = req.body || {};
    if (!userId) {
      res.status(400).json({ error: 'ডেমো ব্যবহারকারী নির্বাচন করুন।' });
      return;
    }
    const user = db.getUserById(String(userId));
    if (!user) {
      res.status(404).json({ error: 'ডেমো ব্যবহারকারী পাওয়া যায়নি।' });
      return;
    }
    if (user.status === 'suspended') {
      res.status(403).json({ error: 'অ্যাকাউন্টটি স্থগিত করা হয়েছে।' });
      return;
    }
    const sessionId = db.createSession(user.id, SESSION_TTL_MS);
    setSessionCookie(res, sessionId);
    res.json({ user });
  });

  router.post('/auth/register', (req, res) => {
    const { fullName, email, phone, institution, preferredLanguage, password } = req.body || {};
    if (!fullName || !email || !phone || !password) {
      res.status(400).json({ error: 'সকল প্রয়োজনীয় তথ্য পূরণ করুন।' });
      return;
    }
    if (String(password).length < 8) {
      res.status(400).json({ error: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।' });
      return;
    }
    const existing = db.getUserWithPasswordByEmail(String(email));
    if (existing) {
      res.status(409).json({ error: 'এই ইমেইল দিয়ে ইতিমধ্যেই একটি অ্যাকাউন্ট তৈরি করা আছে।' });
      return;
    }
    // Note: Role is ALWAYS forced to 'student' inside createStudentUser; client cannot assign admin role
    const created = db.createStudentUser({
      fullName: String(fullName),
      email: String(email),
      phone: String(phone),
      institution: institution ? String(institution) : undefined,
      preferredLanguage: preferredLanguage === 'en' ? 'en' : 'bn',
      password: String(password),
    });
    const sessionId = db.createSession(created.id, SESSION_TTL_MS);
    setSessionCookie(res, sessionId);
    res.status(201).json({ user: created });
  });

  router.post('/auth/logout', (req, res) => {
    const authReq = req as AuthenticatedRequest;
    if (authReq.sessionId) {
      db.deleteSession(authReq.sessionId);
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  router.post('/auth/forgot-password', (req, res) => {
    const { email } = req.body || {};
    if (!email) {
      res.status(400).json({ error: 'ইমেইল ঠিকানা আবশ্যক।' });
      return;
    }
    const found = db.getUserWithPasswordByEmail(String(email));
    if (found) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const now = new Date();
      const exp = new Date(now.getTime() + 30 * 60 * 1000);
      db.db
        .prepare('INSERT INTO password_resets (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(`pr-${Date.now()}`, found.user.id, code, exp.toISOString(), now.toISOString());
    }
    res.json({ ok: true, message: 'পাসওয়ার্ড রিসেট নির্দেশনা প্রস্তুত করা হয়েছে।' });
  });

  router.post('/auth/reset-password', (req, res) => {
    const { token, password } = req.body || {};
    if (!token || !password || String(password).length < 8) {
      res.status(400).json({ error: 'সঠিক যাচাইকরণ কোড এবং কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড দিন।' });
      return;
    }
    const row = db.db
      .prepare('SELECT * FROM password_resets WHERE token = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1')
      .get(String(token)) as Record<string, unknown> | undefined;

    if (row && new Date(String(row.expires_at)).getTime() > Date.now()) {
      db.db
        .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        .run(hashPassword(String(password)), String(row.user_id));
      db.db
        .prepare('UPDATE password_resets SET used_at = ? WHERE id = ?')
        .run(new Date().toISOString(), String(row.id));
    }
    res.json({ ok: true });
  });

  router.patch('/users/me', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { fullName, phone, institution, preferredLanguage } = req.body || {};
    if (!fullName || !phone) {
      res.status(400).json({ error: 'নাম এবং মোবাইল নম্বর আবশ্যক।' });
      return;
    }
    const updated = db.updateUserProfile(authReq.currentUser!.id, {
      fullName: String(fullName),
      phone: String(phone),
      institution: institution ? String(institution) : undefined,
      preferredLanguage: preferredLanguage === 'en' ? 'en' : 'bn',
    });
    res.json({ user: updated });
  });

  // --- Public Site & Academic Catalogue ---
  router.get('/public/site-data', (_req, res) => {
    const catalogue = db.getAcademicCatalogue();
    const cms = db.getPublicCmsData();
    const plans = db.listPlans();
    const paymentMethods = db.listPaymentMethods();
    res.json({
      siteSettings: cms.siteSettings,
      classes: catalogue.classes.filter((c) => c.isActive),
      subjects: catalogue.subjects.filter((s) => s.isActive),
      plans: plans.filter((p) => p.isActive),
      faqs: cms.faqs.filter((f) => f.isPublished),
      notices: cms.notices.filter((n) => n.isPublished),
      paymentMethods: paymentMethods.filter((pm) => pm.isActive),
      questionTypes: catalogue.questionTypes.filter((qt) => qt.isActive),
    });
  });

  router.get('/academic', (_req, res) => {
    res.json(db.getAcademicCatalogue());
  });

  router.post('/contact', (req, res) => {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !subject || !message) {
      res.status(400).json({ error: 'সকল ঘর সঠিকভাবে পূরণ করুন।' });
      return;
    }
    const created = db.addContactMessage({
      name: String(name),
      email: String(email),
      subject: String(subject),
      message: String(message),
    });
    res.status(201).json({ message: created });
  });

  // --- Access-Controlled & Paginated Question Bank ---
  router.get('/questions', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.currentUser!;
    const allSubs = db.listSubscriptions(user.id);
    const permitted = getUserPermittedClassIds(allSubs, user.id);

    const {
      classId = 'all',
      groupId = 'all',
      subjectId = 'all',
      chapterId = 'all',
      topicId = 'all',
      typeCode = 'all',
      difficulty = 'all',
      marks = 'all',
      search = '',
      page = '1',
      pageSize = '20',
    } = req.query as Record<string, string>;

    if (classId !== 'all' && user.role !== 'admin' && !permitted.includes(classId)) {
      res.status(403).json({
        error: 'নির্বাচিত শ্রেণির প্রশ্নব্যাংক দেখতে সক্রিয় সাবস্ক্রিপশন প্রয়োজন।',
        items: [],
        total: 0,
        page: 1,
        pageSize: Number(pageSize) || 20,
        totalPages: 0,
      });
      return;
    }

    const allQuestions = db.listAllQuestions();
    const searchLower = search.trim().toLowerCase();

    const filtered = allQuestions.filter((q) => {
      if (user.role !== 'admin') {
        if (q.status !== 'published') return false;
        if (!permitted.includes(q.classId)) return false;
      }
      if (classId !== 'all' && q.classId !== classId) return false;
      if (groupId !== 'all' && q.groupId !== groupId) return false;
      if (subjectId !== 'all' && q.subjectId !== subjectId) return false;
      if (chapterId !== 'all' && q.chapterId !== chapterId) return false;
      if (topicId !== 'all' && q.topicId !== topicId) return false;
      if (typeCode !== 'all' && q.questionTypeCode !== typeCode) return false;
      if (difficulty !== 'all' && q.difficulty !== difficulty) return false;
      if (marks !== 'all' && String(q.marks) !== marks) return false;
      if (searchLower) {
        const hay = `${q.prompt} ${q.stimulus || ''} ${q.correctAnswerText || ''}`.toLowerCase();
        if (!hay.includes(searchLower)) return false;
      }
      return true;
    });

    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / ps));
    const sliced = filtered.slice((p - 1) * ps, p * ps);

    res.json({
      items: sliced,
      total,
      page: p,
      pageSize: ps,
      totalPages,
    });
  });

  router.get('/questions/:questionId', (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.currentUser;
    const question = db.getQuestionById(String(req.params.questionId));
    if (!question) {
      res.status(404).json({ error: 'প্রশ্নটি পাওয়া যায়নি।' });
      return;
    }
    const subs = user ? db.listSubscriptions(user.id) : [];
    const hasAccess = canUserAccessQuestion(question, subs, user?.id, user?.role);
    const sanitized = sanitizeQuestionForUser(question, subs, user?.id, user?.role);
    res.json({ question: sanitized, hasAccess });
  });

  // --- Favorites & Saved Questions ---
  router.get('/collections', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    res.json(db.getUserFavoritesAndSaved(authReq.currentUser!.id));
  });

  router.post('/favorites/:questionId/toggle', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.currentUser!;
    const questionId = String(req.params.questionId);
    const question = db.getQuestionById(questionId);
    const subs = db.listSubscriptions(user.id);
    if (!question || !canUserAccessQuestion(question, subs, user.id, user.role)) {
      res.status(403).json({ error: 'এই শ্রেণির জন্য সক্রিয় সাবস্ক্রিপশন প্রয়োজন।' });
      return;
    }
    const favoriteIds = db.toggleFavorite(user.id, questionId);
    res.json({ favoriteIds });
  });

  router.post('/saved/:questionId/toggle', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.currentUser!;
    const questionId = String(req.params.questionId);
    const question = db.getQuestionById(questionId);
    const subs = db.listSubscriptions(user.id);
    if (!question || !canUserAccessQuestion(question, subs, user.id, user.role)) {
      res.status(403).json({ error: 'এই শ্রেণির জন্য সক্রিয় সাবস্ক্রিপশন প্রয়োজন।' });
      return;
    }
    const savedIds = db.toggleSaved(user.id, questionId);
    res.json({ savedIds });
  });

  // --- Custom Question Paper Generator & Saved Papers ---
  router.post('/papers/generate', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.currentUser!;
    const body = req.body || {};

    const classId = String(body.classId || '');
    const subjectId = String(body.subjectId || '');
    const subs = db.listSubscriptions(user.id);

    if (!canUserAccessClass(subs, user.id, classId, user.role)) {
      res.status(403).json({
        error: 'প্রশ্নপত্র তৈরি করতে নির্বাচিত শ্রেণির সক্রিয় সাবস্ক্রিপশন প্রয়োজন।',
      });
      return;
    }

    try {
      const genInput: GeneratePaperRequestInput = {
        classId,
        groupId: body.groupId || null,
        subjectId,
        chapterIds: Array.isArray(body.chapterIds) ? body.chapterIds : undefined,
        topicIds: Array.isArray(body.topicIds) ? body.topicIds : undefined,
        difficulty: body.difficulty || 'all',
        marksFilter: body.marksFilter || 'all',
        search: body.search || '',
        requirements: Array.isArray(body.requirements) ? body.requirements : undefined,
        selectedQuestionIds: Array.isArray(body.selectedQuestionIds) ? body.selectedQuestionIds : undefined,
        customMarksByQuestionId: body.customMarksByQuestionId || undefined,
        shuffle: Boolean(body.shuffle),
      };

      const generated = generatePaperQuestionsFromPool({
        allQuestions: db.listAllQuestions(),
        subscriptions: subs,
        userId: user.id,
        role: user.role,
        input: genInput,
      });

      const saved = db.savePaperRecord(user, {
        title: String(body.title || 'কাস্টম প্রশ্নপত্র').trim(),
        examName: String(body.examName || 'মূল্যায়ন পরীক্ষা').trim(),
        classId,
        subjectId,
        schoolName: String(body.schoolName || user.institution || 'মডেল একাডেমি').trim(),
        schoolLogoDataUrl: body.schoolLogoDataUrl,
        examDate: String(body.examDate || new Date().toISOString().slice(0, 10)),
        durationMinutes: Math.max(10, Math.min(300, Number(body.durationMinutes) || 60)),
        instructions: String(body.instructions || 'সকল প্রশ্নের স্পষ্ট উত্তর দাও।'),
        includeStudentFields: body.includeStudentFields !== false,
        includeHeaderFooter: body.includeHeaderFooter !== false,
        includePageNumbers: body.includePageNumbers !== false,
        items: generated.items,
      });

      res.status(201).json({
        paper: saved,
        totalMarks: generated.totalMarks,
        questionCount: generated.items.length,
      });
    } catch (err) {
      if (err instanceof PaperGenerationError) {
        res.status(err.statusCode).json({
          error: err.message,
          shortages: err.shortages || [],
        });
        return;
      }
      res.status(400).json({ error: err instanceof Error ? err.message : 'প্রশ্নপত্র তৈরি করা যায়নি।' });
    }
  });

  router.get('/papers', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    res.json({ papers: db.listPapers(authReq.currentUser!.id) });
  });

  router.get('/papers/:paperId', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.currentUser!;
    const paper = db.getPaperById(String(req.params.paperId));
    if (!paper) {
      res.status(404).json({ error: 'প্রশ্নপত্রটি পাওয়া যায়নি।' });
      return;
    }
    if (paper.userId !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'অনুমতি নেই: আপনি এই প্রশ্নপত্রের স্বত্বাধিকারী নন।' });
      return;
    }
    res.json({ paper });
  });

  router.post('/papers', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.currentUser!;
    const body = req.body as Omit<QuestionPaper, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string };
    const subs = db.listSubscriptions(user.id);

    if (
      Array.isArray(body.items) &&
      body.items.length > 0 &&
      !canUserAddQuestionToPaper(subs, user.id, user.role, body.classId)
    ) {
      res.status(403).json({
        error: 'প্রশ্নব্যাংকের প্রশ্ন দিয়ে নতুন প্রশ্নপত্র তৈরি করতে এই শ্রেণির সক্রিয় সাবস্ক্রিপশন প্রয়োজন।',
      });
      return;
    }

    // Re-verify any referenced sourceQuestionIds against backend Question Bank & build authoritative snapshots
    const validatedItems: QuestionPaperItem[] = (body.items || []).map((item, idx) => {
      if (item.sourceQuestionId) {
        const masterQ = db.getQuestionById(item.sourceQuestionId);
        if (masterQ && canUserAccessQuestion(masterQ, subs, user.id, user.role)) {
          return buildImmutableQuestionSnapshot(masterQ, idx, item.customMarks);
        }
      }
      return { ...item, orderIndex: idx };
    });

    const created = db.savePaperRecord(user, { ...body, items: validatedItems });
    res.status(201).json({ paper: created });
  });

  router.put('/papers/:paperId', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.currentUser!;
    const paperId = String(req.params.paperId);
    const existing = db.getPaperById(paperId);
    if (!existing) {
      res.status(404).json({ error: 'প্রশ্নপত্রটি পাওয়া যায়নি।' });
      return;
    }
    if (existing.userId !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'অনুমতি নেই।' });
      return;
    }

    const body = req.body as Omit<QuestionPaper, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
    const subs = db.listSubscriptions(user.id);
    const existingSourceIds = new Set(existing.items.map((i) => i.sourceQuestionId));
    const addedNewQuestion = (body.items || []).some(
      (item) => item.sourceQuestionId && !existingSourceIds.has(item.sourceQuestionId)
    );

    if (addedNewQuestion && !canUserAddQuestionToPaper(subs, user.id, user.role, body.classId)) {
      res.status(403).json({
        error: 'মেয়াদোত্তীর্ণ বা সাবস্ক্রিপশনবিহীন ব্যবহারকারী নতুন প্রশ্ন যুক্ত করতে পারবেন না।',
      });
      return;
    }

    const existingMap = new Map(existing.items.map((i) => [i.sourceQuestionId, i]));
    const normalizedItems: QuestionPaperItem[] = (body.items || []).map((item, idx) => {
      // Preserve existing snapshot if already in paper; fetch from master only if newly added with active access
      if (!existingSourceIds.has(item.sourceQuestionId) && item.sourceQuestionId) {
        const masterQ = db.getQuestionById(item.sourceQuestionId);
        if (!masterQ || !canUserAccessQuestion(masterQ, subs, user.id, user.role)) {
          throw new Error('প্রশ্নব্যাংক থেকে প্রশ্ন যুক্ত করার অনুমতি নেই।');
        }
        return buildImmutableQuestionSnapshot(masterQ, idx, item.customMarks);
      }
      const prev = existingMap.get(item.sourceQuestionId);
      return {
        ...item,
        snapshot: prev ? prev.snapshot : item.snapshot,
        orderIndex: idx,
      };
    });

    try {
      const updated = db.savePaperRecord(user, { ...body, id: paperId, items: normalizedItems });
      res.json({ paper: updated });
    } catch (err) {
      res.status(403).json({ error: err instanceof Error ? err.message : 'হালনাগাদ করা যায়নি।' });
    }
  });

  router.delete('/papers/:paperId', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.currentUser!;
    const paper = db.getPaperById(String(req.params.paperId));
    if (!paper) {
      res.status(404).json({ error: 'প্রশ্নপত্রটি পাওয়া যায়নি।' });
      return;
    }
    if (paper.userId !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'অনুমতি নেই।' });
      return;
    }
    db.deletePaper(paper.id);
    res.json({ ok: true });
  });

  router.post('/papers/:paperId/export', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.currentUser!;
    const paper = db.getPaperById(String(req.params.paperId));
    if (!paper) {
      res.status(404).json({ error: 'প্রশ্নপত্রটি পাওয়া যায়নি।' });
      return;
    }
    if (paper.userId !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'অনুমতি নেই: আপনি এই প্রশ্নপত্রের স্বত্বাধিকারী নন।' });
      return;
    }

    const format = req.body?.format === 'docx' ? 'docx' : 'pdf';
    const includedAnswerKey = Boolean(req.body?.includeAnswerKey);

    // Prepare sanitized student/answer-key payload from immutable snapshot
    const exportItems = paper.items.map((item) => {
      const snap = { ...item.snapshot };
      if (!includedAnswerKey) {
        delete snap.correctAnswerText;
        delete snap.explanation;
        if (snap.options) {
          snap.options = snap.options.map((o) => ({ ...o, isCorrect: false }));
        }
        if (snap.subParts) {
          snap.subParts = snap.subParts.map((sp) => ({ ...sp, answer: '' }));
        }
      }
      return { ...item, snapshot: snap };
    });

    const record = db.recordExport(user.id, paper.id, paper.title, format, includedAnswerKey);
    res.status(201).json({
      record,
      exportPaper: { ...paper, items: exportItems },
    });
  });

  router.get('/exports', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    res.json({ exports: db.listExports(authReq.currentUser!.id) });
  });

  // --- Subscriptions & Manual Payments ---
  router.get('/subscriptions', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    res.json({ subscriptions: db.listSubscriptions(authReq.currentUser!.id) });
  });

  router.get('/subscriptions/permitted-classes', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const subs = db.listSubscriptions(authReq.currentUser!.id);
    const permitted = getUserPermittedClassIds(subs, authReq.currentUser!.id);
    res.json({ permittedClassIds: permitted });
  });

  router.get('/payments', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    res.json({ payments: db.listPayments(authReq.currentUser!.id) });
  });

  router.post('/payments', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.currentUser!;
    try {
      const payment = db.submitManualPayment(user, {
        planId: String(req.body?.planId || ''),
        paymentMethodId: String(req.body?.paymentMethodId || ''),
        senderNumber: String(req.body?.senderNumber || ''),
        transactionRef: String(req.body?.transactionRef || ''),
        submittedAmountBdt: Number(req.body?.submittedAmountBdt || 0),
        receiptDataUrl: req.body?.receiptDataUrl,
        receiptFileName: req.body?.receiptFileName,
      });
      res.status(201).json({ payment });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'পেমেন্ট জমা দেওয়া যায়নি।' });
    }
  });

  // --- Private Storage Upload & Signed Short-Lived Downloads ---
  router.post('/storage/upload', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.currentUser!;
    const bucket = String(req.body?.bucket || '') as StorageBucket;
    const allowedBuckets: StorageBucket[] = [
      'question-images',
      'payment-receipts',
      'school-logos',
      'profile-images',
      'exported-papers',
    ];
    if (!allowedBuckets.includes(bucket)) {
      res.status(400).json({ error: 'অবৈধ স্টোরেজ বাকেট।' });
      return;
    }
    if (bucket === 'question-images' && user.role !== 'admin') {
      res.status(403).json({ error: 'প্রশ্নের ছবি কেবল অ্যাডমিন আপলোড করতে পারবেন।' });
      return;
    }

    const fileName = String(req.body?.fileName || 'upload.bin');
    const dataUrl = String(req.body?.dataUrl || '');
    if (!dataUrl) {
      res.status(400).json({ error: 'ফাইল কনটেন্ট পাওয়া যায়নি।' });
      return;
    }

    const meta = db.saveBase64ToStorage(
      bucket,
      user.id,
      fileName,
      dataUrl,
      req.body?.classId ? String(req.body.classId) : null
    );
    const token = signStorageToken({
      objectId: meta.id,
      userId: user.id,
      expiresAtMs: Date.now() + 15 * 60 * 1000,
    });
    res.status(201).json({
      object: meta,
      signedUrl: `/api/storage/file/${token}`,
    });
  });

  router.get('/storage/signed-url/:objectId', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.currentUser!;
    const meta = db.getStorageObject(String(req.params.objectId));
    if (!meta) {
      res.status(404).json({ error: 'ফাইলটি পাওয়া যায়নি।' });
      return;
    }

    if (user.role !== 'admin') {
      if (meta.bucket === 'question-images') {
        const subs = db.listSubscriptions(user.id);
        if (!meta.classId || !canUserAccessClass(subs, user.id, meta.classId, user.role)) {
          res.status(403).json({ error: 'এই প্রশ্ন-চিত্র দেখার অনুমতি নেই।' });
          return;
        }
      } else if (meta.ownerUserId !== user.id) {
        res.status(403).json({ error: 'অন্য ব্যবহারকারীর ব্যক্তিগত ফাইলে প্রবেশের অনুমতি নেই।' });
        return;
      }
    }

    const token = signStorageToken({
      objectId: meta.id,
      userId: user.id,
      expiresAtMs: Date.now() + 10 * 60 * 1000,
    });
    res.json({ signedUrl: `/api/storage/file/${token}`, expiresInSeconds: 600 });
  });

  router.get('/storage/file/:token', (req, res) => {
    const payload = verifyStorageToken(String(req.params.token));
    if (!payload) {
      res.status(403).json({ error: 'ডাউনলোড টোকেনটি অবৈধ বা মেয়াদোত্তীর্ণ।' });
      return;
    }
    const meta = db.getStorageObject(payload.objectId);
    if (!meta) {
      res.status(404).json({ error: 'ফাইলটি পাওয়া যায়নি।' });
      return;
    }
    const fullPath = path.join(db.storageRoot, meta.diskPath);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'ফাইলটি স্টোরেজে নেই।' });
      return;
    }
    res.setHeader('Content-Type', meta.mimeType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(fullPath);
  });

  // --- Admin Operations ---
  router.get('/admin/snapshot', requireAdmin, (_req, res) => {
    res.json(db.getAdminSnapshot());
  });

  router.post('/admin/academic/classes', requireAdmin, (req, res) => {
    const created = db.addClass(req.body as Omit<AcademicClass, 'id'>);
    res.status(201).json(created);
  });

  router.post('/admin/academic/groups', requireAdmin, (req, res) => {
    const created = db.addGroup(req.body as Omit<AcademicGroup, 'id'>);
    res.status(201).json(created);
  });

  router.post('/admin/academic/subjects', requireAdmin, (req, res) => {
    const created = db.addSubject(req.body as Omit<Subject, 'id'>);
    res.status(201).json(created);
  });

  router.post('/admin/academic/chapters', requireAdmin, (req, res) => {
    const created = db.addChapter(req.body as Omit<Chapter, 'id'>);
    res.status(201).json(created);
  });

  router.post('/admin/academic/topics', requireAdmin, (req, res) => {
    const created = db.addTopic(req.body as Omit<Topic, 'id'>);
    res.status(201).json(created);
  });

  router.post('/admin/questions', requireAdmin, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const saved = db.saveQuestion(
      authReq.currentUser!,
      req.body as Omit<Question, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    );
    res.status(201).json(saved);
  });

  router.put('/admin/questions/:questionId', requireAdmin, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const saved = db.saveQuestion(authReq.currentUser!, {
      ...(req.body as Omit<Question, 'id' | 'createdAt' | 'updatedAt'>),
      id: String(req.params.questionId),
    });
    res.json(saved);
  });

  router.delete('/admin/questions/:questionId', requireAdmin, (req, res) => {
    db.deleteQuestion(String(req.params.questionId));
    res.json({ ok: true });
  });

  router.post('/admin/questions/bulk', requireAdmin, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const importedCount = db.bulkImportQuestions(authReq.currentUser!, items);
    res.status(201).json({ importedCount });
  });

  router.post('/admin/plans', requireAdmin, (req, res) => {
    const saved = db.savePlan(req.body as Omit<Plan, 'id'> & { id?: string });
    res.status(201).json(saved);
  });

  router.put('/admin/plans/:planId', requireAdmin, (req, res) => {
    const saved = db.savePlan({ ...(req.body as Omit<Plan, 'id'>), id: String(req.params.planId) });
    res.json(saved);
  });

  router.post('/admin/payment-methods', requireAdmin, (req, res) => {
    const saved = db.savePaymentMethod(req.body as Omit<PaymentMethod, 'id'> & { id?: string });
    res.status(201).json(saved);
  });

  router.put('/admin/payment-methods/:methodId', requireAdmin, (req, res) => {
    const saved = db.savePaymentMethod({
      ...(req.body as Omit<PaymentMethod, 'id'>),
      id: String(req.params.methodId),
    });
    res.json(saved);
  });

  router.post('/admin/payments/:paymentId/review', requireAdmin, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const decision = req.body?.decision === 'approved' ? 'approved' : 'rejected';
    const reviewNote = String(req.body?.reviewNote || '');
    try {
      const result = db.reviewPaymentAtomic(
        authReq.currentUser!,
        String(req.params.paymentId),
        decision,
        reviewNote
      );
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'পেমেন্ট যাচাই ব্যর্থ হয়েছে।' });
    }
  });

  router.post('/admin/subscriptions/activate', requireAdmin, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const sub = db.manualActivateSubscription(
      authReq.currentUser!,
      String(req.body?.userId || ''),
      String(req.body?.planId || '')
    );
    res.status(201).json(sub);
  });

  router.patch('/admin/subscriptions/:subscriptionId/status', requireAdmin, (req, res) => {
    db.updateSubscriptionStatus(
      String(req.params.subscriptionId),
      String(req.body?.status) as Subscription['status']
    );
    res.json({ ok: true });
  });

  router.patch('/admin/users/:userId/status', requireAdmin, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const targetId = String(req.params.userId);
    if (targetId === authReq.currentUser!.id) {
      res.status(400).json({ error: 'আপনি নিজের অ্যাডমিন অ্যাকাউন্ট স্থগিত করতে পারবেন না।' });
      return;
    }
    db.updateUserStatus(targetId, req.body?.status === 'suspended' ? 'suspended' : 'active');
    res.json({ ok: true });
  });

  router.patch('/admin/users/:userId/role', requireAdmin, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const targetId = String(req.params.userId);
    const nextRole = req.body?.role === 'admin' ? 'admin' : 'student';
    db.updateUserRole(authReq.currentUser!.id, targetId, nextRole);
    res.json({ ok: true });
  });

  router.put('/admin/site-settings', requireAdmin, (req, res) => {
    const updated = db.updateSiteSettings(req.body as SiteSettings);
    res.json(updated);
  });

  router.post('/admin/notices', requireAdmin, (req, res) => {
    const saved = db.saveNotice(req.body as Omit<Notice, 'id' | 'createdAt'> & { id?: string });
    res.status(201).json(saved);
  });

  router.post('/admin/faqs', requireAdmin, (req, res) => {
    const saved = db.saveFaq(req.body as Omit<FaqItem, 'id'> & { id?: string });
    res.status(201).json(saved);
  });

  router.patch('/admin/contact-messages/:messageId/resolve', requireAdmin, (req, res) => {
    db.resolveContactMessage(String(req.params.messageId));
    res.json({ ok: true });
  });

  router.get('/admin/activity-logs', requireAdmin, (_req, res) => {
    res.json({ logs: db.listActivityLogs() });
  });

  router.get('/admin/reports', requireAdmin, (_req, res) => {
    const snap = db.getAdminSnapshot();
    const approvedRevenue = snap.payments
      .filter((p) => p.status === 'approved')
      .reduce((sum, p) => sum + p.expectedAmountBdt, 0);
    res.json({
      totalUsers: snap.users.length,
      totalQuestions: snap.questions.length,
      publishedQuestions: snap.questions.filter((q) => q.status === 'published').length,
      totalPapers: snap.papers.length,
      totalExports: snap.exports.length,
      pendingPayments: snap.payments.filter((p) => p.status === 'pending').length,
      approvedRevenueBdt: approvedRevenue,
    });
  });

  router.post('/demo/reset', (req, res) => {
    const authReq = req as AuthenticatedRequest;
    // Allow admin or prototype reset
    if (authReq.sessionId) {
      db.deleteSession(authReq.sessionId);
    }
    db.resetToSeed();
    res.json({ ok: true });
  });

  return router;
}
