import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  PieChart, Plus, Sparkles, AlertTriangle, CheckCircle2, TrendingUp,
  Megaphone, Users, Building, Truck, Coffee, Zap, ShoppingCart, Briefcase,
  Wallet, Edit3, Trash2, Target,
} from "lucide-react";

interface Props { customerProductId: string }

interface Cat {
  id: string; name: string; icon: any; color: string;
  budget: number; spent: number;
}

const MOCK: Cat[] = [
  { id: "1", name: "Marketing & Anúncios", icon: Megaphone, color: "from-pink-500 to-rose-500", budget: 5000, spent: 4720 },
  { id: "2", name: "Folha de Pagamento", icon: Users, color: "from-blue-500 to-indigo-500", budget: 18000, spent: 18000 },
  { id: "3", name: "Aluguel & Estrutura", icon: Building, color: "from-amber-500 to-orange-500", budget: 4500, spent: 4500 },
  { id: "4", name: "Logística & Frete", icon: Truck, color: "from-emerald-500 to-teal-500", budget: 2200, spent: 1340 },
  { id: "5", name: "Alimentação & Café", icon: Coffee, color: "from-orange-400 to-red-500", budget: 800, spent: 612 },
  { id: "6", name: "Energia & Internet", icon: Zap, color: "from-yellow-500 to-amber-500", budget: 1500, spent: 1820 },
  { id: "7", name: "Insumos & Estoque", icon: ShoppingCart, color: "from-violet-500 to-purple-500", budget: 6000, spent: 3210 },
  { id: "8", name: "Serviços Profissionais", icon: Briefcase, color: "from-cyan-500 to-blue-500", budget: 3000, spent: 2400 },
];

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function BudgetCategoriesTab({ customerProductId: _ }: Props) {
  const [cats] = useState<Cat[]>(MOCK);

  const totals = useMemo(() => {
    const budget = cats.reduce((a, c) => a + c.budget, 0);
    const spent = cats.reduce((a, c) => a + c.spent, 0);
    const pct = budget ? (spent / budget) * 100 : 0;
    const exceeded = cats.filter((c) => c.spent > c.budget).length;
    const warning = cats.filter((c) => c.spent / c.budget >= 0.8 && c.spent <= c.budget).length;
    return { budget, spent, pct, exceeded, warning };
  }, [cats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-violet-500/10 via-background to-fuchsia-500/10 p-6">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-violet-500 text-xs font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider">Orçamentos Inteligentes</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Categorias & Limites</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-xl">
              Defina um teto mensal para cada categoria. A IA monitora gastos em tempo real e alerta antes do estouro.
            </p>
          </div>
          <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0 hover:opacity-90 shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Nova Categoria
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={Wallet} label="Orçamento Total" value={fmtBRL(totals.budget)} tone="text-foreground" />
        <KPI icon={TrendingUp} label="Gasto no Mês" value={fmtBRL(totals.spent)} tone="text-violet-500" />
        <KPI icon={AlertTriangle} label="Estouradas" value={String(totals.exceeded)} tone="text-rose-500" />
        <KPI icon={CheckCircle2} label="Próx. do limite" value={String(totals.warning)} tone="text-amber-500" />
      </div>

      {/* Global progress */}
      <Card className="p-5 border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <PieChart className="w-4 h-4 text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">Consumo Geral do Mês</p>
              <p className="text-xs text-muted-foreground">{totals.pct.toFixed(1)}% do orçamento utilizado</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">Abril 2026</Badge>
        </div>
        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 rounded-full transition-all"
            style={{ width: `${Math.min(totals.pct, 100)}%` }}
          />
        </div>
      </Card>

      {/* Categories grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {cats.map((c) => {
          const pct = (c.spent / c.budget) * 100;
          const status = pct >= 100 ? "exceeded" : pct >= 80 ? "warning" : "ok";
          const Icon = c.icon;
          return (
            <Card key={c.id} className="group relative p-5 border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all overflow-hidden">
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${c.color}`} />
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center shrink-0 shadow-md`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">Mensal · renovação dia 1</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-7 w-7"><Edit3 className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <span className="text-2xl font-bold">{fmtBRL(c.spent)}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">/ {fmtBRL(c.budget)}</span>
                </div>
                <Badge
                  className={
                    status === "exceeded" ? "bg-rose-500/15 text-rose-500 border-rose-500/30 hover:bg-rose-500/20"
                    : status === "warning" ? "bg-amber-500/15 text-amber-500 border-amber-500/30 hover:bg-amber-500/20"
                    : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20"
                  }
                  variant="outline"
                >
                  {pct.toFixed(0)}%
                </Badge>
              </div>

              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                    status === "exceeded" ? "bg-gradient-to-r from-rose-500 to-red-600"
                    : status === "warning" ? "bg-gradient-to-r from-amber-400 to-orange-500"
                    : `bg-gradient-to-r ${c.color}`
                  }`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>

              {status === "exceeded" && (
                <div className="mt-3 flex items-center gap-2 text-xs text-rose-500 bg-rose-500/5 border border-rose-500/20 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Estourou em {fmtBRL(c.spent - c.budget)} este mês</span>
                </div>
              )}
              {status === "warning" && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-500 bg-amber-500/5 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  <span>{fmtBRL(c.budget - c.spent)} restantes — atenção</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, tone }: any) {
  return (
    <Card className="p-4 border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`w-3.5 h-3.5 ${tone}`} />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className={`text-xl font-bold ${tone}`}>{value}</p>
    </Card>
  );
}
