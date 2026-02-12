-- Criar bucket para comprovantes de pagamento
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprovantes',
  'comprovantes',
  false,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
);

-- Política: Usuários podem fazer upload de seus próprios comprovantes
CREATE POLICY "Users can upload own payment receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'comprovantes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: Usuários podem visualizar seus próprios comprovantes
CREATE POLICY "Users can view own payment receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'comprovantes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: Admins podem visualizar todos os comprovantes
CREATE POLICY "Admins can view all payment receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'comprovantes' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Política: Usuários podem atualizar seus próprios comprovantes
CREATE POLICY "Users can update own payment receipts"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'comprovantes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: Usuários podem deletar seus próprios comprovantes
CREATE POLICY "Users can delete own payment receipts"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'comprovantes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);