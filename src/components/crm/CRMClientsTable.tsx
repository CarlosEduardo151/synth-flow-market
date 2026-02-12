import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2, Search, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface CRMCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  business_type: string | null;
  status: string;
  last_contact_date: string | null;
  total_purchases: number;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
}

interface CRMClientsTableProps {
  customers: CRMCustomer[];
  onViewDetails: (customer: CRMCustomer) => void;
  onEdit: (customer: CRMCustomer) => void;
  onDelete: (customerId: string) => void;
  onRowClick?: (customer: CRMCustomer) => void;
}

export const CRMClientsTable = ({ customers, onViewDetails, onEdit, onDelete, onRowClick }: CRMClientsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'name'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Filtrar clientes
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm) ||
      customer.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
    return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
  });

  // Exportar para XLSX
  const exportToXLSX = () => {
    const exportData = filteredCustomers.map(customer => ({
      Nome: customer.name,
      Email: customer.email || '-',
      Telefone: customer.phone || '-',
      Empresa: customer.company || '-',
      Status: customer.status,
      'Última Interação': customer.last_contact_date 
        ? new Date(customer.last_contact_date).toLocaleDateString('pt-BR')
        : '-',
      'Data de Cadastro': new Date(customer.created_at).toLocaleDateString('pt-BR')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, `clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({ title: "Lista exportada com sucesso!" });
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: any } = {
      customer: 'default',
      prospect: 'secondary',
      lead: 'outline',
      inactive: 'destructive'
    };
    return variants[status] || 'outline';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      customer: 'Cliente',
      prospect: 'Em Negociação',
      lead: 'Lead',
      inactive: 'Inativo'
    };
    return labels[status] || status;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Lista de Clientes</CardTitle>
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 md:w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="lead">Leads</SelectItem>
                <SelectItem value="prospect">Em Negociação</SelectItem>
                <SelectItem value="customer">Clientes</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={`${sortBy}:${sortDir}`}
              onValueChange={(v) => {
                const [by, dir] = v.split(':') as ['created_at' | 'name', 'asc' | 'desc'];
                setSortBy(by);
                setSortDir(dir);
              }}
            >
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at:desc">Mais recentes</SelectItem>
                <SelectItem value="created_at:asc">Mais antigos</SelectItem>
                <SelectItem value="name:asc">Nome (A-Z)</SelectItem>
                <SelectItem value="name:desc">Nome (Z-A)</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportToXLSX} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar XLSX
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última Interação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                sortedCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className={onRowClick ? 'cursor-pointer' : undefined}
                    onClick={(e) => {
                      // evita disparar quando clicar nos botões
                      const target = e.target as HTMLElement;
                      if (target.closest('button')) return;
                      onRowClick?.(customer);
                    }}
                  >
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.company || '-'}</TableCell>
                    <TableCell>{customer.email || '-'}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadge(customer.status)}>
                        {getStatusLabel(customer.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {customer.last_contact_date 
                        ? new Date(customer.last_contact_date).toLocaleDateString('pt-BR')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewDetails(customer)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(customer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(customer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Mostrando {sortedCustomers.length} de {customers.length} clientes
        </div>
      </CardContent>
    </Card>
  );
};