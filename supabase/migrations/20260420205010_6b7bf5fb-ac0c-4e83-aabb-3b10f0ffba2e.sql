DROP POLICY IF EXISTS "Service role can write DAS PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update DAS PDFs" ON storage.objects;

CREATE POLICY "Owners can write their DAS PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'das_guides'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.customer_products cp
        WHERE cp.user_id = auth.uid()
          AND cp.id::text = (storage.foldername(name))[1]
      )
    )
  );

CREATE POLICY "Owners can update their DAS PDFs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'das_guides'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.customer_products cp
        WHERE cp.user_id = auth.uid()
          AND cp.id::text = (storage.foldername(name))[1]
      )
    )
  );