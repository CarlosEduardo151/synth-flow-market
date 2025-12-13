import { useAuth, useAdminCheck } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, FileText, CheckCircle, XCircle, Clock, Eye, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  payment_method: string;
  payment_receipt_url: string;
  created_at: string;
}

export default function AdminOrdersPage() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    
    if (!adminLoading && !isAdmin) {
      navigate('/');
      return;
    }
  }, [user, loading, isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
    }
  }, [isAdmin]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pedidos.",
        variant: "destructive",
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // Buscar informações do pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Atualizar status do pedido
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Se o pedido foi confirmado ou completado, entregar os produtos ao cliente
      if (newStatus === 'confirmed' || newStatus === 'completed') {
        // Buscar itens do pedido
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);

        if (itemsError) {
          console.error('Erro ao buscar itens do pedido:', itemsError);
        } else if (orderItems && orderItems.length > 0) {
          // Verificar se já existem produtos entregues para este pedido
          const { data: existingProducts } = await supabase
            .from('customer_products')
            .select('id')
            .eq('order_id', orderId)
            .limit(1);

          // Se não existem produtos entregues, criar
          if (!existingProducts || existingProducts.length === 0) {
            const customerProductsData = orderItems.map(item => ({
              user_id: order.user_id,
              order_id: orderId,
              product_slug: item.product_slug,
              product_title: item.product_title,
              acquisition_type: 'purchase' as const,
              is_active: true,
              download_count: 0,
              max_downloads: 3,
            }));

            const { error: productsError } = await supabase
              .from('customer_products')
              .insert(customerProductsData);

            if (productsError) {
              console.error('Erro ao entregar produtos:', productsError);
              toast({
                title: "Atenção",
                description: "Pedido confirmado, mas houve erro ao entregar produtos. Tente entregar manualmente.",
                variant: "destructive",
              });
            } else {
              console.log(`${customerProductsData.length} produto(s) entregue(s) ao cliente`);
            }
          }
        }

        // Se tem parcelas, criar as parcelas se ainda não existem
        if (order.installment_count > 1) {
          const { data: existingInstallments } = await supabase
            .from('order_installments')
            .select('id')
            .eq('order_id', orderId)
            .limit(1);

          if (!existingInstallments || existingInstallments.length === 0) {
            const installmentsData = [];
            const installmentValue = order.installment_value || Math.round(order.total_amount / order.installment_count);
            
            for (let i = 1; i <= order.installment_count; i++) {
              const dueDate = new Date();
              dueDate.setMonth(dueDate.getMonth() + (i - 1));
              
              installmentsData.push({
                order_id: orderId,
                installment_number: i,
                total_installments: order.installment_count,
                amount: installmentValue,
                due_date: dueDate.toISOString(),
                status: i === 1 ? 'paid' : 'pending',
                payment_proof_url: i === 1 ? order.payment_receipt_url : null,
                paid_at: i === 1 ? new Date().toISOString() : null
              });
            }

            const { error: installmentsError } = await supabase
              .from('order_installments')
              .insert(installmentsData);

            if (installmentsError) {
              console.error('Erro ao criar parcelas:', installmentsError);
            }
          }
        }
      }

      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      toast({
        title: "Sucesso",
        description: newStatus === 'confirmed' ? "Pedido confirmado e produtos entregues!" : "Pedido cancelado.",
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Aguardando Pagamento</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Confirmado</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Clock className="w-3 h-3 mr-1" />Em Análise</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle className="w-3 h-3 mr-1" />Concluído</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReceiptUrl = (path: string) => {
    if (!path) return '';
    try {
      const { data } = supabase.storage.from('comprovantes').getPublicUrl(path);
      return data.publicUrl;
    } catch (error) {
      console.error('Erro ao obter URL do comprovante:', error);
      return '';
    }
  };

  if (loading || adminLoading) {
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
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Painel
          </Button>
          <h1 className="text-3xl font-bold">Gerenciar Pedidos</h1>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-2xl">Gerenciamento de Pedidos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Visualize comprovantes e aprove pagamentos
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {loadingOrders ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Nenhum pedido encontrado</p>
                <p className="text-sm text-muted-foreground mt-2">Os pedidos aparecerão aqui quando forem realizados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Cliente</TableHead>
                      <TableHead className="font-semibold">Contato</TableHead>
                      <TableHead className="font-semibold">Valor</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Comprovante</TableHead>
                      <TableHead className="font-semibold">Data</TableHead>
                      <TableHead className="font-semibold text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-xs text-muted-foreground">ID: {order.id.slice(0, 8)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{order.customer_email}</div>
                          {order.customer_phone && (
                            <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-primary">
                            R$ {(order.total_amount / 100).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">{order.payment_method}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          {order.payment_receipt_url ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  Visualizar
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                                <DialogHeader>
                                  <DialogTitle>Comprovante de Pagamento</DialogTitle>
                                  <p className="text-sm text-muted-foreground">
                                    Cliente: {order.customer_name}
                                  </p>
                                </DialogHeader>
                                <div className="mt-4 space-y-4">
                                  <div className="bg-muted p-4 rounded-lg">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Pedido:</span>
                                        <span className="font-medium ml-2">#{order.id.slice(0, 8)}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Valor:</span>
                                        <span className="font-medium ml-2">R$ {(order.total_amount / 100).toFixed(2)}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Data:</span>
                                        <span className="font-medium ml-2">
                                          {new Date(order.created_at).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Email:</span>
                                        <span className="font-medium ml-2">{order.customer_email}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="border rounded-lg p-4 bg-white">
                                    {order.payment_receipt_url.toLowerCase().endsWith('.pdf') ? (
                                      <div className="text-center space-y-4">
                                        <FileText className="w-16 h-16 mx-auto text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">Arquivo PDF</p>
                                        <Button
                                          onClick={() => window.open(getReceiptUrl(order.payment_receipt_url), '_blank')}
                                          className="gap-2"
                                        >
                                          <Download className="w-4 h-4" />
                                          Abrir PDF
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <img
                                          src={getReceiptUrl(order.payment_receipt_url)}
                                          alt="Comprovante de pagamento"
                                          className="w-full h-auto rounded-lg shadow-md"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const errorDiv = e.currentTarget.nextElementSibling as HTMLElement;
                                            if (errorDiv) errorDiv.style.display = 'block';
                                          }}
                                        />
                                        <div className="hidden text-center py-8 bg-muted rounded-lg">
                                          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                                          <p className="text-sm text-muted-foreground">Não foi possível carregar a imagem</p>
                                          <Button
                                            onClick={() => window.open(getReceiptUrl(order.payment_receipt_url), '_blank')}
                                            variant="outline"
                                            size="sm"
                                            className="mt-2"
                                          >
                                            Abrir em nova aba
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex gap-2 pt-4 border-t">
                                    <Button
                                      onClick={() => window.open(getReceiptUrl(order.payment_receipt_url), '_blank')}
                                      variant="outline"
                                      className="flex-1 gap-2"
                                    >
                                      <Download className="w-4 h-4" />
                                      Baixar Arquivo
                                    </Button>
                                    {(order.status === 'pending' || order.status === 'processing') && (
                                      <>
                                        <Button
                                          onClick={() => {
                                            updateOrderStatus(order.id, 'confirmed');
                                          }}
                                          className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                          Aprovar Pagamento
                                        </Button>
                                        <Button
                                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                          variant="destructive"
                                          className="flex-1 gap-2"
                                        >
                                          <XCircle className="w-4 h-4" />
                                          Recusar
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <XCircle className="w-4 h-4 text-destructive" />
                              Sem comprovante
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            {(order.status === 'pending' || order.status === 'processing') && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => updateOrderStatus(order.id, 'confirmed')}
                                  className="w-full bg-green-600 hover:bg-green-700 gap-1"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                  className="w-full gap-1"
                                >
                                  <XCircle className="w-3 h-3" />
                                  Recusar
                                </Button>
                              </>
                            )}
                            {order.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateOrderStatus(order.id, 'completed')}
                                className="w-full text-blue-600 hover:bg-blue-50 border-blue-200"
                              >
                                ✓ Concluir
                              </Button>
                            )}
                            {(order.status === 'completed' || order.status === 'cancelled') && (
                              <Badge variant="outline" className="justify-center">
                                Finalizado
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}