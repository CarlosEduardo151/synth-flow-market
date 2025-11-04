import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ProductTutorial } from '@/components/ProductTutorial';
import { fidelidadeDigitalTutorial } from '@/data/tutorials/fidelidade-digital';
import { LoyaltyDashboard } from '@/components/loyalty/LoyaltyDashboard';
import { LoyaltyClients } from '@/components/loyalty/LoyaltyClients';
import { LoyaltyRewards } from '@/components/loyalty/LoyaltyRewards';
import { LoyaltyTransactions } from '@/components/loyalty/LoyaltyTransactions';
import { LoyaltyMessages } from '@/components/loyalty/LoyaltyMessages';
import { LoyaltySettings } from '@/components/loyalty/LoyaltySettings';
import { LoyaltyIntegration } from '@/components/loyalty/LoyaltyIntegration';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function LoyaltySystem() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { productId } = useParams();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [customerProductId, setCustomerProductId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user && productId) {
      setCustomerProductId(productId);
    } else if (user && !productId) {
      // Buscar o customer_product_id do usuário para este produto
      fetchCustomerProduct();
    }
  }, [user, loading, navigate, productId]);

  const fetchCustomerProduct = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('customer_products')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_slug', 'fidelidade-digital')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching customer product:', error);
      toast({
        title: "Erro",
        description: "Você precisa adquirir o produto para acessar este sistema.",
        variant: "destructive"
      });
      navigate('/produtos/fidelidade-digital');
      return;
    }

    setCustomerProductId(data.id);
  };

  if (loading || !customerProductId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ProductTutorial
        productSlug="fidelidade-digital"
        productTitle="Sistema de Fidelidade Digital"
        steps={fidelidadeDigitalTutorial}
        onComplete={() => {}}
      />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Sistema de Fidelidade Digital
          </h1>
          <p className="text-muted-foreground">
            Gerencie seu programa de pontos e recompensas
          </p>
        </div>

        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-7 mb-6">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="clients">Clientes</TabsTrigger>
              <TabsTrigger value="rewards">Recompensas</TabsTrigger>
              <TabsTrigger value="transactions">Transações</TabsTrigger>
              <TabsTrigger value="messages">Mensagens</TabsTrigger>
              <TabsTrigger value="integration">Integração</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4">
              <LoyaltyDashboard customerProductId={customerProductId} />
            </TabsContent>

            <TabsContent value="clients" className="space-y-4">
              <LoyaltyClients customerProductId={customerProductId} />
            </TabsContent>

            <TabsContent value="rewards" className="space-y-4">
              <LoyaltyRewards customerProductId={customerProductId} />
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <LoyaltyTransactions customerProductId={customerProductId} />
            </TabsContent>

            <TabsContent value="messages" className="space-y-4">
              <LoyaltyMessages customerProductId={customerProductId} />
            </TabsContent>

            <TabsContent value="integration" className="space-y-4">
              <LoyaltyIntegration customerProductId={customerProductId} />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <LoyaltySettings customerProductId={customerProductId} />
            </TabsContent>
          </Tabs>
        </Card>
      </main>

      <Footer />
    </div>
  );
}