import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Theater, Send, RotateCcw, Trophy, Brain, User, Bot, Loader2, Sparkles, TrendingUp, Target, Award, BarChart3, History, Play } from 'lucide-react';
import { toast } from 'sonner';
import { SalesSectionHeader } from './SalesSectionHeader';

interface Props { customerProductId: string; }

interface Session {
  id: string;
  persona_name: string;
  persona_profile: any;
  scenario: string | null;
  ai_score: number | null;
  ai_feedback: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  transcript: any;
  status: string;
  created_at: string;
}

const personas = [
  { id: 'cetico', label: 'Cliente Cético', emoji: '😒', desc: 'Desconfiado, pede prova social', difficulty: 'Médio' },
  { id: 'preco', label: 'Caçador de Preço', emoji: '💰', desc: 'Quer desconto agressivo', difficulty: 'Difícil' },
  { id: 'tecnico', label: 'Comprador Técnico', emoji: '🤓', desc: 'CTO, foca em arquitetura', difficulty: 'Difícil' },
  { id: 'pressa', label: 'Com Pressa', emoji: '⚡', desc: 'Pitch de 30s ou nada', difficulty: 'Médio' },
  { id: 'indeciso', label: 'Eternamente Indeciso', emoji: '🤔', desc: '"Vou pensar" infinito', difficulty: 'Muito Difícil' },
];

const SCENARIOS_PRESETS = [
  'SaaS B2B, ticket R$ 2.500/mês, decisor é o CMO de e-commerce.',
  'Consultoria, ticket R$ 15.000 projeto, decisor é fundador de startup.',
  'Produto físico, ticket R$ 800, decisor é dono de loja de bairro.',
  'Software empresarial, ticket R$ 50.000/ano, decisor é diretor de TI.',
];

export function SalesRolePlay({ customerProductId }: Props) {
  const { user } = useAuth();
  const [persona, setPersona] = useState('cetico');
  const [scenario, setScenario] = useState(SCENARIOS_PRESETS[0]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [reviewSession, setReviewSession] = useState<Session | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadSessions = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('sa_roleplay_sessions')
      .select('id,persona_name,persona_profile,scenario,ai_score,ai_feedback,strengths,improvements,transcript,status,created_at')
      .eq('customer_product_id', customerProductId)
      .order('created_at', { ascending: false }).limit(30);
    setSessions(data || []);
    setLoading(false);
  };

  useEffect(() => { if (customerProductId) loadSessions(); }, [customerProductId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript, thinking]);

  const startSession = async () => {
    if (!user) return;
    setSaving(true);
    const personaMeta = personas.find(p => p.id === persona);
    const { data, error } = await (supabase as any)
      .from('sa_roleplay_sessions')
      .insert({
        customer_product_id: customerProductId,
        persona_name: persona,
        persona_profile: { id: persona, label: personaMeta?.label, emoji: personaMeta?.emoji, desc: personaMeta?.desc },
        scenario,
        status: 'in_progress',
        transcript: [],
      })
      .select().single();
    setSaving(false);
    if (error) { console.error('startSession error', error); toast.error('Erro ao iniciar sessão: ' + error.message); return; }
    setActiveSession(data);
    setTranscript([]);
    setReviewSession(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeSession || thinking) return;
    const userMsg = input.trim();
    const next = [...transcript, { role: 'vendedor', text: userMsg }];
    setTranscript(next);
    setInput('');
    setThinking(true);

    try {
      const { data, error } = await supabase.functions.invoke('sa-roleplay-chat', {
        body: { mode: 'reply', persona: activeSession.persona_name, scenario: activeSession.scenario, transcript: next },
      });
      if (error) throw error;
      const reply = (data as any)?.reply || '...';
      const updated = [...next, { role: 'lead', text: reply }];
      setTranscript(updated);
      await (supabase as any).from('sa_roleplay_sessions').update({ transcript: updated }).eq('id', activeSession.id);
    } catch (e: any) {
      toast.error('Erro na resposta da IA: ' + (e?.message || 'desconhecido'));
    } finally {
      setThinking(false);
    }
  };

  const finishSession = async () => {
    if (!activeSession) return;
    if (transcript.length < 2) { toast.error('Faça pelo menos uma troca antes de finalizar.'); return; }
    setEvaluating(true);
    try {
      await (supabase as any).from('sa_roleplay_sessions').update({ transcript }).eq('id', activeSession.id);
      const { data, error } = await supabase.functions.invoke('sa-roleplay-chat', {
        body: { mode: 'evaluate', session_id: activeSession.id },
      });
      if (error) throw error;
      const fb = (data as any)?.feedback;
      toast.success(`Avaliação concluída — ${fb?.score ?? 0}/100`);
      const completed = { ...activeSession, status: 'completed', ai_score: fb?.score, ai_feedback: JSON.stringify(fb), strengths: fb?.pontos_fortes || [], improvements: fb?.pontos_fracos || [], transcript };
      setActiveSession(null);
      setTranscript([]);
      setReviewSession(completed as any);
      loadSessions();
    } catch (e: any) {
      toast.error('Erro ao avaliar: ' + (e?.message || 'desconhecido'));
    } finally {
      setEvaluating(false);
    }
  };

  const cancelSession = async () => {
    if (!activeSession) return;
    await (supabase as any).from('sa_roleplay_sessions').update({ status: 'abandoned' }).eq('id', activeSession.id);
    setActiveSession(null);
    setTranscript([]);
    loadSessions();
  };

  const totalSessions = sessions.length;
  const completed = sessions.filter(s => s.status === 'completed' && s.ai_score != null);
  const avgScore = completed.length ? Math.round(completed.reduce((s, x) => s + (x.ai_score || 0), 0) / completed.length) : 0;
  const bestScore = completed.length ? Math.max(...completed.map(s => s.ai_score || 0)) : 0;
  const personaLabel = (id: string) => personas.find(p => p.id === id)?.label || id;
  const personaEmoji = (id: string) => personas.find(p => p.id === id)?.emoji || '🎭';

  /* ============ REVIEW VIEW ============ */
  if (reviewSession) {
    const rawFb = reviewSession.ai_feedback;
    let fb: any = {};
    if (rawFb) { try { fb = typeof rawFb === 'string' ? JSON.parse(rawFb) : rawFb; } catch { fb = { veredito: String(rawFb) }; } }
    if (reviewSession.ai_score != null && fb.score == null) fb.score = reviewSession.ai_score;
    if (reviewSession.strengths?.length && !fb.pontos_fortes) fb.pontos_fortes = reviewSession.strengths;
    if (reviewSession.improvements?.length && !fb.pontos_fracos) fb.pontos_fracos = reviewSession.improvements;
    const m: any = fb.metricas || {};
    return (
      <div className="space-y-4">
        <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Award className="h-6 w-6 text-primary" /> Avaliação da Sessão
                </CardTitle>
                <CardDescription className="mt-1">
                  {personaEmoji(reviewSession.persona_name)} {personaLabel(reviewSession.persona_name)} · {reviewSession.transcript?.length || 0} mensagens
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold text-primary">{fb.score ?? 0}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">de 100</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fb.veredito && (
              <div className="p-3 rounded-lg bg-muted/50 border-l-4 border-primary">
                <p className="text-sm font-medium">{fb.veredito}</p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /> Pontos Fortes</h4>
                <ul className="space-y-1.5">
                  {(fb.pontos_fortes || []).map((p: string, i: number) => (
                    <li key={i} className="text-xs flex gap-2"><span className="text-emerald-500 mt-0.5">✓</span>{p}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2"><Target className="h-4 w-4 text-orange-500" /> A melhorar</h4>
                <ul className="space-y-1.5">
                  {(fb.pontos_fracos || []).map((p: string, i: number) => (
                    <li key={i} className="text-xs flex gap-2"><span className="text-orange-500 mt-0.5">→</span>{p}</li>
                  ))}
                </ul>
              </div>
            </div>

            {Object.keys(m).length > 0 && (
              <div className="space-y-2 pt-3 border-t">
                <h4 className="text-sm font-bold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Métricas detalhadas</h4>
                {[
                  ['abertura', 'Abertura'],
                  ['descoberta', 'Descoberta'],
                  ['apresentacao_valor', 'Apresentação de Valor'],
                  ['quebra_objecoes', 'Quebra de Objeções'],
                  ['fechamento', 'Fechamento'],
                ].map(([k, label]) => (
                  <div key={k} className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-mono font-bold">{m[k] ?? 0}/10</span></div>
                    <Progress value={(m[k] ?? 0) * 10} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}

            {fb.proximo_treino && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-xs font-bold uppercase text-primary mb-1">Próximo treino sugerido</p>
                <p className="text-sm">{fb.proximo_treino}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={() => setReviewSession(null)} variant="outline" className="flex-1"><RotateCcw className="h-4 w-4 mr-2" />Voltar</Button>
              <Button onClick={() => { setReviewSession(null); startSession(); }} className="flex-1"><Play className="h-4 w-4 mr-2" />Treinar de novo</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ============ ACTIVE SESSION ============ */
  if (activeSession) {
    return (
      <div className="grid lg:grid-cols-[1fr_280px] gap-4 h-[calc(100vh-200px)] min-h-[600px]">
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="border-b py-3 px-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-lg">{personaEmoji(activeSession.persona_name)}</div>
                <div>
                  <p className="font-bold text-sm">{personaLabel(activeSession.persona_name)}</p>
                  <p className="text-[11px] text-muted-foreground">Lead simulado · IA Groq</p>
                </div>
              </div>
              <Badge variant="outline" className="gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />ao vivo</Badge>
            </div>
          </CardHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
            {transcript.length === 0 && (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">O lead está esperando seu primeiro contato.</p>
                <p className="text-[11px] text-muted-foreground mt-1">Comece com uma abordagem natural.</p>
              </div>
            )}
            {transcript.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'vendedor' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'lead' ? 'bg-primary/10' : 'bg-emerald-500/10'}`}>
                  {msg.role === 'lead' ? <Bot className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-emerald-500" />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${msg.role === 'lead' ? 'bg-card border rounded-tl-sm' : 'bg-emerald-500/15 rounded-tr-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>
                <div className="bg-card border rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-3 bg-card">
            <div className="flex gap-2">
              <Textarea
                value={input} onChange={e => setInput(e.target.value)}
                placeholder={thinking ? 'Lead está digitando...' : 'Sua resposta como vendedor...'}
                rows={2} className="flex-1 resize-none" disabled={thinking}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              />
              <Button size="icon" onClick={sendMessage} disabled={!input.trim() || thinking} className="h-auto">
                {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">Enter para enviar · Shift+Enter quebra linha</p>
          </div>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Cenário</CardTitle></CardHeader>
            <CardContent><p className="text-xs text-muted-foreground leading-relaxed">{activeSession.scenario}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Progresso</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Trocas</span><span className="font-bold">{Math.floor(transcript.length / 2)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Mensagens</span><span className="font-bold">{transcript.length}</span></div>
              <div className="pt-2 text-[11px] text-muted-foreground border-t">Mín. 5 trocas para boa avaliação.</div>
            </CardContent>
          </Card>
          <Button onClick={finishSession} disabled={evaluating || transcript.length < 2} className="w-full" size="lg">
            {evaluating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Avaliando...</> : <><Trophy className="h-4 w-4 mr-2" />Finalizar e avaliar</>}
          </Button>
          <Button onClick={cancelSession} variant="outline" className="w-full" size="sm">Cancelar sessão</Button>
        </div>
      </div>
    );
  }

  /* ============ SETUP / DASHBOARD VIEW ============ */
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">Sessões treinadas</p><Theater className="h-4 w-4 text-muted-foreground" /></div>
          <p className="text-2xl font-bold mt-1">{totalSessions}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">Score médio</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div>
          <p className="text-2xl font-bold mt-1 text-primary">{avgScore}<span className="text-xs text-muted-foreground">/100</span></p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">Melhor score</p><Trophy className="h-4 w-4 text-muted-foreground" /></div>
          <p className="text-2xl font-bold mt-1 text-emerald-500">{bestScore}<span className="text-xs text-muted-foreground">/100</span></p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">Concluídas</p><Award className="h-4 w-4 text-muted-foreground" /></div>
          <p className="text-2xl font-bold mt-1">{completed.length}</p>
        </CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Theater className="h-5 w-5 text-primary" />Nova Simulação</CardTitle>
            <CardDescription>Treine pitch e quebra de objeções com leads simulados pela IA Groq.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold">Escolha a persona do lead</label>
              <div className="grid sm:grid-cols-2 gap-2">
                {personas.map(p => (
                  <button key={p.id} onClick={() => setPersona(p.id)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${persona === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-bold text-sm flex items-center gap-2"><span className="text-lg">{p.emoji}</span>{p.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{p.desc}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">{p.difficulty}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">Cenário de venda</label>
              <Textarea value={scenario} onChange={e => setScenario(e.target.value)} rows={3} placeholder="Descreva o contexto: segmento, ticket, decisor, dor principal..." />
              <div className="flex flex-wrap gap-1.5">
                {SCENARIOS_PRESETS.map((s, i) => (
                  <button key={i} onClick={() => setScenario(s)} className="text-[10px] px-2 py-1 rounded-full bg-muted hover:bg-primary/10 transition-colors">
                    Preset {i + 1}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={startSession} className="w-full" size="lg" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Iniciar Simulação
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" />Histórico</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[480px]">
              <div className="px-4 pb-4 space-y-2">
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : sessions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Nenhuma sessão ainda. Treine sua primeira!</p>
                ) : sessions.map(s => (
                  <button key={s.id} onClick={() => s.status === 'completed' && s.ai_feedback ? setReviewSession(s) : null}
                    className={`w-full text-left p-2.5 rounded-lg border transition-colors ${s.ai_feedback ? 'hover:border-primary/60 cursor-pointer' : 'cursor-default opacity-70'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{personaEmoji(s.persona_name)}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{personaLabel(s.persona_name)}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      {s.ai_score != null ? (
                        <Badge className={s.ai_score >= 70 ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : s.ai_score >= 40 ? 'bg-orange-500/15 text-orange-600 border-orange-500/30' : 'bg-destructive/15 text-destructive border-destructive/30'}>
                          {s.ai_score}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px]">{s.status}</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4 flex items-start gap-3">
          <Brain className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Por que isso é raro no mercado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Quase nenhum CRM oferece role-play com IA. A maioria dos vendedores treina "no cliente real" — perdendo deals enquanto aprende. Aqui você treina antes, com leads simulados que reagem como os seus reais, e recebe avaliação detalhada de coach sênior.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
