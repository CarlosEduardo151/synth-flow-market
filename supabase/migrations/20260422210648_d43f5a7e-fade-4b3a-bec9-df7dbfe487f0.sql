
-- Remover policies amplas (sem checagem de ownership)
DROP POLICY IF EXISTS "Auth users can view fleet evidence" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete own fleet evidence" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload fleet evidence" ON storage.objects;

-- Garantir que existe policy de UPDATE escopada por dono
DROP POLICY IF EXISTS "Users can update own fleet docs" ON storage.objects;
CREATE POLICY "Users can update own fleet docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'fleet_docs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'fleet_docs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Garantir que existe policy de DELETE escopada por dono
DROP POLICY IF EXISTS "Users can delete own fleet docs" ON storage.objects;
CREATE POLICY "Users can delete own fleet docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'fleet_docs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Admins podem gerenciar tudo (auditoria)
DROP POLICY IF EXISTS "Admins can manage all fleet docs" ON storage.objects;
CREATE POLICY "Admins can manage all fleet docs"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'fleet_docs' AND has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'fleet_docs' AND has_role(auth.uid(), 'admin'));
