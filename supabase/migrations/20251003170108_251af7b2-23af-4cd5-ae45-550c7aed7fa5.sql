-- Add attachment_url column to ticket_messages
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ticket attachments

-- Users can view their own ticket attachments and admin can view all
CREATE POLICY "Users can view their ticket attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ticket-attachments' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    is_admin(auth.uid())
  )
);

-- Users can upload attachments to their own folders
CREATE POLICY "Users can upload their own ticket attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can upload to any folder
CREATE POLICY "Admins can upload ticket attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments' AND
  is_admin(auth.uid())
);

-- Users can delete their own attachments
CREATE POLICY "Users can delete their own ticket attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ticket-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can delete any attachment
CREATE POLICY "Admins can delete any ticket attachment"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ticket-attachments' AND
  is_admin(auth.uid())
);