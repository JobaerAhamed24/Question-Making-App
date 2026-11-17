-- QuestionBank Private Storage Buckets & Access Policies (Milestone 10)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('question-images', 'question-images', FALSE, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('payment-receipts', 'payment-receipts', FALSE, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  ('school-logos', 'school-logos', FALSE, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('profile-images', 'profile-images', FALSE, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('exported-papers', 'exported-papers', FALSE, 15728640, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- payment-receipts: owner uploads & reads own folder (/{user_id}/...); admin reads all
CREATE POLICY "receipts_bucket_owner_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "receipts_bucket_owner_or_admin_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-receipts'
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- school-logos & profile-images: owner manages own folder
CREATE POLICY "user_assets_owner_manage"
  ON storage.objects FOR ALL
  USING (
    bucket_id IN ('school-logos', 'profile-images')
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  )
  WITH CHECK (
    bucket_id IN ('school-logos', 'profile-images')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- exported-papers: private per user; admin can audit
CREATE POLICY "exported_papers_owner_or_admin"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'exported-papers'
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  )
  WITH CHECK (
    bucket_id = 'exported-papers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- question-images: stored by class folder (/{class_id}/...); readable only by active subscribers of that class or admin
CREATE POLICY "question_images_admin_manage"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'question-images'
    AND public.is_admin(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'question-images'
    AND public.is_admin(auth.uid())
  );

CREATE POLICY "question_images_subscriber_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'question-images'
    AND public.has_active_class_access(auth.uid(), (storage.foldername(name))[1])
  );
