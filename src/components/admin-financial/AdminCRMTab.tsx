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
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Download,
  Phone,
  Mail,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface AuthUser {
  id: string;
  email: string;
  raw_user_meta_data: {
    full_name?: string;
  };
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cpf_cnpj: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  company: string | null;
  status: string | null;
  source: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function AdminCRMTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchCustomers();
    syncRegisteredUsers(); // Auto-sync on load
  }, []);

  const syncRegisteredUsers = async () => {
    setSyncing(true);
    try {
      // Buscar todos os usuários registrados via profiles
      const { data: profiles, error: profilesError } = await (supabase
        .from('profiles')
        .select('id, full_name, phone') as any);

      if (profilesError || !profiles) {
        console.error('Error fetching profiles:', profilesError);
        setSyncing(false);
        return;
      }

      // Buscar clientes já existentes no CRM por nome
      const { data: existingCustomers } = await ((supabase as any)
        .from('admin_crm_customers')
        .select('name'));

      const existingNames = new Set((existingCustomers as any[])?.map(c => c.name?.toLowerCase()) || []);

      // Filtrar apenas usuários que ainda não estão no CRM
      const newUsers = (profiles as any[]).filter(
        profile => profile.full_name && !existingNames.has(profile.full_name.toLowerCase())
      );

      if (newUsers.length === 0) {
        toast({ title: "Todos os usuários já estão sincronizados!" });
        setSyncing(false);
        return;
      }

      // Inserir novos usuários no CRM
      const customersToInsert = newUsers.map((profile: any) => ({
        name: profile.full_name || 'Usuário',
        phone: profile.phone || null,
        status: 'customer',
        source: 'registro_site',
        notes: `Sincronizado automaticamente. User ID: ${profile.id}`
      }));

      const { error: insertError } = await ((supabase as any)
        .from('admin_crm_customers')
        .insert(customersToInsert));

      if (insertError) {
        toast({ 
          title: "Erro ao sincronizar", 
          description: insertError.message,
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: `${newUsers.length} usuário(s) sincronizado(s) com sucesso!` 
        });
        fetchCustomers();
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({ 
        title: "Erro ao sincronizar usuários", 
        variant: "destructive" 
      });
    }
    setSyncing(false);
  };

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await ((supabase as any)
      .from('admin_crm_customers')
      .select('*')
      .order('created_at', { ascending: false }));

    if (!error && data) {
      setCustomers(data as Customer[]);
    }
    setLoading(false);
  };

  const handleSaveCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const customerData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
      cpf_cnpj: formData.get('cpf_cnpj') as string || null,
      address: formData.get('address') as string || null,
      city: formData.get('city') as string || null,
      state: formData.get('state') as string || null,
      company: formData.get('company') as string || null,
      status: formData.get('status') as string || 'lead',
      source: formData.get('source') as string || null,
      notes: formData.get('notes') as string || null
    };

    let error;
    if (editingCustomer) {
      ({ error } = await ((supabase as any)
        .from('admin_crm_customers')
        .update(customerData)
        .eq('id', editingCustomer.id)));
    } else {
      ({ error } = await ((supabase as any)
        .from('admin_crm_customers')
        .insert(customerData)));
    }

    if (!error) {
      toast({ 
        title: editingCustomer ? "Cliente atualizado!" : "Cliente adicionado com sucesso!" 
      });
      setIsAddingCustomer(false);
      setEditingCustomer(null);
      fetchCustomers();
    } else {
      toast({ 
        title: "Erro ao salvar cliente", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    const { error } = await ((supabase as any)
      .from('admin_crm_customers')
      .delete()
      .eq('id', id));

    if (!error) {
      toast({ title: "Cliente excluído com sucesso!" });
      fetchCustomers();
    } else {
      toast({ 
        title: "Erro ao excluir cliente", 
        variant: "destructive" 
      });
    }
  };

  const exportToXLSX = () => {
    const exportData = filteredCustomers.map(c => ({
      Nome: c.name,
      Email: c.email || '',
      Telefone: c.phone || '',
      'CPF/CNPJ': c.cpf_cnpj || '',
      Empresa: c.company || '',
      Cidade: c.city || '',
      Estado: c.state || '',
      Status: getStatusLabel(c.status || ''),
      'Data Cadastro': c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, `clientes_crm_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'active': 'Ativo',
      'inactive': 'Inativo',
      'lead': 'Lead',
      'prospect': 'Prospecto',
      'customer': 'Cliente'
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'active': 'default',
      'customer': 'default',
      'prospect': 'secondary',
      'lead': 'outline',
      'inactive': 'destructive'
    };
    return variants[status] || 'outline';
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Clientes Cadastrados</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                onClick={syncRegisteredUsers}
                disabled={syncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar Contas'}
              </Button>
              <Button variant="outline" onClick={exportToXLSX}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button onClick={() => setIsAddingCustomer(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Cliente
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
                placeholder="Buscar por nome, email, telefone ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="prospect">Prospecto</SelectItem>
                <SelectItem value="customer">Cliente</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Compras</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {customer.email && (
                            <span className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </span>
                          )}
                          {customer.phone && (
                            <span className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{customer.company || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(customer.status || '')}>
                          {getStatusLabel(customer.status || '')}
                        </Badge>
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setViewingCustomer(customer)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setEditingCustomer(customer);
                              setIsAddingCustomer(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteCustomer(customer.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum cliente encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            Mostrando {filteredCustomers.length} de {customers.length} clientes
          </div>
        </CardContent>
      </Card>

      {/* Dialog para adicionar/editar cliente */}
      <Dialog open={isAddingCustomer} onOpenChange={(open) => {
        setIsAddingCustomer(open);
        if (!open) setEditingCustomer(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveCustomer}>
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Editar Cliente' : 'Adicionar Novo Cliente'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do cliente
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    defaultValue={editingCustomer?.name} 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    defaultValue={editingCustomer?.email || ''} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    defaultValue={editingCustomer?.phone || ''} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                  <Input 
                    id="cpf_cnpj" 
                    name="cpf_cnpj" 
                    defaultValue={editingCustomer?.cpf_cnpj || ''} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input 
                    id="company" 
                    name="company" 
                    defaultValue={editingCustomer?.company || ''} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="source">Origem</Label>
                  <Input 
                    id="source" 
                    name="source" 
                    placeholder="Como conheceu a empresa"
                    defaultValue={editingCustomer?.source || ''} 
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Endereço</Label>
                <Input 
                  id="address" 
                  name="address" 
                  defaultValue={editingCustomer?.address || ''} 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input 
                    id="city" 
                    name="city" 
                    defaultValue={editingCustomer?.city || ''} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input 
                    id="state" 
                    name="state" 
                    defaultValue={editingCustomer?.state || ''} 
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={editingCustomer?.status || 'lead'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="prospect">Prospecto</SelectItem>
                    <SelectItem value="customer">Cliente</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  defaultValue={editingCustomer?.notes || ''} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsAddingCustomer(false);
                setEditingCustomer(null);
              }}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingCustomer ? 'Atualizar' : 'Adicionar'} Cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para visualizar cliente */}
      <Dialog open={!!viewingCustomer} onOpenChange={() => setViewingCustomer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewingCustomer?.name}</DialogTitle>
            <DialogDescription>Detalhes do cliente</DialogDescription>
          </DialogHeader>
          {viewingCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{viewingCustomer.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{viewingCustomer.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
                  <p className="font-medium">{viewingCustomer.cpf_cnpj || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Empresa</p>
                  <p className="font-medium">{viewingCustomer.company || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cidade/Estado</p>
                  <p className="font-medium">
                    {viewingCustomer.city || '-'} / {viewingCustomer.state || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadge(viewingCustomer.status || '')}>
                    {getStatusLabel(viewingCustomer.status || '')}
                  </Badge>
                </div>
              </div>
              {viewingCustomer.address && (
                <div>
                  <p className="text-sm text-muted-foreground">Endereço</p>
                  <p className="font-medium">{viewingCustomer.address}</p>
                </div>
              )}
              {viewingCustomer.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="font-medium">{viewingCustomer.notes}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Cadastrado em</p>
                <p className="font-medium">
                  {viewingCustomer.created_at ? new Date(viewingCustomer.created_at).toLocaleDateString('pt-BR') : '-'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
