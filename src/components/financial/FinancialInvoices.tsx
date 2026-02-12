import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Receipt, Check, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  customerProductId: string;
  mode: 'personal' | 'business';
}

interface Invoice {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  recurring: boolean;
  recurring_interval: string | null;
  notes: string | null;
  source: string;
}

export function FinancialInvoices({ customerProductId, mode }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [newInvoice, setNewInvoice] = useState({
    title: '',
    amount: '',
    due_date: '',
    notes: '',
    recurring: false,
    recurring_interval: 'monthly'
  });

  useEffect(() => {
    fetchInvoices();
  }, [customerProductId]);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await (supabase
      .from('financial_agent_invoices' as any)
      .select('*')
      .eq('customer_product_id', customerProductId)
      .order('due_date', { ascending: true }) as any);

    if (error) {
      toast({ title: "Erro ao carregar faturas", variant: "destructive" });
    } else {
      setInvoices((data || []) as Invoice[]);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!newInvoice.title || !newInvoice.amount || !newInvoice.due_date) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    const { error } = await (supabase.from('financial_agent_invoices' as any).insert({
      customer_product_id: customerProductId,
      title: newInvoice.title,
      amount: parseFloat(newInvoice.amount),
      due_date: newInvoice.due_date,
      notes: newInvoice.notes || null,
      recurring: newInvoice.recurring,
      recurring_interval: newInvoice.recurring ? newInvoice.recurring_interval : null,
      source: 'manual'
    }) as any);

    if (error) {
      toast({ title: "Erro ao adicionar fatura", variant: "destructive" });
    } else {
      toast({ title: "Fatura adicionada!" });
      setNewInvoice({
        title: '',
        amount: '',
        due_date: '',
        notes: '',
        recurring: false,
        recurring_interval: 'monthly'
      });
      setDialogOpen(false);
      fetchInvoices();
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    const { error } = await (supabase
      .from('financial_agent_invoices' as any)
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id) as any);

    if (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } else {
      toast({ title: "Fatura marcada como paga!" });
      fetchInvoices();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta fatura?')) return;
    
    const { error } = await (supabase
      .from('financial_agent_invoices' as any)
      .delete()
      .eq('id', id) as any);

    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Fatura excluída" });
      fetchInvoices();
    }
  };

  const getStatusInfo = (invoice: Invoice) => {
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (invoice.status === 'paid') {
      return { icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-500/20', label: 'Paga' };
    }
    if (daysUntil < 0) {
      return { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/20', label: 'Vencida' };
    }
    if (daysUntil <= 3) {
      return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/20', label: 'Próxima' };
    }
    return { icon: Receipt, color: 'text-blue-500', bg: 'bg-blue-500/20', label: 'Pendente' };
  };

  const pendingInvoices = invoices.filter(i => i.status === 'pending');
  const paidInvoices = invoices.filter(i => i.status === 'paid');

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(5)].map((_, i) => <Card key={i} className="h-20 bg-muted/50" />)}
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Faturas e Contas</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> Nova Fatura
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Fatura</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input
                  placeholder={mode === 'business' ? 'Ex: Aluguel do escritório' : 'Ex: Conta de luz'}
                  value={newInvoice.title}
                  onChange={(e) => setNewInvoice({ ...newInvoice, title: e.target.value })}
                />
              </div>

              <div>
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={newInvoice.amount}
                  onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                />
              </div>

              <div>
                <Label>Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={newInvoice.due_date}
                  onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Observações</Label>
                <Input
                  placeholder="Detalhes adicionais"
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recurring"
                  checked={newInvoice.recurring}
                  onCheckedChange={(checked) => setNewInvoice({ ...newInvoice, recurring: checked as boolean })}
                />
                <Label htmlFor="recurring">Conta recorrente</Label>
              </div>

              <Button onClick={handleSubmit} className="w-full">
                Adicionar Fatura
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Invoices */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-amber-500">Pendentes ({pendingInvoices.length})</h3>
        <div className="space-y-3">
          {pendingInvoices.map(invoice => {
            const status = getStatusInfo(invoice);
            const StatusIcon = status.icon;
            const dueDate = new Date(invoice.due_date);
            const today = new Date();
            const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            return (
              <Card key={invoice.id} className="p-4 bg-card/80 backdrop-blur-sm hover:bg-card transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${status.bg}`}>
                      <StatusIcon className={`h-5 w-5 ${status.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{invoice.title}</p>
                        {invoice.recurring && (
                          <Badge variant="outline" className="text-xs">Recorrente</Badge>
                        )}
                        {invoice.source === 'webhook' && (
                          <Badge className="bg-primary/20 text-primary text-xs">Via Chatbot</Badge>
                        )}
                      </div>
                      <p className={`text-sm ${daysUntil < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        Vence: {dueDate.toLocaleDateString('pt-BR')}
                        {daysUntil < 0 && ` (${Math.abs(daysUntil)} dias atrasado)`}
                        {daysUntil === 0 && ' (Hoje)'}
                        {daysUntil > 0 && daysUntil <= 3 && ` (${daysUntil} dias)`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xl font-bold text-amber-500">
                      R$ {Number(invoice.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsPaid(invoice.id)}
                      className="text-emerald-500 border-emerald-500 hover:bg-emerald-500 hover:text-white"
                    >
                      <Check className="h-4 w-4 mr-1" /> Pagar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(invoice.id)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
          {pendingInvoices.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Nenhuma fatura pendente</p>
            </Card>
          )}
        </div>
      </div>

      {/* Paid Invoices */}
      {paidInvoices.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-emerald-500">Pagas ({paidInvoices.length})</h3>
          <div className="space-y-3">
            {paidInvoices.slice(0, 5).map(invoice => (
              <Card key={invoice.id} className="p-4 bg-card/50 backdrop-blur-sm opacity-75">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-emerald-500/20">
                      <Check className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium">{invoice.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Paga em: {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('pt-BR') : '-'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-emerald-500">
                    R$ {Number(invoice.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
