import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ArrowUpDown,
  Receipt,
  Target,
  BarChart3,
  Settings,
  MessageSquare,
  Wand2,
  Sparkles,
  Wallet,
  ChevronLeft,
  Menu,
  PieChart,
  Repeat,
  Calculator,
  Globe2,
  FileBarChart,
  Calendar as CalendarIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useProductAccess } from '@/hooks/useProductAccess';
import { CFODashboard } from '@/components/financial/cfo/CFODashboard';
import { ScenariosTab } from '@/components/financial/cfo/ScenariosTab';
import { InsightsTab } from '@/components/financial/cfo/InsightsTab';
import { BudgetCategoriesTab } from '@/components/financial/cfo/BudgetCategoriesTab';
import { RecurringTab } from '@/components/financial/cfo/RecurringTab';
import { TaxCalculatorTab } from '@/components/financial/cfo/TaxCalculatorTab';
import { MultiCurrencyTab } from '@/components/financial/cfo/MultiCurrencyTab';
import { DRETab } from '@/components/financial/cfo/DRETab';
import { CashCalendarTab } from '@/components/financial/cfo/CashCalendarTab';
import { FinancialTransactions } from '@/components/financial/FinancialTransactions';
import { InvoicesHub } from '@/components/financial/invoices/InvoicesHub';
import { QuotesTab } from '@/components/financial/quotes/QuotesTab';
import { FinancialGoals } from '@/components/financial/FinancialGoals';
import { FinancialReports } from '@/components/financial/FinancialReports';
import { FinancialSettings } from '@/components/financial/FinancialSettings';
import { FinancialChatbot } from '@/components/financial/FinancialChatbot';
import { Financial2FAGate } from '@/components/financial/Financial2FAGate';

const sidebarItems = [
  { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { value: 'calendar', label: 'Calendário', icon: CalendarIcon },
  { value: 'scenarios', label: 'Cenários', icon: Wand2 },
  { value: 'insights', label: 'Insights', icon: Sparkles },
  { value: 'chatbot', label: 'Chat', icon: MessageSquare },
  { value: 'transactions', label: 'Transações', icon: ArrowUpDown },
  { value: 'recurring', label: 'Recorrentes', icon: Repeat },
  { value: 'budgets', label: 'Orçamentos', icon: PieChart },
  { value: 'quotes', label: 'Cotações', icon: FileBarChart },
  { value: 'invoices', label: 'Faturas', icon: Receipt },
  { value: 'dre', label: 'DRE', icon: FileBarChart },
  { value: 'taxes', label: 'Impostos', icon: Calculator },
  { value: 'currency', label: 'Multi-moeda', icon: Globe2 },
  { value: 'goals', label: 'Metas', icon: Target },
  { value: 'reports', label: 'Relatórios', icon: BarChart3 },
  { value: 'settings', label: 'Config', icon: Settings },
];

export default function FinancialAgentSystem() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAccess, customerId, loading } = useProductAccess('agente-financeiro');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mode, setMode] = useState<'personal' | 'business'>('personal');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!loading && (!hasAccess || !customerId)) {
    toast({
      title: 'Erro',
      description: 'Você precisa adquirir o produto ou ativar um teste grátis para acessar este sistema.',
      variant: 'destructive',
    });
    navigate('/p/agente-financeiro');
    return null;
  }

  if (loading || !customerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-primary/30 animate-spin border-t-primary" />
            <Wallet className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Carregando painel...</p>
        </div>
      </div>
    );
  }

  const activeTabData = sidebarItems.find((t) => t.value === activeTab);

  const SidebarNav = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-emerald-500/10 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm leading-none">Agente Financeiro</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">CFO Virtual</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {sidebarItems.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => {
                setActiveTab(tab.value);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors ${
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span className="flex-1 text-left">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="px-3 py-3 border-t border-border/50">
        <motion.button
          onClick={() => navigate('/meus-produtos')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors group"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          <ChevronLeft className="w-[18px] h-[18px] transition-transform group-hover:-translate-x-0.5" />
          <span>Voltar</span>
        </motion.button>
      </div>
    </div>
  );

  return (
    <Financial2FAGate customerProductId={customerId}>
      <div className="min-h-screen bg-background flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-56 border-r border-border/50 bg-card/50 sticky top-0 h-screen">
          <SidebarNav />
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border/50 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                    <Menu className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-56 p-0">
                  <SidebarNav />
                </SheetContent>
              </Sheet>
              <div>
                <h1 className="text-base font-semibold text-foreground leading-none">
                  {activeTabData?.label}
                </h1>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-500 border-emerald-500/30">
                    {mode === 'personal' ? 'Pessoa Física' : 'Empresarial'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode('personal')}
                className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                  mode === 'personal'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Pessoa Física
              </button>
              <button
                onClick={() => setMode('business')}
                className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                  mode === 'business'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Empresarial
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="dashboard" className="space-y-4">
                <CFODashboard customerProductId={customerId} mode={mode} />
              </TabsContent>
              <TabsContent value="scenarios" className="space-y-4">
                <ScenariosTab customerProductId={customerId} />
              </TabsContent>
              <TabsContent value="insights" className="space-y-4">
                <InsightsTab customerProductId={customerId} />
              </TabsContent>
              <TabsContent value="chatbot" className="space-y-4">
                <FinancialChatbot customerProductId={customerId} />
              </TabsContent>
              <TabsContent value="transactions" className="space-y-4">
                <FinancialTransactions customerProductId={customerId} mode={mode} />
              </TabsContent>
              <TabsContent value="invoices" className="space-y-4">
                <InvoicesHub customerProductId={customerId} />
              </TabsContent>
              <TabsContent value="quotes" className="space-y-4">
                <QuotesTab customerProductId={customerId} />
              </TabsContent>
              <TabsContent value="calendar" className="space-y-4">
                <CashCalendarTab customerProductId={customerId} />
              </TabsContent>
              <TabsContent value="recurring" className="space-y-4">
                <RecurringTab customerProductId={customerId} />
              </TabsContent>
              <TabsContent value="budgets" className="space-y-4">
                <BudgetCategoriesTab customerProductId={customerId} />
              </TabsContent>
              <TabsContent value="dre" className="space-y-4">
                <DRETab customerProductId={customerId} />
              </TabsContent>
              <TabsContent value="taxes" className="space-y-4">
                <TaxCalculatorTab customerProductId={customerId} />
              </TabsContent>
              <TabsContent value="currency" className="space-y-4">
                <MultiCurrencyTab customerProductId={customerId} />
              </TabsContent>
              <TabsContent value="goals" className="space-y-4">
                <FinancialGoals customerProductId={customerId} />
              </TabsContent>
              <TabsContent value="reports" className="space-y-4">
                <FinancialReports customerProductId={customerId} mode={mode} />
              </TabsContent>
              <TabsContent value="settings" className="space-y-4">
                <FinancialSettings customerProductId={customerId} mode={mode} onModeChange={setMode} />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </Financial2FAGate>
  );
}
