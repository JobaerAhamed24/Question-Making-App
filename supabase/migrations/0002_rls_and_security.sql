-- QuestionBank RLS Policies, Security-Definer Helpers & Atomic Workflows (Milestone 2 / 6 / 8)

-- ============================================================================
-- 1. SECURITY-DEFINER ACCESS CONTROL HELPERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = check_user_id
      AND ur.role = 'admin'
      AND p.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.has_active_class_access(
  check_user_id UUID,
  target_class_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(check_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.subscription_classes sc ON sc.subscription_id = s.id
      JOIN public.profiles p ON p.id = s.user_id
      WHERE s.user_id = check_user_id
        AND p.status = 'active'
        AND s.status = 'active'
        AND s.starts_at <= NOW()
        AND s.expires_at > NOW()
        AND sc.class_id = target_class_id
    );
$$;

REVOKE ALL ON FUNCTION public.has_active_class_access(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_class_access(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_read_question(
  check_user_id UUID,
  target_question_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(check_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.questions q
      WHERE q.id = target_question_id
        AND q.status = 'published'
        AND public.has_active_class_access(check_user_id, q.class_id)
    );
$$;

REVOKE ALL ON FUNCTION public.can_read_question(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_question(UUID, TEXT) TO authenticated;

-- Prevent non-admin users from altering sensitive profile fields (status)
CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    NEW.status := OLD.status;
    NEW.email := OLD.email;
    NEW.email_verified := OLD.email_verified;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_update ON public.profiles;
CREATE TRIGGER trg_guard_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY ON EVERY TABLE
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.difficulty_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_stimuli ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_subparts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. POLICIES: PROFILES & ROLES
-- ============================================================================
CREATE POLICY "profiles_read_own_or_admin"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "user_roles_read_own_or_admin"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "user_roles_admin_manage"
  ON public.user_roles FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- 4. POLICIES: PUBLIC CATALOGUE & CMS
-- ============================================================================
CREATE POLICY "public_read_classes" ON public.classes FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "admin_manage_classes" ON public.classes FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "public_read_groups" ON public.groups FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "admin_manage_groups" ON public.groups FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "public_read_subjects" ON public.subjects FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "admin_manage_subjects" ON public.subjects FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "public_read_chapters" ON public.chapters FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "admin_manage_chapters" ON public.chapters FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "public_read_topics" ON public.topics FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "admin_manage_topics" ON public.topics FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "public_read_qtypes" ON public.question_types FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "admin_manage_qtypes" ON public.question_types FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "public_read_difficulty" ON public.difficulty_levels FOR SELECT USING (TRUE);

CREATE POLICY "public_read_plans" ON public.plans FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "admin_manage_plans" ON public.plans FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "public_read_plan_classes" ON public.plan_classes FOR SELECT USING (TRUE);
CREATE POLICY "admin_manage_plan_classes" ON public.plan_classes FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "public_read_plan_features" ON public.plan_features FOR SELECT USING (TRUE);
CREATE POLICY "admin_manage_plan_features" ON public.plan_features FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "public_read_payment_methods" ON public.payment_methods FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "admin_manage_payment_methods" ON public.payment_methods FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "public_read_site_settings" ON public.site_settings FOR SELECT USING (TRUE);
CREATE POLICY "admin_manage_site_settings" ON public.site_settings FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "public_read_notices" ON public.notices FOR SELECT USING (is_published OR public.is_admin(auth.uid()));
CREATE POLICY "admin_manage_notices" ON public.notices FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "public_read_faqs" ON public.faqs FOR SELECT USING (is_published OR public.is_admin(auth.uid()));
CREATE POLICY "admin_manage_faqs" ON public.faqs FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "public_insert_contact" ON public.contact_messages FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "admin_manage_contact" ON public.contact_messages FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "admin_update_contact" ON public.contact_messages FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- 5. POLICIES: CLASS-GATED QUESTION BANK & PROTECTED CHILD TABLES
-- ============================================================================
CREATE POLICY "questions_read_entitled"
  ON public.questions FOR SELECT
  USING (public.can_read_question(auth.uid(), id));

CREATE POLICY "questions_admin_write"
  ON public.questions FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "q_stimuli_read_entitled"
  ON public.question_stimuli FOR SELECT
  USING (public.can_read_question(auth.uid(), question_id));
CREATE POLICY "q_stimuli_admin_write"
  ON public.question_stimuli FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "q_options_read_entitled"
  ON public.question_options FOR SELECT
  USING (public.can_read_question(auth.uid(), question_id));
CREATE POLICY "q_options_admin_write"
  ON public.question_options FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "q_answers_read_entitled"
  ON public.question_answers FOR SELECT
  USING (public.can_read_question(auth.uid(), question_id));
CREATE POLICY "q_answers_admin_write"
  ON public.question_answers FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "q_subparts_read_entitled"
  ON public.question_subparts FOR SELECT
  USING (public.can_read_question(auth.uid(), question_id));
CREATE POLICY "q_subparts_admin_write"
  ON public.question_subparts FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "q_tags_read_entitled"
  ON public.question_tags FOR SELECT
  USING (public.can_read_question(auth.uid(), question_id));
CREATE POLICY "q_tags_admin_write"
  ON public.question_tags FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- 6. POLICIES: SUBSCRIPTIONS & MANUAL PAYMENTS
-- ============================================================================
CREATE POLICY "subs_read_own_or_admin"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "subs_admin_manage"
  ON public.subscriptions FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "sub_classes_read_own_or_admin"
  ON public.subscription_classes FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.id = subscription_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "payments_read_own_or_admin"
  ON public.payments FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Clients cannot insert approved payments directly or alter status
CREATE POLICY "payments_insert_own_pending"
  ON public.payments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND reviewed_by_admin_id IS NULL
    AND reviewed_at IS NULL
  );

CREATE POLICY "payments_admin_update"
  ON public.payments FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "receipts_read_owner_or_admin"
  ON public.payment_receipts FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "receipts_insert_owner"
  ON public.payment_receipts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_reviews_admin_only"
  ON public.payment_reviews FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- 7. POLICIES: FAVORITES, SAVED QUESTIONS, PAPERS, SNAPSHOTS, EXPORTS
-- ============================================================================
CREATE POLICY "favorites_own_accessible"
  ON public.favorites FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_read_question(auth.uid(), question_id)
  );

CREATE POLICY "saved_questions_own_accessible"
  ON public.saved_questions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_read_question(auth.uid(), question_id)
  );

-- Saved papers remain readable/exportable after expiry
CREATE POLICY "papers_read_own_or_admin"
  ON public.papers FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- New paper creation with class questions requires active class access
CREATE POLICY "papers_insert_active_subscriber"
  ON public.papers FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.has_active_class_access(auth.uid(), class_id)
  );

CREATE POLICY "papers_update_own"
  ON public.papers FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "papers_delete_own"
  ON public.papers FOR DELETE
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "paper_questions_read_own_or_admin"
  ON public.paper_questions FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.user_id = auth.uid())
  );

-- Adding new QB question items requires active access to that paper's class
CREATE POLICY "paper_questions_insert_active_access"
  ON public.paper_questions FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.papers p
      WHERE p.id = paper_id
        AND p.user_id = auth.uid()
        AND public.has_active_class_access(auth.uid(), p.class_id)
        AND (question_id IS NULL OR public.can_read_question(auth.uid(), question_id))
    )
  );

CREATE POLICY "paper_questions_update_delete_own"
  ON public.paper_questions FOR UPDATE
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.user_id = auth.uid())
  );

CREATE POLICY "paper_questions_delete_own"
  ON public.paper_questions FOR DELETE
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.user_id = auth.uid())
  );

CREATE POLICY "exports_read_insert_own"
  ON public.export_history FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "exports_insert_own"
  ON public.export_history FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.user_id = auth.uid())
  );

CREATE POLICY "activity_logs_admin_read"
  ON public.activity_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

-- ============================================================================
-- 8. ATOMIC SERVER-SIDE PAYMENT REVIEW & SUBSCRIPTION EXPIRY FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.review_payment_atomic(
  p_payment_id TEXT,
  p_admin_id UUID,
  p_decision TEXT,
  p_review_note TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_plan public.plans%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_sub_id TEXT;
  v_expires TIMESTAMPTZ;
  v_admin_name TEXT;
BEGIN
  IF NOT public.is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: admin privileges required';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid payment decision: %', p_decision;
  END IF;

  -- Lock payment row to make approval atomic & idempotent
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.status <> 'pending' THEN
    RAISE EXCEPTION 'Payment has already been reviewed (status: %)', v_payment.status;
  END IF;

  SELECT full_name INTO v_admin_name FROM public.profiles WHERE id = p_admin_id;

  IF p_decision = 'rejected' THEN
    UPDATE public.payments
    SET status = 'rejected',
        reviewed_by_admin_id = p_admin_id,
        reviewed_at = v_now,
        review_note = COALESCE(NULLIF(trim(p_review_note), ''), 'পেমেন্ট যাচাই ব্যর্থ হয়েছে।')
    WHERE id = p_payment_id;

    INSERT INTO public.payment_reviews (payment_id, admin_user_id, decision, review_note)
    VALUES (p_payment_id, p_admin_id, 'rejected', COALESCE(NULLIF(trim(p_review_note), ''), 'পেমেন্ট যাচাই ব্যর্থ হয়েছে।'));

    INSERT INTO public.activity_logs (id, actor_user_id, actor_name, actor_role, action, target_type, target_id, details)
    VALUES ('log-' || replace(gen_random_uuid()::text, '-', ''), p_admin_id, COALESCE(v_admin_name, 'Admin'), 'admin',
      'পেমেন্ট বাতিল করেছেন: ' || v_payment.transaction_ref, 'payment', p_payment_id, COALESCE(p_review_note, ''));

    RETURN jsonb_build_object('status', 'rejected', 'payment_id', p_payment_id);
  END IF;

  -- Approval path: revalidate plan and activate immediately (no carry-forward)
  SELECT * INTO v_plan FROM public.plans WHERE id = v_payment.plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated plan no longer exists';
  END IF;

  v_sub_id := 'sub-' || replace(gen_random_uuid()::text, '-', '');
  v_expires := v_now + (v_plan.duration_days || ' days')::INTERVAL;

  UPDATE public.payments
  SET status = 'approved',
      reviewed_by_admin_id = p_admin_id,
      reviewed_at = v_now,
      review_note = COALESCE(NULLIF(trim(p_review_note), ''), 'যাচাইকৃত ও সক্রিয় করা হয়েছে।')
  WHERE id = p_payment_id;

  INSERT INTO public.subscriptions (
    id, user_id, plan_id, plan_name_snapshot, price_snapshot_bdt,
    duration_days_snapshot, status, starts_at, expires_at, payment_id, activated_by_admin_id
  ) VALUES (
    v_sub_id, v_payment.user_id, v_plan.id, v_payment.plan_name_snapshot,
    v_payment.expected_amount_bdt, v_plan.duration_days, 'active', v_now, v_expires, p_payment_id, p_admin_id
  );

  INSERT INTO public.subscription_classes (subscription_id, class_id)
  SELECT v_sub_id, pc.class_id
  FROM public.plan_classes pc
  WHERE pc.plan_id = v_plan.id;

  INSERT INTO public.payment_reviews (payment_id, admin_user_id, decision, review_note)
  VALUES (p_payment_id, p_admin_id, 'approved', COALESCE(NULLIF(trim(p_review_note), ''), 'যাচাইকৃত ও সক্রিয় করা হয়েছে।'));

  INSERT INTO public.activity_logs (id, actor_user_id, actor_name, actor_role, action, target_type, target_id, details)
  VALUES ('log-' || replace(gen_random_uuid()::text, '-', ''), p_admin_id, COALESCE(v_admin_name, 'Admin'), 'admin',
    'পেমেন্ট অনুমোদন করেছেন: ' || v_payment.transaction_ref, 'payment', p_payment_id,
    v_payment.plan_name_snapshot || ' তাৎক্ষণিকভাবে সক্রিয় হয়েছে।');

  RETURN jsonb_build_object(
    'status', 'approved',
    'payment_id', p_payment_id,
    'subscription_id', v_sub_id,
    'starts_at', v_now,
    'expires_at', v_expires
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_payment_atomic(TEXT, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_payment_atomic(TEXT, UUID, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.expire_stale_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.subscriptions
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at <= NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
