import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Target, Trash2, TrendingUp, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  customerProductId: string;
}

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  status: string;
  created_at: string;
}

const pad2 = (value: number) => String(value).padStart(2, '0');
const fmtBRL = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const formatDateBR = (value: string | null | undefined) => {
  if (!value) return '';
  const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (!iso) return value;
  return `${pad2(Number(iso[3]))}/${pad2(Number(iso[2]))}/${iso[1]}`;
};

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: { duration: 0.16, ease: 'easeIn' },
  },
};

export function FinancialGoals({ customerProductId }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addAmountDialogOpen, setAddAmountDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const { toast } = useToast();

  const [newGoal, setNewGoal] = useState({
    name: '',
    target_amount: '',
    deadline: ''
  });

  useEffect(() => {
    fetchGoals();
  }, [customerProductId]);

  const fetchGoals = async () => {
    setLoading(true);
    const { data, error } = await (supabase
      .from('financial_agent_goals' as any)
      .select('*')
      .eq('customer_product_id', customerProductId)
      .order('created_at', { ascending: false }) as any);

    if (error) {
      toast({ title: "Erro ao carregar metas", variant: "destructive" });
    } else {
      setGoals((data || []) as Goal[]);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!newGoal.name || !newGoal.target_amount) {
      toast({ title: "Preencha nome e valor da meta", variant: "destructive" });
      return;
    }

    const { error } = await (supabase.from('financial_agent_goals' as any).insert({
      customer_product_id: customerProductId,
      name: newGoal.name,
      target_amount: parseFloat(newGoal.target_amount),
      current_amount: 0,
      status: 'active',
      deadline: newGoal.deadline || null
    }) as any);

    if (error) {
      toast({ title: "Erro ao criar meta", variant: "destructive" });
    } else {
      toast({ title: "Meta criada!" });
      setNewGoal({ name: '', target_amount: '', deadline: '' });
      setDialogOpen(false);
      fetchGoals();
    }
  };

  const handleAddAmount = async () => {
    if (!selectedGoal || !addAmount) return;

    const newAmount = Number(selectedGoal.current_amount) + parseFloat(addAmount);
    const isCompleted = newAmount >= Number(selectedGoal.target_amount);

    const { error } = await (supabase
      .from('financial_agent_goals' as any)
      .update({ 
        current_amount: newAmount,
        status: isCompleted ? 'completed' : 'active'
      })
      .eq('id', selectedGoal.id) as any);

    if (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } else {
      toast({ 
        title: isCompleted ? "🎉 Meta atingida!" : "Valor adicionado!" 
      });
      setAddAmountDialogOpen(false);
      setAddAmount('');
      setSelectedGoal(null);
      fetchGoals();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;
    
    const { error } = await (supabase
      .from('financial_agent_goals' as any)
      .delete()
      .eq('id', id) as any);

    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Meta excluída" });
      fetchGoals();
    }
  };

  const activeGoals = goals.filter(g => (g.status ?? 'active') !== 'completed');
  const completedGoals = goals.filter(g => g.status === 'completed');

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => <Card key={i} className="h-32 bg-muted/50" />)}
    </div>;
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold">Metas Financeiras</h2>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe o avanço das metas com mais clareza visual.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 shadow-sm transition-transform hover:-translate-y-0.5">
              <Plus className="h-4 w-4 mr-2" /> Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Meta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da Meta *</Label>
                <Input
                  placeholder="Ex: Reserva de emergência"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Valor Alvo (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={newGoal.target_amount}
                  onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })}
                />
              </div>

              <div>
                <Label>Prazo (opcional)</Label>
                <Input
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                />
              </div>

              <Button onClick={handleSubmit} className="w-full">
                Criar Meta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <Dialog open={addAmountDialogOpen} onOpenChange={setAddAmountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Valor - {selectedGoal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor a adicionar (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
              />
            </div>
            {selectedGoal && (
              <p className="text-sm text-muted-foreground">
                Atual: {fmtBRL(Number(selectedGoal.current_amount))} / Meta: {fmtBRL(Number(selectedGoal.target_amount))}
              </p>
            )}
            <Button onClick={handleAddAmount} className="w-full">
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.04, ease: 'easeOut' }}
      >
        <h3 className="text-lg font-semibold mb-4 text-primary">Em Andamento ({activeGoals.length})</h3>
        <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {activeGoals.map(goal => {
              const progress = Math.min((Number(goal.current_amount) / Number(goal.target_amount || 1)) * 100, 100);
              const remaining = Math.max(Number(goal.target_amount) - Number(goal.current_amount), 0);

              return (
                <motion.div
                  key={goal.id}
                  variants={itemVariants}
                  layout
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.995 }}
                >
                  <Card className="p-6 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="p-3 rounded-full bg-primary/20"
                          animate={{ scale: [1, 1.04, 1] }}
                          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Target className="h-5 w-5 text-primary" />
                        </motion.div>
                        <div>
                          <h4 className="font-semibold">{goal.name}</h4>
                          {goal.deadline && (
                            <p className="text-sm text-muted-foreground">
                              Prazo: {formatDateBR(goal.deadline)}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(goal.id)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{progress.toFixed(1)}%</span>
                      </div>
                      <motion.div
                        initial={{ opacity: 0.7, scaleX: 0.98 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                      >
                        <Progress value={progress} className="h-3" />
                      </motion.div>
                      <div className="flex justify-between">
                        <span className="text-sm">{fmtBRL(Number(goal.current_amount))}</span>
                        <span className="text-sm font-medium text-primary">{fmtBRL(Number(goal.target_amount))}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Faltam {fmtBRL(remaining)}
                      </p>
                    </div>

                    <Button
                      className="w-full mt-4"
                      variant="outline"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setAddAmountDialogOpen(true);
                      }}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" /> Adicionar Valor
                    </Button>
                  </Card>
                </motion.div>
              );
            })}

            {activeGoals.length === 0 && (
              <motion.div variants={itemVariants} layout className="col-span-2">
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">Nenhuma meta ativa. Crie sua primeira meta!</p>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {completedGoals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.08, ease: 'easeOut' }}
        >
          <h3 className="text-lg font-semibold mb-4 text-emerald-500">Concluídas ({completedGoals.length})</h3>
          <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {completedGoals.map(goal => (
                <motion.div key={goal.id} variants={itemVariants} layout whileHover={{ y: -3 }}>
                  <Card className="p-6 bg-emerald-500/10 border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="p-3 rounded-full bg-emerald-500/20"
                          animate={{ scale: [1, 1.06, 1] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Check className="h-5 w-5 text-emerald-500" />
                        </motion.div>
                        <div>
                          <h4 className="font-semibold">{goal.name}</h4>
                          <p className="text-sm text-emerald-500">
                            Meta atingida: {fmtBRL(Number(goal.target_amount))}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500">Concluída</Badge>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
