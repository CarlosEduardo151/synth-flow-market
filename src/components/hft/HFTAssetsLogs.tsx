import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Coins, Activity, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import { LogEntry, ASSET_INFO } from './HFTConstants';

interface HFTAssetsLogsProps {
  ativos: string[];
  logs: LogEntry[];
  lastUpdate: Date | null;
}

export function HFTAssetsLogs({ ativos, logs, lastUpdate }: HFTAssetsLogsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Ativos em Carteira */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-card to-card backdrop-blur h-full overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Coins className="h-5 w-5 text-amber-500" />
              </motion.div>
              Ativos em Carteira
              {ativos.length > 0 && (
                <Badge className="ml-2 bg-amber-500/20 text-amber-400 border-amber-500/30">
                  {ativos.length} ativo{ativos.length > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Moedas que o bot está segurando no momento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="popLayout">
              {ativos.length > 0 ? (
                <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {ativos.map((ativo, index) => {
                    const info = ASSET_INFO[ativo] || { 
                      name: ativo.split('/')[0], 
                      description: 'Criptomoeda disponível para trading.',
                      color: 'from-gray-500 to-slate-500',
                      icon: '◆'
                    };
                    return (
                      <motion.div
                        key={ativo}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        className="group"
                      >
                        <div className={`p-4 rounded-xl bg-gradient-to-r ${info.color} bg-opacity-10 border border-white/10 hover:border-white/20 transition-all relative overflow-hidden`}>
                          <div className="flex items-start gap-4 relative">
                            <motion.div 
                              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center text-white font-bold text-xl shadow-lg`}
                              animate={{ rotate: [0, 5, -5, 0] }}
                              transition={{ duration: 4, repeat: Infinity, delay: index * 0.5 }}
                            >
                              {info.icon}
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-foreground">{info.name}</h4>
                                <Badge variant="outline" className="text-xs bg-background/50">
                                  {ativo}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {info.description}
                              </p>
                            </div>
                            <motion.div
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="flex flex-col items-end gap-1"
                            >
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                HOLDING
                              </Badge>
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-muted-foreground"
                >
                  <motion.div
                    animate={{ y: [0, -8, 0], rotateY: [0, 180, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-block"
                  >
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                      <Coins className="h-10 w-10 text-amber-500/50" />
                    </div>
                  </motion.div>
                  <p className="font-medium">Nenhum ativo em carteira</p>
                  <p className="text-sm mt-1">O bot está analisando o mercado...</p>
                  <motion.div 
                    className="flex justify-center gap-1 mt-4"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-amber-500/50"
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Logs de Atividade */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-500" />
                  Logs de Atividade
                </CardTitle>
                <CardDescription>
                  Eventos do sistema em tempo real
                </CardDescription>
              </div>
              {lastUpdate && (
                <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-500 border-cyan-500/30">
                  <Clock className="h-3 w-3 mr-1" />
                  {lastUpdate.toLocaleTimeString()}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px] w-full rounded-xl border border-border/50 p-4 bg-background/50">
              <AnimatePresence mode="popLayout">
                {logs.length > 0 ? (
                  <div className="space-y-2 font-mono text-xs">
                    {logs.map((log, index) => (
                      <motion.div 
                        key={`${log.timestamp.getTime()}-${index}`}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        className={`flex items-start gap-2 py-1 px-2 rounded-lg ${
                          log.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                          log.type === 'error' ? 'bg-rose-500/10 text-rose-400' :
                          log.type === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-muted/30 text-muted-foreground'
                        }`}
                      >
                        <span className="opacity-60 shrink-0">
                          [{log.timestamp.toLocaleTimeString()}]
                        </span>
                        <span className="break-all">{log.message}</span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    <p>Aguardando logs...</p>
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
