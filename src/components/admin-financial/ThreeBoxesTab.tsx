import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  TrendingUp, 
  Shield, 
  Briefcase,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  History
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  sale_price: number;
  cost_price: number;
}

interface BoxBalance {
  box_type: string;
  balance: number;
}

interface BoxMovement {
  id: string;
  box_type: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

interface ProfitDistribution {
  id: string;
  product_id: string | null;
  sale_price: number;
  cost_price: number;
  gross_profit: number;
  reinvestment_amount: number;
  emergency_amount: number;
  prolabore_amount: number;
  sale_date: string;
  notes: string | null;
  created_at: string;
}

export function ThreeBoxesTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [boxBalances, setBoxBalances] = useState<BoxBalance[]>([]);
  const [movements, setMovements] = useState<BoxMovement[]>([]);
  const [distributions, setDistributions] = useState<ProfitDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawBoxType, setWithdrawBoxType] = useState('');

  // Form state para cálculo
  const [selectedProduct, setSelectedProduct] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const [productsRes, balancesRes] = await Promise.all([
      supabase.from('admin_products').select('id, name, sale_price, cost_price').eq('is_active', true),
      supabase.from('box_balances').select('box_type, balance'),
    ]);

    // Fetch movements and distributions using raw queries since tables may not exist in types
    const movementsRes = await supabase
      .from('box_movements' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    const distributionsRes = await supabase
      .from('profit_distribution' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (productsRes.data) setProducts(productsRes.data);
    if (balancesRes.data) setBoxBalances(balancesRes.data);
    if (movementsRes.data) setMovements(movementsRes.data as unknown as BoxMovement[]);
    if (distributionsRes.data) setDistributions(distributionsRes.data as unknown as ProfitDistribution[]);

    setLoading(false);
  };

  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    const product = products.find(p => p.id === productId);
    if (product) {
      setSalePrice(product.sale_price.toString());
      setCostPrice(product.cost_price.toString());
    }
  };

  const calculateDistribution = async (e: React.FormEvent) => {
    e.preventDefault();

    const sale = parseFloat(salePrice);
    const cost = parseFloat(costPrice) || 0;
    const grossProfit = sale - cost;

    if (grossProfit <= 0) {
      toast({
        title: "Lucro inválido",
        description: "O preço de venda deve ser maior que o custo para ter lucro.",
        variant: "destructive"
      });
      return;
    }

    // Cálculo das 3 caixinhas (33% cada)
    const reinvestment = grossProfit * 0.33;
    const emergency = grossProfit * 0.33;
    const prolabore = grossProfit * 0.34; // 34% para o pró-labore para somar 100%

    // Inserir a distribuição
    const { error: distError } = await (supabase
      .from('profit_distribution' as any) as any)
      .insert({
        product_id: selectedProduct || null,
        sale_price: sale,
        cost_price: cost,
        gross_profit: grossProfit,
        reinvestment_amount: reinvestment,
        emergency_amount: emergency,
        prolabore_amount: prolabore,
        sale_date: saleDate
      });

    if (distError) {
      toast({ title: "Erro ao registrar distribuição", variant: "destructive" });
      return;
    }

    // Atualizar os saldos das caixinhas
    const updates = [
      { box_type: 'reinvestment', amount: reinvestment },
      { box_type: 'emergency', amount: emergency },
      { box_type: 'prolabore', amount: prolabore }
    ];

    for (const update of updates) {
      const currentBalance = boxBalances.find(b => b.box_type === update.box_type)?.balance || 0;
      await supabase
        .from('box_balances')
        .update({ balance: Number(currentBalance) + update.amount, last_updated: new Date().toISOString() })
        .eq('box_type', update.box_type);

      // Registrar movimentação
      await (supabase
        .from('box_movements' as any) as any)
        .insert({
          box_type: update.box_type,
          type: 'in',
          amount: update.amount,
          description: `Venda: ${salePrice} - Custo: ${costPrice} = Lucro: ${grossProfit.toFixed(2)}`
        });
    }

    toast({ 
      title: "Distribuição calculada!", 
      description: `Lucro de ${formatCurrency(grossProfit)} distribuído nas 3 caixinhas.`
    });

    // Limpar form e atualizar dados
    setSelectedProduct('');
    setSalePrice('');
    setCostPrice('');
    setIsCalculating(false);
    fetchData();
  };

  const handleWithdraw = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const description = formData.get('description') as string;

    const currentBalance = boxBalances.find(b => b.box_type === withdrawBoxType)?.balance || 0;
    
    if (amount > currentBalance) {
      toast({ 
        title: "Saldo insuficiente", 
        description: `O saldo da caixinha é ${formatCurrency(currentBalance)}`,
        variant: "destructive" 
      });
      return;
    }

    // Atualizar saldo
    const { error: updateError } = await supabase
      .from('box_balances')
      .update({ balance: Number(currentBalance) - amount, last_updated: new Date().toISOString() })
      .eq('box_type', withdrawBoxType);

    if (updateError) {
      toast({ title: "Erro ao atualizar saldo", variant: "destructive" });
      return;
    }

    // Registrar movimentação
    await (supabase
      .from('box_movements' as any) as any)
      .insert({
        box_type: withdrawBoxType,
        type: 'out',
        amount: amount,
        description: description
      });

    toast({ title: "Retirada registrada com sucesso!" });
    setIsWithdrawing(false);
    setWithdrawBoxType('');
    fetchData();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getBoxLabel = (boxType: string) => {
    const labels: Record<string, string> = {
      'reinvestment': 'Reinvestimento',
      'emergency': 'Emergência',
      'prolabore': 'Pró-labore'
    };
    return labels[boxType] || boxType;
  };

  const getBoxIcon = (boxType: string) => {
    const icons: Record<string, typeof TrendingUp> = {
      'reinvestment': TrendingUp,
      'emergency': Shield,
      'prolabore': Briefcase
    };
    const Icon = icons[boxType] || TrendingUp;
    return <Icon className="h-6 w-6" />;
  };

  const getBoxColor = (boxType: string) => {
    const colors: Record<string, string> = {
      'reinvestment': 'from-green-500/10 to-green-600/5 border-green-500/20',
      'emergency': 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
      'prolabore': 'from-violet-500/10 to-violet-600/5 border-violet-500/20'
    };
    return colors[boxType] || '';
  };

  const getBoxTextColor = (boxType: string) => {
    const colors: Record<string, string> = {
      'reinvestment': 'text-green-500',
      'emergency': 'text-amber-500',
      'prolabore': 'text-violet-500'
    };
    return colors[boxType] || '';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explicação do sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Sistema das 3 Caixinhas
          </CardTitle>
          <CardDescription>
            Quando você vende um produto, seu lucro (venda - custo) é automaticamente dividido em 3 partes iguais:
            <br />
            <strong>33% Reinvestimento</strong> (crescer o negócio) | 
            <strong> 33% Emergência</strong> (reserva para crises) | 
            <strong> 34% Pró-labore</strong> (seu dinheiro pessoal)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsCalculating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Calcular Nova Venda
          </Button>
        </CardContent>
      </Card>

      {/* Cards das 3 Caixinhas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {boxBalances.map((box) => (
          <Card key={box.box_type} className={`bg-gradient-to-br ${getBoxColor(box.box_type)}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{getBoxLabel(box.box_type)}</CardTitle>
              <div className={getBoxTextColor(box.box_type)}>
                {getBoxIcon(box.box_type)}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getBoxTextColor(box.box_type)}`}>
                {formatCurrency(Number(box.balance))}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => {
                  setWithdrawBoxType(box.box_type);
                  setIsWithdrawing(true);
                }}
              >
                Retirar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Histórico de movimentações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Movimentações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Caixinha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>
                      {new Date(mov.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getBoxLabel(mov.box_type)}</Badge>
                    </TableCell>
                    <TableCell>
                      {mov.type === 'in' ? (
                        <span className="flex items-center text-emerald-500">
                          <ArrowUpRight className="h-4 w-4 mr-1" />
                          Entrada
                        </span>
                      ) : (
                        <span className="flex items-center text-red-500">
                          <ArrowDownRight className="h-4 w-4 mr-1" />
                          Saída
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{mov.description}</TableCell>
                    <TableCell className={`text-right font-medium ${mov.type === 'in' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {mov.type === 'in' ? '+' : '-'} {formatCurrency(Number(mov.amount))}
                    </TableCell>
                  </TableRow>
                ))}
                {movements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma movimentação registrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para calcular nova venda */}
      <Dialog open={isCalculating} onOpenChange={setIsCalculating}>
        <DialogContent>
          <form onSubmit={calculateDistribution}>
            <DialogHeader>
              <DialogTitle>Calcular Distribuição de Lucro</DialogTitle>
              <DialogDescription>
                Selecione um produto ou insira os valores manualmente
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="product">Produto (opcional)</Label>
                <Select value={selectedProduct} onValueChange={handleProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto ou deixe em branco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum (inserir manualmente)</SelectItem>
                    {products.map(prod => (
                      <SelectItem key={prod.id} value={prod.id}>
                        {prod.name} - Venda: {formatCurrency(prod.sale_price)} | Custo: {formatCurrency(prod.cost_price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="salePrice">Preço de Venda *</Label>
                  <Input 
                    id="salePrice" 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="costPrice">Custo (pode ser 0)</Label>
                  <Input 
                    id="costPrice" 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="saleDate">Data da Venda</Label>
                <Input 
                  id="saleDate" 
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  required 
                />
              </div>

              {/* Preview do cálculo */}
              {salePrice && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium mb-2">Preview da Distribuição:</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Lucro Bruto</p>
                        <p className="font-bold">{formatCurrency((parseFloat(salePrice) || 0) - (parseFloat(costPrice) || 0))}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cada Caixinha (~33%)</p>
                        <p className="font-bold text-emerald-500">
                          {formatCurrency(((parseFloat(salePrice) || 0) - (parseFloat(costPrice) || 0)) * 0.33)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCalculating(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Calcular e Distribuir
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para retirada */}
      <Dialog open={isWithdrawing} onOpenChange={(open) => {
        setIsWithdrawing(open);
        if (!open) setWithdrawBoxType('');
      }}>
        <DialogContent>
          <form onSubmit={handleWithdraw}>
            <DialogHeader>
              <DialogTitle>Retirar da Caixinha {getBoxLabel(withdrawBoxType)}</DialogTitle>
              <DialogDescription>
                Saldo disponível: {formatCurrency(boxBalances.find(b => b.box_type === withdrawBoxType)?.balance || 0)}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Valor a Retirar *</Label>
                <Input 
                  id="amount" 
                  name="amount"
                  type="number" 
                  step="0.01"
                  min="0"
                  max={boxBalances.find(b => b.box_type === withdrawBoxType)?.balance || 0}
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Motivo da Retirada *</Label>
                <Input 
                  id="description" 
                  name="description"
                  placeholder="Ex: Compra de equipamento, pagamento de conta..."
                  required 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsWithdrawing(false);
                setWithdrawBoxType('');
              }}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive">
                Confirmar Retirada
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
