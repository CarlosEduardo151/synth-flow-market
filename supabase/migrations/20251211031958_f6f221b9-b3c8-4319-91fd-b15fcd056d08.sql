-- Tabela para créditos StarAI
CREATE TABLE public.starai_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  balance_brl DECIMAL(10,2) NOT NULL DEFAULT 75.00, -- Saldo em reais (75 BRL grátis inicial)
  free_balance_brl DECIMAL(10,2) NOT NULL DEFAULT 75.00, -- Bônus grátis
  deposited_brl DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Total depositado
  total_used_brl DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Total consumido
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela para transações de crédito StarAI
CREATE TABLE public.starai_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'usage', 'bonus', 'refund')),
  amount_brl DECIMAL(10,2) NOT NULL,
  description TEXT,
  payment_id VARCHAR(255), -- ID do pagamento MP se for depósito
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.starai_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starai_transactions ENABLE ROW LEVEL SECURITY;

-- Policies para starai_credits
CREATE POLICY "Users can view their own credits"
ON public.starai_credits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credits"
ON public.starai_credits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits"
ON public.starai_credits FOR UPDATE
USING (auth.uid() = user_id);

-- Policies para starai_transactions
CREATE POLICY "Users can view their own transactions"
ON public.starai_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
ON public.starai_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_starai_credits_updated_at
BEFORE UPDATE ON public.starai_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_starai_credits_user_id ON public.starai_credits(user_id);
CREATE INDEX idx_starai_transactions_user_id ON public.starai_transactions(user_id);
CREATE INDEX idx_starai_transactions_type ON public.starai_transactions(type);