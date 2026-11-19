-- Migration 0007: Advanced Academic & Admission Question Paper Builder + Learning Hub + Kids Game
-- Safe additive migration preserving existing classes, subjects, subscriptions, payments, slides, and live exams.

-- 1. Extend existing Academic Chapters & Topics with ordering and curriculum verification metadata
alter table if exists public.chapters
  add column if not exists display_order integer not null default 1,
  add column if not exists source_ref text,
  add column if not exists curriculum_version text default 'NCTB-2025',
  add column if not exists pending_verification boolean not null default false;

alter table if exists public.topics
  add column if not exists display_order integer not null default 1,
  add column if not exists pending_verification boolean not null default false;

-- 2. Admission Categories, Institutions, Subjects, Topics (logically separated from Academic Class 1–12)
create table if not exists public.admission_categories (
  id text primary key check (id in ('university', 'engineering', 'medical')),
  name text not null,
  name_bn text not null,
  subtitle_bn text not null default '',
  description_bn text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admission_institutions (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references public.admission_categories(id) on delete cascade,
  name text not null,
  name_bn text not null,
  short_code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admission_subjects (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references public.admission_categories(id) on delete cascade,
  name text not null,
  name_bn text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admission_topics (
  id uuid primary key default gen_random_uuid(),
  admission_subject_id uuid not null references public.admission_subjects(id) on delete cascade,
  name text not null,
  name_bn text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Extend Questions with Domain (academic/admission), Education Board, Year (2010–2026), and AI Approval status
alter table if exists public.questions
  add column if not exists domain text not null default 'academic' check (domain in ('academic', 'admission')),
  add column if not exists admission_category text references public.admission_categories(id),
  add column if not exists institution_id uuid references public.admission_institutions(id),
  add column if not exists admission_subject_id uuid references public.admission_subjects(id),
  add column if not exists admission_topic_id uuid references public.admission_topics(id),
  add column if not exists education_board text check (education_board in ('dhaka','chattogram','cumilla','rajshahi','jashore','barishal','sylhet','dinajpur','mymensingh')),
  add column if not exists exam_year integer check (exam_year between 2010 and 2030),
  add column if not exists approval_status text not null default 'approved' check (approval_status in ('approved', 'pending_ai', 'rejected')),
  add column if not exists is_ai_generated boolean not null default false;

create index if not exists idx_questions_domain_board_year on public.questions (domain, education_board, exam_year);
create index if not exists idx_questions_admission on public.questions (admission_category, institution_id, admission_subject_id);

-- 4. Extend Question Papers (make exam_date nullable/optional, add design_config & omr_config JSONB)
alter table if exists public.question_papers
  alter column exam_date drop not null;

alter table if exists public.question_papers
  add column if not exists domain text not null default 'academic' check (domain in ('academic', 'admission')),
  add column if not exists admission_category text,
  add column if not exists header_text text,
  add column if not exists footer_text text,
  add column if not exists design_config jsonb not null default '{}'::jsonb,
  add column if not exists omr_config jsonb not null default '{}'::jsonb;

-- 5. Saved Workspace Filter Presets
create table if not exists public.saved_filters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  domain text not null check (domain in ('academic', 'admission')),
  filters jsonb not null,
  created_at timestamptz not null default now()
);

-- 6. Public SEO Learning Hub & Moderated Comments
create table if not exists public.learning_contents (
  id uuid primary key default gen_random_uuid(),
  category_slug text not null,
  domain text not null default 'academic' check (domain in ('academic', 'admission')),
  class_slug text not null,
  class_name_bn text not null,
  subject_slug text not null,
  subject_name_bn text not null,
  chapter_slug text not null,
  chapter_name_bn text not null,
  exercise_slug text not null,
  exercise_name_bn text not null,
  problem_slug text not null,
  title text not null,
  question_text text not null,
  diagram_svg text,
  image_url text,
  formulas jsonb not null default '[]'::jsonb,
  equations jsonb not null default '[]'::jsonb,
  solution_steps jsonb not null default '[]'::jsonb,
  final_answer text not null,
  youtube_url text,
  seo_title text not null,
  seo_description text not null,
  related_ids jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_slug, subject_slug, chapter_slug, exercise_slug, problem_slug)
);

create table if not exists public.learning_comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.learning_contents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  body text not null,
  liked_by_user_ids uuid[] not null default '{}',
  reported_by_user_ids uuid[] not null default '{}',
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_learning_comments_content on public.learning_comments (content_id, created_at desc);

-- 7. Public Kids Math Games, Levels, Custom Questions & Progress
create table if not exists public.kids_games (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('addition', 'subtraction', 'multiplication', 'division')),
  mode_id text not null,
  title_bn text not null,
  subtitle_bn text not null default '',
  instructions_bn text not null default '',
  difficulty text not null default 'easy' check (difficulty in ('easy', 'medium', 'hard')),
  reward_stars integer not null default 3,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.kids_game_levels (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.kids_games(id) on delete cascade,
  level_number integer not null,
  title_bn text not null,
  difficulty text not null default 'easy',
  target_score integer not null default 50,
  reward_stars integer not null default 2,
  time_limit_seconds integer
);

create table if not exists public.kids_game_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_stars integer not null default 0,
  total_score integer not null default 0,
  completed_lessons text[] not null default '{}',
  completed_levels jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 8. Row Level Security (Public read on Learning Hub & Kids Games; Owner/Admin write rules)
alter table public.admission_categories enable row level security;
alter table public.admission_institutions enable row level security;
alter table public.admission_subjects enable row level security;
alter table public.admission_topics enable row level security;
alter table public.saved_filters enable row level security;
alter table public.learning_contents enable row level security;
alter table public.learning_comments enable row level security;
alter table public.kids_games enable row level security;
alter table public.kids_game_levels enable row level security;
alter table public.kids_game_progress enable row level security;

create policy "Public read learning contents" on public.learning_contents
  for select using (is_published = true);

create policy "Public read visible comments" on public.learning_comments
  for select using (is_hidden = false);

create policy "Authenticated users add own comments" on public.learning_comments
  for insert with check (auth.uid() = user_id);

create policy "Users edit or delete own comments" on public.learning_comments
  for all using (auth.uid() = user_id);

create policy "Public read active kids games" on public.kids_games
  for select using (is_active = true);

create policy "Users manage own saved filters" on public.saved_filters
  for all using (auth.uid() = user_id);

create policy "Users manage own kids progress" on public.kids_game_progress
  for all using (auth.uid() = user_id);
