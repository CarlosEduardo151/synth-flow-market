
-- Tabela de oficinas parceiras (cadastro de parceiros de manutenção)
CREATE TABLE public.fleet_partner_workshops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_product_id UUID REFERENCES public.customer_products(id),
  cnpj TEXT NOT NULL,
  razao_social TEXT,
  nome_fantasia TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  valor_hora_tecnica NUMERIC DEFAULT 0,
  categorias TEXT[] DEFAULT '{}',
  banco_nome TEXT,
  banco_agencia TEXT,
  banco_conta TEXT,
  banco_tipo_conta TEXT,
  banco_titular TEXT,
  banco_cpf_cnpj TEXT,
  pix_chave TEXT,
  alvara_url TEXT,
  fachada_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, aprovado, rejeitado
  aprovado_por UUID,
  aprovado_em TIMESTAMP WITH TIME ZONE,
  observacoes_admin TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fleet_partner_workshops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fleet_partner_workshops"
  ON public.fleet_partner_workshops FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage own fleet_partner_workshops"
  ON public.fleet_partner_workshops FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_fleet_partner_workshops_updated_at
  BEFORE UPDATE ON public.fleet_partner_workshops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de operadores de frota (clientes gestores)
CREATE TABLE public.fleet_operators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_product_id UUID REFERENCES public.customer_products(id),
  cnpj TEXT NOT NULL,
  razao_social TEXT,
  nome_fantasia TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  telefone TEXT,
  email TEXT,
  tamanho_frota INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fleet_operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fleet_operators"
  ON public.fleet_operators FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage own fleet_operators"
  ON public.fleet_operators FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_fleet_operators_updated_at
  BEFORE UPDATE ON public.fleet_operators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de convites de motoristas
CREATE TABLE public.fleet_driver_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.fleet_operators(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  motorista_nome TEXT,
  motorista_telefone TEXT,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, aceito, expirado
  accepted_by UUID,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fleet_driver_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fleet_driver_invites"
  ON public.fleet_driver_invites FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Operators can manage own invites"
  ON public.fleet_driver_invites FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.fleet_operators fo
    WHERE fo.id = fleet_driver_invites.operator_id AND fo.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.fleet_operators fo
    WHERE fo.id = fleet_driver_invites.operator_id AND fo.user_id = auth.uid()
  ));

-- Bucket para uploads de alvará/fachada
INSERT INTO storage.buckets (id, name, public) VALUES ('fleet_docs', 'fleet_docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own fleet docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'fleet_docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own fleet docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fleet_docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all fleet docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fleet_docs' AND has_role(auth.uid(), 'admin'::app_role));
