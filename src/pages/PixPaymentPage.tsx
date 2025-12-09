import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Copy, Upload, QrCode, Key, CheckCircle, CreditCard, Loader2, ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

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

  const pixData = {
    qrcode: '/pix-qrcode.png',
    chave: '00020101021126580014br.gov.bcb.pix01367e19354b-7e68-42d2-9dbf-eff2dcca5f805204000053039865802BR5917CARLOS E F MORORO6010IMPERATRIZ62070503***63049401'
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
        title: "✓ Comprovante selecionado",
        description: file.name,
      });
    }
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText(pixData.chave);
    toast({
      title: "✓ Chave PIX copiada!",
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

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_receipt_url: uploadData.path,
          customer_name: customerInfo.name,
          installment_count: installments,
          installment_value: Math.round(getInstallmentValue()),
          status: 'processing'
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      const installmentsData = [];
      const installmentValue = Math.round(getInstallmentValue());
      
      for (let i = 1; i <= installments; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
        
        installmentsData.push({
          order_id: orderId,
          installment_number: i,
          total_installments: installments,
          amount: installmentValue,
          due_date: dueDate.toISOString(),
          status: i === 1 ? 'paid' : 'pending',
          payment_proof_url: i === 1 ? uploadData.path : null,
          paid_at: i === 1 ? new Date().toISOString() : null
        });
      }

      const { error: installmentsError } = await supabase
        .from('order_installments')
        .insert(installmentsData);

      if (installmentsError) throw installmentsError;

      toast({
        title: "✓ Pagamento enviado!",
        description: installments > 1 
          ? `Primeira parcela enviada. Você receberá lembretes das próximas ${installments - 1} parcelas.`
          : "Seu pagamento será analisado em breve",
      });

      navigate('/meus-pedidos');
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/20">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header com Progresso */}
          <div className="mb-12">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="flex items-center gap-2 opacity-50">
                <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <span className="text-sm">Carrinho</span>
              </div>
              <div className="w-16 h-1 bg-primary rounded"></div>
              <div className="flex items-center gap-2 opacity-50">
                <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <span className="text-sm">Checkout</span>
              </div>
              <div className="w-16 h-1 bg-primary rounded"></div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold ring-4 ring-primary/20">
                  3
                </div>
                <span className="font-semibold text-primary">Pagamento</span>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-center mb-3 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Pagamento via PIX
            </h1>
            <p className="text-center text-muted-foreground text-lg mb-6">
              Realize o pagamento e envie o comprovante
            </p>
            
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-4 bg-primary/10 rounded-xl px-8 py-4 border-2 border-primary/20">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatPrice(orderTotal)}
                  </p>
                </div>
                {installments > 1 && (
                  <>
                    <Separator orientation="vertical" className="h-12" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{installments}x Parcelas</p>
                      <p className="text-2xl font-bold">
                        {formatPrice(Math.round(getInstallmentValue()))}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-8">
            {/* Parcelamento */}
            <Card className="shadow-xl border-0 bg-card/80 backdrop-blur overflow-hidden">
              <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-6 border-b flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">Escolha o Parcelamento</h2>
                  <p className="text-sm text-muted-foreground">Parcele em até 12x no PIX</p>
                </div>
              </div>
              
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="installments" className="text-sm font-bold mb-3 block">
                      Número de Parcelas
                    </Label>
                    <Select 
                      value={String(installments)} 
                      onValueChange={(value) => setInstallments(Number(value))}
                    >
                      <SelectTrigger className="w-full h-12 text-base">
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

                  <div className="bg-primary/5 p-6 rounded-xl border-2 border-primary/20">
                    <div className="flex items-center gap-3 mb-4">
                      <CreditCard className="w-6 h-6 text-primary" />
                      <span className="font-bold text-lg">Resumo</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Parcelas:</span>
                        <strong>{installments}x</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor/parcela:</span>
                        <strong className="text-primary">{formatPrice(Math.round(getInstallmentValue()))}</strong>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between text-base">
                        <span className="font-semibold">Total:</span>
                        <strong className="text-primary text-lg">{formatPrice(orderTotal)}</strong>
                      </div>
                    </div>
                    {installments > 1 && (
                      <p className="text-xs text-muted-foreground mt-3 p-3 bg-background/50 rounded">
                        ℹ️ Você pagará a 1ª parcela agora e receberá lembretes para as próximas
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados PIX e Upload */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Realizar Pagamento */}
              <Card className="shadow-xl border-0 bg-card/80 backdrop-blur overflow-hidden">
                <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-6 border-b flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">Realize o Pagamento</h2>
                    <p className="text-sm text-muted-foreground">
                      {installments > 1 ? `Pague ${formatPrice(Math.round(getInstallmentValue()))}` : 'Escolha o método'}
                    </p>
                  </div>
                </div>
                
                <CardContent className="p-8 space-y-6">
                  <RadioGroup value={pixMethod} onValueChange={setPixMethod}>
                    <div className={`flex items-center space-x-4 p-5 border-2 rounded-xl cursor-pointer transition-all ${pixMethod === 'qrcode' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50'}`}>
                      <RadioGroupItem value="qrcode" id="qrcode" className="shrink-0" />
                      <Label htmlFor="qrcode" className="flex items-center gap-3 cursor-pointer flex-1">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <QrCode className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-bold">QR Code PIX</div>
                          <div className="text-xs text-muted-foreground">Escaneie com seu banco</div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className={`flex items-center space-x-4 p-5 border-2 rounded-xl cursor-pointer transition-all ${pixMethod === 'chave' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50'}`}>
                      <RadioGroupItem value="chave" id="chave" className="shrink-0" />
                      <Label htmlFor="chave" className="flex items-center gap-3 cursor-pointer flex-1">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Key className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-bold">Chave PIX</div>
                          <div className="text-xs text-muted-foreground">Copie e cole no app</div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  {pixMethod === 'qrcode' && (
                    <div className="bg-white p-6 rounded-xl border-2 border-primary/20 text-center space-y-4">
                      <img 
                        src={pixData.qrcode} 
                        alt="QR Code PIX" 
                        className="mx-auto border-4 border-primary/10 shadow-xl rounded-xl max-w-[250px]"
                      />
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-primary">
                          📱 Abra o app do seu banco
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Escaneie o QR Code acima e confirme o pagamento
                        </p>
                      </div>
                    </div>
                  )}

                  {pixMethod === 'chave' && (
                    <div className="bg-accent/50 p-6 rounded-xl border-2 border-primary/20 space-y-4">
                      <Label className="text-sm font-bold block">Chave PIX (Copia e Cola)</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={pixData.chave} 
                          readOnly 
                          className="font-mono text-xs"
                        />
                        <Button 
                          type="button" 
                          size="icon"
                          onClick={copyPixKey}
                          className="shrink-0 h-10 w-10"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        💡 Copie e cole no seu app de pagamento
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upload do Comprovante */}
              <Card className="shadow-xl border-0 bg-card/80 backdrop-blur overflow-hidden">
                <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-6 border-b flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">Envie o Comprovante</h2>
                    <p className="text-sm text-muted-foreground">Obrigatório para confirmar</p>
                  </div>
                </div>
                
                <CardContent className="p-8">
                  <form onSubmit={handleSubmitPayment} className="space-y-6">
                    <div>
                      <Label htmlFor="name" className="text-sm font-bold">
                        Nome Completo <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo(prev => ({...prev, name: e.target.value}))}
                        placeholder="Digite seu nome completo"
                        required
                        className="mt-2 h-12"
                      />
                    </div>

                    <div>
                      <Label htmlFor="receipt" className="text-sm font-bold">
                        Comprovante de Pagamento <span className="text-destructive">*</span>
                      </Label>
                      <div className="mt-2">
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
                          className="w-full h-auto py-6"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${receipt ? 'bg-primary-foreground/20' : 'bg-primary/10'}`}>
                              <Upload className="w-6 h-6" />
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-bold text-base">
                                {receipt ? '✓ Arquivo Selecionado' : 'Selecionar Comprovante'}
                              </div>
                              <div className="text-xs opacity-80">
                                {receipt ? receipt.name : 'PNG, JPG ou PDF (máx. 10MB)'}
                              </div>
                            </div>
                          </div>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        📎 Formatos: PNG, JPG, JPEG e PDF (máx. 10MB)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="additionalInfo" className="text-sm font-bold">
                        Observações (opcional)
                      </Label>
                      <Textarea
                        id="additionalInfo"
                        value={customerInfo.additionalInfo}
                        onChange={(e) => setCustomerInfo(prev => ({...prev, additionalInfo: e.target.value}))}
                        placeholder="Informações adicionais sobre o pagamento"
                        rows={3}
                        className="mt-2"
                      />
                    </div>

                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        className="w-full h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all" 
                        disabled={loading || !receipt || !customerInfo.name.trim()}
                      >
                        {loading ? (
                          <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Enviando...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            Confirmar Pagamento
                          </div>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Info Final */}
            <Card className="shadow-xl border-0 bg-blue-50/80 dark:bg-blue-950/20">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-3 text-blue-900 dark:text-blue-100">
                      Próximos Passos
                    </h3>
                    <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                      <p>✓ Nossa equipe analisará seu comprovante</p>
                      <p>✓ Você receberá acesso aos produtos em até 24h</p>
                      <p>✓ Notificação por email assim que for aprovado</p>
                      {installments > 1 && (
                        <p className="font-semibold mt-3">
                          📅 Você receberá lembretes automáticos das próximas {installments - 1} parcelas
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/checkout')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Checkout
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
