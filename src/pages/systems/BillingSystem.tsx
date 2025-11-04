import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductTutorial } from '@/components/ProductTutorial';
import { gestaoCobrancasTutorial } from '@/data/tutorials/gestao-cobrancas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, UserPlus, CreditCard, Calendar, Send, Settings, CheckCircle2, 
  Copy, AlertCircle, TrendingUp, Download, Eye, Search, Filter, 
  Mail, MessageSquare, FileText, BarChart3, PieChart, Clock
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PieChart as RechartsPie, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

interface BillingClient {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  cpf_cnpj: string | null;
}

interface Invoice {
  id: string;
  client_id: string;
  amount: number;
  due_date: string;
  payment_method: string | null;
  status: string;
  paid_at: string | null;
  whatsapp_reminder_sent: boolean;
  payment_link: string | null;
  created_at: string;
}

interface ZApiConnection {
  id: string;
  instance_id: string;
  token: string;
  phone_number: string;
  is_active: boolean;
}

interface MessageTemplate {
  id: string;
  name: string;
  message: string;
  channel: 'whatsapp' | 'email' | 'sms';
}

const BillingSystem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customerProductId, setCustomerProductId] = useState<string | null>(null);
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isAddingInvoice, setIsAddingInvoice] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [zapiConnection, setZapiConnection] = useState<ZApiConnection | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([
    { 
      id: '1', 
      name: 'Lembrete de Vencimento', 
      message: 'Olá {cliente}, lembramos que sua cobrança de R$ {valor} vence em {vencimento}. Por favor, realize o pagamento via {forma_pagamento}.', 
      channel: 'whatsapp' 
    },
    { 
      id: '2', 
      name: 'Cobrança Atrasada', 
      message: 'Olá {cliente}, sua cobrança de R$ {valor} está atrasada. Regularize o pagamento o quanto antes.', 
      channel: 'whatsapp' 
    },
    { 
      id: '3', 
      name: 'Confirmação de Pagamento', 
      message: 'Confirmação: o pagamento de R$ {valor} foi recebido. Obrigado pela sua pontualidade!', 
      channel: 'whatsapp' 
    },
  ]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('customer_products')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_slug', 'gestao-cobrancas')
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast({
          title: "Acesso Negado",
          description: "Você precisa comprar o sistema de Gestão de Cobranças para acessar.",
          variant: "destructive"
        });
        navigate('/meus-produtos');
        return;
      }

      setCustomerProductId(data.id);
      await loadData(data.id);
    } catch (error) {
      console.error('Error checking access:', error);
      navigate('/meus-produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async (productId: string) => {
    const { data: clientsData } = await supabase
      .from('billing_clients')
      .select('*')
      .eq('customer_product_id', productId);

    if (clientsData) {
      setClients(clientsData);

      const clientIds = clientsData.map(c => c.id);
      if (clientIds.length > 0) {
        const { data: invoicesData } = await supabase
          .from('billing_invoices')
          .select('*')
          .in('client_id', clientIds)
          .order('due_date', { ascending: false });

        if (invoicesData) {
          setInvoices(invoicesData);
        }
      }
    }

    const { data: settingsData } = await supabase
      .from('collection_settings')
      .select('*')
      .eq('customer_product_id', productId)
      .single();

    if (settingsData) {
      setSettings(settingsData);
    }

    if (user) {
      const { data: zapiData } = await supabase
        .from('zapi_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (zapiData) {
        setZapiConnection(zapiData);
      }
    }
  };

  const handleAddClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customerProductId) return;

    const formData = new FormData(e.currentTarget);
    const { error } = await supabase.from('billing_clients').insert({
      customer_product_id: customerProductId,
      name: formData.get('name') as string,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string,
      cpf_cnpj: formData.get('cpf_cnpj') as string || null
    });

    if (!error) {
      toast({ title: "Cliente adicionado com sucesso!" });
      setIsAddingClient(false);
      loadData(customerProductId);
    } else {
      toast({ title: "Erro ao adicionar cliente", variant: "destructive" });
    }
  };

  const handleAddInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const { error } = await supabase.from('billing_invoices').insert({
      client_id: formData.get('client_id') as string,
      amount: parseFloat(formData.get('amount') as string),
      due_date: formData.get('due_date') as string,
      payment_method: formData.get('payment_method') as string || null,
      payment_link: formData.get('payment_link') as string || null
    });

    if (!error) {
      toast({ title: "Cobrança criada com sucesso!" });
      setIsAddingInvoice(false);
      if (customerProductId) loadData(customerProductId);
    } else {
      toast({ title: "Erro ao criar cobrança", variant: "destructive" });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customerProductId) return;

    const formData = new FormData(e.currentTarget);
    
    const settingsData = {
      customer_product_id: customerProductId,
      n8n_webhook_url: formData.get('webhook_url') as string,
      message_type: formData.get('message_type') as string,
      template_message: formData.get('template_message') as string,
      auto_send_reminders: formData.get('auto_send') === 'on',
      days_before_due: parseInt(formData.get('days_before') as string),
      pix_key: formData.get('pix_key') as string || null,
      pix_payment_link: formData.get('pix_payment_link') as string || null,
      pix_qrcode_url: formData.get('pix_qrcode_url') as string || null
    };

    const { error } = settings
      ? await supabase.from('collection_settings').update(settingsData).eq('id', settings.id)
      : await supabase.from('collection_settings').insert(settingsData);

    if (!error) {
      toast({ title: "Configurações salvas com sucesso!" });
      setIsConfiguring(false);
      if (customerProductId) loadData(customerProductId);
    } else {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    }
  };

  const handleSendReminder = async (invoiceId: string, messageType: string) => {
    if (messageType === 'template' && zapiConnection) {
      await handleSendViaZApi(invoiceId);
      return;
    }

    if (!settings?.n8n_webhook_url) {
      toast({
        title: "Configure o webhook primeiro",
        description: "Você precisa configurar o webhook n8n antes de enviar lembretes",
        variant: "destructive"
      });
      return;
    }

    setSendingReminder(invoiceId);
    
    try {
      const { error } = await supabase.functions.invoke('send-billing-reminder', {
        body: { 
          invoiceId,
          messageType: settings.message_type || messageType
        }
      });

      if (error) throw error;

      toast({ title: "Lembrete enviado com sucesso!" });
      if (customerProductId) loadData(customerProductId);
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      toast({ 
        title: "Erro ao enviar lembrete", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setSendingReminder(null);
    }
  };

  const handleSendViaZApi = async (invoiceId: string) => {
    setSendingReminder(invoiceId);

    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      const client = clients.find(c => c.id === invoice.client_id);
      if (!client) throw new Error('Client not found');

      const dueDate = new Date(invoice.due_date).toLocaleDateString('pt-BR');
      const template = settings?.template_message || 'Olá {nome}, você tem uma cobrança de R$ {valor} vencendo em {data}. Clique no link para pagar: {link_pagamento}';
      
      const pixKey = settings?.pix_key || 'Não configurada';
      const pixPaymentLink = settings?.pix_payment_link || invoice.payment_link || '';
      const pixQrCodeUrl = settings?.pix_qrcode_url || '';

      let message = template
        .replace('{nome}', client.name)
        .replace('{cliente}', client.name)
        .replace('{valor}', invoice.amount.toFixed(2))
        .replace('{data}', dueDate)
        .replace('{vencimento}', dueDate)
        .replace('{forma_pagamento}', invoice.payment_method || 'PIX')
        .replace('{link_pagamento}', pixPaymentLink || 'https://seu-link-de-pagamento.com')
        .replace('{chave_pix}', pixKey);

      // Se houver QR Code configurado, adiciona ao final da mensagem
      if (pixQrCodeUrl) {
        message += `\n\nQR Code PIX: ${pixQrCodeUrl}`;
      }

      const zapiUrl = `https://api.z-api.io/instances/${zapiConnection!.instance_id}/token/${zapiConnection!.token}/send-text`;
      
      const response = await fetch(zapiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: client.phone,
          message: message,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem via Z-API');
      }

      await supabase
        .from('billing_invoices')
        .update({ 
          whatsapp_reminder_sent: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      toast({ title: "Lembrete enviado via WhatsApp!" });
      if (customerProductId) loadData(customerProductId);
    } catch (error: any) {
      console.error('Error sending via Z-API:', error);
      toast({ 
        title: "Erro ao enviar lembrete", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setSendingReminder(null);
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    const { error } = await supabase
      .from('billing_invoices')
      .update({ 
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('id', invoiceId);

    if (!error) {
      toast({ title: "Cobrança marcada como paga!" });
      if (customerProductId) loadData(customerProductId);
    } else {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'Cliente';
  };

  const getTotalPending = () => {
    return invoices
      .filter(inv => inv.status === 'pending')
      .reduce((sum, inv) => sum + inv.amount, 0);
  };

  const getTotalOverdue = () => {
    return invoices
      .filter(inv => inv.status === 'pending' && new Date(inv.due_date) < new Date())
      .reduce((sum, inv) => sum + inv.amount, 0);
  };

  const getTotalPaid = () => {
    return invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);
  };

  const getTotalBilled = () => {
    return invoices.reduce((sum, inv) => sum + inv.amount, 0);
  };

  const getDefaultRate = () => {
    const total = invoices.length;
    const overdue = invoices.filter(inv => inv.status === 'pending' && new Date(inv.due_date) < new Date()).length;
    return total > 0 ? ((overdue / total) * 100).toFixed(1) : '0.0';
  };

  const getExpiringCount = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return invoices.filter(inv => 
      inv.status === 'pending' && 
      new Date(inv.due_date).toDateString() === tomorrow.toDateString()
    ).length;
  };

  const getStatusData = () => {
    const paid = invoices.filter(inv => inv.status === 'paid').length;
    const overdue = invoices.filter(inv => inv.status === 'pending' && new Date(inv.due_date) < new Date()).length;
    const pending = invoices.filter(inv => inv.status === 'pending' && new Date(inv.due_date) >= new Date()).length;
    
    return [
      { name: 'Pagas', value: paid, color: 'hsl(var(--chart-2))' },
      { name: 'Pendentes', value: pending, color: 'hsl(var(--chart-3))' },
      { name: 'Atrasadas', value: overdue, color: 'hsl(var(--chart-1))' },
    ];
  };

  const getMonthlyData = () => {
    const monthlyMap = new Map<string, number>();
    
    invoices.forEach(inv => {
      const date = new Date(inv.created_at || inv.due_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, 0);
      }
      monthlyMap.set(monthKey, monthlyMap.get(monthKey)! + inv.amount);
    });

    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, value]) => {
        const [year, month] = key.split('-');
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('pt-BR', { month: 'short' });
        return {
          month: monthName,
          valor: value
        };
      });
  };

  const exportToXLSX = () => {
    const exportData = invoices.map(inv => ({
      Cliente: getClientName(inv.client_id),
      Valor: `R$ ${inv.amount.toFixed(2)}`,
      Vencimento: new Date(inv.due_date).toLocaleDateString('pt-BR'),
      Status: inv.status === 'paid' ? 'Pago' : new Date(inv.due_date) < new Date() ? 'Vencido' : 'Pendente',
      'Forma Pagamento': inv.payment_method?.toUpperCase() || 'N/A',
      'Pago em': inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('pt-BR') : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cobranças');
    XLSX.writeFile(wb, `cobrancas_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({ title: "Relatório exportado com sucesso!" });
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `https://agndhravgmcwpdjkozka.supabase.co/functions/v1/whatsapp-webhook`;
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: "Link copiado!", description: "Cole este link no webhook do Z-API" });
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = getClientName(inv.client_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'paid' && inv.status === 'paid') ||
      (filterStatus === 'pending' && inv.status === 'pending' && new Date(inv.due_date) >= new Date()) ||
      (filterStatus === 'overdue' && inv.status === 'pending' && new Date(inv.due_date) < new Date());
    
    return matchesSearch && matchesFilter;
  });

  const paidInvoices = invoices.filter(inv => inv.status === 'paid');

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <ProductTutorial
        productSlug="gestao-cobrancas"
        productTitle="Gestão de Cobranças Automatizada"
        steps={gestaoCobrancasTutorial}
        onComplete={() => {}}
      />
      
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-primary" />
              Gestão de Cobranças Inteligente
            </h1>
            <p className="text-muted-foreground mt-2">
              Automatize cobranças e reduza inadimplência • Última atualização: {new Date().toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToXLSX}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Dialog open={isConfiguring} onOpenChange={setIsConfiguring}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <form onSubmit={handleSaveSettings}>
                  <DialogHeader>
                    <DialogTitle>Configurações de Cobrança</DialogTitle>
                    <DialogDescription>
                      Configure o webhook do Agente de IA e as mensagens automáticas
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {!zapiConnection && (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">
                          ⚠️ Para enviar mensagens template diretamente, conecte sua conta Z-API na página de produto.
                        </p>
                      </div>
                    )}

                    {zapiConnection && (
                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-2">
                        <p className="text-sm text-green-600 dark:text-green-400">
                          ✓ Z-API conectado: {zapiConnection.phone_number}
                        </p>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={copyWebhookUrl}
                          className="w-full"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Link do Webhook Z-API
                        </Button>
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="webhook_url">URL do Agente de IA (HTTP Request) *</Label>
                      <Input 
                        id="webhook_url" 
                        name="webhook_url" 
                        placeholder="https://seu-n8n.com/webhook/cobrancas"
                        defaultValue={settings?.n8n_webhook_url}
                        required 
                      />
                      <p className="text-sm text-muted-foreground">
                        Cole aqui a URL do webhook do n8n para integração com IA
                      </p>
                      <div className="p-3 bg-muted/50 rounded-md text-xs">
                        <p className="font-semibold mb-2">Formato JSON esperado:</p>
                        <pre className="overflow-x-auto">{`{
  "cliente": "Carlos Eduardo",
  "valor": 200.00,
  "vencimento": "2025-10-20",
  "status": "pendente",
  "forma_pagamento": "PIX",
  "operacao": "adicionar"
}`}</pre>
                        <p className="mt-2">Operações: <code>adicionar</code>, <code>zerar</code>, <code>substituir</code></p>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="message_type">Tipo de Mensagem</Label>
                      <select
                        id="message_type"
                        name="message_type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                        defaultValue={settings?.message_type || 'template'}
                      >
                        <option value="template">
                          {zapiConnection ? 'Mensagens Prontas (Envio Direto via Z-API)' : 'Mensagens Prontas (Template)'}
                        </option>
                        <option value="ai">Mensagens via IA (Requer Webhook n8n)</option>
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="template_message">Template de Mensagem</Label>
                      <Textarea
                        id="template_message"
                        name="template_message"
                        rows={4}
                        placeholder="Olá {cliente}, você tem uma cobrança de R$ {valor} vencendo em {vencimento}..."
                        defaultValue={settings?.template_message}
                      />
                      <p className="text-sm text-muted-foreground">
                        Use: {'{cliente}'}, {'{valor}'}, {'{vencimento}'}, {'{forma_pagamento}'}, {'{link_pagamento}'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="auto_send"
                        name="auto_send"
                        className="h-4 w-4"
                        defaultChecked={settings?.auto_send_reminders}
                      />
                      <Label htmlFor="auto_send" className="cursor-pointer">
                        Enviar lembretes automáticos
                      </Label>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="days_before">Dias antes do vencimento</Label>
                      <Input 
                        id="days_before" 
                        name="days_before" 
                        type="number"
                        defaultValue={settings?.days_before_due || 3}
                      />
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <h3 className="font-semibold mb-3">Informações de Pagamento PIX</h3>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="pix_key">Chave PIX</Label>
                        <Input 
                          id="pix_key" 
                          name="pix_key" 
                          placeholder="Digite sua chave PIX (CPF, CNPJ, email, telefone ou chave aleatória)"
                          defaultValue={settings?.pix_key}
                        />
                        <p className="text-sm text-muted-foreground">
                          Esta chave será incluída nas mensagens de cobrança
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="pix_payment_link">Link de Pagamento PIX</Label>
                        <Input 
                          id="pix_payment_link" 
                          name="pix_payment_link" 
                          type="url"
                          placeholder="https://link-do-seu-pagamento-pix.com"
                          defaultValue={settings?.pix_payment_link}
                        />
                        <p className="text-sm text-muted-foreground">
                          Link direto para página de pagamento (opcional)
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="pix_qrcode_url">URL do QR Code PIX</Label>
                        <Input 
                          id="pix_qrcode_url" 
                          name="pix_qrcode_url" 
                          type="url"
                          placeholder="https://link-da-imagem-qrcode.png"
                          defaultValue={settings?.pix_qrcode_url}
                        />
                        <p className="text-sm text-muted-foreground">
                          Cole a URL da imagem do QR Code PIX (será enviado nas mensagens)
                        </p>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Salvar Configurações</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddingClient} onOpenChange={setIsAddingClient}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleAddClient}>
                  <DialogHeader>
                    <DialogTitle>Adicionar Cliente</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nome *</Label>
                      <Input id="name" name="name" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input id="phone" name="phone" placeholder="5511999999999" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                      <Input id="cpf_cnpj" name="cpf_cnpj" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Adicionar</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddingInvoice} onOpenChange={setIsAddingInvoice}>
              <DialogTrigger asChild>
                <Button>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Nova Cobrança
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleAddInvoice}>
                  <DialogHeader>
                    <DialogTitle>Gerar Nova Cobrança</DialogTitle>
                    <DialogDescription>
                      Preencha os dados para criar uma nova cobrança
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="client_id">Cliente *</Label>
                      <select
                        id="client_id"
                        name="client_id"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                        required
                      >
                        <option value="">Selecione...</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Valor *</Label>
                      <Input id="amount" name="amount" type="number" step="0.01" placeholder="100.00" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="due_date">Vencimento *</Label>
                      <Input id="due_date" name="due_date" type="date" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="payment_method">Forma de Pagamento *</Label>
                      <select
                        id="payment_method"
                        name="payment_method"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                        required
                      >
                        <option value="">Selecione...</option>
                        <option value="pix">PIX</option>
                        <option value="boleto">Boleto</option>
                        <option value="card">Cartão</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="payment_link">Link de Pagamento</Label>
                      <Input 
                        id="payment_link" 
                        name="payment_link" 
                        type="url" 
                        placeholder="https://..." 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Criar Cobrança</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <FileText className="h-4 w-4 mr-2" />
              Cobranças
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              Mensagens Prontas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Alertas */}
            {getExpiringCount() > 0 && (
              <Card className="border-orange-500/50 bg-orange-500/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <p className="text-sm font-medium">
                      <span className="text-orange-500">{getExpiringCount()} cobrança(s)</span> vencem amanhã!
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resumo Financeiro */}
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Total Cobrado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R$ {getTotalBilled().toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Total Recebido
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    R$ {getTotalPaid().toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    Pendente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    R$ {getTotalPending().toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    Em Atraso
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    R$ {getTotalOverdue().toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Inadimplência</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {getDefaultRate()}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Status das Cobranças
                  </CardTitle>
                  <CardDescription>Proporção entre pagas, pendentes e atrasadas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={getStatusData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getStatusData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Valor Cobrado por Mês
                  </CardTitle>
                  <CardDescription>Histórico dos últimos 6 meses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getMonthlyData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                      />
                      <Legend />
                      <Bar dataKey="valor" fill="hsl(var(--primary))" name="Valor Total" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Histórico de Cobranças Quitadas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Histórico de Cobranças Quitadas
                </CardTitle>
                <CardDescription>
                  {paidInvoices.length} cobrança(s) paga(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paidInvoices.slice(0, 5).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div>
                        <p className="font-medium">{getClientName(invoice.client_id)}</p>
                        <p className="text-sm text-muted-foreground">
                          Pago em {new Date(invoice.paid_at!).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">R$ {invoice.amount.toFixed(2)}</p>
                        <Badge variant="outline" className="text-xs">{invoice.payment_method?.toUpperCase()}</Badge>
                      </div>
                    </div>
                  ))}
                  {paidInvoices.length === 0 && (
                    <p className="text-center text-muted-foreground py-6">
                      Nenhuma cobrança quitada ainda
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            {/* Filtros */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="overdue">Atrasadas</SelectItem>
                      <SelectItem value="paid">Pagas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Cobranças */}
            <div className="grid gap-4">
              {filteredInvoices.map((invoice) => {
                const isOverdue = new Date(invoice.due_date) < new Date() && invoice.status === 'pending';
                const isPending = invoice.status === 'pending' && !isOverdue;
                const client = clients.find(c => c.id === invoice.client_id);
                
                return (
                  <Card key={invoice.id} className={
                    invoice.status === 'paid' ? 'border-green-500/50' :
                    isOverdue ? 'border-red-500/50' : 'border-yellow-500/50'
                  }>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {getClientName(invoice.client_id)}
                            <Badge variant={
                              invoice.status === 'paid' ? 'default' :
                              isOverdue ? 'destructive' : 'secondary'
                            } className={
                              invoice.status === 'paid' ? 'bg-green-600' :
                              isOverdue ? '' : 'bg-yellow-600'
                            }>
                              {invoice.status === 'paid' ? '✓ Pago' : isOverdue ? '⚠ Vencida' : '⏱ Pendente'}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Vencimento: {new Date(invoice.due_date).toLocaleDateString('pt-BR')}
                            </span>
                            {client?.phone && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                {client.phone}
                              </span>
                            )}
                            {client?.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {client.email}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            R$ {invoice.amount.toFixed(2)}
                          </div>
                          {invoice.payment_method && (
                            <Badge variant="outline" className="mt-2">
                              {invoice.payment_method.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        {invoice.status === 'pending' && (
                          <>
                            <Button 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => handleSendReminder(invoice.id, settings?.message_type || 'template')}
                              disabled={sendingReminder === invoice.id}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {sendingReminder === invoice.id ? 'Enviando...' : 'Enviar Lembrete'}
                            </Button>
                            <Button 
                              variant="default"
                              onClick={() => handleMarkAsPaid(invoice.id)}
                              className="flex-1"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Marcar como Pago
                            </Button>
                            <Button 
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {invoice.status === 'paid' && (
                          <div className="w-full flex items-center justify-between p-3 bg-green-500/10 rounded-md">
                            <Badge variant="default" className="bg-green-600">
                              ✓ Pago em {new Date(invoice.paid_at!).toLocaleDateString('pt-BR')}
                            </Badge>
                            <Button 
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredInvoices.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Nenhuma cobrança encontrada
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mensagens Prontas Automatizadas</CardTitle>
                <CardDescription>
                  Configure mensagens para envio automático via WhatsApp, E-mail ou SMS
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {messageTemplates.map((template, index) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant="outline" className="capitalize">
                          {template.channel === 'whatsapp' && <MessageSquare className="h-3 w-3 mr-1" />}
                          {template.channel === 'email' && <Mail className="h-3 w-3 mr-1" />}
                          {template.channel}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={template.message}
                        onChange={(e) => {
                          const newTemplates = [...messageTemplates];
                          newTemplates[index].message = e.target.value;
                          setMessageTemplates(newTemplates);
                        }}
                        rows={3}
                        className="mb-3"
                      />
                      <div className="flex gap-2">
                        <Select
                          value={template.channel}
                          onValueChange={(value: 'whatsapp' | 'email' | 'sms') => {
                            const newTemplates = [...messageTemplates];
                            newTemplates[index].channel = value;
                            setMessageTemplates(newTemplates);
                          }}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="email">E-mail</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" className="flex-1">
                          Salvar Alterações
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Variáveis disponíveis: {'{cliente}'}, {'{valor}'}, {'{vencimento}'}, {'{forma_pagamento}'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de Detalhes */}
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes da Cobrança</DialogTitle>
              <DialogDescription>
                Histórico completo do cliente
              </DialogDescription>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{getClientName(selectedInvoice.client_id)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="font-medium text-primary">R$ {selectedInvoice.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vencimento</p>
                    <p className="font-medium">{new Date(selectedInvoice.due_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={selectedInvoice.status === 'paid' ? 'default' : 'secondary'}>
                      {selectedInvoice.status === 'paid' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                    <p className="font-medium">{selectedInvoice.payment_method?.toUpperCase() || 'N/A'}</p>
                  </div>
                  {selectedInvoice.paid_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Pago em</p>
                      <p className="font-medium">{new Date(selectedInvoice.paid_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  )}
                </div>
                {selectedInvoice.payment_link && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Link de Pagamento</p>
                    <a 
                      href={selectedInvoice.payment_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      {selectedInvoice.payment_link}
                    </a>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Histórico de Cobranças do Cliente</p>
                  <div className="space-y-2">
                    {invoices
                      .filter(inv => inv.client_id === selectedInvoice.client_id)
                      .map(inv => (
                        <div key={inv.id} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                          <span>{new Date(inv.due_date).toLocaleDateString('pt-BR')}</span>
                          <span>R$ {inv.amount.toFixed(2)}</span>
                          <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                            {inv.status === 'paid' ? 'Pago' : 'Pendente'}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

export default BillingSystem;
