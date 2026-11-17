-- QuestionBank Realtime Publication Setup (Supabase Postgres CDC)
-- Enables live postgres_changes streams for authorized QuestionBank tables.

DO $$
DECLARE
  tbl TEXT;
  realtime_tables TEXT[] := ARRAY[
    'classes',
    'groups',
    'subjects',
    'chapters',
    'topics',
    'question_types',
    'questions',
    'question_options',
    'question_answers',
    'question_subparts',
    'plans',
    'plan_classes',
    'payment_methods',
    'payments',
    'subscriptions',
    'subscription_classes',
    'favorites',
    'saved_questions',
    'papers',
    'paper_questions',
    'export_history',
    'site_settings',
    'notices',
    'faqs',
    'contact_messages',
    'activity_logs'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH tbl IN ARRAY realtime_tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', tbl);
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    END IF;
  END LOOP;
END $$;
