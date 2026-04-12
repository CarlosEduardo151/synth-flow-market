
-- =============================================
-- NOVALINK MICRO-BUSINESS SUITE - FULL SCHEMA
-- =============================================

-- 1. Catálogo de Produtos/Serviços
CREATE TABLE public.micro_biz_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price NUMERIC(10,2),
  photo_url TEXT,
  photo_storage_path TEXT,
  ai_description JSONB,
  ai_vision_analysis JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.micro_biz_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own micro_biz_products"
  ON public.micro_biz_products FOR ALL
  USING (public.owns_customer_product(customer_product_id))
  WITH CHECK (public.owns_customer_product(customer_product_id));

CREATE TRIGGER update_micro_biz_products_updated_at
  BEFORE UPDATE ON public.micro_biz_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Criativos Publicitários (Gerados por FLUX/IA)
CREATE TABLE public.micro_biz_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.micro_biz_products(id) ON DELETE SET NULL,
  prompt_used TEXT,
  image_url TEXT,
  image_storage_path TEXT,
  copy_options JSONB DEFAULT '[]'::jsonb,
  selected_copy TEXT,
  style_preset TEXT DEFAULT 'professional',
  flux_model_used TEXT DEFAULT 'flux-1-pro',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.micro_biz_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own micro_biz_creatives"
  ON public.micro_biz_creatives FOR ALL
  USING (public.owns_customer_product(customer_product_id))
  WITH CHECK (public.owns_customer_product(customer_product_id));

CREATE TRIGGER update_micro_biz_creatives_updated_at
  BEFORE UPDATE ON public.micro_biz_creatives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Campanhas Meta Ads
CREATE TABLE public.micro_biz_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  creative_id UUID REFERENCES public.micro_biz_creatives(id) ON DELETE SET NULL,
  platform TEXT NOT NULL DEFAULT 'instagram',
  budget_cents INTEGER NOT NULL DEFAULT 1000,
  duration_days INTEGER NOT NULL DEFAULT 7,
  target_audience JSONB DEFAULT '{}'::jsonb,
  meta_campaign_id TEXT,
  meta_adset_id TEXT,
  meta_ad_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend_cents INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.micro_biz_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own micro_biz_campaigns"
  ON public.micro_biz_campaigns FOR ALL
  USING (public.owns_customer_product(customer_product_id))
  WITH CHECK (public.owns_customer_product(customer_product_id));

CREATE TRIGGER update_micro_biz_campaigns_updated_at
  BEFORE UPDATE ON public.micro_biz_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. CRM Invisível - Leads
CREATE TABLE public.micro_biz_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  phone TEXT,
  name TEXT,
  company TEXT,
  email TEXT,
  interest TEXT,
  purchase_intent_score INTEGER DEFAULT 0,
  next_step TEXT,
  source TEXT NOT NULL DEFAULT 'whatsapp',
  raw_conversation_summary TEXT,
  sentiment TEXT,
  tags TEXT[] DEFAULT '{}',
  last_contact_at TIMESTAMPTZ DEFAULT now(),
  is_converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  total_interactions INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.micro_biz_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own micro_biz_leads"
  ON public.micro_biz_leads FOR ALL
  USING (public.owns_customer_product(customer_product_id))
  WITH CHECK (public.owns_customer_product(customer_product_id));

CREATE TRIGGER update_micro_biz_leads_updated_at
  BEFORE UPDATE ON public.micro_biz_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_micro_biz_leads_phone ON public.micro_biz_leads(customer_product_id, phone);
CREATE INDEX idx_micro_biz_leads_intent ON public.micro_biz_leads(purchase_intent_score DESC);

-- 5. Log de Conversas Processadas
CREATE TABLE public.micro_biz_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.micro_biz_leads(id) ON DELETE SET NULL,
  phone TEXT,
  direction TEXT NOT NULL DEFAULT 'inbound',
  message_text TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  ai_extracted_data JSONB,
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  processing_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.micro_biz_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own micro_biz_conversations"
  ON public.micro_biz_conversations FOR ALL
  USING (public.owns_customer_product(customer_product_id))
  WITH CHECK (public.owns_customer_product(customer_product_id));

CREATE INDEX idx_micro_biz_conversations_lead ON public.micro_biz_conversations(lead_id);
CREATE INDEX idx_micro_biz_conversations_phone ON public.micro_biz_conversations(customer_product_id, phone);

-- 6. Configuração de IA por Cliente
CREATE TABLE public.micro_biz_ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE UNIQUE,
  vision_model TEXT DEFAULT 'llama-4-scout',
  chat_model TEXT DEFAULT 'llama-3.3-70b-versatile',
  creative_model TEXT DEFAULT 'gpt-oss-120b',
  audio_model TEXT DEFAULT 'whisper-large-v3-turbo',
  system_prompt TEXT DEFAULT 'Você é um assistente de vendas inteligente para micro-empresas brasileiras. Seja direto, amigável e focado em conversão.',
  temperature NUMERIC(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1024,
  auto_publish_ads BOOLEAN DEFAULT false,
  default_budget_cents INTEGER DEFAULT 1000,
  target_audience_template JSONB DEFAULT '{"age_min": 18, "age_max": 65, "radius_km": 15}'::jsonb,
  business_type TEXT,
  business_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.micro_biz_ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own micro_biz_ai_config"
  ON public.micro_biz_ai_config FOR ALL
  USING (public.owns_customer_product(customer_product_id))
  WITH CHECK (public.owns_customer_product(customer_product_id));

CREATE TRIGGER update_micro_biz_ai_config_updated_at
  BEFORE UPDATE ON public.micro_biz_ai_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grants para service_role (Edge Functions)
GRANT ALL ON public.micro_biz_products TO service_role;
GRANT ALL ON public.micro_biz_creatives TO service_role;
GRANT ALL ON public.micro_biz_campaigns TO service_role;
GRANT ALL ON public.micro_biz_leads TO service_role;
GRANT ALL ON public.micro_biz_conversations TO service_role;
GRANT ALL ON public.micro_biz_ai_config TO service_role;
