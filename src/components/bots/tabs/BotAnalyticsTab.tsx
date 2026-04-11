import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, MessageCircle, Zap, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const sb = supabase as any;

interface BotAnalyticsTabProps {
  customerProductId: string;
}

interface DailyData {
  date: string;
  label: string;
  messages: number;
  tokens: number;
  avgMs: number;
}

export function BotAnalyticsTab({ customerProductId }: BotAnalyticsTabProps) {
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 14 | 30>(7);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - range);

      const { data: metrics, error } = await sb
        .from('bot_usage_metrics')
        .select('created_at, tokens_total, processing_ms')
        .eq('customer_product_id', customerProductId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const { data: logs } = await sb
        .from('bot_conversation_logs')
        .select('created_at, direction')
        .eq('customer_product_id', customerProductId)
        .gte('created_at', since.toISOString());

      // Group by day
      const dayMap = new Map<string, { messages: number; tokens: number; totalMs: number; count: number }>();

      // Init all days
      for (let i = 0; i < range; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (range - 1 - i));
        const key = d.toISOString().slice(0, 10);
        dayMap.set(key, { messages: 0, tokens: 0, totalMs: 0, count: 0 });
      }

      // Count messages from logs
      (logs || []).forEach((l: any) => {
        const key = l.created_at.slice(0, 10);
        const entry = dayMap.get(key);
        if (entry) entry.messages++;
      });

      // Aggregate metrics
      (metrics || []).forEach((m: any) => {
        const key = m.created_at.slice(0, 10);
        const entry = dayMap.get(key);
        if (entry) {
          entry.tokens += m.tokens_total || 0;
          entry.totalMs += m.processing_ms || 0;
          entry.count++;
        }
      });

      const result: DailyData[] = [];
      dayMap.forEach((v, k) => {
        result.push({
          date: k,
          label: new Date(k + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          messages: v.messages,
          tokens: v.tokens,
          avgMs: v.count > 0 ? Math.round(v.totalMs / v.count) : 0,
        });
      });

      setData(result);
    } catch (e) {
      console.error('analytics error:', e);
    } finally {
      setLoading(false);
    }
  }, [customerProductId, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalMessages = data.reduce((s, d) => s + d.messages, 0);
  const totalTokens = data.reduce((s, d) => s + d.tokens, 0);
  const avgLatency = data.filter(d => d.avgMs > 0).reduce((s, d, _, a) => s + d.avgMs / a.length, 0);
  const peakDay = data.reduce((max, d) => d.messages > max.messages ? d : max, { messages: 0, label: '-', date: '', tokens: 0, avgMs: 0 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Analytics
        </h3>
        <div className="flex gap-2">
          {([7, 14, 30] as const).map(r => (
            <Button
              key={r}
              variant={range === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRange(r)}
            >
              {r}d
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Mensagens</span>
            </div>
            <p className="text-2xl font-bold font-mono">{totalMessages.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Tokens</span>
            </div>
            <p className="text-2xl font-bold font-mono">{totalTokens.toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Latência média</span>
            </div>
            <p className="text-2xl font-bold font-mono">{Math.round(avgLatency)}<span className="text-sm text-muted-foreground">ms</span></p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Pico</span>
            </div>
            <p className="text-2xl font-bold font-mono">{peakDay.messages}</p>
            <p className="text-[10px] text-muted-foreground">{peakDay.label}</p>
          </CardContent>
        </Card>
      </div>

      {/* Messages chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Mensagens por dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number) => [value, 'Mensagens']}
                />
                <Area type="monotone" dataKey="messages" stroke="hsl(var(--primary))" fill="url(#msgGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tokens + Latency charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tokens consumidos por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Tokens']}
                  />
                  <Bar dataKey="tokens" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Latência média por dia (ms)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number) => [`${value}ms`, 'Latência']}
                  />
                  <Area type="monotone" dataKey="avgMs" stroke="hsl(38, 92%, 50%)" fill="url(#latGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
