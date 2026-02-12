-- Tabela para armazenar configurações do bot HFT de cada usuário
CREATE TABLE public.bot_hft_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  patrimonio_inicial DECIMAL(20, 8) NOT NULL DEFAULT 0,
  patrimonio_atual DECIMAL(20, 8) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT false,
  auto_trade BOOLEAN NOT NULL DEFAULT true,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  max_position_size DECIMAL(10, 2) NOT NULL DEFAULT 10,
  stop_loss_percent DECIMAL(5, 2) NOT NULL DEFAULT 5,
  take_profit_percent DECIMAL(5, 2) NOT NULL DEFAULT 10,
  allowed_pairs TEXT[] NOT NULL DEFAULT ARRAY['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT'],
  trading_hours_start TIME DEFAULT '00:00:00',
  trading_hours_end TIME DEFAULT '23:59:59',
  max_daily_trades INTEGER NOT NULL DEFAULT 100,
  max_daily_loss DECIMAL(10, 2) NOT NULL DEFAULT 20,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.bot_hft_configs ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas suas próprias configurações
CREATE POLICY "Usuários podem ver suas configs"
ON public.bot_hft_configs
FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem criar suas próprias configurações
CREATE POLICY "Usuários podem criar suas configs"
ON public.bot_hft_configs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias configurações
CREATE POLICY "Usuários podem atualizar suas configs"
ON public.bot_hft_configs
FOR UPDATE
USING (auth.uid() = user_id);

-- Usuários podem deletar suas próprias configurações (reivindicar patrimônio)
CREATE POLICY "Usuários podem deletar suas configs"
ON public.bot_hft_configs
FOR DELETE
USING (auth.uid() = user_id);

-- Admins podem ver todas as configurações
CREATE POLICY "Admins podem ver todas as configs"
ON public.bot_hft_configs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at (usando função existente)
CREATE TRIGGER update_bot_hft_configs_updated_at
BEFORE UPDATE ON public.bot_hft_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Tabela para histórico de trades
CREATE TABLE public.bot_hft_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  config_id UUID REFERENCES public.bot_hft_configs(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  entry_price DECIMAL(20, 8) NOT NULL,
  exit_price DECIMAL(20, 8),
  quantity DECIMAL(20, 8) NOT NULL,
  profit_loss DECIMAL(20, 8),
  profit_percent DECIMAL(10, 4),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.bot_hft_trades ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para trades
CREATE POLICY "Usuários podem ver seus trades"
ON public.bot_hft_trades
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus trades"
ON public.bot_hft_trades
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins podem ver todos os trades
CREATE POLICY "Admins podem ver todos os trades"
ON public.bot_hft_trades
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));