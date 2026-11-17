import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createSeedDatabase, type AppDatabaseState } from '../src/data/seedData.ts';
import { calculateNewSubscriptionWindow, isDuplicateTransactionRef } from '../src/lib/rules.ts';
import type {
  AcademicClass,
  AcademicGroup,
  ActivityLog,
  Chapter,
  ContactMessage,
  ExportRecord,
  FaqItem,
  Notice,
  Payment,
  PaymentMethod,
  Plan,
  Question,
  QuestionPaper,
  QuestionPaperItem,
  QuestionType,
  SiteSettings,
  Subject,
  Subscription,
  Topic,
  UserProfile,
  UserRole,
} from '../src/types/domain.ts';
import { generateUid, hashPassword } from './security.ts';

export type StorageBucket =
  | 'question-images'
  | 'payment-receipts'
  | 'school-logos'
  | 'profile-images'
  | 'exported-papers';

export interface StoredFileMeta {
  id: string;
  bucket: StorageBucket;
  ownerUserId: string;
  classId?: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  diskPath: string;
  createdAt: string;
}

export interface PaymentReviewRecord {
  id: string;
  paymentId: string;
  adminUserId: string;
  decision: 'approved' | 'rejected';
  reviewNote: string;
  createdAt: string;
}

const BUCKETS: StorageBucket[] = [
  'question-images',
  'payment-receipts',
  'school-logos',
  'profile-images',
  'exported-papers',
];

export class QuestionBankDatabase {
  public readonly db: DatabaseSync;
  public readonly storageRoot: string;

  constructor(dbPath?: string, storageRoot?: string) {
    const resolvedDbPath =
      dbPath || path.resolve(process.cwd(), 'data', 'questionbank.sqlite');
    const resolvedStorage =
      storageRoot || path.resolve(process.cwd(), 'data', 'storage');

    if (resolvedDbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });
    }
    fs.mkdirSync(resolvedStorage, { recursive: true });
    for (const bucket of BUCKETS) {
      fs.mkdirSync(path.join(resolvedStorage, bucket), { recursive: true });
    }

    this.storageRoot = resolvedStorage;
    this.db = new DatabaseSync(resolvedDbPath);
    this.db.exec('PRAGMA foreign_keys = ON;');
    if (resolvedDbPath !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL;');
    }

    this.migrate();
    this.seedIfEmpty();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        phone TEXT NOT NULL DEFAULT '',
        institution TEXT,
        password_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
        email_verified INTEGER NOT NULL DEFAULT 1,
        preferred_language TEXT NOT NULL DEFAULT 'bn' CHECK (preferred_language IN ('en', 'bn')),
        avatar_object_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_roles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
        assigned_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_bn TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        level_order INTEGER NOT NULL,
        has_groups INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        name_bn TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        name_bn TEXT NOT NULL,
        code TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS chapters (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        chapter_number INTEGER NOT NULL,
        name TEXT NOT NULL,
        name_bn TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS topics (
        id TEXT PRIMARY KEY,
        chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        name_bn TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS question_types (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        name_bn TEXT NOT NULL,
        default_marks INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS difficulty_levels (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_bn TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
        group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
        subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
        chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE RESTRICT,
        topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
        question_type_code TEXT NOT NULL,
        language TEXT NOT NULL CHECK (language IN ('en', 'bn')),
        difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
        marks REAL NOT NULL CHECK (marks > 0),
        status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
        title TEXT,
        prompt TEXT NOT NULL,
        equation_latex TEXT,
        image_url TEXT,
        image_caption TEXT,
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS question_stimuli (
        question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
        stimulus TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS question_options (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        text TEXT NOT NULL,
        is_correct INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS question_answers (
        question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
        correct_answer_text TEXT,
        explanation TEXT
      );

      CREATE TABLE IF NOT EXISTS question_subparts (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        prompt TEXT NOT NULL,
        marks REAL NOT NULL,
        answer TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS question_tags (
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        tag TEXT NOT NULL,
        PRIMARY KEY (question_id, tag)
      );

      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_bn TEXT NOT NULL,
        audience_label TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        price_bdt REAL NOT NULL,
        original_price_bdt REAL,
        currency TEXT NOT NULL DEFAULT 'BDT',
        duration_days INTEGER NOT NULL,
        features_json TEXT NOT NULL DEFAULT '[]',
        is_active INTEGER NOT NULL DEFAULT 1,
        display_order INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS plan_classes (
        plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        PRIMARY KEY (plan_id, class_id)
      );

      CREATE TABLE IF NOT EXISTS payment_methods (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        account_number TEXT NOT NULL,
        account_type TEXT NOT NULL,
        instructions TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
        plan_name_snapshot TEXT NOT NULL,
        expected_amount_bdt REAL NOT NULL,
        submitted_amount_bdt REAL NOT NULL,
        payment_method_id TEXT NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
        payment_method_name_snapshot TEXT NOT NULL,
        sender_number TEXT NOT NULL,
        transaction_ref TEXT NOT NULL,
        receipt_data_url TEXT,
        receipt_file_name TEXT,
        receipt_object_id TEXT,
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
        reviewed_by_admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TEXT,
        review_note TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_reviews (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        admin_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
        review_note TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
        plan_name_snapshot TEXT NOT NULL,
        price_snapshot_bdt REAL NOT NULL,
        duration_days_snapshot INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
        starts_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
        activated_by_admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS subscription_classes (
        subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
        PRIMARY KEY (subscription_id, class_id)
      );

      CREATE TABLE IF NOT EXISTS favorites (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        PRIMARY KEY (user_id, question_id)
      );

      CREATE TABLE IF NOT EXISTS saved_questions (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        PRIMARY KEY (user_id, question_id)
      );

      CREATE TABLE IF NOT EXISTS papers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        exam_name TEXT NOT NULL,
        class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
        subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
        school_name TEXT NOT NULL,
        school_logo_data_url TEXT,
        exam_date TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        instructions TEXT NOT NULL,
        total_marks REAL NOT NULL DEFAULT 0,
        include_student_fields INTEGER NOT NULL DEFAULT 1,
        include_header_footer INTEGER NOT NULL DEFAULT 1,
        include_page_numbers INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS paper_questions (
        id TEXT PRIMARY KEY,
        paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
        source_question_id TEXT,
        question_order INTEGER NOT NULL,
        custom_marks REAL NOT NULL,
        question_snapshot_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS export_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
        paper_title TEXT NOT NULL,
        format TEXT NOT NULL CHECK (format IN ('pdf', 'docx')),
        included_answer_key INTEGER NOT NULL DEFAULT 0,
        storage_object_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notices (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        is_published INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS faqs (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT NOT NULL,
        display_order INTEGER NOT NULL,
        is_published INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS contact_messages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('unread', 'resolved')),
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS site_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        brand_name TEXT NOT NULL,
        hero_headline TEXT NOT NULL,
        hero_subheadline TEXT NOT NULL,
        support_email TEXT NOT NULL,
        support_phone TEXT NOT NULL,
        office_address TEXT NOT NULL,
        renewal_rule_notice TEXT NOT NULL,
        demo_disclaimer TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        actor_user_id TEXT,
        actor_name TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        details TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS storage_objects (
        id TEXT PRIMARY KEY,
        bucket TEXT NOT NULL,
        owner_user_id TEXT NOT NULL,
        class_id TEXT,
        file_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        disk_path TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_questions_lookup
        ON questions (status, class_id, subject_id, chapter_id, question_type_code, difficulty);
      CREATE INDEX IF NOT EXISTS idx_subs_user_status
        ON subscriptions (user_id, status, expires_at);
      CREATE INDEX IF NOT EXISTS idx_payments_user_status
        ON payments (user_id, status, created_at);
      CREATE INDEX IF NOT EXISTS idx_papers_user
        ON papers (user_id, updated_at);
    `);
  }

  public seedIfEmpty(): void {
    const countRow = this.db.prepare('SELECT COUNT(*) AS cnt FROM classes').get() as { cnt: number };
    if (countRow && countRow.cnt > 0) {
      return;
    }
    this.seedFromState(createSeedDatabase());
  }

  public resetToSeed(): void {
    const tables = [
      'export_history',
      'paper_questions',
      'papers',
      'favorites',
      'saved_questions',
      'subscription_classes',
      'subscriptions',
      'payment_reviews',
      'payments',
      'payment_methods',
      'plan_classes',
      'plans',
      'question_tags',
      'question_subparts',
      'question_answers',
      'question_options',
      'question_stimuli',
      'questions',
      'difficulty_levels',
      'question_types',
      'topics',
      'chapters',
      'subjects',
      'groups',
      'classes',
      'notices',
      'faqs',
      'contact_messages',
      'site_settings',
      'activity_logs',
      'storage_objects',
      'password_resets',
      'sessions',
      'user_roles',
      'users',
    ];
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      for (const table of tables) {
        this.db.exec(`DELETE FROM ${table};`);
      }
      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
    this.seedFromState(createSeedDatabase());
  }

  private seedFromState(seed: AppDatabaseState): void {
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      const diffRows = [
        { code: 'easy', name: 'Easy', name_bn: 'সহজ' },
        { code: 'medium', name: 'Medium', name_bn: 'মধ্যম' },
        { code: 'hard', name: 'Hard', name_bn: 'কঠিন' },
      ];
      const insDiff = this.db.prepare(
        'INSERT OR IGNORE INTO difficulty_levels (code, name, name_bn) VALUES (?, ?, ?)'
      );
      for (const d of diffRows) insDiff.run(d.code, d.name, d.name_bn);

      const insUser = this.db.prepare(
        `INSERT INTO users (id, full_name, email, phone, institution, password_hash, status, email_verified, preferred_language, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const insRole = this.db.prepare(
        'INSERT INTO user_roles (user_id, role, assigned_at) VALUES (?, ?, ?)'
      );
      for (const u of seed.users) {
        const plain = seed.passwordsByUserId[u.id] || 'demo1234';
        insUser.run(
          u.id,
          u.fullName,
          u.email,
          u.phone,
          u.institution || null,
          hashPassword(plain),
          u.status,
          u.emailVerified ? 1 : 0,
          u.preferredLanguage,
          u.createdAt
        );
        insRole.run(u.id, u.role, u.createdAt);
      }

      const insCls = this.db.prepare(
        'INSERT INTO classes (id, name, name_bn, slug, level_order, has_groups, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      for (const c of seed.classes) {
        insCls.run(c.id, c.name, c.nameBn, c.slug, c.levelOrder, c.hasGroups ? 1 : 0, c.isActive ? 1 : 0);
      }

      const insGrp = this.db.prepare(
        'INSERT INTO groups (id, class_id, name, name_bn, is_active) VALUES (?, ?, ?, ?, ?)'
      );
      for (const g of seed.groups) {
        insGrp.run(g.id, g.classId, g.name, g.nameBn, g.isActive ? 1 : 0);
      }

      const insSubj = this.db.prepare(
        'INSERT INTO subjects (id, class_id, group_id, name, name_bn, code, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      for (const s of seed.subjects) {
        insSubj.run(s.id, s.classId, s.groupId || null, s.name, s.nameBn, s.code, s.isActive ? 1 : 0);
      }

      const insCh = this.db.prepare(
        'INSERT INTO chapters (id, subject_id, chapter_number, name, name_bn, is_active) VALUES (?, ?, ?, ?, ?, ?)'
      );
      for (const ch of seed.chapters) {
        insCh.run(ch.id, ch.subjectId, ch.chapterNumber, ch.name, ch.nameBn, ch.isActive ? 1 : 0);
      }

      const insTop = this.db.prepare(
        'INSERT INTO topics (id, chapter_id, name, name_bn, is_active) VALUES (?, ?, ?, ?, ?)'
      );
      for (const t of seed.topics) {
        insTop.run(t.id, t.chapterId, t.name, t.nameBn, t.isActive ? 1 : 0);
      }

      const insQt = this.db.prepare(
        'INSERT INTO question_types (id, code, name, name_bn, default_marks, is_active) VALUES (?, ?, ?, ?, ?, ?)'
      );
      for (const qt of seed.questionTypes) {
        insQt.run(qt.id, qt.code, qt.name, qt.nameBn, qt.defaultMarks, qt.isActive ? 1 : 0);
      }

      for (const q of seed.questions) {
        this.insertQuestionInternal(q, null);
      }

      const insPlan = this.db.prepare(
        `INSERT INTO plans (id, name, name_bn, audience_label, description, price_bdt, original_price_bdt, currency, duration_days, features_json, is_active, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const insPlanCls = this.db.prepare(
        'INSERT INTO plan_classes (plan_id, class_id) VALUES (?, ?)'
      );
      for (const p of seed.plans) {
        insPlan.run(
          p.id,
          p.name,
          p.nameBn,
          p.audienceLabel,
          p.description,
          p.priceBdt,
          p.originalPriceBdt ?? null,
          p.currency,
          p.durationDays,
          JSON.stringify(p.features),
          p.isActive ? 1 : 0,
          p.displayOrder
        );
        for (const cid of p.includedClassIds) {
          insPlanCls.run(p.id, cid);
        }
      }

      const insPm = this.db.prepare(
        'INSERT INTO payment_methods (id, name, account_number, account_type, instructions, is_active) VALUES (?, ?, ?, ?, ?, ?)'
      );
      for (const pm of seed.paymentMethods) {
        insPm.run(pm.id, pm.name, pm.accountNumber, pm.accountType, pm.instructions, pm.isActive ? 1 : 0);
      }

      const insPay = this.db.prepare(
        `INSERT INTO payments (
          id, user_id, plan_id, plan_name_snapshot, expected_amount_bdt, submitted_amount_bdt,
          payment_method_id, payment_method_name_snapshot, sender_number, transaction_ref,
          receipt_data_url, receipt_file_name, status, reviewed_by_admin_id, reviewed_at, review_note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const pay of seed.payments) {
        insPay.run(
          pay.id,
          pay.userId,
          pay.planId,
          pay.planNameSnapshot,
          pay.expectedAmountBdt,
          pay.submittedAmountBdt,
          pay.paymentMethodId,
          pay.paymentMethodNameSnapshot,
          pay.senderNumber,
          pay.transactionRef,
          pay.receiptDataUrl || null,
          pay.receiptFileName || null,
          pay.status,
          pay.reviewedByAdminId || null,
          pay.reviewedAt || null,
          pay.reviewNote || null,
          pay.createdAt
        );
      }

      const insSub = this.db.prepare(
        `INSERT INTO subscriptions (
          id, user_id, plan_id, plan_name_snapshot, price_snapshot_bdt, duration_days_snapshot,
          status, starts_at, expires_at, payment_id, activated_by_admin_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const insSubCls = this.db.prepare(
        'INSERT INTO subscription_classes (subscription_id, class_id) VALUES (?, ?)'
      );
      for (const s of seed.subscriptions) {
        insSub.run(
          s.id,
          s.userId,
          s.planId,
          s.planNameSnapshot,
          s.priceSnapshotBdt,
          s.durationDaysSnapshot,
          s.status,
          s.startsAt,
          s.expiresAt,
          s.paymentId || null,
          s.activatedByAdminId || null,
          s.createdAt
        );
        for (const cid of s.grantedClassIds) {
          insSubCls.run(s.id, cid);
        }
      }

      const insFav = this.db.prepare(
        'INSERT OR IGNORE INTO favorites (user_id, question_id, created_at) VALUES (?, ?, ?)'
      );
      for (const [uid, qids] of Object.entries(seed.favoritesByUserId)) {
        for (const qid of qids) insFav.run(uid, qid, new Date().toISOString());
      }

      const insSaved = this.db.prepare(
        'INSERT OR IGNORE INTO saved_questions (user_id, question_id, created_at) VALUES (?, ?, ?)'
      );
      for (const [uid, qids] of Object.entries(seed.savedByUserId)) {
        for (const qid of qids) insSaved.run(uid, qid, new Date().toISOString());
      }

      for (const paper of seed.papers) {
        this.insertPaperInternal(paper);
      }

      const insExp = this.db.prepare(
        'INSERT INTO export_history (id, user_id, paper_id, paper_title, format, included_answer_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      for (const exp of seed.exports) {
        insExp.run(exp.id, exp.userId, exp.paperId, exp.paperTitle, exp.format, exp.includedAnswerKey ? 1 : 0, exp.createdAt);
      }

      const insNot = this.db.prepare(
        'INSERT INTO notices (id, title, body, is_published, created_at) VALUES (?, ?, ?, ?, ?)'
      );
      for (const n of seed.notices) {
        insNot.run(n.id, n.title, n.body, n.isPublished ? 1 : 0, n.createdAt);
      }

      const insFaq = this.db.prepare(
        'INSERT INTO faqs (id, question, answer, category, display_order, is_published) VALUES (?, ?, ?, ?, ?, ?)'
      );
      for (const f of seed.faqs) {
        insFaq.run(f.id, f.question, f.answer, f.category, f.displayOrder, f.isPublished ? 1 : 0);
      }

      const insMsg = this.db.prepare(
        'INSERT INTO contact_messages (id, name, email, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      for (const m of seed.contactMessages) {
        insMsg.run(m.id, m.name, m.email, m.subject, m.message, m.status, m.createdAt);
      }

      const s = seed.siteSettings;
      this.db
        .prepare(
          `INSERT INTO site_settings (id, brand_name, hero_headline, hero_subheadline, support_email, support_phone, office_address, renewal_rule_notice, demo_disclaimer)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          s.brandName,
          s.heroHeadline,
          s.heroSubheadline,
          s.supportEmail,
          s.supportPhone,
          s.officeAddress,
          s.renewalRuleNotice,
          s.demoDisclaimer
        );

      const insLog = this.db.prepare(
        'INSERT INTO activity_logs (id, actor_user_id, actor_name, actor_role, action, target_type, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      for (const log of seed.activityLogs) {
        insLog.run(
          log.id,
          log.actorUserId,
          log.actorName,
          log.actorRole,
          log.action,
          log.targetType,
          log.targetId,
          log.details,
          log.createdAt
        );
      }

      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  private insertQuestionInternal(q: Question, createdBy: string | null): void {
    this.db
      .prepare(
        `INSERT INTO questions (
          id, class_id, group_id, subject_id, chapter_id, topic_id, question_type_code,
          language, difficulty, marks, status, title, prompt, equation_latex, image_url,
          image_caption, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        q.id,
        q.classId,
        q.groupId || null,
        q.subjectId,
        q.chapterId,
        q.topicId || null,
        q.questionTypeCode,
        q.language,
        q.difficulty,
        q.marks,
        q.status,
        q.title || null,
        q.prompt,
        q.equationLatex || null,
        q.imageUrl || null,
        q.imageCaption || null,
        createdBy,
        q.createdAt,
        q.updatedAt
      );

    if (q.stimulus) {
      this.db
        .prepare('INSERT INTO question_stimuli (question_id, stimulus) VALUES (?, ?)')
        .run(q.id, q.stimulus);
    }

    if (q.options && q.options.length > 0) {
      const insOpt = this.db.prepare(
        'INSERT INTO question_options (id, question_id, label, text, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
      );
      q.options.forEach((opt, idx) => {
        insOpt.run(opt.id, q.id, opt.label, opt.text, opt.isCorrect ? 1 : 0, idx);
      });
    }

    if (q.correctAnswerText || q.explanation) {
      this.db
        .prepare(
          'INSERT INTO question_answers (question_id, correct_answer_text, explanation) VALUES (?, ?, ?)'
        )
        .run(q.id, q.correctAnswerText || null, q.explanation || null);
    }

    if (q.subParts && q.subParts.length > 0) {
      const insSp = this.db.prepare(
        'INSERT INTO question_subparts (id, question_id, label, prompt, marks, answer, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      q.subParts.forEach((sp, idx) => {
        insSp.run(sp.id, q.id, sp.label, sp.prompt, sp.marks, sp.answer, idx);
      });
    }
  }

  private insertPaperInternal(paper: QuestionPaper): void {
    const totalMarks = paper.items.reduce((sum, i) => sum + Number(i.customMarks || 0), 0);
    this.db
      .prepare(
        `INSERT INTO papers (
          id, user_id, title, exam_name, class_id, subject_id, school_name,
          school_logo_data_url, exam_date, duration_minutes, instructions, total_marks,
          include_student_fields, include_header_footer, include_page_numbers, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        paper.id,
        paper.userId,
        paper.title,
        paper.examName,
        paper.classId,
        paper.subjectId,
        paper.schoolName,
        paper.schoolLogoDataUrl || null,
        paper.examDate,
        paper.durationMinutes,
        paper.instructions,
        totalMarks,
        paper.includeStudentFields ? 1 : 0,
        paper.includeHeaderFooter ? 1 : 0,
        paper.includePageNumbers ? 1 : 0,
        paper.createdAt,
        paper.updatedAt
      );

    const insItem = this.db.prepare(
      `INSERT INTO paper_questions (id, paper_id, source_question_id, question_order, custom_marks, question_snapshot_json)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    paper.items.forEach((item, idx) => {
      insItem.run(
        item.id,
        paper.id,
        item.sourceQuestionId || null,
        idx,
        item.customMarks,
        JSON.stringify(item.snapshot)
      );
    });
  }

  // --- Housekeeping ---
  public expireStaleSubscriptions(now: Date = new Date()): number {
    const nowIso = now.toISOString();
    const res = this.db
      .prepare(`UPDATE subscriptions SET status = 'expired' WHERE status = 'active' AND expires_at <= ?`)
      .run(nowIso);
    return Number(res.changes || 0);
  }

  // --- Auth & Profiles ---
  public getUserById(userId: string): UserProfile | null {
    const row = this.db
      .prepare(
        `SELECT u.id, u.full_name, u.email, u.phone, u.institution, ur.role, u.status,
                u.email_verified, u.preferred_language, u.created_at
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         WHERE u.id = ?`
      )
      .get(userId) as Record<string, unknown> | undefined;
    return row ? this.mapUserRow(row) : null;
  }

  public getUserWithPasswordByEmail(email: string): { user: UserProfile; passwordHash: string } | null {
    const row = this.db
      .prepare(
        `SELECT u.id, u.full_name, u.email, u.phone, u.institution, u.password_hash, ur.role, u.status,
                u.email_verified, u.preferred_language, u.created_at
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         WHERE lower(u.email) = lower(?)`
      )
      .get(email.trim()) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      user: this.mapUserRow(row),
      passwordHash: String(row.password_hash),
    };
  }

  private mapUserRow(row: Record<string, unknown>): UserProfile {
    return {
      id: String(row.id),
      fullName: String(row.full_name),
      email: String(row.email),
      phone: String(row.phone || ''),
      institution: row.institution ? String(row.institution) : undefined,
      role: (row.role === 'admin' ? 'admin' : 'student') as UserRole,
      status: row.status === 'suspended' ? 'suspended' : 'active',
      emailVerified: Boolean(row.email_verified),
      preferredLanguage: row.preferred_language === 'en' ? 'en' : 'bn',
      createdAt: String(row.created_at),
    };
  }

  public listUsers(): UserProfile[] {
    const rows = this.db
      .prepare(
        `SELECT u.id, u.full_name, u.email, u.phone, u.institution, ur.role, u.status,
                u.email_verified, u.preferred_language, u.created_at
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         ORDER BY u.created_at DESC`
      )
      .all() as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapUserRow(r));
  }

  public createStudentUser(input: {
    fullName: string;
    email: string;
    phone: string;
    institution?: string;
    preferredLanguage: 'en' | 'bn';
    password: string;
  }): UserProfile {
    const id = generateUid('u');
    const now = new Date().toISOString();
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      this.db
        .prepare(
          `INSERT INTO users (id, full_name, email, phone, institution, password_hash, status, email_verified, preferred_language, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?, ?)`
        )
        .run(
          id,
          input.fullName.trim(),
          input.email.trim().toLowerCase(),
          input.phone.trim(),
          input.institution?.trim() || null,
          hashPassword(input.password),
          input.preferredLanguage,
          now
        );
      this.db
        .prepare(`INSERT INTO user_roles (user_id, role, assigned_at) VALUES (?, 'student', ?)`)
        .run(id, now);
      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
    return this.getUserById(id)!;
  }

  public createSession(userId: string, ttlMs: number): string {
    const sessionId = generateUid('sess');
    const now = new Date();
    const expires = new Date(now.getTime() + ttlMs);
    this.db
      .prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(sessionId, userId, now.toISOString(), expires.toISOString());
    return sessionId;
  }

  public getUserBySessionId(sessionId: string): UserProfile | null {
    const row = this.db
      .prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?')
      .get(sessionId) as { user_id: string; expires_at: string } | undefined;
    if (!row) return null;
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      this.db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
      return null;
    }
    const user = this.getUserById(row.user_id);
    if (!user || user.status === 'suspended') return null;
    return user;
  }

  public deleteSession(sessionId: string): void {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }

  public updateUserProfile(
    userId: string,
    patch: { fullName: string; phone: string; institution?: string; preferredLanguage: 'en' | 'bn' }
  ): UserProfile {
    this.db
      .prepare(
        `UPDATE users SET full_name = ?, phone = ?, institution = ?, preferred_language = ? WHERE id = ?`
      )
      .run(
        patch.fullName.trim(),
        patch.phone.trim(),
        patch.institution?.trim() || null,
        patch.preferredLanguage,
        userId
      );
    const updated = this.getUserById(userId);
    if (!updated) throw new Error('ব্যবহারকারী পাওয়া যায়নি।');
    return updated;
  }

  public updateUserStatus(userId: string, status: 'active' | 'suspended'): void {
    this.db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
    if (status === 'suspended') {
      this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    }
  }

  public updateUserRole(adminId: string, targetUserId: string, role: UserRole): void {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE user_roles SET role = ?, assigned_at = ? WHERE user_id = ?')
      .run(role, now, targetUserId);
    const admin = this.getUserById(adminId);
    this.appendActivityLog({
      actorUserId: adminId,
      actorName: admin?.fullName || 'Admin',
      actorRole: 'admin',
      action: `ব্যবহারকারীর ভূমিকা পরিবর্তন (${role})`,
      targetType: 'user',
      targetId: targetUserId,
      details: `নতুন ভূমিকা: ${role}`,
    });
  }

  // --- Academic Catalogue ---
  public getAcademicCatalogue() {
    const classes = (this.db.prepare('SELECT * FROM classes ORDER BY level_order ASC').all() as Array<Record<string, unknown>>).map(
      (r): AcademicClass => ({
        id: String(r.id),
        name: String(r.name),
        nameBn: String(r.name_bn),
        slug: String(r.slug),
        levelOrder: Number(r.level_order),
        hasGroups: Boolean(r.has_groups),
        isActive: Boolean(r.is_active),
      })
    );
    const groups = (this.db.prepare('SELECT * FROM groups').all() as Array<Record<string, unknown>>).map(
      (r): AcademicGroup => ({
        id: String(r.id),
        classId: String(r.class_id),
        name: String(r.name),
        nameBn: String(r.name_bn),
        isActive: Boolean(r.is_active),
      })
    );
    const subjects = (this.db.prepare('SELECT * FROM subjects').all() as Array<Record<string, unknown>>).map(
      (r): Subject => ({
        id: String(r.id),
        classId: String(r.class_id),
        groupId: r.group_id ? String(r.group_id) : null,
        name: String(r.name),
        nameBn: String(r.name_bn),
        code: String(r.code),
        isActive: Boolean(r.is_active),
      })
    );
    const chapters = (
      this.db.prepare('SELECT * FROM chapters ORDER BY chapter_number ASC').all() as Array<Record<string, unknown>>
    ).map(
      (r): Chapter => ({
        id: String(r.id),
        subjectId: String(r.subject_id),
        chapterNumber: Number(r.chapter_number),
        name: String(r.name),
        nameBn: String(r.name_bn),
        isActive: Boolean(r.is_active),
      })
    );
    const topics = (this.db.prepare('SELECT * FROM topics').all() as Array<Record<string, unknown>>).map(
      (r): Topic => ({
        id: String(r.id),
        chapterId: String(r.chapter_id),
        name: String(r.name),
        nameBn: String(r.name_bn),
        isActive: Boolean(r.is_active),
      })
    );
    const questionTypes = (this.db.prepare('SELECT * FROM question_types').all() as Array<Record<string, unknown>>).map(
      (r): QuestionType => ({
        id: String(r.id),
        code: String(r.code) as QuestionType['code'],
        name: String(r.name),
        nameBn: String(r.name_bn),
        defaultMarks: Number(r.default_marks),
        isActive: Boolean(r.is_active),
      })
    );
    return { classes, groups, subjects, chapters, topics, questionTypes };
  }

  public addClass(input: Omit<AcademicClass, 'id'>): AcademicClass {
    const item: AcademicClass = { ...input, id: generateUid('cls') };
    this.db
      .prepare('INSERT INTO classes (id, name, name_bn, slug, level_order, has_groups, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(item.id, item.name, item.nameBn, item.slug, item.levelOrder, item.hasGroups ? 1 : 0, item.isActive ? 1 : 0);
    return item;
  }

  public addGroup(input: Omit<AcademicGroup, 'id'>): AcademicGroup {
    const item: AcademicGroup = { ...input, id: generateUid('grp') };
    this.db
      .prepare('INSERT INTO groups (id, class_id, name, name_bn, is_active) VALUES (?, ?, ?, ?, ?)')
      .run(item.id, item.classId, item.name, item.nameBn, item.isActive ? 1 : 0);
    return item;
  }

  public addSubject(input: Omit<Subject, 'id'>): Subject {
    const item: Subject = { ...input, id: generateUid('sub') };
    this.db
      .prepare('INSERT INTO subjects (id, class_id, group_id, name, name_bn, code, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(item.id, item.classId, item.groupId || null, item.name, item.nameBn, item.code, item.isActive ? 1 : 0);
    return item;
  }

  public addChapter(input: Omit<Chapter, 'id'>): Chapter {
    const item: Chapter = { ...input, id: generateUid('ch') };
    this.db
      .prepare('INSERT INTO chapters (id, subject_id, chapter_number, name, name_bn, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run(item.id, item.subjectId, item.chapterNumber, item.name, item.nameBn, item.isActive ? 1 : 0);
    return item;
  }

  public addTopic(input: Omit<Topic, 'id'>): Topic {
    const item: Topic = { ...input, id: generateUid('top') };
    this.db
      .prepare('INSERT INTO topics (id, chapter_id, name, name_bn, is_active) VALUES (?, ?, ?, ?, ?)')
      .run(item.id, item.chapterId, item.name, item.nameBn, item.isActive ? 1 : 0);
    return item;
  }

  // --- Questions ---
  public listAllQuestions(): Question[] {
    const rows = this.db
      .prepare('SELECT * FROM questions ORDER BY created_at DESC')
      .all() as Array<Record<string, unknown>>;
    return this.hydrateQuestions(rows);
  }

  public getQuestionById(questionId: string): Question | null {
    const row = this.db
      .prepare('SELECT * FROM questions WHERE id = ?')
      .get(questionId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.hydrateQuestions([row])[0] || null;
  }

  private hydrateQuestions(rows: Array<Record<string, unknown>>): Question[] {
    if (rows.length === 0) return [];
    const stimuliRows = this.db.prepare('SELECT * FROM question_stimuli').all() as Array<Record<string, unknown>>;
    const optionRows = this.db
      .prepare('SELECT * FROM question_options ORDER BY sort_order ASC')
      .all() as Array<Record<string, unknown>>;
    const answerRows = this.db.prepare('SELECT * FROM question_answers').all() as Array<Record<string, unknown>>;
    const subRows = this.db
      .prepare('SELECT * FROM question_subparts ORDER BY sort_order ASC')
      .all() as Array<Record<string, unknown>>;

    const stimuliMap = new Map(stimuliRows.map((r) => [String(r.question_id), String(r.stimulus)]));
    const answerMap = new Map(
      answerRows.map((r) => [
        String(r.question_id),
        {
          correctAnswerText: r.correct_answer_text ? String(r.correct_answer_text) : undefined,
          explanation: r.explanation ? String(r.explanation) : undefined,
        },
      ])
    );

    const optMap = new Map<string, Question['options']>();
    for (const r of optionRows) {
      const qid = String(r.question_id);
      const list = optMap.get(qid) || [];
      list.push({
        id: String(r.id),
        label: String(r.label),
        text: String(r.text),
        isCorrect: Boolean(r.is_correct),
      });
      optMap.set(qid, list);
    }

    const subMap = new Map<string, Question['subParts']>();
    for (const r of subRows) {
      const qid = String(r.question_id);
      const list = subMap.get(qid) || [];
      list.push({
        id: String(r.id),
        label: String(r.label),
        prompt: String(r.prompt),
        marks: Number(r.marks),
        answer: String(r.answer),
      });
      subMap.set(qid, list);
    }

    return rows.map((r) => {
      const id = String(r.id);
      const ans = answerMap.get(id);
      return {
        id,
        classId: String(r.class_id),
        groupId: r.group_id ? String(r.group_id) : null,
        subjectId: String(r.subject_id),
        chapterId: String(r.chapter_id),
        topicId: r.topic_id ? String(r.topic_id) : null,
        questionTypeCode: String(r.question_type_code) as Question['questionTypeCode'],
        language: r.language === 'en' ? 'en' : 'bn',
        difficulty: String(r.difficulty) as Question['difficulty'],
        marks: Number(r.marks),
        status: String(r.status) as Question['status'],
        title: r.title ? String(r.title) : undefined,
        prompt: String(r.prompt),
        stimulus: stimuliMap.get(id),
        equationLatex: r.equation_latex ? String(r.equation_latex) : undefined,
        imageUrl: r.image_url ? String(r.image_url) : undefined,
        imageCaption: r.image_caption ? String(r.image_caption) : undefined,
        options: optMap.get(id),
        subParts: subMap.get(id),
        correctAnswerText: ans?.correctAnswerText,
        explanation: ans?.explanation,
        createdAt: String(r.created_at),
        updatedAt: String(r.updated_at),
      };
    });
  }

  public saveQuestion(
    admin: UserProfile,
    input: Omit<Question, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Question {
    const now = new Date().toISOString();
    const qId = input.id || generateUid('q');
    const existing = input.id ? this.getQuestionById(input.id) : null;

    const fullQuestion: Question = {
      ...input,
      id: qId,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    this.db.exec('BEGIN IMMEDIATE;');
    try {
      if (existing) {
        this.db.prepare('DELETE FROM question_stimuli WHERE question_id = ?').run(qId);
        this.db.prepare('DELETE FROM question_options WHERE question_id = ?').run(qId);
        this.db.prepare('DELETE FROM question_answers WHERE question_id = ?').run(qId);
        this.db.prepare('DELETE FROM question_subparts WHERE question_id = ?').run(qId);
        this.db
          .prepare(
            `UPDATE questions SET
              class_id = ?, group_id = ?, subject_id = ?, chapter_id = ?, topic_id = ?,
              question_type_code = ?, language = ?, difficulty = ?, marks = ?, status = ?,
              title = ?, prompt = ?, equation_latex = ?, image_url = ?, image_caption = ?,
              updated_at = ?
             WHERE id = ?`
          )
          .run(
            fullQuestion.classId,
            fullQuestion.groupId || null,
            fullQuestion.subjectId,
            fullQuestion.chapterId,
            fullQuestion.topicId || null,
            fullQuestion.questionTypeCode,
            fullQuestion.language,
            fullQuestion.difficulty,
            fullQuestion.marks,
            fullQuestion.status,
            fullQuestion.title || null,
            fullQuestion.prompt,
            fullQuestion.equationLatex || null,
            fullQuestion.imageUrl || null,
            fullQuestion.imageCaption || null,
            now,
            qId
          );

        if (fullQuestion.stimulus) {
          this.db.prepare('INSERT INTO question_stimuli (question_id, stimulus) VALUES (?, ?)').run(qId, fullQuestion.stimulus);
        }
        if (fullQuestion.options && fullQuestion.options.length > 0) {
          const insOpt = this.db.prepare(
            'INSERT INTO question_options (id, question_id, label, text, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
          );
          fullQuestion.options.forEach((opt, idx) =>
            insOpt.run(opt.id, qId, opt.label, opt.text, opt.isCorrect ? 1 : 0, idx)
          );
        }
        if (fullQuestion.correctAnswerText || fullQuestion.explanation) {
          this.db
            .prepare('INSERT INTO question_answers (question_id, correct_answer_text, explanation) VALUES (?, ?, ?)')
            .run(qId, fullQuestion.correctAnswerText || null, fullQuestion.explanation || null);
        }
        if (fullQuestion.subParts && fullQuestion.subParts.length > 0) {
          const insSp = this.db.prepare(
            'INSERT INTO question_subparts (id, question_id, label, prompt, marks, answer, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
          );
          fullQuestion.subParts.forEach((sp, idx) =>
            insSp.run(sp.id, qId, sp.label, sp.prompt, sp.marks, sp.answer, idx)
          );
        }
      } else {
        this.insertQuestionInternal(fullQuestion, admin.id);
      }

      this.appendActivityLog({
        actorUserId: admin.id,
        actorName: admin.fullName,
        actorRole: 'admin',
        action: existing ? `প্রশ্ন ${qId} হালনাগাদ করেছেন` : `নতুন প্রশ্ন ${qId} তৈরি করেছেন`,
        targetType: 'question',
        targetId: qId,
        details: `${fullQuestion.questionTypeCode.toUpperCase()} · ${fullQuestion.status}`,
      });
      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
    return this.getQuestionById(qId)!;
  }

  public deleteQuestion(questionId: string): void {
    this.db.prepare('DELETE FROM questions WHERE id = ?').run(questionId);
  }

  public bulkImportQuestions(
    admin: UserProfile,
    items: Array<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>
  ): number {
    const now = new Date().toISOString();
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      for (const item of items) {
        const q: Question = {
          ...item,
          id: generateUid('q'),
          createdAt: now,
          updatedAt: now,
        };
        this.insertQuestionInternal(q, admin.id);
      }
      this.appendActivityLog({
        actorUserId: admin.id,
        actorName: admin.fullName,
        actorRole: 'admin',
        action: `একসাথে ${items.length}টি প্রশ্ন ইমপোর্ট করেছেন`,
        targetType: 'question',
        targetId: 'bulk',
        details: `প্রশ্নব্যাংকে ${items.length}টি প্রশ্ন যুক্ত করা হয়েছে।`,
      });
      this.db.exec('COMMIT;');
      return items.length;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  // --- Plans & Subscriptions ---
  public listPlans(): Plan[] {
    const planRows = this.db.prepare('SELECT * FROM plans ORDER BY display_order ASC').all() as Array<Record<string, unknown>>;
    const pcRows = this.db.prepare('SELECT * FROM plan_classes').all() as Array<{ plan_id: string; class_id: string }>;
    const classMap = new Map<string, string[]>();
    for (const r of pcRows) {
      const list = classMap.get(r.plan_id) || [];
      list.push(r.class_id);
      classMap.set(r.plan_id, list);
    }
    return planRows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      nameBn: String(r.name_bn),
      audienceLabel: String(r.audience_label || ''),
      description: String(r.description || ''),
      priceBdt: Number(r.price_bdt),
      originalPriceBdt: r.original_price_bdt !== null && r.original_price_bdt !== undefined ? Number(r.original_price_bdt) : null,
      currency: 'BDT',
      durationDays: Number(r.duration_days),
      includedClassIds: classMap.get(String(r.id)) || [],
      features: JSON.parse(String(r.features_json || '[]')) as string[],
      isActive: Boolean(r.is_active),
      displayOrder: Number(r.display_order),
    }));
  }

  public savePlan(input: Omit<Plan, 'id'> & { id?: string }): Plan {
    const id = input.id || generateUid('plan');
    const exists = Boolean(this.db.prepare('SELECT id FROM plans WHERE id = ?').get(id));
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      if (exists) {
        this.db
          .prepare(
            `UPDATE plans SET name = ?, name_bn = ?, audience_label = ?, description = ?, price_bdt = ?,
              original_price_bdt = ?, currency = ?, duration_days = ?, features_json = ?, is_active = ?, display_order = ?
             WHERE id = ?`
          )
          .run(
            input.name,
            input.nameBn,
            input.audienceLabel,
            input.description,
            input.priceBdt,
            input.originalPriceBdt ?? null,
            input.currency,
            input.durationDays,
            JSON.stringify(input.features),
            input.isActive ? 1 : 0,
            input.displayOrder,
            id
          );
        this.db.prepare('DELETE FROM plan_classes WHERE plan_id = ?').run(id);
      } else {
        this.db
          .prepare(
            `INSERT INTO plans (id, name, name_bn, audience_label, description, price_bdt, original_price_bdt, currency, duration_days, features_json, is_active, display_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            id,
            input.name,
            input.nameBn,
            input.audienceLabel,
            input.description,
            input.priceBdt,
            input.originalPriceBdt ?? null,
            input.currency,
            input.durationDays,
            JSON.stringify(input.features),
            input.isActive ? 1 : 0,
            input.displayOrder
          );
      }
      const insPc = this.db.prepare('INSERT INTO plan_classes (plan_id, class_id) VALUES (?, ?)');
      for (const cid of input.includedClassIds) insPc.run(id, cid);
      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
    return this.listPlans().find((p) => p.id === id)!;
  }

  public listSubscriptions(userId?: string): Subscription[] {
    this.expireStaleSubscriptions();
    const rows = (
      userId
        ? this.db.prepare('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC').all(userId)
        : this.db.prepare('SELECT * FROM subscriptions ORDER BY created_at DESC').all()
    ) as Array<Record<string, unknown>>;

    const scRows = this.db.prepare('SELECT * FROM subscription_classes').all() as Array<{
      subscription_id: string;
      class_id: string;
    }>;
    const clsMap = new Map<string, string[]>();
    for (const r of scRows) {
      const list = clsMap.get(r.subscription_id) || [];
      list.push(r.class_id);
      clsMap.set(r.subscription_id, list);
    }

    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      planId: String(r.plan_id),
      planNameSnapshot: String(r.plan_name_snapshot),
      priceSnapshotBdt: Number(r.price_snapshot_bdt),
      durationDaysSnapshot: Number(r.duration_days_snapshot),
      grantedClassIds: clsMap.get(String(r.id)) || [],
      status: String(r.status) as Subscription['status'],
      startsAt: String(r.starts_at),
      expiresAt: String(r.expires_at),
      paymentId: r.payment_id ? String(r.payment_id) : undefined,
      activatedByAdminId: r.activated_by_admin_id ? String(r.activated_by_admin_id) : undefined,
      createdAt: String(r.created_at),
    }));
  }

  public manualActivateSubscription(admin: UserProfile, userId: string, planId: string): Subscription {
    const plan = this.listPlans().find((p) => p.id === planId);
    if (!plan) throw new Error('প্ল্যান পাওয়া যায়নি।');
    const now = new Date();
    const win = calculateNewSubscriptionWindow(plan.durationDays, now);
    const subId = generateUid('sub');
    const nowIso = now.toISOString();

    this.db.exec('BEGIN IMMEDIATE;');
    try {
      this.db
        .prepare(
          `INSERT INTO subscriptions (
            id, user_id, plan_id, plan_name_snapshot, price_snapshot_bdt, duration_days_snapshot,
            status, starts_at, expires_at, activated_by_admin_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`
        )
        .run(
          subId,
          userId,
          plan.id,
          `${plan.nameBn || plan.name} (অ্যাডমিন প্রদত্ত)`,
          plan.priceBdt,
          plan.durationDays,
          win.startsAt,
          win.expiresAt,
          admin.id,
          nowIso
        );
      const insSc = this.db.prepare('INSERT INTO subscription_classes (subscription_id, class_id) VALUES (?, ?)');
      for (const cid of plan.includedClassIds) insSc.run(subId, cid);
      this.appendActivityLog({
        actorUserId: admin.id,
        actorName: admin.fullName,
        actorRole: 'admin',
        action: `ম্যানুয়ালি ${plan.nameBn || plan.name} চালু করেছেন`,
        targetType: 'subscription',
        targetId: subId,
        details: `ব্যবহারকারী ${userId}-কে ${plan.durationDays} দিনের এক্সেস দেওয়া হয়েছে।`,
      });
      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
    return this.listSubscriptions(userId).find((s) => s.id === subId)!;
  }

  public updateSubscriptionStatus(subscriptionId: string, status: Subscription['status']): void {
    const res = this.db.prepare('UPDATE subscriptions SET status = ? WHERE id = ?').run(status, subscriptionId);
    if (!res.changes) throw new Error('সাবস্ক্রিপশন পাওয়া যায়নি।');
  }

  // --- Payment Methods, Manual Payments & Atomic Review ---
  public listPaymentMethods(): PaymentMethod[] {
    const rows = this.db.prepare('SELECT * FROM payment_methods').all() as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      accountNumber: String(r.account_number),
      accountType: String(r.account_type),
      instructions: String(r.instructions),
      isActive: Boolean(r.is_active),
    }));
  }

  public savePaymentMethod(input: Omit<PaymentMethod, 'id'> & { id?: string }): PaymentMethod {
    const id = input.id || generateUid('pm');
    const exists = Boolean(this.db.prepare('SELECT id FROM payment_methods WHERE id = ?').get(id));
    if (exists) {
      this.db
        .prepare(
          'UPDATE payment_methods SET name = ?, account_number = ?, account_type = ?, instructions = ?, is_active = ? WHERE id = ?'
        )
        .run(input.name, input.accountNumber, input.accountType, input.instructions, input.isActive ? 1 : 0, id);
    } else {
      this.db
        .prepare(
          'INSERT INTO payment_methods (id, name, account_number, account_type, instructions, is_active) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(id, input.name, input.accountNumber, input.accountType, input.instructions, input.isActive ? 1 : 0);
    }
    return this.listPaymentMethods().find((pm) => pm.id === id)!;
  }

  public listPayments(userId?: string): Payment[] {
    const rows = (
      userId
        ? this.db.prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC').all(userId)
        : this.db.prepare('SELECT * FROM payments ORDER BY created_at DESC').all()
    ) as Array<Record<string, unknown>>;

    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      planId: String(r.plan_id),
      planNameSnapshot: String(r.plan_name_snapshot),
      expectedAmountBdt: Number(r.expected_amount_bdt),
      submittedAmountBdt: Number(r.submitted_amount_bdt),
      paymentMethodId: String(r.payment_method_id),
      paymentMethodNameSnapshot: String(r.payment_method_name_snapshot),
      senderNumber: String(r.sender_number),
      transactionRef: String(r.transaction_ref),
      receiptDataUrl: r.receipt_data_url ? String(r.receipt_data_url) : undefined,
      receiptFileName: r.receipt_file_name ? String(r.receipt_file_name) : undefined,
      status: String(r.status) as Payment['status'],
      reviewedByAdminId: r.reviewed_by_admin_id ? String(r.reviewed_by_admin_id) : undefined,
      reviewedAt: r.reviewed_at ? String(r.reviewed_at) : undefined,
      reviewNote: r.review_note ? String(r.review_note) : undefined,
      createdAt: String(r.created_at),
    }));
  }

  public submitManualPayment(
    user: UserProfile,
    input: {
      planId: string;
      paymentMethodId: string;
      senderNumber: string;
      transactionRef: string;
      submittedAmountBdt: number;
      receiptDataUrl?: string;
      receiptFileName?: string;
      receiptObjectId?: string;
    }
  ): Payment {
    const plan = this.listPlans().find((p) => p.id === input.planId && p.isActive);
    if (!plan) throw new Error('নির্বাচিত সাবস্ক্রিপশন প্ল্যানটি সক্রিয় নয়।');

    const method = this.listPaymentMethods().find((m) => m.id === input.paymentMethodId && m.isActive);
    if (!method) throw new Error('নির্বাচিত পেমেন্ট মাধ্যমটি পাওয়া যায়নি।');

    const allPayments = this.listPayments();
    if (isDuplicateTransactionRef(allPayments, method.id, input.transactionRef)) {
      throw new Error('এই পেমেন্ট মাধ্যমে এই ট্রানজেকশন আইডি ইতিমধ্যেই জমা দেওয়া হয়েছে।');
    }

    let receiptObjId = input.receiptObjectId;
    if (!receiptObjId && input.receiptDataUrl && input.receiptDataUrl.startsWith('data:')) {
      const savedObj = this.saveBase64ToStorage(
        'payment-receipts',
        user.id,
        input.receiptFileName || 'receipt.png',
        input.receiptDataUrl
      );
      receiptObjId = savedObj.id;
    }

    const id = generateUid('pay');
    const nowIso = new Date().toISOString();
    const normalizedRef = input.transactionRef.trim().toUpperCase();

    this.db.exec('BEGIN IMMEDIATE;');
    try {
      this.db
        .prepare(
          `INSERT INTO payments (
            id, user_id, plan_id, plan_name_snapshot, expected_amount_bdt, submitted_amount_bdt,
            payment_method_id, payment_method_name_snapshot, sender_number, transaction_ref,
            receipt_data_url, receipt_file_name, receipt_object_id, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
        )
        .run(
          id,
          user.id,
          plan.id,
          plan.nameBn || plan.name,
          plan.priceBdt,
          Number(input.submittedAmountBdt),
          method.id,
          method.name,
          input.senderNumber.trim(),
          normalizedRef,
          input.receiptDataUrl || null,
          input.receiptFileName || null,
          receiptObjId || null,
          nowIso
        );

      this.appendActivityLog({
        actorUserId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        action: `ম্যানুয়াল পেমেন্ট ${normalizedRef} জমা দিয়েছেন`,
        targetType: 'payment',
        targetId: id,
        details: `${plan.nameBn || plan.name} · ৳${Number(input.submittedAmountBdt)} (${method.name})`,
      });
      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }

    return this.listPayments(user.id).find((p) => p.id === id)!;
  }

  public reviewPaymentAtomic(
    admin: UserProfile,
    paymentId: string,
    decision: 'approved' | 'rejected',
    reviewNote: string,
    now: Date = new Date()
  ): { payment: Payment; subscription?: Subscription } {
    const nowIso = now.toISOString();
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      const paymentRow = this.db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as
        | Record<string, unknown>
        | undefined;
      if (!paymentRow) throw new Error('পেমেন্ট তথ্য পাওয়া যায়নি।');
      if (String(paymentRow.status) !== 'pending') {
        throw new Error('এই পেমেন্টটি ইতিমধ্যেই যাচাই করা হয়েছে।');
      }

      const finalNote =
        reviewNote.trim() ||
        (decision === 'approved' ? 'যাচাইকৃত ও সক্রিয় করা হয়েছে।' : 'পেমেন্ট যাচাই ব্যর্থ হয়েছে।');

      if (decision === 'rejected') {
        this.db
          .prepare(
            `UPDATE payments SET status = 'rejected', reviewed_by_admin_id = ?, reviewed_at = ?, review_note = ? WHERE id = ?`
          )
          .run(admin.id, nowIso, finalNote, paymentId);

        this.db
          .prepare(
            `INSERT INTO payment_reviews (id, payment_id, admin_user_id, decision, review_note, created_at)
             VALUES (?, ?, ?, 'rejected', ?, ?)`
          )
          .run(generateUid('rev'), paymentId, admin.id, finalNote, nowIso);

        this.appendActivityLog({
          actorUserId: admin.id,
          actorName: admin.fullName,
          actorRole: 'admin',
          action: `পেমেন্ট ${String(paymentRow.transaction_ref)} বাতিল করেছেন`,
          targetType: 'payment',
          targetId: paymentId,
          details: finalNote,
        });

        this.db.exec('COMMIT;');
        return { payment: this.listPayments().find((p) => p.id === paymentId)! };
      }

      const plan = this.listPlans().find((p) => p.id === String(paymentRow.plan_id));
      if (!plan) throw new Error('সংশ্লিষ্ট প্ল্যানটি আর বিদ্যমান নেই।');

      const win = calculateNewSubscriptionWindow(plan.durationDays, now);
      const subId = generateUid('sub');

      this.db
        .prepare(
          `UPDATE payments SET status = 'approved', reviewed_by_admin_id = ?, reviewed_at = ?, review_note = ? WHERE id = ?`
        )
        .run(admin.id, nowIso, finalNote, paymentId);

      this.db
        .prepare(
          `INSERT INTO subscriptions (
            id, user_id, plan_id, plan_name_snapshot, price_snapshot_bdt, duration_days_snapshot,
            status, starts_at, expires_at, payment_id, activated_by_admin_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`
        )
        .run(
          subId,
          String(paymentRow.user_id),
          plan.id,
          String(paymentRow.plan_name_snapshot),
          Number(paymentRow.expected_amount_bdt),
          plan.durationDays,
          win.startsAt,
          win.expiresAt,
          paymentId,
          admin.id,
          nowIso
        );

      const insSc = this.db.prepare('INSERT INTO subscription_classes (subscription_id, class_id) VALUES (?, ?)');
      for (const cid of plan.includedClassIds) insSc.run(subId, cid);

      this.db
        .prepare(
          `INSERT INTO payment_reviews (id, payment_id, admin_user_id, decision, review_note, created_at)
           VALUES (?, ?, ?, 'approved', ?, ?)`
        )
        .run(generateUid('rev'), paymentId, admin.id, finalNote, nowIso);

      this.appendActivityLog({
        actorUserId: admin.id,
        actorName: admin.fullName,
        actorRole: 'admin',
        action: `পেমেন্ট ${String(paymentRow.transaction_ref)} অনুমোদন করেছেন`,
        targetType: 'payment',
        targetId: paymentId,
        details: `${plan.nameBn || plan.name} (${plan.durationDays} দিন) তাৎক্ষণিকভাবে সক্রিয় করা হয়েছে।`,
      });

      this.db.exec('COMMIT;');
      const payment = this.listPayments().find((p) => p.id === paymentId)!;
      const subscription = this.listSubscriptions(String(paymentRow.user_id)).find((s) => s.id === subId)!;
      return { payment, subscription };
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  public listPaymentReviews(): PaymentReviewRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM payment_reviews ORDER BY created_at DESC')
      .all() as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: String(r.id),
      paymentId: String(r.payment_id),
      adminUserId: String(r.admin_user_id),
      decision: r.decision === 'approved' ? 'approved' : 'rejected',
      reviewNote: String(r.review_note),
      createdAt: String(r.created_at),
    }));
  }

  // --- Favorites & Saved Questions ---
  public getUserFavoritesAndSaved(userId: string): { favoriteIds: string[]; savedIds: string[] } {
    const favRows = this.db
      .prepare('SELECT question_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Array<{ question_id: string }>;
    const savedRows = this.db
      .prepare('SELECT question_id FROM saved_questions WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Array<{ question_id: string }>;
    return {
      favoriteIds: favRows.map((r) => r.question_id),
      savedIds: savedRows.map((r) => r.question_id),
    };
  }

  public toggleFavorite(userId: string, questionId: string): string[] {
    const exists = this.db
      .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND question_id = ?')
      .get(userId, questionId);
    if (exists) {
      this.db.prepare('DELETE FROM favorites WHERE user_id = ? AND question_id = ?').run(userId, questionId);
    } else {
      this.db
        .prepare('INSERT INTO favorites (user_id, question_id, created_at) VALUES (?, ?, ?)')
        .run(userId, questionId, new Date().toISOString());
    }
    return this.getUserFavoritesAndSaved(userId).favoriteIds;
  }

  public toggleSaved(userId: string, questionId: string): string[] {
    const exists = this.db
      .prepare('SELECT 1 FROM saved_questions WHERE user_id = ? AND question_id = ?')
      .get(userId, questionId);
    if (exists) {
      this.db.prepare('DELETE FROM saved_questions WHERE user_id = ? AND question_id = ?').run(userId, questionId);
    } else {
      this.db
        .prepare('INSERT INTO saved_questions (user_id, question_id, created_at) VALUES (?, ?, ?)')
        .run(userId, questionId, new Date().toISOString());
    }
    return this.getUserFavoritesAndSaved(userId).savedIds;
  }

  // --- Papers & Immutable Snapshots ---
  public listPapers(userId?: string): QuestionPaper[] {
    const rows = (
      userId
        ? this.db.prepare('SELECT * FROM papers WHERE user_id = ? ORDER BY updated_at DESC').all(userId)
        : this.db.prepare('SELECT * FROM papers ORDER BY updated_at DESC').all()
    ) as Array<Record<string, unknown>>;

    const itemRows = this.db
      .prepare('SELECT * FROM paper_questions ORDER BY question_order ASC')
      .all() as Array<Record<string, unknown>>;
    const itemsByPaper = new Map<string, QuestionPaperItem[]>();
    for (const ir of itemRows) {
      const pid = String(ir.paper_id);
      const list = itemsByPaper.get(pid) || [];
      list.push({
        id: String(ir.id),
        sourceQuestionId: ir.source_question_id ? String(ir.source_question_id) : '',
        orderIndex: Number(ir.question_order),
        customMarks: Number(ir.custom_marks),
        snapshot: JSON.parse(String(ir.question_snapshot_json)),
      });
      itemsByPaper.set(pid, list);
    }

    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      title: String(r.title),
      examName: String(r.exam_name),
      classId: String(r.class_id),
      subjectId: String(r.subject_id),
      schoolName: String(r.school_name),
      schoolLogoDataUrl: r.school_logo_data_url ? String(r.school_logo_data_url) : undefined,
      examDate: String(r.exam_date),
      durationMinutes: Number(r.duration_minutes),
      instructions: String(r.instructions),
      includeStudentFields: Boolean(r.include_student_fields),
      includeHeaderFooter: Boolean(r.include_header_footer),
      includePageNumbers: Boolean(r.include_page_numbers),
      items: itemsByPaper.get(String(r.id)) || [],
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));
  }

  public getPaperById(paperId: string): QuestionPaper | null {
    return this.listPapers().find((p) => p.id === paperId) || null;
  }

  public savePaperRecord(
    user: UserProfile,
    input: Omit<QuestionPaper, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): QuestionPaper {
    const now = new Date().toISOString();
    const paperId = input.id || generateUid('paper');
    const existing = input.id ? this.getPaperById(input.id) : null;
    const totalMarks = input.items.reduce((sum, i) => sum + Number(i.customMarks || 0), 0);

    this.db.exec('BEGIN IMMEDIATE;');
    try {
      if (existing) {
        this.db
          .prepare(
            `UPDATE papers SET
              title = ?, exam_name = ?, class_id = ?, subject_id = ?, school_name = ?,
              school_logo_data_url = ?, exam_date = ?, duration_minutes = ?, instructions = ?,
              total_marks = ?, include_student_fields = ?, include_header_footer = ?,
              include_page_numbers = ?, updated_at = ?
             WHERE id = ?`
          )
          .run(
            input.title,
            input.examName,
            input.classId,
            input.subjectId,
            input.schoolName,
            input.schoolLogoDataUrl || null,
            input.examDate,
            input.durationMinutes,
            input.instructions,
            totalMarks,
            input.includeStudentFields ? 1 : 0,
            input.includeHeaderFooter ? 1 : 0,
            input.includePageNumbers ? 1 : 0,
            now,
            paperId
          );
        this.db.prepare('DELETE FROM paper_questions WHERE paper_id = ?').run(paperId);
      } else {
        this.db
          .prepare(
            `INSERT INTO papers (
              id, user_id, title, exam_name, class_id, subject_id, school_name,
              school_logo_data_url, exam_date, duration_minutes, instructions, total_marks,
              include_student_fields, include_header_footer, include_page_numbers, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            paperId,
            user.id,
            input.title,
            input.examName,
            input.classId,
            input.subjectId,
            input.schoolName,
            input.schoolLogoDataUrl || null,
            input.examDate,
            input.durationMinutes,
            input.instructions,
            totalMarks,
            input.includeStudentFields ? 1 : 0,
            input.includeHeaderFooter ? 1 : 0,
            input.includePageNumbers ? 1 : 0,
            now,
            now
          );
        this.appendActivityLog({
          actorUserId: user.id,
          actorName: user.fullName,
          actorRole: user.role,
          action: `"${input.title}" প্রশ্নপত্র তৈরি করেছেন`,
          targetType: 'paper',
          targetId: paperId,
          details: `${input.items.length}টি প্রশ্ন সংযুক্ত করা হয়েছে`,
        });
      }

      const insItem = this.db.prepare(
        `INSERT INTO paper_questions (id, paper_id, source_question_id, question_order, custom_marks, question_snapshot_json)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      input.items.forEach((item, idx) => {
        insItem.run(
          item.id || generateUid('pi'),
          paperId,
          item.sourceQuestionId || null,
          idx,
          item.customMarks,
          JSON.stringify(item.snapshot)
        );
      });

      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }

    return this.getPaperById(paperId)!;
  }

  public deletePaper(paperId: string): void {
    this.db.prepare('DELETE FROM papers WHERE id = ?').run(paperId);
  }

  public recordExport(
    userId: string,
    paperId: string,
    paperTitle: string,
    format: 'pdf' | 'docx',
    includedAnswerKey: boolean,
    storageObjectId?: string
  ): ExportRecord {
    const id = generateUid('exp');
    const createdAt = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO export_history (id, user_id, paper_id, paper_title, format, included_answer_key, storage_object_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, userId, paperId, paperTitle, format, includedAnswerKey ? 1 : 0, storageObjectId || null, createdAt);
    return { id, userId, paperId, paperTitle, format, includedAnswerKey, createdAt };
  }

  public listExports(userId?: string): ExportRecord[] {
    const rows = (
      userId
        ? this.db.prepare('SELECT * FROM export_history WHERE user_id = ? ORDER BY created_at DESC').all(userId)
        : this.db.prepare('SELECT * FROM export_history ORDER BY created_at DESC').all()
    ) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      paperId: String(r.paper_id),
      paperTitle: String(r.paper_title),
      format: r.format === 'docx' ? 'docx' : 'pdf',
      includedAnswerKey: Boolean(r.included_answer_key),
      createdAt: String(r.created_at),
    }));
  }

  // --- CMS & Activity Logs ---
  public getPublicCmsData() {
    const settingsRow = this.db.prepare('SELECT * FROM site_settings WHERE id = 1').get() as Record<string, unknown>;
    const siteSettings: SiteSettings = {
      brandName: String(settingsRow.brand_name),
      heroHeadline: String(settingsRow.hero_headline),
      heroSubheadline: String(settingsRow.hero_subheadline),
      supportEmail: String(settingsRow.support_email),
      supportPhone: String(settingsRow.support_phone),
      officeAddress: String(settingsRow.office_address),
      renewalRuleNotice: String(settingsRow.renewal_rule_notice),
      demoDisclaimer: String(settingsRow.demo_disclaimer),
    };

    const notices = (this.db.prepare('SELECT * FROM notices ORDER BY created_at DESC').all() as Array<Record<string, unknown>>).map(
      (r): Notice => ({
        id: String(r.id),
        title: String(r.title),
        body: String(r.body),
        isPublished: Boolean(r.is_published),
        createdAt: String(r.created_at),
      })
    );

    const faqs = (this.db.prepare('SELECT * FROM faqs ORDER BY display_order ASC').all() as Array<Record<string, unknown>>).map(
      (r): FaqItem => ({
        id: String(r.id),
        question: String(r.question),
        answer: String(r.answer),
        category: String(r.category),
        displayOrder: Number(r.display_order),
        isPublished: Boolean(r.is_published),
      })
    );

    const contactMessages = (
      this.db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
    ).map(
      (r): ContactMessage => ({
        id: String(r.id),
        name: String(r.name),
        email: String(r.email),
        subject: String(r.subject),
        message: String(r.message),
        status: r.status === 'resolved' ? 'resolved' : 'unread',
        createdAt: String(r.created_at),
      })
    );

    return { siteSettings, notices, faqs, contactMessages };
  }

  public updateSiteSettings(settings: SiteSettings): SiteSettings {
    this.db
      .prepare(
        `UPDATE site_settings SET brand_name = ?, hero_headline = ?, hero_subheadline = ?,
         support_email = ?, support_phone = ?, office_address = ?, renewal_rule_notice = ?, demo_disclaimer = ?
         WHERE id = 1`
      )
      .run(
        settings.brandName,
        settings.heroHeadline,
        settings.heroSubheadline,
        settings.supportEmail,
        settings.supportPhone,
        settings.officeAddress,
        settings.renewalRuleNotice,
        settings.demoDisclaimer
      );
    return this.getPublicCmsData().siteSettings;
  }

  public saveNotice(input: Omit<Notice, 'id' | 'createdAt'> & { id?: string }): Notice {
    const id = input.id || generateUid('not');
    const createdAt = new Date().toISOString();
    const exists = Boolean(this.db.prepare('SELECT id FROM notices WHERE id = ?').get(id));
    if (exists) {
      this.db
        .prepare('UPDATE notices SET title = ?, body = ?, is_published = ? WHERE id = ?')
        .run(input.title, input.body, input.isPublished ? 1 : 0, id);
    } else {
      this.db
        .prepare('INSERT INTO notices (id, title, body, is_published, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(id, input.title, input.body, input.isPublished ? 1 : 0, createdAt);
    }
    return this.getPublicCmsData().notices.find((n) => n.id === id)!;
  }

  public saveFaq(input: Omit<FaqItem, 'id'> & { id?: string }): FaqItem {
    const id = input.id || generateUid('faq');
    const exists = Boolean(this.db.prepare('SELECT id FROM faqs WHERE id = ?').get(id));
    if (exists) {
      this.db
        .prepare('UPDATE faqs SET question = ?, answer = ?, category = ?, display_order = ?, is_published = ? WHERE id = ?')
        .run(input.question, input.answer, input.category, input.displayOrder, input.isPublished ? 1 : 0, id);
    } else {
      this.db
        .prepare('INSERT INTO faqs (id, question, answer, category, display_order, is_published) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, input.question, input.answer, input.category, input.displayOrder, input.isPublished ? 1 : 0);
    }
    return this.getPublicCmsData().faqs.find((f) => f.id === id)!;
  }

  public addContactMessage(input: { name: string; email: string; subject: string; message: string }): ContactMessage {
    const id = generateUid('msg');
    const createdAt = new Date().toISOString();
    this.db
      .prepare('INSERT INTO contact_messages (id, name, email, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, \'unread\', ?)')
      .run(id, input.name.trim(), input.email.trim(), input.subject.trim(), input.message.trim(), createdAt);
    return { id, ...input, status: 'unread', createdAt };
  }

  public resolveContactMessage(id: string): void {
    this.db.prepare(`UPDATE contact_messages SET status = 'resolved' WHERE id = ?`).run(id);
  }

  public appendActivityLog(input: Omit<ActivityLog, 'id' | 'createdAt'>): void {
    this.db
      .prepare(
        `INSERT INTO activity_logs (id, actor_user_id, actor_name, actor_role, action, target_type, target_id, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        generateUid('log'),
        input.actorUserId,
        input.actorName,
        input.actorRole,
        input.action,
        input.targetType,
        input.targetId,
        input.details,
        new Date().toISOString()
      );
  }

  public listActivityLogs(): ActivityLog[] {
    const rows = this.db
      .prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 200')
      .all() as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: String(r.id),
      actorUserId: String(r.actor_user_id || ''),
      actorName: String(r.actor_name),
      actorRole: r.actor_role === 'admin' ? 'admin' : 'student',
      action: String(r.action),
      targetType: String(r.target_type) as ActivityLog['targetType'],
      targetId: String(r.target_id),
      details: String(r.details || ''),
      createdAt: String(r.created_at),
    }));
  }

  // --- Private Storage Objects ---
  public saveBase64ToStorage(
    bucket: StorageBucket,
    ownerUserId: string,
    fileName: string,
    dataUrlOrBase64: string,
    classId?: string | null
  ): StoredFileMeta {
    let mimeType = 'application/octet-stream';
    let base64Body = dataUrlOrBase64;
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrlOrBase64);
    if (match) {
      mimeType = match[1];
      base64Body = match[2];
    }
    const buffer = Buffer.from(base64Body, 'base64');
    return this.saveBufferToStorage(bucket, ownerUserId, fileName, mimeType, buffer, classId);
  }

  public saveBufferToStorage(
    bucket: StorageBucket,
    ownerUserId: string,
    fileName: string,
    mimeType: string,
    buffer: Buffer,
    classId?: string | null
  ): StoredFileMeta {
    const id = generateUid('obj');
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'file.bin';
    const relPath = path.join(bucket, `${id}-${safeName}`);
    const fullPath = path.join(this.storageRoot, relPath);
    fs.writeFileSync(fullPath, buffer);
    const createdAt = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO storage_objects (id, bucket, owner_user_id, class_id, file_name, mime_type, size_bytes, disk_path, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, bucket, ownerUserId, classId || null, safeName, mimeType, buffer.length, relPath, createdAt);

    return {
      id,
      bucket,
      ownerUserId,
      classId: classId || null,
      fileName: safeName,
      mimeType,
      sizeBytes: buffer.length,
      diskPath: relPath,
      createdAt,
    };
  }

  public getStorageObject(objectId: string): StoredFileMeta | null {
    const r = this.db.prepare('SELECT * FROM storage_objects WHERE id = ?').get(objectId) as
      | Record<string, unknown>
      | undefined;
    if (!r) return null;
    return {
      id: String(r.id),
      bucket: String(r.bucket) as StorageBucket,
      ownerUserId: String(r.owner_user_id),
      classId: r.class_id ? String(r.class_id) : null,
      fileName: String(r.file_name),
      mimeType: String(r.mime_type),
      sizeBytes: Number(r.size_bytes),
      diskPath: String(r.disk_path),
      createdAt: String(r.created_at),
    };
  }

  // --- Full Admin Snapshot ---
  public getAdminSnapshot(): Omit<AppDatabaseState, 'passwordsByUserId'> {
    const catalogue = this.getAcademicCatalogue();
    const cms = this.getPublicCmsData();
    const users = this.listUsers();
    const favoritesByUserId: Record<string, string[]> = {};
    const savedByUserId: Record<string, string[]> = {};
    for (const u of users) {
      const col = this.getUserFavoritesAndSaved(u.id);
      favoritesByUserId[u.id] = col.favoriteIds;
      savedByUserId[u.id] = col.savedIds;
    }

    return {
      users,
      classes: catalogue.classes,
      groups: catalogue.groups,
      subjects: catalogue.subjects,
      chapters: catalogue.chapters,
      topics: catalogue.topics,
      questionTypes: catalogue.questionTypes,
      questions: this.listAllQuestions(),
      plans: this.listPlans(),
      subscriptions: this.listSubscriptions(),
      paymentMethods: this.listPaymentMethods(),
      payments: this.listPayments(),
      favoritesByUserId,
      savedByUserId,
      papers: this.listPapers(),
      exports: this.listExports(),
      notices: cms.notices,
      faqs: cms.faqs,
      contactMessages: cms.contactMessages,
      siteSettings: cms.siteSettings,
      activityLogs: this.listActivityLogs(),
    };
  }
}
