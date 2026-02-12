import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LoyaltyClientsProps {
  customerProductId: string;
}

export function LoyaltyClients({ customerProductId }: LoyaltyClientsProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPointsDialogOpen, setIsPointsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  const [pointsData, setPointsData] = useState({
    points: '',
    description: '',
    operation: 'add' as 'add' | 'remove'
  });

  useEffect(() => {
    fetchClients();
  }, [customerProductId]);

  useEffect(() => {
    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm)
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const fetchClients = async () => {
    const { data, error } = await (supabase
      .from('loyalty_clients' as any)
      .select('*')
      .eq('customer_product_id', customerProductId)
      .order('points_balance', { ascending: false }) as any);

    if (error) {
      toast({ title: "Erro", description: "Erro ao buscar clientes", variant: "destructive" });
      return;
    }

    setClients(data || []);
    setFilteredClients(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await (supabase
      .from('loyalty_clients' as any)
      .insert({
        customer_product_id: customerProductId,
        ...formData
      }) as any);

    if (error) {
      toast({ title: "Erro", description: "Erro ao criar cliente", variant: "destructive" });
      return;
    }

    toast({ title: "Sucesso", description: "Cliente criado com sucesso!" });
    setIsDialogOpen(false);
    setFormData({ name: '', phone: '', email: '', notes: '' });
    fetchClients();
  };

  const handlePointsOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const points = parseInt(pointsData.points);
    const operation = pointsData.operation;
    const change = operation === 'add' ? points : -points;

    const newBalance = Math.max(0, selectedClient.points_balance + change);

    const { error: updateError } = await (supabase
      .from('loyalty_clients' as any)
      .update({
        points_balance: newBalance,
        total_points_earned: operation === 'add' ? selectedClient.total_points_earned + points : selectedClient.total_points_earned,
        total_points_redeemed: operation === 'remove' ? selectedClient.total_points_redeemed + points : selectedClient.total_points_redeemed,
        last_transaction_date: new Date().toISOString()
      })
      .eq('id', selectedClient.id) as any);

    if (updateError) {
      toast({ title: "Erro", description: "Erro ao atualizar pontos", variant: "destructive" });
      return;
    }

    const { error: transactionError } = await (supabase
      .from('loyalty_transactions' as any)
      .insert({
        customer_product_id: customerProductId,
        client_id: selectedClient.id,
        transaction_type: operation,
        points_amount: points,
        description: pointsData.description || (operation === 'add' ? 'Pontos adicionados manualmente' : 'Pontos removidos manualmente'),
        origin: 'manual'
      }) as any);

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
    }

    toast({ 
      title: "Sucesso", 
      description: `${points} pontos ${operation === 'add' ? 'adicionados' : 'removidos'} com sucesso!` 
    });

    setIsPointsDialogOpen(false);
    setPointsData({ points: '', description: '', operation: 'add' });
    setSelectedClient(null);
    fetchClients();
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      active: 'default',
      inactive: 'secondary',
      blocked: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Pontos</TableHead>
              <TableHead>Último Resgate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell>
                    <span className="font-bold text-primary">{client.points_balance}</span>
                  </TableCell>
                  <TableCell>
                    {client.last_transaction_date 
                      ? new Date(client.last_transaction_date).toLocaleDateString('pt-BR')
                      : '-'
                    }
                  </TableCell>
                  <TableCell>{getStatusBadge(client.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedClient(client);
                          setPointsData({ ...pointsData, operation: 'add' });
                          setIsPointsDialogOpen(true);
                        }}
                      >
                        <TrendingUp className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedClient(client);
                          setPointsData({ ...pointsData, operation: 'remove' });
                          setIsPointsDialogOpen(true);
                        }}
                      >
                        <TrendingDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Pontos */}
      <Dialog open={isPointsDialogOpen} onOpenChange={setIsPointsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pointsData.operation === 'add' ? 'Adicionar' : 'Remover'} Pontos
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePointsOperation} className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Input value={selectedClient?.name || ''} disabled />
            </div>
            <div>
              <Label htmlFor="points">Quantidade de Pontos</Label>
              <Input
                id="points"
                type="number"
                value={pointsData.points}
                onChange={(e) => setPointsData({ ...pointsData, points: e.target.value })}
                required
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={pointsData.description}
                onChange={(e) => setPointsData({ ...pointsData, description: e.target.value })}
                placeholder="Motivo da operação"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsPointsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Confirmar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
