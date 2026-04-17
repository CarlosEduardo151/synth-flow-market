import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Theater, Send, Mic, RotateCcw, Trophy, Brain, User, Bot, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props { customerProductId: string; }

interface Session {
  id: string;
  persona: string;
  scenario: string | null;
  score: number | null;
  feedback: any;
  transcript: any;
  status: string;
  created_at: string;
}

const personas = [
  { id: 'cetico', label: '😒 Cliente Cético', desc: 'Desconfiado, faz mil perguntas, pede prova social' },
  { id: 'preco', label: '💰 Caçador de Preço', desc: 'Quer desconto, compara com concorrente, ameaça sair' },
  { id: 'tecnico', label: '🤓 Comprador Técnico', desc: 'CTO/dev, foca em arquitetura, segurança, integrações' },
  { id: 'pressa', label: '⚡ Com Pressa', desc: 'Decisor ocupado, quer 30s de pitch, odeia call longa' },
  { id: 'indeciso', label: '🤔 Eternamente Indeciso', desc: 'Pede mais tempo, "vou pensar", não responde' },
];

export function SalesRolePlay({ customerProductId }: Props) {
  const { user } = useAuth();
  const [persona, setPersona] = useState('cetico');
  const [scenario, setScenario] = useState('Lead de SaaS B2B, ticket R$ 2.500/mês, decisor é o CMO, segmento de e-commerce.');
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('sa_roleplay_sessions')
      .select('id,persona,scenario,score,feedback,transcript,status,created_at')
      .eq('customer_product_id', customerProductId)
      .order('created_at', { ascending: false }).limit(20);
    setSessions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!customerProductId) return;
    loadSessions();
  }, [customerProductId]);

  const startSession = async () => {
    if (!user) return;
    setSaving(true);
    const { data, error } = await (supabase as any)
      .from('sa_roleplay_sessions')
      .insert({
        customer_product_id: customerProductId,
        user_id: user.id,
        persona,
        scenario,
        status: 'active',
        transcript: [],
      })
      .select().single();
    setSaving(false);
    if (error) { toast.error('Erro ao iniciar sessão'); return; }
    setActiveSession(data);
    setTranscript([]);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeSession) return;
    const next = [...transcript, { role: 'vendedor', text: input }];
    setTranscript(next);
    setInput('');
    await (supabase as any).from('sa_roleplay_sessions')
      .update({ transcript: next }).eq('id', activeSession.id);
    // TODO: chamar edge function de IA para resposta do lead simulado
  };

  const finishSession = async () => {
    if (!activeSession) return;
    setSaving(true);
    await (supabase as any).from('sa_roleplay_sessions')
      .update({ status: 'completed', transcript }).eq('id', activeSession.id);
    setSaving(false);
    toast.success('Sessão concluída. Avaliação será gerada.');
    setActiveSession(null);
    setTranscript([]);
    loadSessions();
  };

  const totalSessions = sessions.length;
  const completed = sessions.filter(s => s.status === 'completed' && s.score != null);
  const avgScore = completed.length ? Math.round(completed.reduce((s, x) => s + (x.score || 0), 0) / completed.length) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Sessões treinadas</p><p className="text-2xl font-bold">{totalSessions}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Score médio</p><p className="text-2xl font-bold text-emerald-500">{avgScore}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Concluídas</p><p className="text-2xl font-bold">{completed.length}</p></CardContent></Card>
      </div>

      {!activeSession ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Theater className="h-5 w-5 text-primary" />Simulador de Lead — Role-play IA</CardTitle>
            <CardDescription>Treine pitch e quebra de objeções com leads simulados. A IA finge ser o cliente baseado em padrões reais do seu histórico.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Persona do Lead</label>
              <Select value={persona} onValueChange={setPersona}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {personas.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div>
                        <p className="font-medium">{p.label}</p>
                        <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cenário</label>
              <Textarea value={scenario} onChange={e => setScenario(e.target.value)} rows={3} />
              <p className="text-[11px] text-muted-foreground">Descreva contexto: segmento, ticket, decisor, dor principal</p>
            </div>

            <Button onClick={startSession} className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Theater className="h-4 w-4 mr-2" />}
              Iniciar Simulação
            </Button>

            {!loading && sessions.length > 0 && (
              <div className="pt-4 border-t space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sessões recentes</p>
                {sessions.slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs p-2 rounded hover:bg-muted/30">
                    <span>{personas.find(p => p.id === s.persona)?.label || s.persona}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                      {s.score != null && <Badge>{s.score}/100</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2"><Theater className="h-5 w-5 text-primary" />Sessão em andamento</CardTitle>
                <CardDescription>{personas.find(p => p.id === activeSession.persona)?.label}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setActiveSession(null); setTranscript([]); }}>
                  <RotateCcw className="h-4 w-4 mr-2" />Cancelar
                </Button>
                <Button size="sm" onClick={finishSession} disabled={saving}>
                  <Trophy className="h-4 w-4 mr-2" />Finalizar e avaliar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto p-4 bg-muted/30 rounded-md min-h-[200px]">
              {transcript.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Comece a conversa enviando sua primeira mensagem ao lead simulado.</p>
              ) : transcript.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'vendedor' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'lead' ? 'bg-primary/10' : 'bg-emerald-500/10'}`}>
                    {msg.role === 'lead' ? <Bot className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${msg.role === 'lead' ? 'bg-card border' : 'bg-emerald-500/10'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Textarea
                value={input} onChange={e => setInput(e.target.value)}
                placeholder="Digite sua resposta como vendedor..." rows={2} className="flex-1"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              />
              <div className="flex flex-col gap-2">
                <Button size="icon" variant="outline"><Mic className="h-4 w-4" /></Button>
                <Button size="icon" onClick={sendMessage}><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Brain className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Por que isso é raro no mercado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Quase nenhum CRM oferece role-play com IA. A maioria dos vendedores treina "no cliente real" — perdendo deals enquanto aprende. Aqui você treina antes, com leads simulados que reagem como os seus reais.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
