import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, Sparkles, Rocket, Crown, ArrowRight, Zap, Star, Gift, ShoppingCart, Calendar } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

export type SubscriptionPlan = 'monthly' | 'semiannual';

export interface Package {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number; // Preço mensal em centavos
  semiannualPrice: number; // Preço semestral (6x) em centavos
  semiannualDiscount: number; // Desconto adicional no semestral
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgGlow: string;
  popular?: boolean;
  products: { name: string; slug: string }[];
  benefits: string[];
}

export const packages: Package[] = [
  {
    id: "empreendedor",
    name: "Pacote Empreendedor",
    description: "Ideal para quem está começando e quer automatizar o básico do negócio",
    monthlyPrice: 59999, // R$ 599,99/mês
    semiannualPrice: 299999, // R$ 2.999,99 semestral
    semiannualDiscount: 17,
    icon: Rocket,
    color: "from-blue-500 to-cyan-500",
    bgGlow: "bg-blue-500/20",
    products: [
      { name: "CRM Simples", slug: "crm-simples" },
      { name: "Gestão de Cobranças", slug: "gestao-cobrancas" },
      { name: "Posts Sociais Automáticos", slug: "posts-sociais" },
    ],
    benefits: [
      "Organize seus clientes",
      "Nunca mais esqueça cobranças",
      "Presença nas redes automatizada"
    ]
  },
  {
    id: "micro-empresario",
    name: "Pacote Micro-Empresário",
    description: "Para quem já tem um negócio rodando e quer escalar com inteligência",
    monthlyPrice: 89999, // R$ 899,99/mês
    semiannualPrice: 419999, // R$ 4.199,99 semestral
    semiannualDiscount: 22,
    icon: Zap,
    color: "from-violet-500 to-purple-600",
    bgGlow: "bg-violet-500/20",
    popular: true,
    products: [
      { name: "CRM Simples", slug: "crm-simples" },
      { name: "Dashboards Personalizados", slug: "dashboards-personalizados" },
      { name: "Relatórios Financeiros", slug: "relatorios-financeiros" },
      { name: "Fidelidade Digital", slug: "fidelidade-digital" },
      { name: "Assistente de Vendas IA", slug: "assistente-vendas" },
    ],
    benefits: [
      "Visão completa do negócio",
      "Relatórios automáticos",
      "Clientes fiéis e recorrentes",
      "IA vendendo por você"
    ]
  },
  {
    id: "especial",
    name: "Pacote Especial StarAI",
    description: "O melhor da StarAI: automação completa com IA de ponta para dominar o mercado",
    monthlyPrice: 200000, // R$ 2.000,00/mês
    semiannualPrice: 899999, // R$ 8.999,99 semestral
    semiannualDiscount: 25,
    icon: Crown,
    color: "from-amber-400 via-orange-500 to-red-500",
    bgGlow: "bg-amber-500/20",
    products: [
      { name: "CRM Simples", slug: "crm-simples" },
      { name: "Dashboards Personalizados", slug: "dashboards-personalizados" },
      { name: "Relatórios Financeiros", slug: "relatorios-financeiros" },
      { name: "Fidelidade Digital", slug: "fidelidade-digital" },
      { name: "Bot WhatsApp com IA", slug: "bots-automacao" },
      { name: "Assistente de Vendas IA", slug: "assistente-vendas" },
      { name: "Agente Financeiro IA", slug: "agente-financeiro" },
    ],
    benefits: [
      "Atendimento 24/7 no WhatsApp",
      "Vendas no piloto automático",
      "Finanças organizadas com IA",
      "Automação completa do negócio"
    ]
  }
];

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(priceInCents / 100);
}

function PackageCard({ pkg, selectedPlan, onPlanChange, onAddToCart }: {
  pkg: Package;
  selectedPlan: SubscriptionPlan;
  onPlanChange: (plan: SubscriptionPlan) => void;
  onAddToCart: () => void;
}) {
  const isMonthly = selectedPlan === 'monthly';
  const currentPrice = isMonthly ? pkg.monthlyPrice : pkg.semiannualPrice;
  const monthlyEquivalent = isMonthly ? pkg.monthlyPrice : Math.round(pkg.semiannualPrice / 6);
  const totalMonthlyIfSemiannual = pkg.monthlyPrice * 6;

  return (
    <Card className={`relative h-full overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${pkg.popular ? 'ring-2 ring-primary shadow-xl' : ''}`}>
      {/* Glow effect */}
      <div className={`absolute top-0 right-0 w-64 h-64 ${pkg.bgGlow} rounded-full blur-3xl -translate-y-1/2 translate-x-1/2`} />
      
      {pkg.popular && (
        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 z-20">
          <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-1 shadow-lg rounded-t-none">
            <Star className="w-3 h-3 mr-1 fill-current" />
            Mais Popular
          </Badge>
        </div>
      )}
      
      <CardHeader className="relative z-10 pb-4 pt-8">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${pkg.color} flex items-center justify-center mb-4 shadow-lg`}>
          <pkg.icon className="w-7 h-7 text-white" />
        </div>
        
        <CardTitle className="text-2xl font-bold">{pkg.name}</CardTitle>
        <CardDescription className="text-base">{pkg.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="relative z-10 space-y-6">
        {/* Toggle Mensal/Semestral */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => onPlanChange('monthly')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              isMonthly 
                ? 'bg-background shadow-sm text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => onPlanChange('semiannual')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all relative ${
              !isMonthly 
                ? 'bg-background shadow-sm text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Semestral
            {pkg.semiannualDiscount > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                -{pkg.semiannualDiscount}%
              </span>
            )}
          </button>
        </div>

        {/* Preços */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {formatPrice(monthlyEquivalent)}
            </span>
            <span className="text-muted-foreground text-sm">/mês</span>
          </div>
          
          {!isMonthly && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(totalMonthlyIfSemiannual)}
                </span>
                <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                  Economia de {formatPrice(totalMonthlyIfSemiannual - pkg.semiannualPrice)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Total: {formatPrice(currentPrice)} (6 meses)
              </p>
            </div>
          )}
          
          {isMonthly && (
            <p className="text-xs text-muted-foreground">
              Cobrado mensalmente. Cancele quando quiser.
            </p>
          )}
        </div>

        {/* Produtos inclusos */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {pkg.products.length} produtos inclusos:
          </p>
          <ul className="space-y-2">
            {pkg.products.map((product) => (
              <li key={product.slug} className="flex items-center gap-2 text-sm">
                <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${pkg.color} flex items-center justify-center flex-shrink-0`}>
                  <Check className="w-3 h-3 text-white" />
                </div>
                <Link 
                  to={`/p/${product.slug}`} 
                  className="hover:text-primary transition-colors hover:underline"
                >
                  {product.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Benefícios */}
        <div className="space-y-2 pt-4 border-t border-border/50">
          {pkg.benefits.map((benefit, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
              {benefit}
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button 
          className={`w-full group ${pkg.popular ? 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700' : ''}`}
          variant={pkg.popular ? "default" : "outline"}
          size="lg"
          onClick={onAddToCart}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Adicionar ao carrinho
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function PackagesSection() {
  const [selectedPlans, setSelectedPlans] = useState<Record<string, SubscriptionPlan>>({
    empreendedor: 'monthly',
    'micro-empresario': 'monthly',
    especial: 'monthly'
  });
  const { addItem } = useCart();
  const navigate = useNavigate();

  const handlePlanChange = (packageId: string, plan: SubscriptionPlan) => {
    setSelectedPlans(prev => ({ ...prev, [packageId]: plan }));
  };

  const handleAddToCart = (pkg: Package) => {
    const plan = selectedPlans[pkg.id];
    const isMonthly = plan === 'monthly';
    const price = isMonthly ? pkg.monthlyPrice : pkg.semiannualPrice;
    const planLabel = isMonthly ? 'Mensal' : 'Semestral (6 meses)';

    addItem({
      slug: `pacote-${pkg.id}`,
      title: `${pkg.name} - ${planLabel}`,
      price,
      image: undefined,
      acquisitionType: 'subscription',
      isPackage: true,
      packageId: pkg.id,
      subscriptionPlan: plan,
      includedProducts: pkg.products,
      rentalMonths: isMonthly ? 1 : 6
    });

    toast.success(
      <div className="flex flex-col gap-1">
        <span className="font-semibold">{pkg.name} adicionado!</span>
        <span className="text-sm text-muted-foreground">Plano {planLabel}</span>
      </div>,
      {
        action: {
          label: "Ver carrinho",
          onClick: () => navigate('/carrinho')
        }
      }
    );
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm">
            <Gift className="w-4 h-4 mr-2" />
            Promoção Especial de Natal
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Pacotes <span className="gradient-text">de Assinatura</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Escolha o plano ideal para seu negócio. Economize até 27% no plano semestral!
          </p>
        </motion.div>

        {/* Info de economia */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex justify-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Economize até 27% escolhendo o plano semestral
          </div>
        </motion.div>

        {/* Pacotes */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <PackageCard
                pkg={pkg}
                selectedPlan={selectedPlans[pkg.id]}
                onPlanChange={(plan) => handlePlanChange(pkg.id, plan)}
                onAddToCart={() => handleAddToCart(pkg)}
              />
            </motion.div>
          ))}
        </div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground">
            Precisa de algo personalizado? {" "}
            <Link to="/sobre" className="text-primary hover:underline font-medium">
              Fale conosco
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
