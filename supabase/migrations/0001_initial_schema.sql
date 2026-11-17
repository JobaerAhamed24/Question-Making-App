-- QuestionBank Production PostgreSQL Schema (Milestone 1)
-- Compatible with Supabase PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. UTILITY TRIGGER FOR updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. IDENTITY & ROLE-BASED ACCESS TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) >= 2),
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  institution TEXT,
  avatar_storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  email_verified BOOLEAN NOT NULL DEFAULT TRUE,
  preferred_language TEXT NOT NULL DEFAULT 'bn' CHECK (preferred_language IN ('en', 'bn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. ACADEMIC STRUCTURE TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  level_order INTEGER NOT NULL CHECK (level_order > 0),
  has_groups BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.groups (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  group_id TEXT REFERENCES public.groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  code TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chapters (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL CHECK (chapter_number > 0),
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.topics (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.question_types (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (
    code IN ('mcq', 'cq', 'short', 'fill_blank', 'true_false', 'math', 'image_based')
  ),
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  default_marks INTEGER NOT NULL CHECK (default_marks > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.difficulty_levels (
  code TEXT PRIMARY KEY CHECK (code IN ('easy', 'medium', 'hard')),
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

-- ============================================================================
-- 4. QUESTION BANK TABLES (NORMALIZED)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.questions (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  group_id TEXT REFERENCES public.groups(id) ON DELETE SET NULL,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  chapter_id TEXT NOT NULL REFERENCES public.chapters(id) ON DELETE RESTRICT,
  topic_id TEXT REFERENCES public.topics(id) ON DELETE SET NULL,
  question_type_id TEXT NOT NULL REFERENCES public.question_types(id) ON DELETE RESTRICT,
  question_type_code TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'bn' CHECK (language IN ('en', 'bn')),
  difficulty TEXT NOT NULL REFERENCES public.difficulty_levels(code),
  marks NUMERIC(6, 2) NOT NULL CHECK (marks > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  title TEXT,
  question_text TEXT NOT NULL CHECK (char_length(trim(question_text)) >= 3),
  equation_latex TEXT,
  question_image TEXT,
  image_caption TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.question_stimuli (
  question_id TEXT PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
  stimulus_text TEXT NOT NULL,
  stimulus_image_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.question_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_label TEXT NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.question_answers (
  question_id TEXT PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
  correct_answer_text TEXT,
  explanation TEXT
);

CREATE TABLE IF NOT EXISTS public.question_subparts (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  subpart_label TEXT NOT NULL,
  prompt TEXT NOT NULL,
  marks NUMERIC(6, 2) NOT NULL CHECK (marks > 0),
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  UNIQUE (question_id, tag_name)
);

-- ============================================================================
-- 5. SUBSCRIPTION PLANS & CLASS ENTITLEMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  audience_label TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price_bdt NUMERIC(10, 2) NOT NULL CHECK (price_bdt > 0),
  original_price_bdt NUMERIC(10, 2),
  currency TEXT NOT NULL DEFAULT 'BDT' CHECK (currency = 'BDT'),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.plan_classes (
  plan_id TEXT NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, class_id)
);

CREATE TABLE IF NOT EXISTS public.plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ============================================================================
-- 6. MANUAL PAYMENTS & AUDITED REVIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL,
  instructions TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  plan_name_snapshot TEXT NOT NULL,
  expected_amount_bdt NUMERIC(10, 2) NOT NULL CHECK (expected_amount_bdt > 0),
  submitted_amount_bdt NUMERIC(10, 2) NOT NULL CHECK (submitted_amount_bdt > 0),
  payment_method_id TEXT NOT NULL REFERENCES public.payment_methods(id) ON DELETE RESTRICT,
  payment_method_name_snapshot TEXT NOT NULL,
  sender_number TEXT NOT NULL,
  transaction_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate non-rejected transaction references per payment method
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_active_tx_ref
  ON public.payments (payment_method_id, upper(trim(transaction_ref)))
  WHERE status <> 'rejected';

CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/png',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  review_note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  plan_name_snapshot TEXT NOT NULL,
  price_snapshot_bdt NUMERIC(10, 2) NOT NULL,
  duration_days_snapshot INTEGER NOT NULL CHECK (duration_days_snapshot > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  payment_id TEXT REFERENCES public.payments(id) ON DELETE SET NULL,
  activated_by_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.subscription_classes (
  subscription_id TEXT NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  PRIMARY KEY (subscription_id, class_id)
);

-- ============================================================================
-- 7. USER COLLECTIONS, PAPERS, SNAPSHOTS & EXPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.saved_questions (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.papers (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  exam_name TEXT NOT NULL,
  school_name TEXT NOT NULL,
  school_logo_path TEXT,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  group_id TEXT REFERENCES public.groups(id) ON DELETE SET NULL,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration INTEGER NOT NULL CHECK (duration >= 10 AND duration <= 300),
  instructions TEXT NOT NULL DEFAULT '',
  total_marks NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (total_marks >= 0),
  include_student_fields BOOLEAN NOT NULL DEFAULT TRUE,
  include_header_footer BOOLEAN NOT NULL DEFAULT TRUE,
  include_page_numbers BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('draft', 'saved', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_papers_updated_at
  BEFORE UPDATE ON public.papers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.paper_questions (
  id TEXT PRIMARY KEY,
  paper_id TEXT NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  question_id TEXT REFERENCES public.questions(id) ON DELETE SET NULL,
  question_order INTEGER NOT NULL CHECK (question_order >= 0),
  custom_marks NUMERIC(6, 2) NOT NULL CHECK (custom_marks >= 0),
  question_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.export_history (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  paper_id TEXT NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  paper_title TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('pdf', 'docx')),
  included_answer_key BOOLEAN NOT NULL DEFAULT FALSE,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. WEBSITE CMS & AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  brand_name TEXT NOT NULL,
  hero_headline TEXT NOT NULL,
  hero_subheadline TEXT NOT NULL,
  support_email TEXT NOT NULL,
  support_phone TEXT NOT NULL,
  office_address TEXT NOT NULL,
  renewal_rule_notice TEXT NOT NULL,
  demo_disclaimer TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.faqs (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'সাধারণ',
  display_order INTEGER NOT NULL DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. PERFORMANCE INDEXES FOR PAGINATION & FILTERING
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_questions_filter
  ON public.questions (status, class_id, subject_id, chapter_id, question_type_code, difficulty);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active
  ON public.subscriptions (user_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_payments_user_status
  ON public.payments (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_papers_user_updated
  ON public.papers (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_paper_questions_order
  ON public.paper_questions (paper_id, question_order);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created
  ON public.activity_logs (created_at DESC);
