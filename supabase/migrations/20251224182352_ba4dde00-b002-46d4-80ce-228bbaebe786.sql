-- Tabela para gerenciar testes grátis
CREATE TABLE public.free_trials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_slug TEXT NOT NULL,
  product_title TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '2 days'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'converted')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Garantir que um usuário não pode ter mais de um trial ativo do mesmo produto
  UNIQUE(user_id, product_slug)
);

-- Enable RLS
ALTER TABLE public.free_trials ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Users can view their own trials"
ON public.free_trials
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trials"
ON public.free_trials
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trials"
ON public.free_trials
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_free_trials_updated_at
BEFORE UPDATE ON public.free_trials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para verificar limite de 2 trials ativos por usuário
CREATE OR REPLACE FUNCTION public.check_trial_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) 
    FROM public.free_trials 
    WHERE user_id = NEW.user_id 
    AND status = 'active'
  ) >= 2 THEN
    RAISE EXCEPTION 'Você já possui 2 produtos em teste grátis ativo';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para verificar limite antes de inserir
CREATE TRIGGER check_trial_limit_trigger
BEFORE INSERT ON public.free_trials
FOR EACH ROW
EXECUTE FUNCTION public.check_trial_limit();

-- Função para atualizar status de trials expirados
CREATE OR REPLACE FUNCTION public.update_expired_trials()
RETURNS void AS $$
BEGIN
  UPDATE public.free_trials
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;