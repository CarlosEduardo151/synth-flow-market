import { Volume2, Play, Square } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useState, useRef } from 'react';

export type AgentVoiceId = 'nova' | 'onyx' | 'shimmer' | 'alloy' | 'echo' | 'fable';

export interface AgentVoiceConfig {
  enabled: boolean;
  voiceId: AgentVoiceId;
}

interface VoiceDef {
  id: AgentVoiceId;
  novalinkName: string;
  openaiId: string;
  emoji: string;
  profile: string;
  recommendation: string;
}

const VOICES: VoiceDef[] = [
  { id: 'nova', novalinkName: 'Nova v1.0', openaiId: 'nova', emoji: '✨', profile: 'Energética, brilhante e jovem', recommendation: 'Voz oficial da assistente' },
  { id: 'onyx', novalinkName: 'Kernel Prime', openaiId: 'onyx', emoji: '🛡️', profile: 'Robusta, grave e autoritária', recommendation: 'Comandos de infraestrutura e segurança' },
  { id: 'shimmer', novalinkName: 'Link Soft', openaiId: 'shimmer', emoji: '💎', profile: 'Clara, suave e profissional', recommendation: 'Suporte ao cliente e tutoriais' },
  { id: 'alloy', novalinkName: 'Cortex', openaiId: 'alloy', emoji: '⚙️', profile: 'Neutro, equilibrado e estável', recommendation: 'Leitura de logs e dados técnicos' },
  { id: 'echo', novalinkName: 'Cipher', openaiId: 'echo', emoji: '🔮', profile: 'Confiante, maduro e profundo', recommendation: 'Análises estratégicas e relatórios' },
  { id: 'fable', novalinkName: 'Narrative', openaiId: 'fable', emoji: '📖', profile: 'Expressiva e envolvente', recommendation: 'Contação de histórias ou apresentações' },
];

interface BotVoiceConfigProps {
  voiceConfig: AgentVoiceConfig;
  onVoiceConfigChange: (config: AgentVoiceConfig) => void;
}

export function BotVoiceConfig({ voiceConfig, onVoiceConfigChange }: BotVoiceConfigProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Volume2 className="h-5 w-5 text-primary" />
              Voz do Agente (Text-to-Speech)
            </CardTitle>
            <CardDescription className="mt-1">
              Configure a voz que o agente usará para responder com áudio via OpenAI TTS
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{voiceConfig.enabled ? 'Ativo' : 'Inativo'}</span>
            <Switch
              checked={voiceConfig.enabled}
              onCheckedChange={(enabled) => onVoiceConfigChange({ ...voiceConfig, enabled })}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!voiceConfig.enabled && (
          <div className="text-center py-6 space-y-2">
            <Volume2 className="h-8 w-8 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Ative para que o agente responda com áudio</p>
          </div>
        )}

        {voiceConfig.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {VOICES.map((voice) => (
              <button
                key={voice.id}
                onClick={() => onVoiceConfigChange({ ...voiceConfig, voiceId: voice.id })}
                className={`relative rounded-xl p-4 text-left transition-all hover:scale-[1.02] border-2 ${
                  voiceConfig.voiceId === voice.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border/50 hover:border-muted-foreground/30 bg-card/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{voice.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{voice.novalinkName}</h3>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-muted-foreground/20">
                        {voice.openaiId}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{voice.profile}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">💡 {voice.recommendation}</p>
                  </div>
                </div>
                {voiceConfig.voiceId === voice.id && (
                  <Badge className="absolute top-2 right-2 bg-primary text-[10px] px-1.5 py-0">Ativo</Badge>
                )}
              </button>
            ))}
          </div>
        )}

        {voiceConfig.enabled && (
          <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
            <p className="text-[11px] text-muted-foreground">
              🔊 O agente usará a voz <strong>{VOICES.find(v => v.id === voiceConfig.voiceId)?.novalinkName}</strong> (OpenAI <code>{voiceConfig.voiceId}</code>) para gerar áudios de resposta via TTS.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
