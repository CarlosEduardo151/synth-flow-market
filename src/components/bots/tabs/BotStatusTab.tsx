import { useState } from 'react';
import { ServerCog, Shield, Power, RotateCcw, PowerOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BotMetricsPanel } from './BotMetricsPanel';

interface BotStatusTabProps {
  isActive: boolean;
  customerProductId?: string | null;
  onStart: () => Promise<void>;
  onShutdown: () => Promise<void>;
  onRestart: () => Promise<void>;
}

export function BotStatusTab({ isActive, customerProductId, onStart, onShutdown, onRestart }: BotStatusTabProps) {
  const { toast } = useToast();
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const busy = starting || stopping || restarting;

  const handleStart = async () => {
    setStarting(true);
    try {
      await onStart();
      toast({ title: '🟢 Motor ligado', description: 'O bot está ativo e respondendo mensagens.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível ligar o motor.', variant: 'destructive' });
    } finally {
      setStarting(false);
    }
  };

  const handleShutdown = async () => {
    setStopping(true);
    try {
      await onShutdown();
      toast({ title: '🔴 Motor desligado', description: 'Bot, IA e cache desativados. Nenhuma mensagem será processada.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível desligar o motor.', variant: 'destructive' });
    } finally {
      setStopping(false);
    }
  };

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await onRestart();
      toast({ title: '🔄 Motor reiniciado', description: 'Cache limpo, IA reiniciada. Configurações atualizadas aplicadas.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível reiniciar o motor.', variant: 'destructive' });
    } finally {
      setRestarting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ServerCog className="h-5 w-5 text-primary" />
            Motor NovaLink
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Status indicator */}
          <div
            className={`relative flex items-center gap-4 p-5 rounded-xl border transition-all duration-500 ${
              isActive
                ? 'border-green-500/40 bg-green-500/5'
                : 'border-destructive/30 bg-destructive/5'
            }`}
          >
            {isActive && (
              <span className="absolute top-4 right-4 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
            )}

            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-500 ${
                isActive ? 'bg-green-500/15' : 'bg-destructive/10'
              }`}
            >
              {isActive ? (
                <Power className="h-6 w-6 text-green-500" />
              ) : (
                <PowerOff className="h-6 w-6 text-destructive" />
              )}
            </div>
            <div>
              <p className={`font-semibold text-base ${isActive ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                {isActive ? 'Motor Ativo' : 'Motor Desligado'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isActive
                  ? 'Respondendo mensagens automaticamente 24/7'
                  : 'O bot não está respondendo mensagens. Ideal para fazer alterações.'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              onClick={handleStart}
              disabled={busy || isActive}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Power className="h-4 w-4" />
              {starting ? 'Ligando...' : 'Ligar'}
            </Button>

            <Button
              variant="destructive"
              onClick={handleShutdown}
              disabled={busy || !isActive}
              className="gap-2"
            >
              <PowerOff className="h-4 w-4" />
              {stopping ? 'Desligando...' : 'Desligar'}
            </Button>

            <Button
              variant="outline"
              onClick={handleRestart}
              disabled={busy}
              className="gap-2"
            >
              <RotateCcw className={`h-4 w-4 ${restarting ? 'animate-spin' : ''}`} />
              {restarting ? 'Reiniciando...' : 'Reiniciar'}
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* Metrics */}
      <BotMetricsPanel isActive={isActive} customerProductId={customerProductId} />

    </div>
  );
}
