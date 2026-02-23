import { useState } from 'react';
import { ServerCog, Shield, Power, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface BotStatusTabProps {
  isActive: boolean;
  onToggle: (active: boolean) => Promise<void>;
}

export function BotStatusTab({ isActive, onToggle }: BotStatusTabProps) {
  const { toast } = useToast();
  const [toggling, setToggling] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      await onToggle(checked);
      toast({
        title: checked ? 'Motor ligado' : 'Motor desligado',
        description: checked
          ? 'O bot está respondendo mensagens automaticamente.'
          : 'O bot foi desativado e não responderá mensagens.',
      });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível alterar o estado do motor.', variant: 'destructive' });
    } finally {
      setToggling(false);
    }
  };

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await onToggle(false);
      await new Promise((r) => setTimeout(r, 1000));
      await onToggle(true);
      toast({ title: 'Motor reiniciado', description: 'O bot foi reiniciado com sucesso.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível reiniciar o motor.', variant: 'destructive' });
    } finally {
      setRestarting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Motor NovaLink */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ServerCog className="h-5 w-5 text-primary" />
            Motor NovaLink
          </CardTitle>
          <CardDescription>Processamento nativo de IA — sem dependências externas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Status indicator */}
          <div
            className={`relative flex items-center justify-between p-5 rounded-xl border transition-all duration-500 ${
              isActive
                ? 'border-green-500/40 bg-green-500/5'
                : 'border-destructive/30 bg-destructive/5'
            }`}
          >
            {/* Pulse animation when active */}
            {isActive && (
              <span className="absolute top-4 right-4 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
            )}

            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-500 ${
                  isActive ? 'bg-green-500/15' : 'bg-destructive/10'
                }`}
              >
                <Power
                  className={`h-6 w-6 transition-colors duration-500 ${
                    isActive ? 'text-green-500' : 'text-destructive'
                  }`}
                />
              </div>
              <div>
                <p className={`font-semibold text-base ${isActive ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                  {isActive ? 'Motor Ativo' : 'Motor Desligado'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isActive
                    ? 'Respondendo mensagens automaticamente 24/7'
                    : 'O bot não está respondendo mensagens'}
                </p>
              </div>
            </div>

            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
              disabled={toggling || restarting}
              className="scale-125"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant={isActive ? 'destructive' : 'default'}
              onClick={() => handleToggle(!isActive)}
              disabled={toggling || restarting}
              className="gap-2 flex-1"
            >
              <Power className="h-4 w-4" />
              {toggling ? 'Aguarde...' : isActive ? 'Desligar' : 'Ligar'}
            </Button>
            <Button
              variant="outline"
              onClick={handleRestart}
              disabled={restarting || toggling || !isActive}
              className="gap-2 flex-1"
            >
              <RotateCcw className={`h-4 w-4 ${restarting ? 'animate-spin' : ''}`} />
              {restarting ? 'Reiniciando...' : 'Reiniciar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Como Funciona
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>✅ Mensagens de texto são processadas pela IA configurada no Motor IA</p>
            <p>✅ Imagens são analisadas via visão computacional (GPT-4o ou Gemini)</p>
            <p>✅ Áudios são transcritos e processados automaticamente</p>
            <p>✅ Cada cliente tem sua própria configuração independente</p>
            <p>✅ Troque entre OpenAI e Google Gemini a qualquer momento</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
