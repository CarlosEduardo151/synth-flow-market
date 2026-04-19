import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot, Send, Sparkles, Target, MessageSquare, FileText, User2, Loader2,
  Copy, Trash2, RefreshCw, Zap, TrendingUp, AlertTriangle, DollarSign,
} from 'lucide-react';
import { SalesSectionHeader } from './SalesSectionHeader';

interface Props { customerProductId: string; }

interface Msg { role: 'user' | 'assistant'; content: string; }

interface Opp {
  id: string; title: string; stage: string | null; value: number | null;
  probability: number | null; priority: string | null; customer_id: string | null;
}

type Mode = 'chat' | 'next_action' | 'message' | 'summary';

const QUICK_ACTIONS: { mode: Mode; label: string; prompt: string; icon: any; color: string }[] = [
  { mode: 'next_action', label: 'Próxima ação', prompt: 'Qual é a próxima melhor ação para esse lead agora?', icon: Target, color: 'text-emerald-500' },
  { mode: 'message', label: 'Mensagem WhatsApp', prompt: 'Crie uma mensagem de WhatsApp curta e personalizada para reaquecer esse lead.', icon: MessageSquare, color: 'text-green-500' },
  { mode: 'message', label: 'E-mail de follow-up', prompt: 'Escreva um e-mail de follow-up profissional para este lead.', icon: MessageSquare, color: 'text-blue-500' },
  { mode: 'summary', label: 'Resumo executivo', prompt: 'Faça um resumo executivo desse lead: status, dores, objeções e próximo passo.', icon: FileText, color: 'text-violet-500' },
];

const PIPELINE_PROMPTS = [
  'Quais 3 leads têm maior chance de fechar essa semana?',
  'Quais oportunidades estão paradas há muito tempo?',
  'Qual estágio do funil está com mais valor parado?',
  'Que padrão você vê nos últimos deals perdidos?',
];

export function SalesCopilot({ customerProductId }: Props) {
  const { toast } = useToast();
  const [opps, setOpps] = useState<Opp[]>([]);
  const [selectedOpp, setSelectedOpp] = useState<string>('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [stats, setStats] = useState({ open: 0, forecast: 0, atRisk: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!customerProductId) return;
    (async () => {
      const [{ data: oppData }, { data: alerts }] = await Promise.all([
        supabase.from('crm_opportunities')
          .select('id,title,stage,value,probability,priority,customer_id')
          .eq('customer_product_id', customerProductId)
          .order('updated_at', { ascending: false }).limit(200),
        (supabase as any).from('sa_antichurn_alerts')
          .select('id').eq('customer_product_id', customerProductId).eq('status', 'active'),
      ]);
      const all = (oppData || []) as Opp[];
      setOpps(all);
      const open = all.filter(o => !['won', 'lost'].includes((o.stage || '').toLowerCase()));
      const forecast = open.reduce((s, o) => s + Number(o.value || 0) * (Number(o.probability || 0) / 100), 0);
      setStats({ open: open.length, forecast, atRisk: (alerts || []).length });
    })();
  }, [customerProductId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  const selectedOppLabel = useMemo(() => {
    const o = opps.find(x => x.id === selectedOpp);
    return o ? `${o.title} · ${o.stage} · ${(o.probability ?? 0)}%` : 'Pipeline geral (todos os leads)';
  }, [opps, selectedOpp]);

  const fmtMoney = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  const sendMessage = async (text: string, mode: Mode = 'chat') => {
    if (!text.trim() || streaming) return;
    const userMsg: Msg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    let assistantSoFar = '';
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sa-copilot-chat`;
      const session = (await supabase.auth.getSession()).data.session;
      const resp = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          customer_product_id: customerProductId,
          opportunity_id: selectedOpp || null,
          mode,
          messages: [...messages, userMsg],
        }),
      });

      if (resp.status === 429) { toast({ title: 'Limite atingido', description: 'Tente novamente em alguns instantes.', variant: 'destructive' }); throw new Error('rate'); }
      if (resp.status === 402) { toast({ title: 'Créditos esgotados', description: 'Adicione créditos no workspace.', variant: 'destructive' }); throw new Error('credits'); }
      if (!resp.ok || !resp.body) { const t = await resp.text(); throw new Error(t || 'Falha no stream'); }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line || line.startsWith(':') || !line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (c) upsert(c);
          } catch {
            buf = line + '\n' + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Não consegui responder agora. Tente de novo em instantes.' }]);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const copyMsg = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copiado!' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[600px] gap-3">
      <SalesSectionHeader
        icon={Bot}
        title="Copiloto IA de Vendas"
        description="Pergunte ao seu pipeline, gere mensagens e descubra a próxima ação para cada lead"
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium">{streaming ? 'Pensando…' : 'IA online'}</span>
          </div>
        }
      />

      {/* Stats top bar */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Forecast</p>
              <p className="text-2xl font-bold text-emerald-500">{fmtMoney(stats.forecast)}</p>
            </div>
            <DollarSign className="h-7 w-7 text-emerald-500 opacity-60" />
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <CardContent className="p-4 relative flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Em aberto</p>
              <p className="text-2xl font-bold">{stats.open}</p>
            </div>
            <TrendingUp className="h-7 w-7 text-primary opacity-60" />
          </CardContent>
        </Card>
        <Card className="border-red-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Em risco</p>
              <p className="text-2xl font-bold text-red-500">{stats.atRisk}</p>
            </div>
            <AlertTriangle className="h-7 w-7 text-red-500 opacity-60" />
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">IA</p>
              <p className="text-2xl font-bold text-primary">Ativa</p>
            </div>
            <Sparkles className="h-7 w-7 text-primary opacity-60" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[280px_1fr] flex-1 min-h-0">
        {/* Sidebar: lead picker + quick actions */}
        <div className="space-y-3 flex flex-col min-h-0">
          <Card>
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <User2 className="h-3.5 w-3.5" /> Contexto
              </p>
              <Select value={selectedOpp || 'all'} onValueChange={(v) => setSelectedOpp(v === 'all' ? '' : v)}>
                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📊 Pipeline geral</SelectItem>
                  {opps.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.title} · {o.stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground line-clamp-2">{selectedOppLabel}</p>
            </CardContent>
          </Card>

          <Card className="flex-1 min-h-0">
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Ações rápidas
              </p>
              {QUICK_ACTIONS.map((q, i) => {
                const Icon = q.icon;
                const disabled = (q.mode !== 'chat' && !selectedOpp) || streaming;
                return (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => sendMessage(q.prompt, q.mode)}
                    className="w-full justify-start text-xs h-auto py-2 px-3"
                  >
                    <Icon className={`h-3.5 w-3.5 mr-2 ${q.color}`} />
                    {q.label}
                  </Button>
                );
              })}
              {!selectedOpp && (
                <p className="text-[10px] text-muted-foreground italic px-1">Selecione um lead acima para ações específicas</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pergunte ao pipeline</p>
              {PIPELINE_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  disabled={streaming}
                  onClick={() => sendMessage(p, 'chat')}
                  className="w-full text-left text-xs p-2 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  💡 {p}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Chat area */}
        <Card className="flex flex-col min-h-0">
          {/* Header */}
          <div className="border-b p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm">Copiloto IA de Vendas</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {streaming ? 'Pensando...' : 'Pronto · Conhece seu pipeline em tempo real'}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setMessages([])} title="Limpar conversa">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1" ref={scrollRef as any}>
            <div className="p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">Como posso ajudar suas vendas hoje?</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-6">
                    Selecione um lead à esquerda e use uma ação rápida, ou pergunte qualquer coisa sobre seu pipeline.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full">
                    {PIPELINE_PROMPTS.slice(0, 4).map((p, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(p, 'chat')}
                        className="text-left text-xs p-3 rounded-lg border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all"
                      >
                        💬 {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className={`max-w-[85%] group ${m.role === 'user' ? 'order-first' : ''}`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted rounded-tl-sm'
                    }`}>
                      {m.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-pre:bg-background prose-pre:text-foreground prose-pre:border">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || '...'}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                    {m.role === 'assistant' && m.content && (
                      <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => copyMsg(m.content)}>
                          <Copy className="h-3 w-3 mr-1" /> Copiar
                        </Button>
                      </div>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <User2 className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {streaming && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Analisando seu pipeline...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t p-3">
            {selectedOpp && (
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary">
                  <User2 className="h-3 w-3" />
                  Contexto: {opps.find(o => o.id === selectedOpp)?.title}
                </Badge>
                <button onClick={() => setSelectedOpp('')} className="text-[10px] text-muted-foreground hover:text-foreground">limpar</button>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input, 'chat');
                  }
                }}
                placeholder="Pergunte sobre um lead, peça uma mensagem ou estratégia..."
                rows={2}
                disabled={streaming}
                className="resize-none text-sm"
              />
              {streaming ? (
                <Button onClick={stop} variant="destructive" size="icon" className="h-auto">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => sendMessage(input, 'chat')} disabled={!input.trim()} size="icon" className="h-auto">
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Enter para enviar · Shift+Enter para quebra de linha · Desenvolvido por NovaLink
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
