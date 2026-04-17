-- ============================================
-- SALES ASSISTANT (sa_*) BACKEND
-- ============================================

CREATE TABLE public.sa_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  ai_provider TEXT DEFAULT 'novalink',
  ai_model TEXT DEFAULT 'nova-pro',
  voice_tone TEXT DEFAULT 'profissional',
  modules_enabled JSONB NOT NULL DEFAULT '{"prospecting":true,"cadences":true,"scheduling":true,"copilot":true,"roleplay":true,"triggers":true,"antichurn":true,"winback":true,"health":true}'::jsonb,
  business_context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_product_id)
);

CREATE TABLE public.sa_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  source TEXT DEFAULT 'manual',
  ai_score INTEGER DEFAULT 0 CHECK (ai_score >= 0 AND ai_score <= 100),
  qualification TEXT DEFAULT 'lead' CHECK (qualification IN ('lead','mql','sql','customer','disqualified')),
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sa_cadences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_steps INTEGER NOT NULL DEFAULT 0,
  trigger_type TEXT DEFAULT 'manual' CHECK (trigger_type IN ('manual','new_lead','stage_change','no_response')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sa_cadence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  cadence_id UUID NOT NULL REFERENCES public.sa_cadences(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.sa_prospects(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','cancelled')),
  next_action_at TIMESTAMPTZ,
  last_action_at TIMESTAMPTZ,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sa_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.sa_prospects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  meeting_link TEXT,
  calendar_provider TEXT DEFAULT 'internal',
  calendar_event_id TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  scheduled_by_ai BOOLEAN NOT NULL DEFAULT false,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sa_copilot_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.sa_prospects(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('next_action','reply_draft','objection_handling','forecast','battle_card')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  confidence INTEGER DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE public.sa_roleplay_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  persona_name TEXT NOT NULL,
  persona_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  scenario TEXT,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_score INTEGER DEFAULT 0 CHECK (ai_score >= 0 AND ai_score <= 100),
  ai_feedback TEXT,
  strengths TEXT[] DEFAULT ARRAY[]::TEXT[],
  improvements TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sa_trigger_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.sa_prospects(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('job_change','funding','expansion','tech_adoption','news_mention','social_signal','other')),
  title TEXT NOT NULL,
  description TEXT,
  source TEXT,
  source_url TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  relevance_score INTEGER DEFAULT 0 CHECK (relevance_score >= 0 AND relevance_score <= 100),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','viewed','acted','dismissed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sa_antichurn_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.sa_prospects(id) ON DELETE CASCADE,
  churn_probability INTEGER NOT NULL DEFAULT 0 CHECK (churn_probability >= 0 AND churn_probability <= 100),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high','critical')),
  signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acted','resolved','false_positive')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sa_winback_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.sa_prospects(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  trigger_psychology TEXT[] DEFAULT ARRAY[]::TEXT[],
  message_sequence JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','recovered','failed','completed')),
  channel TEXT DEFAULT 'email' CHECK (channel IN ('email','whatsapp','sms','multi')),
  recovered BOOLEAN NOT NULL DEFAULT false,
  recovered_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sa_deal_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.sa_prospects(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  health_score INTEGER NOT NULL DEFAULT 50 CHECK (health_score >= 0 AND health_score <= 100),
  trend TEXT DEFAULT 'stable' CHECK (trend IN ('rising','stable','declining')),
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  positive_factors TEXT[] DEFAULT ARRAY[]::TEXT[],
  risk_factors TEXT[] DEFAULT ARRAY[]::TEXT[],
  recommended_action TEXT,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_sa_prospects_cp ON public.sa_prospects(customer_product_id);
CREATE INDEX idx_sa_prospects_qualification ON public.sa_prospects(qualification);
CREATE INDEX idx_sa_prospects_score ON public.sa_prospects(ai_score DESC);
CREATE INDEX idx_sa_cadences_cp ON public.sa_cadences(customer_product_id);
CREATE INDEX idx_sa_cadence_enrollments_cp ON public.sa_cadence_enrollments(customer_product_id);
CREATE INDEX idx_sa_cadence_enrollments_next ON public.sa_cadence_enrollments(next_action_at) WHERE status = 'active';
CREATE INDEX idx_sa_meetings_cp ON public.sa_meetings(customer_product_id);
CREATE INDEX idx_sa_meetings_scheduled ON public.sa_meetings(scheduled_at);
CREATE INDEX idx_sa_copilot_cp ON public.sa_copilot_suggestions(customer_product_id);
CREATE INDEX idx_sa_copilot_status ON public.sa_copilot_suggestions(status);
CREATE INDEX idx_sa_roleplay_cp ON public.sa_roleplay_sessions(customer_product_id);
CREATE INDEX idx_sa_trigger_events_cp ON public.sa_trigger_events(customer_product_id);
CREATE INDEX idx_sa_trigger_events_status ON public.sa_trigger_events(status);
CREATE INDEX idx_sa_antichurn_cp ON public.sa_antichurn_alerts(customer_product_id);
CREATE INDEX idx_sa_antichurn_risk ON public.sa_antichurn_alerts(risk_level, status);
CREATE INDEX idx_sa_winback_cp ON public.sa_winback_campaigns(customer_product_id);
CREATE INDEX idx_sa_winback_next ON public.sa_winback_campaigns(next_send_at) WHERE status = 'active';
CREATE INDEX idx_sa_health_cp ON public.sa_deal_health_scores(customer_product_id);
CREATE INDEX idx_sa_health_score ON public.sa_deal_health_scores(health_score);

-- TRIGGERS updated_at
CREATE TRIGGER trg_sa_config_updated BEFORE UPDATE ON public.sa_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sa_prospects_updated BEFORE UPDATE ON public.sa_prospects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sa_cadences_updated BEFORE UPDATE ON public.sa_cadences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sa_cadence_enrollments_updated BEFORE UPDATE ON public.sa_cadence_enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sa_meetings_updated BEFORE UPDATE ON public.sa_meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sa_roleplay_updated BEFORE UPDATE ON public.sa_roleplay_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sa_antichurn_updated BEFORE UPDATE ON public.sa_antichurn_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sa_winback_updated BEFORE UPDATE ON public.sa_winback_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sa_health_updated BEFORE UPDATE ON public.sa_deal_health_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.sa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sa_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sa_cadences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sa_cadence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sa_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sa_copilot_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sa_roleplay_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sa_trigger_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sa_antichurn_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sa_winback_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sa_deal_health_scores ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'sa_config','sa_prospects','sa_cadences','sa_cadence_enrollments',
    'sa_meetings','sa_copilot_suggestions','sa_roleplay_sessions',
    'sa_trigger_events','sa_antichurn_alerts','sa_winback_campaigns','sa_deal_health_scores'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('CREATE POLICY "Owners view %1$s" ON public.%1$I FOR SELECT USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), ''admin''));', t);
    EXECUTE format('CREATE POLICY "Owners insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), ''admin''));', t);
    EXECUTE format('CREATE POLICY "Owners update %1$s" ON public.%1$I FOR UPDATE USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), ''admin''));', t);
    EXECUTE format('CREATE POLICY "Owners delete %1$s" ON public.%1$I FOR DELETE USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), ''admin''));', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
  END LOOP;
END $$;