import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Download, TrendingUp, TrendingDown, Gift, XCircle, RotateCcw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';

interface LoyaltyTransactionsProps {
  customerProductId: string;
}

export function LoyaltyTransactions({ customerProductId }: LoyaltyTransactionsProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, [customerProductId]);

  useEffect(() => {
    let filtered = transactions;

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.transaction_type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
  }, [searchTerm, filterType, transactions]);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('loyalty_transactions')
      .select(`
        *,
        client:loyalty_clients(name, phone),
        reward:loyalty_rewards(name)
      `)
      .eq('customer_product_id', customerProductId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Erro", description: "Erro ao buscar transações", variant: "destructive" });
      return;
    }

    setTransactions(data || []);
    setFilteredTransactions(data || []);
  };

  const exportToExcel = () => {
    const dataToExport = filteredTransactions.map(t => ({
      Data: new Date(t.created_at).toLocaleString('pt-BR'),
      Cliente: t.client?.name || 'N/A',
      Tipo: getTypeLabel(t.transaction_type),
      Pontos: t.points_amount,
      Descrição: t.description,
      Origem: t.origin || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transações');
    XLSX.writeFile(wb, `transacoes-fidelidade-${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({ title: "Sucesso", description: "Relatório exportado com sucesso!" });
  };

  const getTypeLabel = (type: string) => {
    const labels: any = {
      add: 'Adição',
      remove: 'Remoção',
      redeem: 'Resgate',
      expire: 'Expiração',
      reset: 'Reset'
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    const icons: any = {
      add: <TrendingUp className="w-4 h-4 text-green-600" />,
      remove: <TrendingDown className="w-4 h-4 text-red-600" />,
      redeem: <Gift className="w-4 h-4 text-purple-600" />,
      expire: <XCircle className="w-4 h-4 text-gray-600" />,
      reset: <RotateCcw className="w-4 h-4 text-orange-600" />
    };
    return icons[type] || null;
  };

  const getTypeBadge = (type: string) => {
    const variants: any = {
      add: 'default',
      remove: 'destructive',
      redeem: 'secondary',
      expire: 'outline',
      reset: 'outline'
    };
    return (
      <Badge variant={variants[type] || 'outline'} className="flex items-center gap-1">
        {getTypeIcon(type)}
        {getTypeLabel(type)}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por cliente ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="add">Adição</SelectItem>
              <SelectItem value="remove">Remoção</SelectItem>
              <SelectItem value="redeem">Resgate</SelectItem>
              <SelectItem value="expire">Expiração</SelectItem>
              <SelectItem value="reset">Reset</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={exportToExcel} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar XLSX
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Pontos</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Origem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.created_at).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction.client?.name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {getTypeBadge(transaction.transaction_type)}
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold ${
                      transaction.transaction_type === 'add' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.transaction_type === 'add' ? '+' : '-'}
                      {transaction.points_amount}
                    </span>
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{transaction.origin || 'N/A'}</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma transação encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Total de transações: {filteredTransactions.length}
      </div>
    </div>
  );
}