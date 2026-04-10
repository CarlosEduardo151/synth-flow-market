import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, useAdminCheck } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Activity, AlertTriangle, ArrowDown, ArrowUp, Bot, CheckCircle2,
  ChevronDown, ChevronUp, Clock, Filter, Info, LogIn, LogOut,
  MessageSquare, Pause, Play, RefreshCw, Search, Server,
  Shield, Terminal, Trash2, XCircle, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// ─── Unified log entry ────────────────────────────────
interface UnifiedLog {
  id: string;
  timestamp: string;
  source: 'edge' | 'bot' | 'audit' | 'webhook';
  level: 'info' | 'warn' | 'error' | 'debug';
  title: string;
  detail: string;
  metadata?: Record<string, unknown>;
  direction?: 'in' | 'out';
  functionName?: string;
  statusCode?: number;
  durationMs?: number;
  errorStack?: string;
  phone?: string;
  userId?: string;
}

// ─── Helpers ──────────────────────────────────────────
const levelIcon = (level: string) => {
  switch (level) {
    case 'error': return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    case 'warn': return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />;
    case 'debug': return <Terminal className="h-3.5 w-3.5 text-muted-foreground" />;
    default: return <Info className="h-3.5 w-3.5 text-blue-500" />;
  }
};

const sourceIcon = (source: string) => {
  switch (source) {
    case 'edge': return <Server className="h-3.5 w-3.5" />;
    case 'bot': return <Bot className="h-3.5 w-3.5" />;
    case 'audit': return <Shield className="h-3.5 w-3.5" />;
    case 'webhook': return <Zap className="h-3.5 w-3.5" />;
    default: return <Activity className="h-3.5 w-3.5" />;
  }
};

const sourceLabel: Record<string, string> = {
  edge: 'Edge Function',
  bot: 'Bot Message',
  audit: 'Auditoria',
  webhook: 'Webhook',
};

const sourceBg: Record<string, string> = {
  edge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  bot: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  audit: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  webhook: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

const levelBorder: Record<string, string> = {
  error: 'border-l-red-500',
  warn: 'border-l-yellow-500',
  debug: 'border-l-muted-foreground/40',
  info: 'border-l-blue-500',
};

const formatTs = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const formatTsFull = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

// ─── Main Component ──────────────────────────────────
const AdminLogsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<UnifiedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) navigate('/auth');
      else if (!isAdmin) navigate('/');
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  const fetchLogs = useCallback(async () => {
    const sb = supabase as any;
    try {
      const [
        { data: platformData },
        { data: botData },
        { data: auditData },
      ] = await Promise.all([
        sb.from('platform_logs').select('*').order('created_at', { ascending: false }).limit(200),
        sb.from('bot_conversation_logs').select('*').order('created_at', { ascending: false }).limit(200),
        sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      const unified: UnifiedLog[] = [];

      // Platform logs → edge
      (platformData || []).forEach((l: any) => {
        unified.push({
          id: `edge-${l.id}`,
          timestamp: l.created_at,
          source: l.source === 'webhook' ? 'webhook' : 'edge',
          level: l.level || 'info',
          title: l.function_name ? `${l.function_name}` : 'Edge Function',
          detail: l.message,
          metadata: l.metadata,
          functionName: l.function_name,
          statusCode: l.status_code,
          durationMs: l.duration_ms,
          errorStack: l.error_stack,
          userId: l.user_id,
          direction: l.message?.includes('→') ? 'out' : 'in',
        });
      });

      // Bot conversation logs
      (botData || []).forEach((l: any) => {
        unified.push({
          id: `bot-${l.id}`,
          timestamp: l.created_at,
          source: 'bot',
          level: 'info',
          title: `${l.direction === 'incoming' ? '📥' : '📤'} ${l.source || 'whatsapp'}`,
          detail: l.message_text?.slice(0, 300) || '',
          direction: l.direction === 'incoming' ? 'in' : 'out',
          phone: l.phone,
          metadata: {
            provider: l.provider,
            model: l.model,
            tokens: l.tokens_used,
            processing_ms: l.processing_ms,
            customer_product_id: l.customer_product_id,
          },
        });
      });

      // Audit logs
      (auditData || []).forEach((l: any) => {
        unified.push({
          id: `audit-${l.id}`,
          timestamp: l.created_at,
          source: 'audit',
          level: l.event_type?.includes('fail') ? 'warn' : 'info',
          title: l.event_type || 'audit',
          detail: l.metadata?.email || l.metadata?.msg || l.event_type || '',
          metadata: l.metadata,
          userId: l.user_id,
          direction: l.event_type?.includes('login') ? 'in' : undefined,
        });
      });

      // Sort by timestamp desc
      unified.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setLogs(unified);
    } catch (e) {
      console.error('logs fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetchLogs();
  }, [isAdmin, fetchLogs]);

  useEffect(() => {
    if (!isAdmin || !autoRefresh) return;
    const iv = setInterval(fetchLogs, refreshInterval * 1000);
    return () => clearInterval(iv);
  }, [isAdmin, autoRefresh, refreshInterval, fetchLogs]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user || !isAdmin) return null;

  // Filters
  const filtered = logs.filter(l => {
    if (levelFilter !== 'all' && l.level !== levelFilter) return false;
    if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        l.detail.toLowerCase().includes(q) ||
        l.functionName?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.userId?.includes(q)
      );
    }
    return true;
  });

  const counts = {
    total: logs.length,
    edge: logs.filter(l => l.source === 'edge').length,
    bot: logs.filter(l => l.source === 'bot').length,
    audit: logs.filter(l => l.source === 'audit').length,
    errors: logs.filter(l => l.level === 'error').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Terminal className="h-6 w-6 text-primary" />
              Central de Logs
            </h1>
            <p className="text-sm text-muted-foreground">
              Tudo que entra e sai da plataforma em tempo real
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-2 text-xs">
              {autoRefresh ? (
                <span className="flex items-center gap-1.5 text-green-500 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  LIVE — {refreshInterval}s
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <Pause className="h-3 w-3" />
                  PAUSADO
                </span>
              )}
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            </div>
            <Select value={String(refreshInterval)} onValueChange={v => setRefreshInterval(Number(v))}>
              <SelectTrigger className="w-[80px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3s</SelectItem>
                <SelectItem value="5">5s</SelectItem>
                <SelectItem value="10">10s</SelectItem>
                <SelectItem value="30">30s</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchLogs(); }} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1 py-1">
            <Activity className="h-3 w-3" /> {counts.total} total
          </Badge>
          <Badge variant="outline" className="gap-1 py-1 text-blue-600">
            <Server className="h-3 w-3" /> {counts.edge} edge
          </Badge>
          <Badge variant="outline" className="gap-1 py-1 text-purple-600">
            <Bot className="h-3 w-3" /> {counts.bot} bot
          </Badge>
          <Badge variant="outline" className="gap-1 py-1 text-amber-600">
            <Shield className="h-3 w-3" /> {counts.audit} audit
          </Badge>
          {counts.errors > 0 && (
            <Badge variant="destructive" className="gap-1 py-1">
              <XCircle className="h-3 w-3" /> {counts.errors} erros
            </Badge>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por função, mensagem, telefone, user ID..."
              className="pl-9"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Fonte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas fontes</SelectItem>
              <SelectItem value="edge">Edge Functions</SelectItem>
              <SelectItem value="bot">Bot Messages</SelectItem>
              <SelectItem value="audit">Auditoria</SelectItem>
              <SelectItem value="webhook">Webhooks</SelectItem>
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[130px]">
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

        {/* Log stream */}
        <Card className="border-border/50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              {filtered.length} registros
              {search && <span className="text-xs">— filtrado por "{search}"</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-380px)] min-h-[400px]">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Terminal className="h-12 w-12 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum log encontrado</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {search ? 'Tente outro termo de busca' : 'Os logs aparecerão em tempo real'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {filtered.map(log => {
                    const isExpanded = expandedId === log.id;
                    return (
                      <div
                        key={log.id}
                        className={`border-l-2 ${levelBorder[log.level] || 'border-l-transparent'} hover:bg-muted/30 transition-colors cursor-pointer`}
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <div className="flex items-start gap-2 px-4 py-2.5">
                          {/* Direction arrow */}
                          <div className="mt-0.5 shrink-0 w-4">
                            {log.direction === 'in' && <ArrowDown className="h-3.5 w-3.5 text-green-500" />}
                            {log.direction === 'out' && <ArrowUp className="h-3.5 w-3.5 text-orange-500" />}
                          </div>

                          {/* Level icon */}
                          <div className="mt-0.5 shrink-0">{levelIcon(log.level)}</div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-mono ${sourceBg[log.source]}`}>
                                {sourceIcon(log.source)}
                                {sourceLabel[log.source]}
                              </span>
                              {log.functionName && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono h-5">
                                  {log.functionName}
                                </Badge>
                              )}
                              {log.statusCode && (
                                <Badge
                                  variant={log.statusCode >= 400 ? 'destructive' : 'outline'}
                                  className="text-[10px] px-1.5 py-0 h-5"
                                >
                                  {log.statusCode}
                                </Badge>
                              )}
                              {log.phone && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono h-5">
                                  📱 {log.phone}
                                </Badge>
                              )}
                              {log.durationMs != null && log.durationMs > 0 && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {log.durationMs}ms
                                </span>
                              )}
                            </div>
                            <p className="text-sm truncate text-foreground/90">{log.detail || log.title}</p>
                            <span className="text-[10px] text-muted-foreground font-mono">{formatTs(log.timestamp)}</span>
                          </div>

                          {/* Expand */}
                          <div className="shrink-0 mt-1">
                            {isExpanded
                              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="px-4 pb-3 pt-0 ml-10 space-y-2">
                            <div className="bg-muted/40 rounded-lg p-3">
                              <p className="text-xs font-mono whitespace-pre-wrap break-all">{log.detail}</p>
                            </div>
                            {log.errorStack && (
                              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                <p className="text-[11px] font-mono text-red-600 whitespace-pre-wrap">{log.errorStack}</p>
                              </div>
                            )}
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div className="bg-muted/20 rounded-lg p-3">
                                <p className="text-[10px] text-muted-foreground mb-1 font-semibold">Metadata</p>
                                <pre className="text-[10px] font-mono whitespace-pre-wrap break-all">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                            <div className="flex gap-4 text-[10px] text-muted-foreground">
                              <span>ID: {log.id}</span>
                              <span>Timestamp: {formatTsFull(log.timestamp)}</span>
                              {log.userId && <span>User: {log.userId.slice(0, 8)}…</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default AdminLogsPage;
