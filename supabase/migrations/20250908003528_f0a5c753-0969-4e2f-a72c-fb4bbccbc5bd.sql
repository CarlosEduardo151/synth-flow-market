-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('comprovantes', 'comprovantes', false);

-- Create policies for payment receipts storage
CREATE POLICY "Users can upload their payment receipts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own payment receipts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all payment receipts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'comprovantes' AND is_admin(auth.uid()));

-- Add payment receipt URL to orders table
ALTER TABLE orders ADD COLUMN payment_receipt_url TEXT;