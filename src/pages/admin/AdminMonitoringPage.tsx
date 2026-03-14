import { useState, useEffect, useCallback } from 'react';
import { useAuth, useAdminCheck } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Cpu, Database,
  HardDrive, RefreshCw, Search, Server, Shield, TrendingUp,
  Users, Zap, ChevronDown, ChevronUp, XCircle, Info, Bug
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ─────────────────────────────────────────────
interface PlatformLog {
  id: string;
  created_at: string;
  level: string;
  source: string;
  function_name: string | null;
  event_type: string;
  message: string;
  duration_ms: number;
  status_code: number | null;
  user_id: string | null;
  metadata: any;
  error_stack: string | null;
}

interface AuditLog {
  id: string;
  created_at: string;
  event_type: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
}

interface SystemHealth {
  totalUsers: number;
  activeProducts: number;
  totalBotMessages: number;
  totalTokensUsed: number;
  totalOrders: number;
  edgeFunctionLogs: number;
  errorRate: number;
  avgResponseTime: number;
}

// ─── Helpers ───────────────────────────────────────────
const levelIcon = (level: string) => {
  switch (level) {
    case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
    case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'debug': return <Bug className="h-4 w-4 text-muted-foreground" />;
    default: return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const levelColor = (level: string) => {
  switch (level) {
    case 'error': return 'border-red-500/30 bg-red-500/5 text-red-600';
    case 'warn': return 'border-yellow-500/30 bg-yellow-500/5 text-yellow-600';
    case 'debug': return 'border-muted bg-muted/30 text-muted-foreground';
    default: return 'border-blue-500/30 bg-blue-500/5 text-blue-600';
  }
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

// ─── Health Cards ──────────────────────────────────────
function HealthCard({ label, value, icon, color, detail }: {
  label: string; value: string | number; icon: React.ReactNode; color: string; detail?: string;
}) {
  return (
    <div className="relative p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur overflow-hidden group hover:border-border transition-colors">
      <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full opacity-10 blur-2xl" style={{ background: color }} />
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ background: `${color}15` }}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold font-mono">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
          {detail && <p className="text-[10px] text-muted-foreground">{detail}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────
const AdminMonitoringPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();

  const [health, setHealth] = useState<SystemHealth>({
    totalUsers: 0, activeProducts: 0, totalBotMessages: 0,
    totalTokensUsed: 0, totalOrders: 0, edgeFunctionLogs: 0,
    errorRate: 0, avgResponseTime: 0,
  });
  const [platformLogs, setPlatformLogs] = useState<PlatformLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) navigate('/auth');
      else if (!isAdmin) navigate('/');
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const sb = supabase as any;

    try {
      // Parallel queries
      const [
        { count: usersCount },
        { count: productsCount },
        { count: botMsgCount },
        { data: tokenData },
        { count: ordersCount },
        { data: pLogs },
        { data: aLogs },
      ] = await Promise.all([
        sb.from('profiles').select('*', { count: 'exact', head: true }),
        sb.from('customer_products').select('*', { count: 'exact', head: true }).eq('is_active', true),
        sb.from('bot_conversation_logs').select('*', { count: 'exact', head: true }),
        sb.from('bot_usage_metrics').select('tokens_total, processing_ms'),
        sb.from('orders').select('*', { count: 'exact', head: true }),
        sb.from('platform_logs').select('*').order('created_at', { ascending: false }).limit(300),
        sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200),
      ]);

      const rows = tokenData || [];
      const totalTokens = rows.reduce((s: number, r: any) => s + (r.tokens_total || 0), 0);
      const avgMs = rows.length > 0
        ? rows.reduce((s: number, r: any) => s + (r.processing_ms || 0), 0) / rows.length
        : 0;

      const logs = pLogs || [];
      const errors = logs.filter((l: any) => l.level === 'error').length;
      const errorRate = logs.length > 0 ? (errors / logs.length) * 100 : 0;

      setHealth({
        totalUsers: usersCount || 0,
        activeProducts: productsCount || 0,
        totalBotMessages: botMsgCount || 0,
        totalTokensUsed: totalTokens,
        totalOrders: ordersCount || 0,
        edgeFunctionLogs: logs.length,
        errorRate,
        avgResponseTime: Math.round(avgMs),
      });

      setPlatformLogs(logs);
      setAuditLogs(aLogs || []);
    } catch (e) {
      console.error('monitoring fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAll();
      const interval = setInterval(fetchAll, 15_000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, fetchAll]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  // Filters
  const filteredPlatformLogs = platformLogs.filter(l => {
    if (levelFilter !== 'all' && l.level !== levelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.message.toLowerCase().includes(q) ||
        l.function_name?.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredAuditLogs = auditLogs.filter(l => {
    if (search) {
      const q = search.toLowerCase();
      return l.event_type.toLowerCase().includes(q) ||
        l.metadata?.email?.toLowerCase().includes(q) ||
        l.ip_address?.includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Monitoramento da Plataforma
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Logs, métricas e saúde do sistema em tempo real
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-green-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              LIVE — 15s
            </span>
            <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Health Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <HealthCard label="Usuários" value={health.totalUsers} icon={<Users className="h-4 w-4" style={{ color: '#3b82f6' }} />} color="#3b82f6" />
          <HealthCard label="Produtos Ativos" value={health.activeProducts} icon={<Database className="h-4 w-4" style={{ color: '#10b981' }} />} color="#10b981" />
          <HealthCard label="Mensagens Bot" value={health.totalBotMessages} icon={<Zap className="h-4 w-4" style={{ color: '#8b5cf6' }} />} color="#8b5cf6" />
          <HealthCard label="Tokens IA" value={health.totalTokensUsed} icon={<Cpu className="h-4 w-4" style={{ color: '#f59e0b' }} />} color="#f59e0b" />
          <HealthCard label="Pedidos" value={health.totalOrders} icon={<HardDrive className="h-4 w-4" style={{ color: '#06b6d4' }} />} color="#06b6d4" />
          <HealthCard label="Edge Logs" value={health.edgeFunctionLogs} icon={<Server className="h-4 w-4" style={{ color: '#ec4899' }} />} color="#ec4899" />
          <HealthCard
            label="Taxa de Erro"
            value={`${health.errorRate.toFixed(1)}%`}
            icon={<AlertTriangle className="h-4 w-4" style={{ color: health.errorRate > 5 ? '#ef4444' : '#10b981' }} />}
            color={health.errorRate > 5 ? '#ef4444' : '#10b981'}
            detail={health.errorRate > 5 ? 'Acima do normal' : 'Saudável'}
          />
          <HealthCard
            label="Resposta Média"
            value={`${health.avgResponseTime}ms`}
            icon={<Clock className="h-4 w-4" style={{ color: '#6366f1' }} />}
            color="#6366f1"
            detail="Tempo de processamento IA"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="platform" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="platform" className="gap-2">
              <Server className="h-3.5 w-3.5" />
              Edge Functions
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <Shield className="h-3.5 w-3.5" />
              Auditoria
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2">
              <TrendingUp className="h-3.5 w-3.5" />
              Uso de IA
            </TabsTrigger>
          </TabsList>

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar logs..." className="pl-9" />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Platform Logs Tab */}
          <TabsContent value="platform">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  Logs de Edge Functions
                </CardTitle>
                <CardDescription>Execuções, erros e latência das funções serverless</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {filteredPlatformLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Server className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">Nenhum log encontrado</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Os logs aparecerão aqui conforme as Edge Functions são executadas
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 pr-4">
                      {filteredPlatformLogs.map(log => {
                        const isExpanded = expandedId === log.id;
                        return (
                          <div
                            key={log.id}
                            className={`rounded-lg border ${levelColor(log.level)} cursor-pointer transition-colors`}
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          >
                            <div className="flex items-start gap-3 p-3">
                              <div className="mt-0.5 shrink-0">{levelIcon(log.level)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase font-mono">
                                    {log.level}
                                  </Badge>
                                  {log.function_name && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                                      {log.function_name}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {log.source}
                                  </Badge>
                                  {log.status_code && (
                                    <Badge variant={log.status_code >= 400 ? 'destructive' : 'outline'} className="text-[10px] px-1.5 py-0">
                                      {log.status_code}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm line-clamp-2">{log.message}</p>
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                  <span>{formatTime(log.created_at)}</span>
                                  {log.duration_ms > 0 && <span>{log.duration_ms}ms</span>}
                                </div>
                              </div>
                              <div className="shrink-0 mt-1">
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="px-3 pb-3 pt-0 border-t border-border/30 mt-1 space-y-2">
                                <div className="bg-muted/30 rounded-lg p-3 mt-2">
                                  <p className="text-sm whitespace-pre-wrap font-mono">{log.message}</p>
                                </div>
                                {log.error_stack && (
                                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                    <p className="text-[11px] font-mono text-red-600 whitespace-pre-wrap">{log.error_stack}</p>
                                  </div>
                                )}
                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                  <div className="bg-muted/20 rounded-lg p-3">
                                    <p className="text-[10px] text-muted-foreground mb-1 font-semibold">Metadata</p>
                                    <pre className="text-[10px] font-mono whitespace-pre-wrap">{JSON.stringify(log.metadata, null, 2)}</pre>
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                                  {log.user_id && <span>User: <code className="text-[10px]">{log.user_id.slice(0, 8)}</code></span>}
                                  <span>ID: <code className="text-[10px]">{log.id.slice(0, 8)}</code></span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
                {filteredPlatformLogs.length > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/30 mt-3">
                    <span>{filteredPlatformLogs.length} registro{filteredPlatformLogs.length !== 1 ? 's' : ''}</span>
                    <span>Atualiza automaticamente a cada 15s</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Logs de Auditoria
                </CardTitle>
                <CardDescription>Logins, acessos e eventos de segurança</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {filteredAuditLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Shield className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">Nenhum log de auditoria</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pr-4">
                      {filteredAuditLogs.map(log => (
                        <div key={log.id} className="rounded-lg border border-border/50 bg-card/50 p-3 hover:bg-card/80 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              {log.event_type === 'login' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <Shield className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase">
                                  {log.event_type}
                                </Badge>
                                {log.metadata?.email && (
                                  <span className="text-[11px] text-muted-foreground font-mono">{log.metadata.email}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span>{formatTime(log.created_at)}</span>
                                {log.ip_address && <span>IP: {log.ip_address}</span>}
                                {log.metadata?.provider && <span>Via: {log.metadata.provider}</span>}
                              </div>
                              {log.user_agent && (
                                <p className="text-[10px] text-muted-foreground/60 mt-1 truncate">{log.user_agent}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {filteredAuditLogs.length > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/30 mt-3">
                    <span>{filteredAuditLogs.length} eventos</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage">
            <UsageTab />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

// ─── Usage Sub-Tab ─────────────────────────────────────
function UsageTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const sb = supabase as any;
      const { data: rows } = await sb
        .from('bot_usage_metrics')
        .select('created_at, tokens_total, tokens_input, tokens_output, processing_ms, provider, model, customer_product_id')
        .order('created_at', { ascending: false })
        .limit(200);
      setData(rows || []);
      setLoading(false);
    };
    fetch();
  }, []);

  // Aggregate by provider
  const byProvider: Record<string, { calls: number; tokens: number; avgMs: number }> = {};
  data.forEach(r => {
    const key = r.provider || 'unknown';
    if (!byProvider[key]) byProvider[key] = { calls: 0, tokens: 0, avgMs: 0 };
    byProvider[key].calls++;
    byProvider[key].tokens += r.tokens_total || 0;
    byProvider[key].avgMs += r.processing_ms || 0;
  });
  Object.values(byProvider).forEach(v => { v.avgMs = v.calls > 0 ? Math.round(v.avgMs / v.calls) : 0; });

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Consumo de IA por Provider
        </CardTitle>
        <CardDescription>Tokens, chamadas e latência agregados</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(byProvider).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum dado de uso registrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(byProvider).map(([provider, stats]) => (
              <div key={provider} className="rounded-xl border border-border/50 bg-card/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm uppercase">{provider}</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">{stats.calls} calls</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Tokens</p>
                    <p className="text-lg font-bold font-mono">{stats.tokens.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Chamadas</p>
                    <p className="text-lg font-bold font-mono">{stats.calls}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Latência Média</p>
                    <p className="text-lg font-bold font-mono">{stats.avgMs}ms</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Recent calls table */}
            <div className="mt-6">
              <p className="text-sm font-semibold mb-3">Últimas Chamadas</p>
              <ScrollArea className="h-[300px]">
                <div className="space-y-1.5">
                  {data.slice(0, 50).map((r, i) => (
                    <div key={i} className="flex items-center gap-3 text-[11px] p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <span className="text-muted-foreground w-[120px] shrink-0">{formatTime(r.created_at)}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono shrink-0">{r.provider || '?'}</Badge>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono shrink-0">{r.model || '?'}</Badge>
                      <span className="font-mono">{(r.tokens_total || 0).toLocaleString()} tkns</span>
                      <span className="text-muted-foreground font-mono">{r.processing_ms}ms</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminMonitoringPage;
