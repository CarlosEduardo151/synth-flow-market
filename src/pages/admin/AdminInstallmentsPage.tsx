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

const AdminInstallmentsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstallments, setSelectedInstallments] = useState<string[]>([]);
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
              Acompanhe e gerencie todas as parcelas dos pedidos
            </p>
          </div>
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

        <Card>
          <CardHeader>
            <CardTitle>Todas as Parcelas</CardTitle>
            <CardDescription>
              Total de {installments.length} parcelas registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((installment) => (
                    <TableRow key={installment.id}>
                      <TableCell className="font-medium">
                        {installment.order.customer_name}
                      </TableCell>
                      <TableCell>{installment.order.customer_email}</TableCell>
                      <TableCell>
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
                  {installments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma parcela encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default AdminInstallmentsPage;
