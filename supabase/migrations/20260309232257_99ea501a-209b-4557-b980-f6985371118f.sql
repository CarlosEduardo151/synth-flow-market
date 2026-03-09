
-- Evidence photos table
CREATE TABLE public.fleet_evidence_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.fleet_service_orders(id) ON DELETE CASCADE,
  customer_product_id UUID NOT NULL,
  uploaded_by TEXT NOT NULL DEFAULT 'sistema',
  category TEXT NOT NULL DEFAULT 'geral',
  caption TEXT,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_fleet_evidence_photos_so ON public.fleet_evidence_photos(service_order_id);
CREATE INDEX idx_fleet_evidence_photos_cp ON public.fleet_evidence_photos(customer_product_id);

-- Enable RLS
ALTER TABLE public.fleet_evidence_photos ENABLE ROW LEVEL SECURITY;

-- RLS: users can see photos for their own customer_products
CREATE POLICY "Users can view own evidence photos"
  ON public.fleet_evidence_photos
  FOR SELECT
  TO authenticated
  USING (public.owns_customer_product(customer_product_id));

-- RLS: users can insert photos for their own customer_products
CREATE POLICY "Users can insert own evidence photos"
  ON public.fleet_evidence_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_customer_product(customer_product_id));

-- RLS: users can delete own photos
CREATE POLICY "Users can delete own evidence photos"
  ON public.fleet_evidence_photos
  FOR DELETE
  TO authenticated
  USING (public.owns_customer_product(customer_product_id));

-- RLS: admins can do everything
CREATE POLICY "Admins full access evidence photos"
  ON public.fleet_evidence_photos
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Workshop access: workshops can see/insert photos for SOs assigned to them
CREATE POLICY "Workshops can view assigned SO photos"
  ON public.fleet_evidence_photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fleet_service_orders fso
      JOIN public.fleet_partner_workshops fpw ON fpw.id = fso.workshop_id
      WHERE fso.id = fleet_evidence_photos.service_order_id
        AND fpw.user_id = auth.uid()
    )
  );

CREATE POLICY "Workshops can insert assigned SO photos"
  ON public.fleet_evidence_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fleet_service_orders fso
      JOIN public.fleet_partner_workshops fpw ON fpw.id = fso.workshop_id
      WHERE fso.id = fleet_evidence_photos.service_order_id
        AND fpw.user_id = auth.uid()
    )
  );

-- Storage policies for fleet_docs bucket (evidence photos)
CREATE POLICY "Auth users can upload fleet evidence"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'fleet_docs');

CREATE POLICY "Auth users can view fleet evidence"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'fleet_docs');

CREATE POLICY "Auth users can delete own fleet evidence"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'fleet_docs');

-- Make fleet_docs bucket public for viewing photos
UPDATE storage.buckets SET public = true WHERE id = 'fleet_docs';

-- Grant service_role access
GRANT ALL ON public.fleet_evidence_photos TO service_role;
