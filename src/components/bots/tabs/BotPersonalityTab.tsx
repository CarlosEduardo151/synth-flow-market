import { Bot, Brain, Shield, Plus, Trash2, Sparkles, Eye, MessageSquare, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { BotVoiceConfig, type AgentVoiceConfig } from './BotVoiceConfig';

export type CommunicationTone = 'profissional' | 'amigavel' | 'tecnico' | 'entusiasmado' | 'empatico' | 'direto';

export interface ActionInstruction {
  id: string;
  instruction: string;
  type: 'do' | 'dont';
}

const COMMUNICATION_TONES: Record<CommunicationTone, { emoji: string; label: string; desc: string; instruction: string; example: string }> = {
  profissional: {
    emoji: '👔', label: 'Profissional', desc: 'Formal e corporativo',
    instruction: 'Use linguagem corporativa e formal. Mantenha um tom respeitoso e objetivo.',
    example: 'Prezado cliente, segue as informações solicitadas sobre nosso serviço.',
  },
  amigavel: {
    emoji: '😊', label: 'Amigável', desc: 'Casual e acolhedor',
    instruction: 'Use linguagem casual mas respeitosa. Use emojis com moderação para ser acolhedor.',
    example: 'Oi! 😊 Claro, vou te ajudar com isso agora mesmo!',
  },
  tecnico: {
    emoji: '🔬', label: 'Técnico', desc: 'Preciso e detalhado',
    instruction: 'Use terminologia técnica precisa. Seja detalhado e específico nas explicações.',
    example: 'A latência média do endpoint é de 120ms com throughput de 500 req/s.',
  },
  entusiasmado: {
    emoji: '🎉', label: 'Entusiasmado', desc: 'Energético e motivador',
    instruction: 'Demonstre energia positiva! Celebre conquistas do cliente. Use exclamações e emojis.',
    example: 'Que incrível! 🚀 Você vai adorar esse recurso! Vamos configurar juntos!',
  },
  empatico: {
    emoji: '💚', label: 'Empático', desc: 'Compreensivo e atencioso',
    instruction: 'Demonstre compreensão genuína. Seja paciente e atencioso com as necessidades do cliente.',
    example: 'Entendo perfeitamente sua situação. Vamos resolver isso juntos, sem pressa.',
  },
  direto: {
    emoji: '🎯', label: 'Direto', desc: 'Objetivo e conciso',
    instruction: 'Vá direto ao ponto. Respostas concisas e objetivas sem rodeios.',
    example: 'Preço: R$ 99/mês. Inclui suporte. Quer contratar?',
  },
};

interface BotPersonalityTabProps {
  communicationTone: CommunicationTone;
  systemPrompt: string;
  actionInstructions: ActionInstruction[];
  voiceConfig?: AgentVoiceConfig;
  onToneChange: (tone: CommunicationTone) => void;
  onSystemPromptChange: (prompt: string) => void;
  onAddInstruction: (instruction: string, type: 'do' | 'dont') => void;
  onRemoveInstruction: (id: string) => void;
  onVoiceConfigChange?: (config: AgentVoiceConfig) => void;
  onSave?: () => void;
  saving?: boolean;
}

export function BotPersonalityTab({
  communicationTone,
  systemPrompt,
  actionInstructions,
  voiceConfig = { enabled: false, voiceId: 'nova' },
  onToneChange,
  onSystemPromptChange,
  onAddInstruction,
  onRemoveInstruction,
  onVoiceConfigChange,
  onSave,
  saving,
}: BotPersonalityTabProps) {
  const [newInstruction, setNewInstruction] = useState('');
  const [newType, setNewType] = useState<'do' | 'dont'>('do');
  const [showPreview, setShowPreview] = useState(false);

  const handleAdd = () => {
    if (!newInstruction.trim()) return;
    onAddInstruction(newInstruction, newType);
    setNewInstruction('');
  };

  const doRules = actionInstructions.filter(i => i.type === 'do');
  const dontRules = actionInstructions.filter(i => i.type === 'dont');

  return (
    <div className="space-y-6">
      {onSave && (
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving} size="sm" className="rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      )}
      {/* Communication Tone */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="h-5 w-5 text-primary" />
                Tom de Comunicação
              </CardTitle>
              <CardDescription className="mt-1">Define como o bot se expressa em todas as respostas</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/30 text-primary">
              <Sparkles className="h-2.5 w-2.5 mr-1" />
              Injetado no motor
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(Object.entries(COMMUNICATION_TONES) as [CommunicationTone, typeof COMMUNICATION_TONES[CommunicationTone]][]).map(([id, tone]) => (
              <button
                key={id}
                onClick={() => onToneChange(id)}
                className={`relative rounded-xl p-4 text-left transition-all hover:scale-[1.02] border-2 ${
                  communicationTone === id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border/50 hover:border-muted-foreground/30 bg-card/50'
                }`}
              >
                <span className="text-2xl mb-2 block">{tone.emoji}</span>
                <h3 className="font-semibold text-sm">{tone.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{tone.desc}</p>
                {communicationTone === id && (
                  <Badge className="absolute top-2 right-2 bg-primary text-[10px] px-1.5 py-0">Ativo</Badge>
                )}
              </button>
            ))}
          </div>

          {/* Preview of selected tone */}
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Prévia do tom selecionado
              </p>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                {COMMUNICATION_TONES[communicationTone].emoji} {COMMUNICATION_TONES[communicationTone].label}
              </Badge>
            </div>
            <div className="bg-background rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Instrução enviada ao motor:</p>
              <p className="text-sm italic text-foreground/80">{COMMUNICATION_TONES[communicationTone].instruction}</p>
            </div>
            <div className="bg-green-500/5 rounded-lg p-3 border border-green-500/10">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Exemplo de resposta:</p>
              <p className="text-sm text-foreground/80">"{COMMUNICATION_TONES[communicationTone].example}"</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Config */}
      {onVoiceConfigChange && (
        <BotVoiceConfig voiceConfig={voiceConfig} onVoiceConfigChange={onVoiceConfigChange} />
      )}

      {/* System Prompt */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-primary" />
                Instruções do Bot (System Prompt)
              </CardTitle>
              <CardDescription className="mt-1">
                Base de personalidade — diga quem é o bot, o que faz e como deve agir
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-3.5 w-3.5" />
              {showPreview ? 'Ocultar' : 'Ver'} prompt final
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            className="min-h-[160px] text-sm font-mono"
            placeholder="Ex: Você é o assistente da loja XYZ. Ajude clientes com dúvidas sobre produtos, preços e entregas..."
          />
          <p className="text-[11px] text-muted-foreground">
            💡 Dica: Seja específico sobre o negócio. Inclua nome da empresa, produtos, horários e políticas.
          </p>

          {/* Prompt preview */}
          {showPreview && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Prompt final enviado ao motor IA
              </p>
              <div className="text-xs font-mono bg-background/80 rounded-lg p-3 border border-border/50 space-y-2 max-h-[300px] overflow-y-auto">
                <div>
                  <span className="text-primary font-semibold">// System Prompt</span>
                  <p className="text-foreground/70 whitespace-pre-wrap mt-1">{systemPrompt || '(vazio)'}</p>
                </div>
                <div className="border-t border-border/30 pt-2">
                  <span className="text-primary font-semibold">// === TOM DE COMUNICAÇÃO ===</span>
                  <p className="text-foreground/70 mt-1">{COMMUNICATION_TONES[communicationTone].instruction}</p>
                </div>
                {actionInstructions.length > 0 && (
                  <div className="border-t border-border/30 pt-2">
                    <span className="text-primary font-semibold">// === REGRAS DE COMPORTAMENTO ===</span>
                    {doRules.length > 0 && (
                      <div className="mt-1">
                        <span className="text-green-600 dark:text-green-400">SEMPRE faça:</span>
                        {doRules.map(r => (
                          <p key={r.id} className="text-foreground/70">✅ {r.instruction}</p>
                        ))}
                      </div>
                    )}
                    {dontRules.length > 0 && (
                      <div className="mt-1">
                        <span className="text-destructive">NUNCA faça:</span>
                        {dontRules.map(r => (
                          <p key={r.id} className="text-foreground/70">❌ NUNCA: {r.instruction}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="border-t border-border/30 pt-2">
                  <span className="text-muted-foreground">// === BASE DE CONHECIMENTO === (carregado do banco)</span>
                </div>
                <div className="border-t border-border/30 pt-2">
                  <span className="text-muted-foreground">// === MEMÓRIA CONTEXTUAL === (últimas mensagens do contato)</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rules */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary" />
                Regras do Agente
              </CardTitle>
              <CardDescription className="mt-1">Limites e diretrizes obrigatórias para o bot seguir</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {doRules.length > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/30 text-green-600 dark:text-green-400">
                  {doRules.length} faça
                </Badge>
              )}
              {dontRules.length > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-destructive/30 text-destructive">
                  {dontRules.length} não faça
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={newType} onValueChange={(v) => setNewType(v as 'do' | 'dont')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="do">✅ Sempre faça</SelectItem>
                <SelectItem value="dont">❌ Nunca faça</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={newInstruction}
              onChange={(e) => setNewInstruction(e.target.value)}
              placeholder="Ex: Sempre cumprimente o cliente pelo nome"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="flex-1"
            />
            <Button onClick={handleAdd} size="icon" className="flex-shrink-0" disabled={!newInstruction.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {actionInstructions.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Shield className="h-8 w-8 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhuma regra configurada</p>
              <p className="text-xs text-muted-foreground/70">Adicione regras para controlar o comportamento do bot</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Do rules */}
              {doRules.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
                    ✅ SEMPRE faça ({doRules.length})
                  </p>
                  {doRules.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-xl text-sm bg-green-500/5 border border-green-500/15"
                    >
                      <span className="text-foreground/80">{item.instruction}</span>
                      <Button variant="ghost" size="icon" onClick={() => onRemoveInstruction(item.id)} className="h-7 w-7 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Dont rules */}
              {dontRules.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-destructive flex items-center gap-1.5">
                    ❌ NUNCA faça ({dontRules.length})
                  </p>
                  {dontRules.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-xl text-sm bg-destructive/5 border border-destructive/15"
                    >
                      <span className="text-foreground/80">{item.instruction}</span>
                      <Button variant="ghost" size="icon" onClick={() => onRemoveInstruction(item.id)} className="h-7 w-7 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
