import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Download,
  TrendingUp,
  TrendingDown,
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  category: string | null;
  product_id: string | null;
  payment_method: string | null;
  reference_date: string;
  notes: string | null;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
}

export function CashFlowTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [dateFilter, setDateFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    
    // Buscar transações do mês selecionado
    const startDate = `${dateFilter}-01`;
    const endDate = new Date(parseInt(dateFilter.split('-')[0]), parseInt(dateFilter.split('-')[1]), 0)
      .toISOString().split('T')[0];

    const { data: txData } = await supabase
      .from('financial_transactions')
      .select('*')
      .gte('reference_date', startDate)
      .lte('reference_date', endDate)
      .order('reference_date', { ascending: false });

    // Buscar produtos para o select
    const { data: prodData } = await supabase
      .from('admin_products')
      .select('id, name')
      .eq('is_active', true);

    if (txData) setTransactions(txData);
    if (prodData) setProducts(prodData);
    
    setLoading(false);
  };

  const handleSaveTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const transactionData = {
      type: formData.get('type') as string,
      amount: parseFloat(formData.get('amount') as string),
      description: formData.get('description') as string,
      category: formData.get('category') as string || null,
      product_id: formData.get('product_id') as string || null,
      payment_method: formData.get('payment_method') as string || null,
      reference_date: formData.get('reference_date') as string,
      notes: formData.get('notes') as string || null
    };

    let error;
    if (editingTransaction) {
      ({ error } = await supabase
        .from('financial_transactions')
        .update(transactionData)
        .eq('id', editingTransaction.id));
    } else {
      ({ error } = await supabase
        .from('financial_transactions')
        .insert(transactionData));
    }

    if (!error) {
      toast({ 
        title: editingTransaction ? "Transação atualizada!" : "Transação registrada com sucesso!" 
      });
      setIsAddingTransaction(false);
      setEditingTransaction(null);
      fetchData();
    } else {
      toast({ 
        title: "Erro ao salvar transação", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

    const { error } = await supabase
      .from('financial_transactions')
      .delete()
      .eq('id', id);

    if (!error) {
      toast({ title: "Transação excluída com sucesso!" });
      fetchData();
    } else {
      toast({ 
        title: "Erro ao excluir transação", 
        variant: "destructive" 
      });
    }
  };

  const exportToXLSX = () => {
    const exportData = filteredTransactions.map(t => ({
      Data: new Date(t.reference_date).toLocaleDateString('pt-BR'),
      Tipo: t.type === 'income' ? 'Receita' : 'Despesa',
      Descrição: t.description,
      Categoria: t.category || '',
      'Método Pagamento': t.payment_method || '',
      Valor: t.amount,
      Observações: t.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fluxo de Caixa');
    XLSX.writeFile(wb, `fluxo_caixa_${dateFilter}.xlsx`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const categories = [
    'Vendas',
    'Serviços',
    'Aluguel',
    'Salários',
    'Marketing',
    'Fornecedores',
    'Impostos',
    'Utilidades',
    'Equipamentos',
    'Outros'
  ];

  const paymentMethods = [
    'Dinheiro',
    'PIX',
    'Cartão Débito',
    'Cartão Crédito',
    'Transferência',
    'Boleto',
    'Outros'
  ];

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {formatCurrency(totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(totalExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo do Período</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(totalIncome - totalExpenses) >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
              {formatCurrency(totalIncome - totalExpenses)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Transações</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToXLSX}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button onClick={() => setIsAddingTransaction(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Transação
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              type="month"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full sm:w-[180px]"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {new Date(tx.reference_date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.type === 'income' ? 'default' : 'destructive'}>
                          {tx.type === 'income' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell>{tx.category || '-'}</TableCell>
                      <TableCell>{tx.payment_method || '-'}</TableCell>
                      <TableCell className={`text-right font-medium ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {tx.type === 'income' ? '+' : '-'} {formatCurrency(Number(tx.amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setEditingTransaction(tx);
                              setIsAddingTransaction(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteTransaction(tx.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma transação encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para adicionar/editar transação */}
      <Dialog open={isAddingTransaction} onOpenChange={(open) => {
        setIsAddingTransaction(open);
        if (!open) setEditingTransaction(null);
      }}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSaveTransaction}>
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
              </DialogTitle>
              <DialogDescription>
                Registre uma nova entrada ou saída de dinheiro
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select name="type" defaultValue={editingTransaction?.type || 'income'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Valor *</Label>
                  <Input 
                    id="amount" 
                    name="amount" 
                    type="number" 
                    step="0.01"
                    min="0"
                    defaultValue={editingTransaction?.amount || ''} 
                    required 
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição *</Label>
                <Input 
                  id="description" 
                  name="description" 
                  defaultValue={editingTransaction?.description || ''} 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select name="category" defaultValue={editingTransaction?.category || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="payment_method">Método de Pagamento</Label>
                  <Select name="payment_method" defaultValue={editingTransaction?.payment_method || ''}>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="reference_date">Data *</Label>
                  <Input 
                    id="reference_date" 
                    name="reference_date" 
                    type="date"
                    defaultValue={editingTransaction?.reference_date || new Date().toISOString().split('T')[0]} 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="product_id">Produto Relacionado</Label>
                  <Select name="product_id" defaultValue={editingTransaction?.product_id || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {products.map(prod => (
                        <SelectItem key={prod.id} value={prod.id}>{prod.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  defaultValue={editingTransaction?.notes || ''} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsAddingTransaction(false);
                setEditingTransaction(null);
              }}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingTransaction ? 'Atualizar' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
