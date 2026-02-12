-- Tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Usuários podem criar seu próprio perfil" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins podem ver todos os perfis" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Trigger para criar perfil automaticamente quando usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tabela de avaliações de clientes (página inicial)
CREATE TABLE IF NOT EXISTS public.customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  review_text text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  avatar_url text,
  is_featured boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode ver reviews em destaque" ON public.customer_reviews
  FOR SELECT USING (true);

CREATE POLICY "Admins podem gerenciar reviews" ON public.customer_reviews
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Tabela de avaliações de produtos
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL,
  is_approved boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode ver reviews aprovadas" ON public.product_reviews
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Usuários podem criar reviews" ON public.product_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem ver suas próprias reviews" ON public.product_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar reviews" ON public.product_reviews
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Tabela de mensagens de chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail text,
  message text NOT NULL,
  is_from_user boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas mensagens" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar mensagens" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins podem ver todas as mensagens" ON public.chat_messages
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Tabela de credenciais de produtos
CREATE TABLE IF NOT EXISTS public.product_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credential_type text NOT NULL,
  credential_name text NOT NULL,
  credential_value text NOT NULL,
  n8n_doc_url text,
  is_valid boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas credenciais" ON public.product_credentials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar credenciais" ON public.product_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas credenciais" ON public.product_credentials
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas credenciais" ON public.product_credentials
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar credenciais" ON public.product_credentials
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Tabela de credenciais requeridas por produto
CREATE TABLE IF NOT EXISTS public.product_required_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug text NOT NULL,
  credential_type text NOT NULL,
  credential_name text NOT NULL,
  description text,
  n8n_doc_url text,
  is_required boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_required_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode ver credenciais requeridas" ON public.product_required_credentials
  FOR SELECT USING (true);

CREATE POLICY "Admins podem gerenciar credenciais requeridas" ON public.product_required_credentials
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Tabela de progresso de tutoriais
CREATE TABLE IF NOT EXISTS public.tutorial_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_slug text NOT NULL,
  step_id text NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_slug, step_id)
);

ALTER TABLE public.tutorial_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu progresso" ON public.tutorial_completions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar progresso" ON public.tutorial_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar progresso" ON public.tutorial_completions
  FOR DELETE USING (auth.uid() = user_id);

-- Tabela de configuração de controle de IA
CREATE TABLE IF NOT EXISTS public.ai_control_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agent_name text DEFAULT 'Assistente IA',
  system_prompt text,
  temperature numeric DEFAULT 0.7,
  max_tokens integer DEFAULT 1000,
  is_active boolean DEFAULT true,
  webhook_url text,
  tools jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

ALTER TABLE public.ai_control_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas configs" ON public.ai_control_config
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar configs" ON public.ai_control_config
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas configs" ON public.ai_control_config
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas configs" ON public.ai_control_config
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar configs" ON public.ai_control_config
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Tabela de tickets de suporte
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category text,
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus tickets" ON public.support_tickets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar tickets" ON public.support_tickets
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Tabela de mensagens de tickets
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  is_internal boolean DEFAULT false,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver mensagens dos seus tickets" ON public.ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = ticket_id AND user_id = auth.uid()
    ) AND is_internal = false
  );

CREATE POLICY "Usuários podem criar mensagens" ON public.ticket_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar mensagens" ON public.ticket_messages
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Tabela de aluguéis de produtos
CREATE TABLE IF NOT EXISTS public.product_rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_slug text NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus aluguéis" ON public.product_rentals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar aluguéis" ON public.product_rentals
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Tabela de itens de pedido
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_slug text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver itens dos seus pedidos" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar itens" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins podem gerenciar itens" ON public.order_items
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Tabela de cupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL,
  min_order_value numeric DEFAULT 0,
  max_uses integer,
  current_uses integer DEFAULT 0,
  is_active boolean DEFAULT true,
  starts_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode ver cupons ativos" ON public.coupons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins podem gerenciar cupons" ON public.coupons
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Tabela de leads WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  name text,
  message text,
  source text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar leads" ON public.whatsapp_leads
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Tabela de parcelas
CREATE TABLE IF NOT EXISTS public.installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  installment_number integer NOT NULL,
  amount integer NOT NULL,
  due_date date NOT NULL,
  paid_at timestamp with time zone,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas parcelas" ON public.installments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins podem gerenciar parcelas" ON public.installments
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Triggers de updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_product_credentials_updated_at BEFORE UPDATE ON public.product_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_ai_control_config_updated_at BEFORE UPDATE ON public.ai_control_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_whatsapp_leads_updated_at BEFORE UPDATE ON public.whatsapp_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Inserir algumas avaliações de exemplo para a página inicial
INSERT INTO public.customer_reviews (customer_name, review_text, rating, is_featured) VALUES
('Carlos Silva', 'O sistema de cobrança automatizada revolucionou minha empresa. Reduzi a inadimplência em 45% no primeiro mês!', 5, true),
('Ana Santos', 'Excelente suporte e os agentes de IA são muito inteligentes. Recomendo para qualquer microempresa.', 5, true),
('Pedro Costa', 'O CRM simples é perfeito para quem está começando. Interface intuitiva e preço justo.', 4, true),
('Maria Oliveira', 'A automação de posts sociais economiza horas do meu dia. Muito satisfeita com o investimento!', 5, true)
ON CONFLICT DO NOTHING;