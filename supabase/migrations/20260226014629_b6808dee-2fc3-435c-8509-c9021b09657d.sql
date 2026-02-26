
-- Knowledge base table for storing business knowledge entries
CREATE TABLE public.bot_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'document', 'website', 'spreadsheet'
  title TEXT NOT NULL,
  content TEXT, -- extracted/processed text content
  source_url TEXT, -- for website entries
  file_name TEXT, -- for uploaded files
  file_mime_type TEXT,
  file_size_bytes BIGINT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ready', -- 'processing', 'ready', 'error'
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Policies: owners can manage, admins can manage
CREATE POLICY "Owners can manage bot_knowledge_base"
  ON public.bot_knowledge_base
  FOR ALL
  USING (owns_customer_product(customer_product_id))
  WITH CHECK (owns_customer_product(customer_product_id));

CREATE POLICY "Admins can manage bot_knowledge_base"
  ON public.bot_knowledge_base
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookup by customer_product_id
CREATE INDEX idx_bot_knowledge_base_cp ON public.bot_knowledge_base(customer_product_id);

-- Grant permissions for edge functions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_knowledge_base TO service_role, authenticated;

-- Storage bucket for knowledge base files
INSERT INTO storage.buckets (id, name, public) VALUES ('bot_knowledge', 'bot_knowledge', false);

-- Storage policies
CREATE POLICY "Users can upload own knowledge files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'bot_knowledge' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own knowledge files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bot_knowledge' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own knowledge files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'bot_knowledge' AND auth.uid()::text = (storage.foldername(name))[1]);
