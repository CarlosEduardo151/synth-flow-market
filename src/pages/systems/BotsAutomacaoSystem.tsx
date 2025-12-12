import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, ArrowRight, Bot, Sparkles, Check } from 'lucide-react';

interface CustomerProduct {
  id: string;
  product_slug: string;
  product_title: string;
  is_active: boolean;
}

interface PlatformConfig {
  platform: 'whatsapp' | 'telegram' | null;
  configured_at: string | null;
}

const BotsAutomacaoSystem = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [customerProduct, setCustomerProduct] = useState<CustomerProduct | null>(null);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<'whatsapp' | 'telegram' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user) {
      checkAccess();
    }
  }, [user, loading, navigate]);

  const checkAccess = async () => {
    if (!user) return;

    try {
      // Check if user has access to this product
      const { data: products, error } = await supabase
        .from('customer_products')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_slug', 'bots-automacao')
        .eq('is_active', true)
        .order('delivered_at', { ascending: false })
        .limit(1);

      if (error || !products || products.length === 0) {
        navigate('/meus-produtos');
        return;
      }

      const product = products[0];

      setCustomerProduct(product);

      // Check if platform was already configured
      const { data: config } = await supabase
        .from('ai_control_config')
        .select('configuration')
        .eq('customer_product_id', product.id)
        .single();

      if (config?.configuration) {
        const configData = config.configuration as any;
        if (configData.platform) {
          setPlatformConfig({
            platform: configData.platform,
            configured_at: configData.configured_at
          });
        }
      }
    } catch (error) {
      console.error('Error checking access:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlatform = async (platform: 'whatsapp' | 'telegram') => {
    if (!customerProduct) return;
    
    setIsSaving(true);
    setSelectedPlatform(platform);

    try {
      // Save platform selection to ai_control_config
      const { error } = await supabase
        .from('ai_control_config')
        .upsert({
          customer_product_id: customerProduct.id,
          configuration: {
            platform,
            configured_at: new Date().toISOString()
          }
        }, {
          onConflict: 'customer_product_id'
        });

      if (error) throw error;

      if (platform === 'whatsapp') {
        // Redirect to WhatsApp bot config panel
        navigate(`/sistema/bots-automacao/whatsapp/${customerProduct.id}`);
      } else {
        // For now, Telegram shows a coming soon or different flow
        setPlatformConfig({
          platform: 'telegram',
          configured_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error saving platform:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If platform is already configured
  if (platformConfig?.platform) {
    if (platformConfig.platform === 'whatsapp') {
      navigate(`/sistema/bots-automacao/whatsapp/${customerProduct?.id}`);
      return null;
    }

    // Telegram panel (placeholder for now)
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <Send className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Bot Telegram Configurado</CardTitle>
              <CardDescription>
                Sua automação para Telegram está ativa
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <Send className="h-4 w-4 mr-2" />
                Telegram
              </Badge>
              <p className="text-muted-foreground">
                Em breve você terá acesso ao painel completo de configuração do bot Telegram.
              </p>
              <Button variant="outline" onClick={() => {
                setPlatformConfig(null);
              }}>
                Alterar Plataforma
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Platform selection screen
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mb-6">
              <Bot className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Bots de Automação</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Escolha a plataforma onde deseja configurar seu bot de automação inteligente
            </p>
          </div>

          {/* Platform Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* WhatsApp Card */}
            <Card 
              className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border-2 ${
                selectedPlatform === 'whatsapp' ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-transparent hover:border-green-500/50'
              }`}
              onClick={() => !isSaving && handleSelectPlatform('whatsapp')}
            >
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">WhatsApp</CardTitle>
                <Badge className="w-fit mx-auto bg-green-600">Recomendado</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-muted-foreground">
                  Configure um bot inteligente para WhatsApp com IA avançada
                </p>
                <ul className="space-y-2">
                  {[
                    'Atendimento automático 24/7',
                    'Integração com IA (GPT, Gemini)',
                    'Respostas contextuais',
                    'Memória de conversas',
                    'Múltiplas ferramentas integradas'
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isSaving}
                >
                  {isSaving && selectedPlatform === 'whatsapp' ? (
                    <>Configurando...</>
                  ) : (
                    <>
                      Configurar WhatsApp
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Telegram Card */}
            <Card 
              className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border-2 ${
                selectedPlatform === 'telegram' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : 'border-transparent hover:border-blue-500/50'
              }`}
              onClick={() => !isSaving && handleSelectPlatform('telegram')}
            >
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                  <Send className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Telegram</CardTitle>
                <Badge variant="outline" className="w-fit mx-auto">Em breve</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-muted-foreground">
                  Configure um bot para Telegram com recursos avançados
                </p>
                <ul className="space-y-2">
                  {[
                    'Bot personalizado',
                    'Comandos customizados',
                    'Grupos e canais',
                    'Webhooks integrados',
                    'API Bot Telegram'
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-blue-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full"
                  variant="outline"
                  disabled={isSaving}
                >
                  {isSaving && selectedPlatform === 'telegram' ? (
                    <>Configurando...</>
                  ) : (
                    <>
                      Configurar Telegram
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-muted rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>Você pode alterar sua escolha posteriormente nas configurações</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BotsAutomacaoSystem;
