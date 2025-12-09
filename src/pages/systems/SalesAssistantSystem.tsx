import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SalesDashboard } from '@/components/sales/SalesDashboard';
import { SalesLeads } from '@/components/sales/SalesLeads';
import { SalesPipeline } from '@/components/sales/SalesPipeline';
import { SalesFollowUps } from '@/components/sales/SalesFollowUps';
import { SalesMeetings } from '@/components/sales/SalesMeetings';
import { SalesReports } from '@/components/sales/SalesReports';
import { SalesSettings } from '@/components/sales/SalesSettings';
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  CalendarCheck, 
  Video, 
  BarChart3, 
  Settings 
} from 'lucide-react';

export default function SalesAssistantSystem() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [customerProductId, setCustomerProductId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchCustomerProduct();
    }
  }, [user, loading, navigate]);

  const fetchCustomerProduct = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('customer_products')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_slug', 'assistente-vendas')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching customer product:', error);
      toast({
        title: "Erro",
        description: "Você precisa adquirir o produto para acessar este sistema.",
        variant: "destructive"
      });
      navigate('/p/assistente-vendas');
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
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
            Assistente de Vendas com IA
          </h1>
          <p className="text-muted-foreground text-lg">
            Prospecção inteligente, follow-up automático e análise de pipeline
          </p>
        </div>

        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-7 mb-6 bg-muted/50">
              <TabsTrigger value="dashboard" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="leads" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Leads</span>
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Pipeline</span>
              </TabsTrigger>
              <TabsTrigger value="followups" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <CalendarCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Follow-ups</span>
              </TabsTrigger>
              <TabsTrigger value="meetings" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Reuniões</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Relatórios</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4">
              <SalesDashboard customerProductId={customerProductId} />
            </TabsContent>

            <TabsContent value="leads" className="space-y-4">
              <SalesLeads customerProductId={customerProductId} />
            </TabsContent>

            <TabsContent value="pipeline" className="space-y-4">
              <SalesPipeline customerProductId={customerProductId} />
            </TabsContent>

            <TabsContent value="followups" className="space-y-4">
              <SalesFollowUps customerProductId={customerProductId} />
            </TabsContent>

            <TabsContent value="meetings" className="space-y-4">
              <SalesMeetings customerProductId={customerProductId} />
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <SalesReports customerProductId={customerProductId} />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <SalesSettings customerProductId={customerProductId} />
            </TabsContent>
          </Tabs>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
