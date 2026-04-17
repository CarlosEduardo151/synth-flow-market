import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Theater, Send, Mic, RotateCcw, Trophy, Brain, User, Bot } from 'lucide-react';

interface Props { customerProductId: string; }

const personas = [
  { id: 'cetico', label: '😒 Cliente Cético', desc: 'Desconfiado, faz mil perguntas, pede prova social' },
  { id: 'preco', label: '💰 Caçador de Preço', desc: 'Quer desconto, compara com concorrente, ameaça sair' },
  { id: 'tecnico', label: '🤓 Comprador Técnico', desc: 'CTO/dev, foca em arquitetura, segurança, integrações' },
  { id: 'pressa', label: '⚡ Com Pressa', desc: 'Decisor ocupado, quer 30s de pitch, odeia call longa' },
  { id: 'indeciso', label: '🤔 Eternamente Indeciso', desc: 'Pede mais tempo, "vou pensar", não responde' },
];

const mockChat = [
  { role: 'lead', text: 'Oi, recebi seu e-mail. Mas pra ser sincero já tenho um sistema parecido e tá funcionando.' },
  { role: 'vendedor', text: 'Entendo! Posso te perguntar qual sistema usa hoje?' },
  { role: 'lead', text: 'Uso o XPTO. E ó, o preço de vocês me pareceu bem mais alto.' },
];

export function SalesRolePlay({ customerProductId }: Props) {
  const [persona, setPersona] = useState('cetico');
  const [scenario, setScenario] = useState('Lead de SaaS B2B, ticket R$ 2.500/mês, decisor é o CMO, segmento de e-commerce.');
  const [chatStarted, setChatStarted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const startSession = () => {
    setChatStarted(true);
    setScore(null);
  };

  const finishSession = () => {
    setScore(78);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sessões treinadas</p>
            <p className="text-2xl font-bold">23</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Score médio</p>
            <p className="text-2xl font-bold text-emerald-500">74</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Objeções dominadas</p>
            <p className="text-2xl font-bold">12/18</p>
          </CardContent>
        </Card>
      </div>

      {!chatStarted ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Theater className="h-5 w-5 text-primary" />
              Simulador de Lead — Role-play IA
            </CardTitle>
            <CardDescription>
              Treine pitch e quebra de objeções com leads simulados. A IA finge ser o cliente baseado em padrões reais do seu histórico.
            </CardDescription>
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

            <Button onClick={startSession} className="w-full">
              <Theater className="h-4 w-4 mr-2" />
              Iniciar Simulação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Theater className="h-5 w-5 text-primary" />
                  Sessão em andamento
                </CardTitle>
                <CardDescription>{personas.find(p => p.id === persona)?.label}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setChatStarted(false)}>
                  <RotateCcw className="h-4 w-4 mr-2" />Reiniciar
                </Button>
                <Button size="sm" onClick={finishSession}>
                  <Trophy className="h-4 w-4 mr-2" />Avaliar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto p-4 bg-muted/30 rounded-md">
              {mockChat.map((msg, i) => (
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
              <Textarea placeholder="Digite sua resposta como vendedor..." rows={2} className="flex-1" />
              <div className="flex flex-col gap-2">
                <Button size="icon" variant="outline"><Mic className="h-4 w-4" /></Button>
                <Button size="icon"><Send className="h-4 w-4" /></Button>
              </div>
            </div>

            {score !== null && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      Avaliação da IA
                    </p>
                    <Badge className="text-lg px-3">{score}/100</Badge>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>✅ Boa quebra de gelo inicial</li>
                    <li>✅ Identificou a objeção de preço corretamente</li>
                    <li>⚠️ Não usou prova social (case relevante teria fechado)</li>
                    <li>❌ Não fez pergunta de descoberta antes de defender preço</li>
                  </ul>
                </CardContent>
              </Card>
            )}
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
