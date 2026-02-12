import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface BotHFTConfig {
  id: string;
  user_id: string;
  exchange: string;
  api_key: string | null;
  api_secret: string | null;
  initial_capital: number | null;
  patrimonio_atual: number | null;
  is_active: boolean | null;
  risk_level: string | null;
  strategy: string | null;
  trading_pair: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BotHFTTrade {
  id: string;
  user_id: string;
  config_id: string;
  pair: string;
  side: 'buy' | 'sell';
  entry_price: number;
  exit_price?: number;
  quantity: number;
  profit_loss?: number;
  profit_percent?: number;
  status: 'open' | 'closed' | 'cancelled';
  opened_at: string;
  closed_at?: string;
  created_at: string;
}

export function useBotHFTConfig() {
  const { user } = useAuth();
  const [config, setConfig] = useState<BotHFTConfig | null>(null);
  const [trades, setTrades] = useState<BotHFTTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!user?.id) {
      setConfig(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bot_hft_configs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setConfig(data as BotHFTConfig);
      } else {
        setConfig(null);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração do bot:', error);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadTrades = useCallback(async () => {
    if (!user?.id) return;

    // Note: bot_hft_trades table may not exist yet
    setTrades([]);
  }, [user?.id]);

  const saveConfig = useCallback(async (newConfig: Partial<BotHFTConfig>) => {
    if (!user?.id) return false;

    setSaving(true);
    try {
      if (config?.id) {
        const { error } = await supabase
          .from('bot_hft_configs')
          .update(newConfig)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bot_hft_configs')
          .insert({
            user_id: user.id,
            exchange: 'binance',
            ...newConfig,
          });

        if (error) throw error;
      }

      await loadConfig();
      return true;
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [user?.id, config?.id, loadConfig]);

  const startBot = useCallback(async (patrimonioInicial: number) => {
    if (!user?.id) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('bot_hft_configs')
        .insert({
          user_id: user.id,
          exchange: 'binance',
          initial_capital: patrimonioInicial,
          patrimonio_atual: patrimonioInicial,
          is_active: true,
        });

      if (error) throw error;

      await loadConfig();
      toast({
        title: "Bot ativado!",
        description: `Patrimônio inicial de $${patrimonioInicial.toFixed(2)} configurado.`
      });
      return true;
    } catch (error) {
      console.error('Erro ao iniciar bot:', error);
      toast({
        title: "Erro ao iniciar",
        description: "Não foi possível iniciar o bot.",
        variant: "destructive"
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [user?.id, loadConfig]);

  const claimPatrimonio = useCallback(async () => {
    if (!user?.id || !config?.id) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('bot_hft_configs')
        .delete()
        .eq('id', config.id);

      if (error) throw error;

      const patrimonioFinal = config.patrimonio_atual || 0;
      setConfig(null);
      
      toast({
        title: "Patrimônio reivindicado!",
        description: `$${patrimonioFinal.toFixed(2)} USDT disponível para saque.`
      });
      return true;
    } catch (error) {
      console.error('Erro ao reivindicar patrimônio:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reivindicar o patrimônio.",
        variant: "destructive"
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [user?.id, config]);

  const updatePatrimonio = useCallback(async (novoPatrimonio: number) => {
    if (!config?.id) return false;

    try {
      const { error } = await supabase
        .from('bot_hft_configs')
        .update({ patrimonio_atual: novoPatrimonio })
        .eq('id', config.id);

      if (error) throw error;
      
      setConfig(prev => prev ? { ...prev, patrimonio_atual: novoPatrimonio } : null);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar patrimônio:', error);
      return false;
    }
  }, [config?.id]);

  const toggleActive = useCallback(async () => {
    if (!config?.id) return false;

    const newState = !config.is_active;
    const success = await saveConfig({ is_active: newState });
    
    if (success) {
      toast({
        title: newState ? "Bot ativado" : "Bot pausado",
        description: newState ? "O trading foi retomado." : "O trading foi pausado."
      });
    }
    
    return success;
  }, [config, saveConfig]);

  useEffect(() => {
    loadConfig();
    loadTrades();
  }, [loadConfig, loadTrades]);

  return {
    config,
    trades,
    loading,
    saving,
    saveConfig,
    startBot,
    claimPatrimonio,
    updatePatrimonio,
    toggleActive,
    loadConfig,
    loadTrades,
  };
}
