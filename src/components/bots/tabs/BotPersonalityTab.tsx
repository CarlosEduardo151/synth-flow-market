import { Bot, Brain, Shield, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

export type CommunicationTone = 'profissional' | 'amigavel' | 'tecnico' | 'entusiasmado' | 'empatico' | 'direto';

export interface ActionInstruction {
  id: string;
  instruction: string;
  type: 'do' | 'dont';
}

const COMMUNICATION_TONES: Record<CommunicationTone, { emoji: string; label: string; desc: string; instruction: string }> = {
  profissional: { emoji: '👔', label: 'Profissional', desc: 'Formal e corporativo', instruction: 'Use linguagem corporativa e formal.' },
  amigavel: { emoji: '😊', label: 'Amigável', desc: 'Casual e acolhedor', instruction: 'Use linguagem casual mas respeitosa. Emojis com moderação.' },
  tecnico: { emoji: '🔬', label: 'Técnico', desc: 'Preciso e detalhado', instruction: 'Use terminologia técnica precisa.' },
  entusiasmado: { emoji: '🎉', label: 'Entusiasmado', desc: 'Energético e motivador', instruction: 'Demonstre energia positiva! Celebre conquistas.' },
  empatico: { emoji: '💚', label: 'Empático', desc: 'Compreensivo e atencioso', instruction: 'Demonstre compreensão genuína. Seja paciente.' },
  direto: { emoji: '🎯', label: 'Direto', desc: 'Objetivo e conciso', instruction: 'Vá direto ao ponto. Respostas concisas.' },
};

interface BotPersonalityTabProps {
  communicationTone: CommunicationTone;
  systemPrompt: string;
  actionInstructions: ActionInstruction[];
  onToneChange: (tone: CommunicationTone) => void;
  onSystemPromptChange: (prompt: string) => void;
  onAddInstruction: (instruction: string, type: 'do' | 'dont') => void;
  onRemoveInstruction: (id: string) => void;
}

export function BotPersonalityTab({
  communicationTone,
  systemPrompt,
  actionInstructions,
  onToneChange,
  onSystemPromptChange,
  onAddInstruction,
  onRemoveInstruction,
}: BotPersonalityTabProps) {
  const [newInstruction, setNewInstruction] = useState('');
  const [newType, setNewType] = useState<'do' | 'dont'>('do');

  const handleAdd = () => {
    if (!newInstruction.trim()) return;
    onAddInstruction(newInstruction, newType);
    setNewInstruction('');
  };

  return (
    <div className="space-y-6">
      {/* Communication Tone */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-primary" />
            Tom de Comunicação
          </CardTitle>
          <CardDescription>Como seu bot vai se comunicar</CardDescription>
        </CardHeader>
        <CardContent>
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

          <div className="mt-4 p-3 bg-muted/30 rounded-xl border border-border/50">
            <p className="text-xs text-muted-foreground mb-0.5">Instrução aplicada:</p>
            <p className="text-sm italic">{COMMUNICATION_TONES[communicationTone].instruction}</p>
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            Instruções do Bot
          </CardTitle>
          <CardDescription>O que seu bot sabe e como deve agir (salva automaticamente)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            className="min-h-[160px] text-sm font-mono"
            placeholder="Ex: Você é o assistente da loja XYZ..."
          />
        </CardContent>
      </Card>

      {/* Rules */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Regras do Agente
          </CardTitle>
          <CardDescription>O que o bot deve ou não fazer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={newType} onValueChange={(v) => setNewType(v as 'do' | 'dont')}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="do">✅ Faça</SelectItem>
                <SelectItem value="dont">❌ Não faça</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={newInstruction}
              onChange={(e) => setNewInstruction(e.target.value)}
              placeholder="Ex: Sempre cumprimente o cliente"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="flex-1"
            />
            <Button onClick={handleAdd} size="icon" className="flex-shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {actionInstructions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma regra configurada</p>
            ) : (
              actionInstructions.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-xl text-sm ${
                    item.type === 'do'
                      ? 'bg-green-500/5 border border-green-500/15'
                      : 'bg-destructive/5 border border-destructive/15'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {item.type === 'do' ? '✅' : '❌'} {item.instruction}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => onRemoveInstruction(item.id)} className="h-7 w-7 flex-shrink-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
