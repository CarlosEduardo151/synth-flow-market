import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Signal, Power, AlertCircle } from 'lucide-react';

interface HFTHeaderProps {
  isRunning: boolean;
  isConnected: boolean;
  connectionError: string | null;
  updateCount: number;
  onToggleBot: () => void;
}

export function HFTHeader({ 
  isRunning, 
  isConnected, 
  connectionError, 
  updateCount, 
  onToggleBot 
}: HFTHeaderProps) {
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div 
              animate={{ rotate: isRunning ? [0, 360] : 0 }}
              transition={{ duration: 2, repeat: isRunning ? Infinity : 0, ease: "linear" }}
              className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/50 shadow-lg shadow-primary/25"
            >
              <Zap className="h-6 w-6 text-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Sniper HFT Bot
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Signal className="h-3 w-3" />
                Trading de Alta Frequência
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {connectionError && (
              <Badge className="bg-rose-500/20 text-rose-500 border-rose-500/30 px-3 py-1">
                <AlertCircle className="h-3 w-3 mr-2" />
                Erro de conexão
              </Badge>
            )}
            <Badge className={`${isConnected && isRunning ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : isRunning ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'bg-gray-500/20 text-gray-500 border-gray-500/30'} px-3 py-1`}>
              <motion.span 
                animate={{ opacity: isRunning ? [1, 0.5, 1] : 1 }}
                transition={{ duration: 1, repeat: isRunning ? Infinity : 0 }}
                className={`w-2 h-2 rounded-full ${isConnected && isRunning ? 'bg-emerald-500' : isRunning ? 'bg-amber-500' : 'bg-gray-500'} mr-2 inline-block`}
              />
              {isConnected && isRunning ? `Online • ${updateCount} updates` : isRunning ? 'Conectando...' : 'Pausado'}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onToggleBot} 
              className={isRunning ? "border-amber-500/30 text-amber-500 hover:bg-amber-500/10" : "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"}
            >
              <Power className="h-4 w-4 mr-2" />
              {isRunning ? 'Pausar' : 'Iniciar'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/meus-produtos')}>
              Voltar
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
