import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { RefreshCw, AlertCircle, Settings, BarChart3, Wallet, Shield, DollarSign } from 'lucide-react';

import { TradingBackground } from '@/components/hft/HFTBackground';
import { RocketCelebration } from '@/components/hft/HFTCelebration';
import { HFTStatsCards } from '@/components/hft/HFTStatsCards';
import { HFTSetupScreen } from '@/components/hft/HFTSetupScreen';
import { HFTHeader } from '@/components/hft/HFTHeader';
import { HFTAssetsLogs } from '@/components/hft/HFTAssetsLogs';
import { BotStatus, LogEntry, HistoryEntry } from '@/components/hft/HFTConstants';

export default function SniperHFTSystem() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Admin check
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  
  // Config from database
  const [dbConfig, setDbConfig] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(true);
  
  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationIntensity, setCelebrationIntensity] = useState(1);
  const lastPatrimonioRef = useRef<number | null>(null);
  
  // Bot states
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [updateCount, setUpdateCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Load config from database
  const loadConfig = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('bot_hft_configs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setDbConfig({
          ...(data as any),
          patrimonio_inicial: Number((data as any).initial_capital || 0),
          patrimonio_atual: Number((data as any).patrimonio_atual || 0),
        });
        setIsRunning((data as any).is_active);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setConfigLoading(false);
    }
  }, [user?.id]);

  // Check admin role
  const checkAdminRole = useCallback(async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (error || !data) {
      toast({
        title: "Acesso Negado",
        description: "Esta página é restrita a administradores.",
        variant: "destructive"
      });
      navigate('/');
      return;
    }

    setIsAdmin(true);
    setAdminLoading(false);
  }, [user?.id, navigate]);

  useEffect(() => {
    if (!authLoading && user?.id) {
      checkAdminRole();
      loadConfig();
    } else if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, loadConfig, checkAdminRole, navigate]);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{
      timestamp: new Date(),
      message,
      type
    }, ...prev].slice(0, 50));
  }, []);

  // Connect to bot API
  const connectToBot = async (saldo: number) => {
    if (!user?.id) return;
    
    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Save config to database first
      const { error: dbError } = await supabase
        .from('bot_hft_configs')
        .upsert({
          user_id: user.id,
          patrimonio_inicial: saldo,
          patrimonio_atual: saldo,
          is_active: true,
        }, { onConflict: 'user_id' });

      if (dbError) throw dbError;

      // Connect via edge function
      const { data, error } = await supabase.functions.invoke('bot-proxy', {
        body: { action: 'conectar', saldo }
      });

      if (error) throw new Error(error.message || 'Erro ao conectar');

      await loadConfig();
      addLog('🚀 Bot conectado com sucesso!', 'success');
      addLog(`💰 Patrimônio inicial: $${saldo.toFixed(2)} USDT`, 'info');
      
      toast({
        title: "Bot Conectado!",
        description: `Trading iniciado com $${saldo.toFixed(2)} USDT`
      });
    } catch (error) {
      console.error('Erro ao conectar:', error);
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      setConnectionError(msg);
      addLog(`❌ Erro: ${msg}`, 'error');
      toast({
        title: "Erro de Conexão",
        description: msg,
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Fetch bot status
  const fetchBotStatus = useCallback(async () => {
    try {
      const { data: statusData, error } = await supabase.functions.invoke('bot-proxy', {
        body: { action: 'status' }
      });

      if (error) throw new Error(error.message);

      const winRateStr = statusData?.win_rate || '0%';
      const winRateValue = typeof winRateStr === 'string' 
        ? parseFloat(winRateStr.replace('%', '')) 
        : (winRateStr ?? 0);
      
      const lucroPercentualStr = statusData?.lucro_percentual || '0%';
      const lucroPercentualValue = typeof lucroPercentualStr === 'string'
        ? parseFloat(lucroPercentualStr.replace('%', ''))
        : (lucroPercentualStr ?? 0);
      
      const newStatus: BotStatus = {
        patrimonio: statusData?.patrimonio ?? statusData?.patrimonio_total ?? 0,
        lucro_prejuizo: statusData?.lucro_bruto ?? statusData?.lucro ?? 0,
        lucro_percentual: lucroPercentualValue,
        lucro: statusData?.lucro_bruto ?? statusData?.lucro ?? 0,
        caixa: statusData?.saldo_caixa ?? statusData?.caixa ?? 0,
        win_rate: winRateValue,
        total_trades: statusData?.trades ?? statusData?.total_trades ?? 0,
        ativos: statusData?.lista_ativos ?? statusData?.ativos ?? [],
        status: statusData?.status ?? 'Ativo',
        sentimento: statusData?.sentimento ?? 'Neutro',
        uptime: statusData?.uptime,
        vitorias: statusData?.vitorias ?? 0,
        derrotas: statusData?.derrotas ?? 0,
      };

      // Celebration on profit increase
      const currentPatrimonio = newStatus.patrimonio;
      const lastPatrimonio = lastPatrimonioRef.current;
      if (lastPatrimonio !== null && currentPatrimonio > lastPatrimonio) {
        const increasePercent = ((currentPatrimonio - lastPatrimonio) / lastPatrimonio) * 100;
        if (increasePercent >= 0.1) {
          setCelebrationIntensity(Math.min(increasePercent / 2, 5));
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 100);
        }
      }
      lastPatrimonioRef.current = currentPatrimonio;
      
      setBotStatus(newStatus);
      setLastUpdate(new Date());
      setUpdateCount(prev => prev + 1);
      setIsConnected(true);
      setConnectionError(null);
      
      // Update patrimonio in database
      if (dbConfig?.id && newStatus.patrimonio !== dbConfig.patrimonio_atual) {
        await supabase
          .from('bot_hft_configs')
          .update({ patrimonio_atual: newStatus.patrimonio })
          .eq('id', dbConfig.id);
      }
      
    } catch (error) {
      console.error('Erro:', error);
      setConnectionError(error instanceof Error ? error.message : 'Erro');
      setIsConnected(false);
    }
  }, [dbConfig]);

  // Polling
  useEffect(() => {
    if (!isRunning || !dbConfig) return;
    
    addLog('🚀 Conectando ao servidor...', 'info');
    fetchBotStatus();
    
    const interval = setInterval(fetchBotStatus, 2000);
    return () => clearInterval(interval);
  }, [isRunning, dbConfig, fetchBotStatus, addLog]);

  const toggleBot = async () => {
    if (!dbConfig?.id) return;
    
    const newState = !isRunning;
    await supabase
      .from('bot_hft_configs')
      .update({ is_active: newState })
      .eq('id', dbConfig.id);
    
    setIsRunning(newState);
    addLog(newState ? '▶️ Bot retomado' : '⏸️ Bot pausado', newState ? 'success' : 'warning');
    toast({ title: newState ? "Bot retomado" : "Bot pausado" });
  };

  const claimPatrimonio = async () => {
    if (!dbConfig?.id) return;
    
    const amount = dbConfig.patrimonio_atual;
    await supabase.from('bot_hft_configs').delete().eq('id', dbConfig.id);
    
    setDbConfig(null);
    setBotStatus(null);
    setIsRunning(false);
    
    toast({
      title: "Patrimônio reivindicado!",
      description: `$${amount.toFixed(2)} USDT disponível para saque.`
    });
  };

  // Loading state
  if (authLoading || configLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return null;
  }

  // Setup screen if no config
  if (!dbConfig) {
    return (
      <HFTSetupScreen 
        onConnect={connectToBot}
        isConnecting={isConnecting}
        connectionError={connectionError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative">
      <RocketCelebration show={showCelebration} intensity={celebrationIntensity} />
      <TradingBackground isRunning={isRunning} />
      
      <HFTHeader 
        isRunning={isRunning}
        isConnected={isConnected}
        connectionError={connectionError}
        updateCount={updateCount}
        onToggleBot={toggleBot}
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-8 space-y-6 relative z-10"
      >
        {/* Connection Error */}
        {connectionError && !botStatus && (
          <Card className="border-rose-500/30 bg-rose-500/10">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
              <h3 className="text-lg font-semibold text-rose-500 mb-2">Erro de Conexão</h3>
              <p className="text-muted-foreground text-center mb-4">{connectionError}</p>
              <Button onClick={() => setIsRunning(true)} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {!botStatus && !connectionError && isRunning && (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="h-12 w-12 text-primary animate-spin mb-4" />
              <h3 className="text-lg font-semibold mb-2">Conectando ao Bot...</h3>
            </CardContent>
          </Card>
        )}

        {/* Tabs with configuration sections */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Risco
            </TabsTrigger>
            <TabsTrigger value="patrimonio" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Patrimônio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {botStatus && (
              <>
                <HFTStatsCards botStatus={botStatus} />
                <HFTAssetsLogs ativos={botStatus.ativos} logs={logs} lastUpdate={lastUpdate} />
              </>
            )}
          </TabsContent>

          <TabsContent value="config">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Configurações de Trading</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Auto Trade</p>
                    <p className="text-lg font-bold">{dbConfig.auto_trade ? 'Ativado' : 'Desativado'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Nível de Risco</p>
                    <p className="text-lg font-bold capitalize">{dbConfig.risk_level || 'Médio'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Máx. Trades/Dia</p>
                    <p className="text-lg font-bold">{dbConfig.max_daily_trades || 100}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Notificações</p>
                    <p className="text-lg font-bold">{dbConfig.notifications_enabled ? 'Ativas' : 'Desativadas'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Gerenciamento de Risco</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Stop Loss</p>
                    <p className="text-lg font-bold text-rose-500">{dbConfig.stop_loss_percent || 5}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Take Profit</p>
                    <p className="text-lg font-bold text-emerald-500">{dbConfig.take_profit_percent || 10}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Máx. Posição</p>
                    <p className="text-lg font-bold">{dbConfig.max_position_size || 10}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Máx. Perda/Dia</p>
                    <p className="text-lg font-bold text-rose-500">{dbConfig.max_daily_loss || 20}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patrimonio">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Seu Patrimônio
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                    <p className="text-sm text-muted-foreground">Patrimônio Inicial</p>
                    <p className="text-2xl font-bold text-primary">${dbConfig.patrimonio_inicial?.toFixed(2)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <p className="text-sm text-muted-foreground">Patrimônio Atual</p>
                    <p className="text-2xl font-bold text-emerald-500">${dbConfig.patrimonio_atual?.toFixed(2)}</p>
                  </div>
                </div>
                <Button 
                  onClick={claimPatrimonio}
                  variant="outline"
                  className="w-full border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Reivindicar Patrimônio (${dbConfig.patrimonio_atual?.toFixed(2)})
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Ao reivindicar, o bot será desativado e você poderá sacar seu patrimônio.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Status Footer */}
        <Card className="border-dashed border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-3">
                <Badge variant="outline">Status: {botStatus?.status ?? 'Inicializando...'}</Badge>
                <Badge variant="outline">Sentimento: {botStatus?.sentimento ?? 'Analisando...'}</Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <motion.div
                  animate={{ rotate: isRunning ? 360 : 0 }}
                  transition={{ duration: 2, repeat: isRunning ? Infinity : 0, ease: "linear" }}
                >
                  <RefreshCw className="h-4 w-4 text-primary" />
                </motion.div>
                <span>Atualização: <strong>2s</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
