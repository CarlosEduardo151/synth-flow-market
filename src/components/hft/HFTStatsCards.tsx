import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Wallet, TrendingUp, TrendingDown, Target, BarChart3, 
  Sparkles, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';

interface BotStatus {
  patrimonio: number;
  lucro_prejuizo: number;
  lucro_percentual: number;
  win_rate: number;
  total_trades: number;
}

interface HFTStatsCardsProps {
  botStatus: BotStatus;
}

export function HFTStatsCards({ botStatus }: HFTStatsCardsProps) {
  const isProfit = botStatus.lucro_prejuizo >= 0;
  const profitColor = isProfit ? 'text-emerald-500' : 'text-rose-500';
  const profitBgClass = isProfit ? 'from-emerald-500/20 to-emerald-500/5' : 'from-rose-500/20 to-rose-500/5';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Patrimônio */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        whileHover={{ scale: 1.02, y: -4 }}
        className="h-full"
      >
        <Card className={`border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden relative h-full ${isProfit && botStatus.lucro_percentual > 0 ? 'ring-2 ring-emerald-500/30' : ''}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-16 -mt-16" />
          
          {isProfit && botStatus.lucro_percentual > 0 && (
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          
          {isProfit && botStatus.lucro_percentual > 0 && (
            <motion.div
              className="absolute top-2 right-2"
              animate={{ y: [-2, -8, -2], rotate: [-5, 5, -5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <div className="text-xl">🚀</div>
            </motion.div>
          )}
          
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
                <Wallet className="h-4 w-4 text-primary" />
              </motion.div>
              Patrimônio Atual
              {isProfit && botStatus.lucro_percentual > 1 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  className="ml-auto"
                >
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                </motion.span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-between min-h-[100px]">
            <motion.div 
              key={botStatus.patrimonio}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-3xl lg:text-4xl font-bold tracking-tight ${isProfit && botStatus.lucro_percentual > 0 ? 'text-emerald-500' : 'text-primary'}`}
            >
              ${botStatus.patrimonio.toFixed(2)}
            </motion.div>
            <div className="flex items-center gap-2 mt-2">
              <motion.div 
                className={`w-2 h-2 rounded-full ${isProfit && botStatus.lucro_percentual > 0 ? 'bg-emerald-500' : 'bg-primary'}`}
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <p className="text-xs text-muted-foreground">USDT em tempo real</p>
              {isProfit && botStatus.lucro_percentual > 0 && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs text-emerald-500 font-medium flex items-center gap-1"
                >
                  <TrendingUp className="h-3 w-3" />
                  Subindo!
                </motion.span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Lucro/Prejuízo */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.02, y: -4 }}
        className="h-full"
      >
        <Card className={`border-transparent bg-gradient-to-br ${profitBgClass} overflow-hidden relative h-full`}>
          <div className={`absolute top-0 right-0 w-32 h-32 ${isProfit ? 'bg-emerald-500/10' : 'bg-rose-500/10'} rounded-full blur-2xl -mr-16 -mt-16`} />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <motion.div animate={{ y: isProfit ? [-2, 2, -2] : [2, -2, 2] }} transition={{ duration: 1.5, repeat: Infinity }}>
                {isProfit ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-rose-500" />}
              </motion.div>
              Lucro/Prejuízo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-between min-h-[100px]">
            <motion.div 
              key={botStatus.lucro_prejuizo}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-3xl lg:text-4xl font-bold ${profitColor} tracking-tight`}
            >
              {isProfit ? '+' : ''}${botStatus.lucro_prejuizo.toFixed(2)}
            </motion.div>
            <p className={`text-sm font-semibold ${profitColor} mt-2 flex items-center gap-1`}>
              {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isProfit ? '+' : ''}{botStatus.lucro_percentual.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Win Rate */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.02, y: -4 }}
        className="h-full"
      >
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card backdrop-blur overflow-hidden relative h-full">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
                <Target className="h-4 w-4 text-emerald-500" />
              </motion.div>
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-between min-h-[100px]">
            <motion.div 
              key={botStatus.win_rate}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl lg:text-4xl font-bold text-emerald-500 tracking-tight"
            >
              {botStatus.win_rate.toFixed(1)}%
            </motion.div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${botStatus.win_rate}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
              <span className="text-xs text-muted-foreground">Taxa de acerto</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Total Trades */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.02, y: -4 }}
        className="h-full"
      >
        <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-card to-card backdrop-blur overflow-hidden relative h-full">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}>
                <BarChart3 className="h-4 w-4 text-violet-500" />
              </motion.div>
              Total de Trades
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-between min-h-[100px]">
            <motion.div 
              key={botStatus.total_trades}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl lg:text-4xl font-bold text-violet-500 tracking-tight"
            >
              {botStatus.total_trades}
            </motion.div>
            <div className="flex items-center gap-2 mt-2">
              <motion.div 
                className="flex gap-1"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-violet-500 rounded-full"
                    animate={{ height: [8, 16, 8] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </motion.div>
              <p className="text-xs text-muted-foreground">operações executadas</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
