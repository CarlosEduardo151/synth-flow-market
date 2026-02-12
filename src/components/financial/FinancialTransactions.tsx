import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, ArrowUpRight, ArrowDownRight, Trash2, Filter } from 'lucide-react';

interface Props {
  customerProductId: string;
  mode: 'personal' | 'business';
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  date: string;
  payment_method: string | null;
  source: string;
  created_at: string;
}

export function FinancialTransactions({ customerProductId, mode }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const { toast } = useToast();

  const [newTransaction, setNewTransaction] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, [customerProductId]);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await (supabase
      .from('financial_agent_transactions' as any)
      .select('*')
      .eq('customer_product_id', customerProductId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }) as any);

    if (error) {
      toast({ title: "Erro ao carregar transações", variant: "destructive" });
    } else {
      setTransactions((data || []) as Transaction[]);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!newTransaction.amount || parseFloat(newTransaction.amount) <= 0) {
      toast({ title: "Informe um valor válido", variant: "destructive" });
      return;
    }

    const { error } = await (supabase.from('financial_agent_transactions' as any).insert({
      customer_product_id: customerProductId,
      type: newTransaction.type,
      amount: parseFloat(newTransaction.amount),
      description: newTransaction.description || null,
      date: newTransaction.date,
      payment_method: newTransaction.payment_method || null,
      source: 'manual'
    }) as any);

    if (error) {
      toast({ title: "Erro ao adicionar transação", variant: "destructive" });
    } else {
      toast({ title: "Transação adicionada!" });
      setNewTransaction({
        type: 'expense',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: ''
      });
      setDialogOpen(false);
      fetchTransactions();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
    
    const { error } = await (supabase
      .from('financial_agent_transactions' as any)
      .delete()
      .eq('id', id) as any);

    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Transação excluída" });
      fetchTransactions();
    }
  };

  const filteredTransactions = filterType === 'all' 
    ? transactions 
    : transactions.filter(t => t.type === filterType);

  const paymentMethods = mode === 'business' 
    ? ['PIX', 'Boleto', 'Cartão Crédito', 'Cartão Débito', 'Transferência', 'Dinheiro', 'Cheque']
    : ['PIX', 'Cartão Crédito', 'Cartão Débito', 'Dinheiro', 'Transferência'];

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(5)].map((_, i) => <Card key={i} className="h-20 bg-muted/50" />)}
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Transações</h2>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Transação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={newTransaction.type === 'income' ? 'default' : 'outline'}
                  className={newTransaction.type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                  onClick={() => setNewTransaction({ ...newTransaction, type: 'income' })}
                >
                  <ArrowUpRight className="h-4 w-4 mr-1" /> Receita
                </Button>
                <Button
                  type="button"
                  variant={newTransaction.type === 'expense' ? 'default' : 'outline'}
                  className={newTransaction.type === 'expense' ? 'bg-red-500 hover:bg-red-600' : ''}
                  onClick={() => setNewTransaction({ ...newTransaction, type: 'expense' })}
                >
                  <ArrowDownRight className="h-4 w-4 mr-1" /> Despesa
                </Button>
              </div>

              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Input
                  placeholder={mode === 'business' ? 'Ex: Pagamento fornecedor' : 'Ex: Supermercado'}
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                />
              </div>

              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                />
              </div>

              <div>
                <Label>Forma de Pagamento</Label>
                <Select 
                  value={newTransaction.payment_method}
                  onValueChange={(v) => setNewTransaction({ ...newTransaction, payment_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSubmit} className="w-full">
                Adicionar Transação
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {filteredTransactions.map(tx => (
          <Card key={tx.id} className="p-4 bg-card/80 backdrop-blur-sm hover:bg-card transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${tx.type === 'income' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                  {tx.type === 'income' ? (
                    <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{tx.description || (tx.type === 'income' ? 'Receita' : 'Despesa')}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{new Date(tx.date).toLocaleDateString('pt-BR')}</span>
                    {tx.payment_method && (
                      <>
                        <span>•</span>
                        <span>{tx.payment_method}</span>
                      </>
                    )}
                    {tx.source !== 'manual' && (
                      <>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                          {tx.source === 'webhook' ? 'Via Chatbot' : tx.source}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className={`text-xl font-bold ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {tx.type === 'income' ? '+' : '-'} R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(tx.id)}
                  className="text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {filteredTransactions.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Nenhuma transação encontrada</p>
          </Card>
        )}
      </div>
    </div>
  );
}
