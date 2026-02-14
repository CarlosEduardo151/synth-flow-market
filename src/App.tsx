import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { DeviceProvider } from "@/contexts/DeviceContext";
import { ChatWidget } from "@/components/ChatWidget";
import { DeviceSelector } from "@/components/DeviceSelector";
import { ScrollToTop } from "@/components/ScrollToTop";

import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import ProductPage from "./pages/ProductPage";
import AuthPage from "./pages/AuthPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import PixPaymentPage from "./pages/PixPaymentPage";
import MercadoPagoPaymentPage from "./pages/MercadoPagoPaymentPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import MyProductsPage from "./pages/MyProductsPage";
import ProductViewPage from "./pages/ProductViewPage";
import Sobre from "./pages/Sobre";
import Jornada from "./pages/Jornada";
import CalendarioRomantico from "./pages/EncontroRomantico";
import Termos from "./pages/TermosDeUso";
import PoliticaPrivacidade from "./pages/PoliticaDePrivacidade";
import SearchPage from "./pages/SearchPage";
import PlanosPage from "./pages/PlanosPage";
import FreeTrialPage from "./pages/FreeTrialPage";
import ProductReviewPage from "./pages/ProductReviewPage";
import DemonstracaoPage from "./pages/DemonstracaoPage";

import AdminDashboard from "./pages/AdminDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerTicketsPage from "./pages/CustomerTicketsPage";
import CustomerSettingsPage from "./pages/CustomerSettingsPage";

import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AdminCouponsPage from "./pages/admin/AdminCouponsPage";
import AdminCustomersPage from "./pages/admin/AdminCustomersPage";
import AdminReviewsPage from "./pages/admin/AdminReviewsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminSubscriptionsReportPage from "./pages/admin/AdminSubscriptionsReportPage";

import CRMSystem from "./pages/systems/CRMSystem";
import DashboardSystem from "./pages/systems/DashboardSystem";
import BillingSystem from "./pages/systems/BillingSystem";
import SocialPostsSystem from "./pages/systems/SocialPostsSystem";
import FinancialReportsSystem from "./pages/systems/FinancialReportsSystem";
import LoyaltySystem from "./pages/systems/LoyaltySystem";
import AIControlSystem from "./pages/systems/AIControlSystem";
import SalesAssistantSystem from "./pages/systems/SalesAssistantSystem";
import BotsAutomacaoSystem from "./pages/systems/BotsAutomacaoSystem";
import WhatsAppBotConfigSystem from "./pages/systems/WhatsAppBotConfigSystem";
import FinancialAgentSystem from "./pages/systems/FinancialAgentSystem";
import AgenteRHSystem from "./pages/systems/AgenteRHSystem";
import AgenteRHConfigSystem from "./pages/systems/AgenteRHConfigSystem";
import AdminTicketsPage from "./pages/admin/AdminTicketsPage";
import AdminAgentConfigPage from "./pages/admin/AdminAgentConfigPage";
import AdminFinancialPage from "./pages/admin/AdminFinancialPage";
import AdminStaraiPurchasesPage from "./pages/admin/AdminStaraiPurchasesPage";
import HowBotWorksPage from "./pages/HowBotWorksPage";
 import AdminDiagnosticPage from "./pages/admin/AdminDiagnosticPage";
import AdminAbandonedCartsPage from "./pages/admin/AdminAbandonedCartsPage";
import AdminCustomMessagesPage from "./pages/admin/AdminCustomMessagesPage";
import SniperHFTSystem from "./pages/systems/SniperHFTSystem";
import AdminBotsAutomacaoPage from "./pages/admin/AdminBotsAutomacaoPage";
import AdminEnginesPage from "./pages/admin/AdminEnginesPage";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();


const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <DeviceProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ChatWidget />
            <DeviceSelector />
            <BrowserRouter>
              <ScrollToTop />
            <Routes>
              {/* rotas públicas */}
              <Route path="/" element={<Index />} />
              <Route path="/c/:slug" element={<CategoryPage />} />
              <Route path="/p/:slug" element={<ProductPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/carrinho" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/pix-payment/:orderId" element={<PixPaymentPage />} />
            <Route path="/mercadopago-payment/:orderId" element={<MercadoPagoPaymentPage />} />
            <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
              <Route path="/sobre" element={<Sobre />} />
              <Route path="/jornada" element={<Jornada />} />
              <Route path="/calendario" element={<CalendarioRomantico />} />
              <Route path="/termos-de-uso" element={<Termos />} />
              <Route path="politica-de-privacidade" element={<PoliticaPrivacidade />} />
              <Route path="/busca" element={<SearchPage />} />
              <Route path="/planos" element={<PlanosPage />} />
              <Route path="/teste-gratis" element={<FreeTrialPage />} />
              <Route path="/demonstracao" element={<DemonstracaoPage />} />

              {/* rotas do cliente */}
              <Route path="/meus-pedidos" element={<MyOrdersPage />} />
              <Route path="/meus-produtos" element={<MyProductsPage />} />
              <Route path="/meus-produtos/:slug" element={<ProductViewPage />} />
              <Route path="/produto/:slug" element={<ProductViewPage />} />
              <Route path="/customer" element={<CustomerDashboard />} />
              <Route path="/customer/tickets" element={<CustomerTicketsPage />} />
              <Route path="/customer/settings" element={<CustomerSettingsPage />} />
              <Route path="/como-funciona" element={<HowBotWorksPage />} />
              <Route path="/avaliar/:productSlug" element={<ProductReviewPage />} />

              {/* rotas dos sistemas comprados */}
              <Route path="/sistema/crm-simples" element={<CRMSystem />} />
              <Route path="/sistema/dashboards-personalizados" element={<DashboardSystem />} />
              <Route path="/sistema/gestao-cobrancas" element={<BillingSystem />} />
              <Route path="/sistema/posts-sociais" element={<SocialPostsSystem />} />
              <Route path="/sistema/relatorios-financeiros" element={<FinancialReportsSystem />} />
              <Route path="/sistema/fidelidade-digital" element={<LoyaltySystem />} />
              <Route path="/sistema/fidelidade-digital/:productId" element={<LoyaltySystem />} />
              <Route path="/sistema/ai-control/:productId" element={<AIControlSystem />} />
              <Route path="/sistema/assistente-vendas" element={<SalesAssistantSystem />} />
              <Route path="/sistema/bots-automacao" element={<BotsAutomacaoSystem />} />
              <Route path="/sistema/bots-automacao/whatsapp/:productId" element={<WhatsAppBotConfigSystem />} />
              <Route path="/sistema/agente-financeiro" element={<FinancialAgentSystem />} />
              <Route path="/sistema/agente-rh" element={<AgenteRHSystem />} />
              <Route path="/sistema/agente-rh/config" element={<AgenteRHConfigSystem />} />
              <Route path="/sistemas/sniper-hft" element={<SniperHFTSystem />} />
              <Route path="/systems/SniperHFTSystem" element={<SniperHFTSystem />} />

              {/* rotas do admin */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/orders" element={<AdminOrdersPage />} />
              <Route path="/admin/products" element={<AdminProductsPage />} />
              <Route path="/admin/categories" element={<AdminCategoriesPage />} />
              <Route path="/admin/coupons" element={<AdminCouponsPage />} />
              <Route path="/admin/customers" element={<AdminCustomersPage />} />
              <Route path="/admin/reviews" element={<AdminReviewsPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route
                path="/admin/subscriptions-report"
                element={<AdminSubscriptionsReportPage />}
              />
              <Route path="/admin/agent-config" element={<AdminAgentConfigPage />} />
              <Route path="/admin/starai-purchases" element={<AdminStaraiPurchasesPage />} />
              <Route path="/admin/tickets" element={<AdminTicketsPage />} />
              <Route path="/admin/financial" element={<AdminFinancialPage />} />
             <Route path="/admin/diagnostico" element={<AdminDiagnosticPage />} />
              <Route path="/admin/abandoned-carts" element={<AdminAbandonedCartsPage />} />
              <Route path="/admin/custom-messages" element={<AdminCustomMessagesPage />} />
              <Route path="/admin/bots-automacao" element={<AdminBotsAutomacaoPage />} />
              <Route path="/admin/engines" element={<AdminEnginesPage />} />

              {/* fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </DeviceProvider>
    </CartProvider>
  </AuthProvider>
</QueryClientProvider>
);

export default App;
