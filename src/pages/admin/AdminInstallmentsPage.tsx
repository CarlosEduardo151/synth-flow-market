import { useAuth, useAdminCheck } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Calendar, DollarSign, Send, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Installment {
  id: string;
  order_id: string;
  installment_number: number;
  total_installments: number;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  payment_proof_url: string | null;
  order: {
    customer_name: string;
    customer_email: string;
  };
}

interface CustomerSummary {
  customer_name: string;
  customer_email: string;
  total_installments: number;
  pending_count: number;
  paid_count: number;
  overdue_count: number;
  total_amount: number;
}

const AdminInstallmentsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationDialog, setNotificationDialog] = useState(false);
  const [notificationType, setNotificationType] = useState<'all' | 'specific'>('all');
  const [specificEmail, setSpecificEmail] = useState('');
  const [notificationSubject, setNotificationSubject] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        navigate('/');
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchInstallments();
    }
  }, [isAdmin]);

  const fetchInstallments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_installments')
        .select(`
          *,
          orders!inner(customer_name, customer_email)
        `)
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      const formattedData = (data || []).map(item => ({
        ...item,
        order: item.orders as any
      }));
      
      setInstallments(formattedData as any);
      
      // Agrupar por cliente
      const customerMap = new Map<string, CustomerSummary>();
      
      formattedData.forEach((inst: any) => {
        const email = inst.order.customer_email;
        const existing = customerMap.get(email);
        
        if (existing) {
          existing.total_installments++;
          existing.total_amount += inst.amount;
          if (inst.status === 'pending') existing.pending_count++;
          if (inst.status === 'paid') existing.paid_count++;
          if (inst.status === 'overdue') existing.overdue_count++;
        } else {
          customerMap.set(email, {
            customer_name: inst.order.customer_name,
            customer_email: email,
            total_installments: 1,
            pending_count: inst.status === 'pending' ? 1 : 0,
            paid_count: inst.status === 'paid' ? 1 : 0,
            overdue_count: inst.status === 'overdue' ? 1 : 0,
            total_amount: inst.amount
          });
        }
      });
      
      setCustomers(Array.from(customerMap.values()));
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar parcelas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateInstallmentStatus = async (installmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('order_installments')
        .update({ 
          status: newStatus,
          ...(newStatus === 'paid' && { paid_at: new Date().toISOString() })
        })
        .eq('id', installmentId);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: 'O status da parcela foi atualizado com sucesso.',
      });

      fetchInstallments();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const sendNotification = async () => {
    setSendingNotification(true);
    try {
      const response = await supabase.functions.invoke('send-notification', {
        body: {
          type: notificationType,
          email: notificationType === 'specific' ? specificEmail : undefined,
          subject: notificationSubject,
          message: notificationMessage,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: 'Notificação enviada',
        description: 'A notificação foi enviada com sucesso.',
      });

      setNotificationDialog(false);
      setNotificationSubject('');
      setNotificationMessage('');
      setSpecificEmail('');
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar notificação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSendingNotification(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
      paid: { label: 'Pago', variant: 'default' as const, icon: CheckCircle },
      overdue: { label: 'Atrasado', variant: 'destructive' as const, icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const filteredInstallments = selectedCustomer
    ? installments.filter(i => i.order.customer_email === selectedCustomer)
    : installments;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Gerenciar Parcelas
            </h1>
            <p className="text-muted-foreground">
              {selectedCustomer 
                ? 'Parcelas do cliente selecionado'
                : 'Clientes com parcelas'}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedCustomer && (
              <Button variant="outline" onClick={() => setSelectedCustomer(null)}>
                Voltar aos Clientes
              </Button>
            )}
            <Dialog open={notificationDialog} onOpenChange={setNotificationDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Send className="h-4 w-4" />
                  Enviar Notificação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Enviar Notificação Personalizada</DialogTitle>
                  <DialogDescription>
                    Envie uma notificação por email para seus clientes
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="notification-type">Destinatários</Label>
                    <Select value={notificationType} onValueChange={(value: 'all' | 'specific') => setNotificationType(value)}>
                      <SelectTrigger id="notification-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os clientes</SelectItem>
                        <SelectItem value="specific">Cliente específico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {notificationType === 'specific' && (
                    <div>
                      <Label htmlFor="specific-email">Email do cliente</Label>
                      <Input
                        id="specific-email"
                        type="email"
                        placeholder="cliente@email.com"
                        value={specificEmail}
                        onChange={(e) => setSpecificEmail(e.target.value)}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="notification-subject">Assunto</Label>
                    <Input
                      id="notification-subject"
                      placeholder="Assunto da notificação"
                      value={notificationSubject}
                      onChange={(e) => setNotificationSubject(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notification-message">Mensagem</Label>
                    <Textarea
                      id="notification-message"
                      placeholder="Digite sua mensagem aqui..."
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                      rows={5}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setNotificationDialog(false)}
                    disabled={sendingNotification}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={sendNotification}
                    disabled={sendingNotification || !notificationSubject || !notificationMessage || (notificationType === 'specific' && !specificEmail)}
                  >
                    {sendingNotification ? 'Enviando...' : 'Enviar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!selectedCustomer ? (
          <Card>
            <CardHeader>
              <CardTitle>Clientes com Parcelas</CardTitle>
              <CardDescription>
                Total de {customers.length} clientes com parcelamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {customers.map((customer) => (
                  <Card
                    key={customer.customer_email}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedCustomer(customer.customer_email)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{customer.customer_name}</CardTitle>
                      <CardDescription className="text-sm">
                        {customer.customer_email}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total de Parcelas:</span>
                        <span className="font-medium">{customer.total_installments}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valor Total:</span>
                        <span className="font-medium">R$ {(customer.total_amount / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap mt-3">
                        {customer.paid_count > 0 && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {customer.paid_count} paga{customer.paid_count > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {customer.pending_count > 0 && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {customer.pending_count} pendente{customer.pending_count > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {customer.overdue_count > 0 && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {customer.overdue_count} atrasada{customer.overdue_count > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {customers.length === 0 && (
                  <div className="col-span-full text-center text-muted-foreground py-8">
                    Nenhum cliente com parcelas encontrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Parcelas de {customers.find(c => c.customer_email === selectedCustomer)?.customer_name}</CardTitle>
              <CardDescription>
                {filteredInstallments.length} parcelas encontradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInstallments.map((installment) => (
                      <TableRow key={installment.id}>
                        <TableCell className="font-medium">
                          {installment.installment_number}/{installment.total_installments}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            R$ {(installment.amount / 100).toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(installment.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(installment.status)}</TableCell>
                        <TableCell>
                          <Select
                            value={installment.status}
                            onValueChange={(value) => updateInstallmentStatus(installment.id, value)}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="paid">Pago</SelectItem>
                              <SelectItem value="overdue">Atrasado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AdminInstallmentsPage;
