import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  Users, 
  Calculator, 
  TrendingUp,
  Package,
  Wallet
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

import { AdminCRMTab } from '@/components/admin-financial/AdminCRMTab';
import { CashFlowTab } from '@/components/admin-financial/CashFlowTab';
import { ThreeBoxesTab } from '@/components/admin-financial/ThreeBoxesTab';
import { ProductsTab } from '@/components/admin-financial/ProductsTab';
import { FinancialOverview } from '@/components/admin-financial/FinancialOverview';

const AdminFinancialPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminRole();
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (error || !data) {
      toast({
        title: "Acesso Negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive"
      });
      navigate('/');
      return;
    }

    setIsAdmin(true);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" />
            Gestão Financeira Completa
          </h1>
          <p className="text-muted-foreground mt-2">
            CRM, Fluxo de Caixa, Cálculo das 3 Caixinhas e Gerenciamento de Produtos
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="crm" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">CRM</span>
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Fluxo de Caixa</span>
            </TabsTrigger>
            <TabsTrigger value="boxes" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">3 Caixinhas</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Produtos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <FinancialOverview />
          </TabsContent>

          <TabsContent value="crm">
            <AdminCRMTab />
          </TabsContent>

          <TabsContent value="cashflow">
            <CashFlowTab />
          </TabsContent>

          <TabsContent value="boxes">
            <ThreeBoxesTab />
          </TabsContent>

          <TabsContent value="products">
            <ProductsTab />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default AdminFinancialPage;
