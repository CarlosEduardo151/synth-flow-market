import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Copy, Upload, QrCode, Key, CheckCircle, CreditCard } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PixPaymentPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pixMethod, setPixMethod] = useState('qrcode');
  const [receipt, setReceipt] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [installments, setInstallments] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    additionalInfo: ''
  });

  useEffect(() => {
    const fetchOrderTotal = async () => {
      if (!orderId) return;
      
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('id', orderId)
        .single();
      
      if (!error && data) {
        setOrderTotal(data.total_amount);
      }
    };
    
    fetchOrderTotal();
  }, [orderId]);

  // Dados PIX fictícios - podem ser configurados via env
  const pixData = {
    qrcode: '/pix-qrcode.png', // arquivo em public/
    chave: '12345678901' // Chave PIX fictícia
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const getInstallmentValue = () => {
    return orderTotal / installments;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'] as const;
      const fileType = file.type.toLowerCase();
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const blockedExts = ['jfif', 'jfi', 'jif'];
      
      if (blockedExts.includes(ext) || !allowedTypes.includes(fileType as any)) {
        toast({
          title: "Formato não suportado",
          description: "Envie apenas PNG, JPEG/JPG ou PDF (sem JFIF).",
          variant: "destructive",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      // Validar tamanho (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      setReceipt(file);
      toast({
        title: "Comprovante selecionado",
        description: file.name,
      });
    }
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText(pixData.chave);
    toast({
      title: "Chave PIX copiada!",
      description: "Cole no seu app de pagamento",
    });
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receipt) {
      toast({
        title: "Erro",
        description: "Por favor, faça upload do comprovante de pagamento",
        variant: "destructive",
      });
      return;
    }

    if (!customerInfo.name.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha seu nome",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Upload do comprovante
      const fileExt = receipt.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(fileName, receipt);

      if (uploadError) {
        const msg = String((uploadError as any).message || '').toLowerCase();
        if (msg.includes('bucket not found')) {
          toast({
            title: "Erro no envio",
            description: "Bucket de comprovantes não encontrado. Tente novamente em alguns minutos.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        throw uploadError;
      }

      // Atualizar pedido com comprovante e informações
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_receipt_url: uploadData.path,
          customer_name: customerInfo.name,
          installment_count: installments,
          installment_value: Math.round(getInstallmentValue()),
          status: 'processing' // Status intermediário para análise
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Criar parcelas se houver mais de 1
      if (installments > 1) {
        const installmentsData = [];
        const installmentValue = Math.round(getInstallmentValue());
        
        for (let i = 1; i <= installments; i++) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + i);
          
          installmentsData.push({
            order_id: orderId,
            installment_number: i,
            total_installments: installments,
            amount: installmentValue,
            due_date: dueDate.toISOString(),
            status: i === 1 ? 'paid' : 'pending', // Primeira parcela já paga
            payment_proof_url: i === 1 ? uploadData.path : null,
            paid_at: i === 1 ? new Date().toISOString() : null
          });
        }

        const { error: installmentsError } = await supabase
          .from('order_installments')
          .insert(installmentsData);

        if (installmentsError) throw installmentsError;
      }

      toast({
        title: "Pagamento enviado!",
        description: installments > 1 
          ? `Primeira parcela enviada. Você receberá lembretes das próximas ${installments - 1} parcelas.`
          : "Seu pagamento será analisado em breve",
      });

      navigate('/customer-dashboard');
    } catch (error: any) {
      toast({
        title: "Erro ao enviar pagamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Pagamento PIX
            </h1>
            <p className="text-muted-foreground text-lg">
              Complete seu pagamento em 4 passos simples
            </p>
            <div className="mt-6 p-4 bg-primary/10 rounded-lg inline-block">
              <p className="text-2xl font-bold text-primary">
                Total: {formatPrice(orderTotal)}
              </p>
              {installments > 1 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {installments}x de {formatPrice(Math.round(getInstallmentValue()))}
                </p>
              )}
            </div>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Card de Parcelamento */}
            <Card className="shadow-lg border-primary/20">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  Escolha o Parcelamento
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Parcele seu pagamento em até 12x
                </p>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label htmlFor="installments" className="text-sm font-semibold mb-2 block">
                    Número de Parcelas
                  </Label>
                  <Select 
                    value={String(installments)} 
                    onValueChange={(value) => setInstallments(Number(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                        <SelectItem key={num} value={String(num)}>
                          {num}x de {formatPrice(Math.round(orderTotal / num))}
                          {num === 1 && ' - À vista'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-accent/50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Detalhes do Parcelamento</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>💳 Valor por parcela: <strong>{formatPrice(Math.round(getInstallmentValue()))}</strong></p>
                    <p>📅 Total de parcelas: <strong>{installments}x</strong></p>
                    <p>💰 Valor total: <strong>{formatPrice(orderTotal)}</strong></p>
                    {installments > 1 && (
                      <p className="text-primary mt-2">
                        ℹ️ Você pagará a primeira parcela agora e receberá lembretes para as próximas
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de Pagamento PIX */}
            <Card className="shadow-lg border-primary/20">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  Realize o Pagamento {installments > 1 && '(1ª Parcela)'}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {installments > 1 
                    ? `Pague a primeira parcela de ${formatPrice(Math.round(getInstallmentValue()))}`
                    : 'Escolha como deseja pagar'
                  }
                </p>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <RadioGroup value={pixMethod} onValueChange={setPixMethod}>
                  <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors">
                    <RadioGroupItem value="qrcode" id="qrcode" />
                    <Label htmlFor="qrcode" className="flex items-center gap-2 cursor-pointer flex-1">
                      <QrCode className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-semibold">QR Code PIX</div>
                        <div className="text-xs text-muted-foreground">Escaneie com seu banco</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors">
                    <RadioGroupItem value="chave" id="chave" />
                    <Label htmlFor="chave" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Key className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-semibold">Chave PIX</div>
                        <div className="text-xs text-muted-foreground">Copie e cole no app</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                {pixMethod === 'qrcode' && (
                  <div className="bg-accent/50 p-6 rounded-lg text-center space-y-4">
                    <img 
                      src={pixData.qrcode} 
                      alt="QR Code PIX" 
                      className="mx-auto border-4 border-white shadow-xl rounded-lg max-w-[280px]"
                    />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        📱 Abra o app do seu banco
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Aponte a câmera para o QR Code acima
                      </p>
                    </div>
                  </div>
                )}

                {pixMethod === 'chave' && (
                  <div className="bg-accent/50 p-6 rounded-lg space-y-4">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Chave PIX (CPF)</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={pixData.chave} 
                          readOnly 
                          className="font-mono text-lg font-bold"
                        />
                        <Button 
                          type="button" 
                          variant="default" 
                          size="icon"
                          onClick={copyPixKey}
                          className="shrink-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        💡 Clique para copiar e cole no seu app de pagamento
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card de Upload do Comprovante */}
            <Card className="shadow-lg border-primary/20 lg:col-span-2">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  Envie o Comprovante
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Obrigatório para confirmar {installments > 1 ? 'a primeira parcela do' : ''} seu pedido
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmitPayment} className="space-y-5">
                  <div>
                    <Label htmlFor="name" className="text-sm font-semibold">
                      Nome Completo <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({...prev, name: e.target.value}))}
                      placeholder="Digite seu nome completo"
                      required
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="receipt" className="text-sm font-semibold">
                      Comprovante de Pagamento <span className="text-destructive">*</span>
                    </Label>
                    <div className="mt-1.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        required
                      />
                      <Button
                        type="button"
                        variant={receipt ? "default" : "outline"}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-auto py-4"
                      >
                        <div className="flex items-center gap-3">
                          <Upload className="w-5 h-5" />
                          <div className="text-left flex-1">
                            <div className="font-semibold">
                              {receipt ? '✓ Arquivo selecionado' : 'Selecionar Comprovante'}
                            </div>
                            <div className="text-xs opacity-90">
                              {receipt ? receipt.name : 'PNG, JPG ou PDF (máx. 10MB)'}
                            </div>
                          </div>
                        </div>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      📎 Formatos aceitos: PNG, JPG, JPEG e PDF (máx. 10MB)
                    </p>
                    {!receipt && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        ⚠️ O comprovante é obrigatório para processar seu pedido
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="additionalInfo" className="text-sm font-semibold">
                      Observações (opcional)
                    </Label>
                    <Textarea
                      id="additionalInfo"
                      value={customerInfo.additionalInfo}
                      onChange={(e) => setCustomerInfo(prev => ({...prev, additionalInfo: e.target.value}))}
                      placeholder="Alguma informação adicional sobre o pagamento?"
                      rows={3}
                      className="mt-1.5"
                    />
                  </div>

                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold" 
                      disabled={loading || !receipt || !customerInfo.name.trim()}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Enviando...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" />
                          Confirmar Pagamento
                        </div>
                      )}
                    </Button>
                    {(!receipt || !customerInfo.name.trim()) && (
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        Preencha todos os campos obrigatórios para continuar
                      </p>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Info adicional */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                  4
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Após o envio</h3>
                  <p className="text-sm text-muted-foreground">
                    Nossa equipe irá analisar seu comprovante e liberar o acesso aos produtos em até 24 horas. 
                    {installments > 1 && ` Você receberá lembretes automáticos para as próximas ${installments - 1} parcelas via email.`}
                    {' '}Você receberá uma notificação por email assim que o pagamento for confirmado.
                  </p>
                  {installments > 1 && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Importante sobre as parcelas:</strong><br />
                        • Você pode acompanhar todas as parcelas no painel do cliente<br />
                        • Receberá lembretes 3 dias antes do vencimento de cada parcela<br />
                        • Cada parcela deve ser paga até a data de vencimento<br />
                        • É possível consultar o status de cada parcela a qualquer momento
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}