import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, Play, DollarSign, Bot, Target, RefreshCw, AlertCircle } from 'lucide-react';

interface HFTSetupScreenProps {
  onConnect: (saldo: number) => Promise<void>;
  isConnecting: boolean;
  connectionError: string | null;
}

export function HFTSetupScreen({ onConnect, isConnecting, connectionError }: HFTSetupScreenProps) {
  const [saldo, setSaldo] = useState<string>('');

  const handleConnect = async () => {
    const saldoNum = parseFloat(saldo);
    if (!saldoNum || saldoNum <= 0) return;
    await onConnect(saldoNum);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto"
        >
          <Card className="border-primary/30 bg-card/80 backdrop-blur-xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-500 to-primary" />
            
            <CardHeader className="text-center pb-2">
              <motion.div 
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shadow-lg shadow-primary/25"
              >
                <Zap className="h-10 w-10 text-primary-foreground" />
              </motion.div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Sniper HFT Bot
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Configure seu patrimônio inicial para começar o trading automatizado
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Patrimônio Inicial (USDT)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Ex: 100.00"
                    value={saldo}
                    onChange={(e) => setSaldo(e.target.value)}
                    className="pl-8 text-lg h-12 bg-background/50 border-border/50 focus:border-primary"
                    min="0"
                    step="0.01"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Este valor será salvo e você poderá reivindicá-lo a qualquer momento
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Bot className="h-4 w-4" />
                    <span className="text-xs font-medium">Trading 24/7</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Operação automática</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-emerald-500 mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-xs font-medium">IA Avançada</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Decisões inteligentes</p>
                </div>
              </div>

              <Button
                onClick={handleConnect}
                disabled={isConnecting || !saldo || parseFloat(saldo) <= 0}
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 shadow-lg shadow-primary/25"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Iniciar Trading
                  </>
                )}
              </Button>

              {connectionError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30"
                >
                  <div className="flex items-center gap-2 text-rose-500">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{connectionError}</span>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
