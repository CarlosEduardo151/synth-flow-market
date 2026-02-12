import { useState, useEffect } from 'react';
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

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => <Card key={i} className="h-32 bg-muted/50" />)}
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Metas Financeiras</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
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
      </div>

      {/* Add Amount Dialog */}
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
                Atual: R$ {Number(selectedGoal.current_amount).toFixed(2)} / Meta: R$ {Number(selectedGoal.target_amount).toFixed(2)}
              </p>
            )}
            <Button onClick={handleAddAmount} className="w-full">
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Goals */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-primary">Em Andamento ({activeGoals.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeGoals.map(goal => {
            const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
            const remaining = Number(goal.target_amount) - Number(goal.current_amount);

            return (
              <Card key={goal.id} className="p-6 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-primary/20">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{goal.name}</h4>
                      {goal.deadline && (
                        <p className="text-sm text-muted-foreground">
                          Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
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
                  <Progress value={progress} className="h-3" />
                  <div className="flex justify-between">
                    <span className="text-sm">
                      R$ {Number(goal.current_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-sm font-medium text-primary">
                      R$ {Number(goal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Faltam R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
            );
          })}
          {activeGoals.length === 0 && (
            <Card className="p-8 text-center col-span-2">
              <p className="text-muted-foreground">Nenhuma meta ativa. Crie sua primeira meta!</p>
            </Card>
          )}
        </div>
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-emerald-500">Concluídas ({completedGoals.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedGoals.map(goal => (
              <Card key={goal.id} className="p-6 bg-emerald-500/10 border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-emerald-500/20">
                      <Check className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{goal.name}</h4>
                      <p className="text-sm text-emerald-500">
                        Meta atingida: R$ {Number(goal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500">Concluída</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
