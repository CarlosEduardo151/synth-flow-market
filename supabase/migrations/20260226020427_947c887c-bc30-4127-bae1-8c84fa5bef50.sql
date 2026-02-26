
-- Report configurations per customer product
CREATE TABLE public.bot_report_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'weekly',  -- daily, weekly, monthly
  send_day INTEGER DEFAULT 1,               -- 0=Sun..6=Sat for weekly, 1-28 for monthly
  send_hour INTEGER DEFAULT 9,              -- 0-23 hour to send
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  report_sections TEXT[] DEFAULT '{summary,conversations,faq_hits,tokens,top_questions}',
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Report history / logs
CREATE TABLE public.bot_report_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL,
  report_config_id UUID REFERENCES public.bot_report_config(id) ON DELETE SET NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recipient_email TEXT NOT NULL,
  frequency TEXT NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  report_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'sent',  -- sent, failed, pending
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.bot_report_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_report_logs ENABLE ROW LEVEL SECURITY;

-- Policies for config
CREATE POLICY "Admins can manage bot_report_config"
ON public.bot_report_config FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can manage bot_report_config"
ON public.bot_report_config FOR ALL
USING (owns_customer_product(customer_product_id))
WITH CHECK (owns_customer_product(customer_product_id));

-- Policies for logs
CREATE POLICY "Admins can manage bot_report_logs"
ON public.bot_report_logs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can view bot_report_logs"
ON public.bot_report_logs FOR SELECT
USING (owns_customer_product(customer_product_id));

-- Indexes
CREATE INDEX idx_bot_report_config_cp ON public.bot_report_config (customer_product_id);
CREATE INDEX idx_bot_report_logs_cp ON public.bot_report_logs (customer_product_id, sent_at DESC);

-- Triggers
CREATE TRIGGER update_bot_report_config_updated_at
BEFORE UPDATE ON public.bot_report_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
