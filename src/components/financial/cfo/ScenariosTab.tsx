import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Area, AreaChart, CartesianGrid, Legend, ReferenceLine,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Briefcase, Building2,
  Calendar, ChevronDown, ChevronUp, Copy, DollarSign, Eye, EyeOff,
  FileDown, Flame, Gauge, HandCoins, Lightbulb, Megaphone, Package,
  Percent, PiggyBank, Plus, Rocket, Save, Sparkles, Target, Trash2,
  TrendingDown, TrendingUp, Users, Wand2, Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Props {
  customerProductId: string;
}

type ScenarioType = "hire" | "expense" | "revenue" | "investment" | "saving" | "loan" | "tax";

interface Scenario {
  id: string;
  name: string;
  monthly_impact: number;
  start_in_months: number;
  duration_months: number | null;
  type: ScenarioType;
  enabled: boolean;
  category?: string;
  notes?: string;
}

const TYPE_META: Record<ScenarioType, { label: string; icon: any; tone: string; bg: string; ring: string; sign: 1 | -1 }> = {
  hire:       { label: "Contratação",   icon: Users,      tone: "text-rose-400",    bg: "bg-rose-500/10",    ring: "ring-rose-500/30",    sign: -1 },
  expense:    { label: "Despesa",       icon: ArrowDownRight, tone: "text-rose-400",    bg: "bg-rose-500/10",    ring: "ring-rose-500/30",    sign: -1 },
  revenue:    { label: "Receita",       icon: ArrowUpRight,   tone: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30", sign:  1 },
  investment: { label: "Investimento",  icon: Rocket,     tone: "text-amber-400",   bg: "bg-amber-500/10",   ring: "ring-amber-500/30",   sign: -1 },
  saving:     { label: "Economia",      icon: PiggyBank,  tone: "text-cyan-400",    bg: "bg-cyan-500/10",    ring: "ring-cyan-500/30",    sign:  1 },
  loan:       { label: "Empréstimo",    icon: HandCoins,  tone: "text-violet-400",  bg: "bg-violet-500/10",  ring: "ring-violet-500/30",  sign: -1 },
  tax:        { label: "Imposto",       icon: Percent,    tone: "text-orange-400",  bg: "bg-orange-500/10",  ring: "ring-orange-500/30",  sign: -1 },
};

interface PresetTemplate {
  category: string;
  icon: any;
  items: Omit<Scenario, "id" | "enabled">[];
}

const TEMPLATE_LIBRARY: PresetTemplate[] = [
  {
    category: "Equipe",
    icon: Users,
    items: [
      { name: "Contratar Dev Pleno (CLT)", monthly_impact: -8500, start_in_months: 1, duration_months: null, type: "hire", category: "Equipe" },
      { name: "Contratar Dev Sênior", monthly_impact: -14000, start_in_months: 2, duration_months: null, type: "hire", category: "Equipe" },
      { name: "Estagiário", monthly_impact: -2200, start_in_months: 1, duration_months: 12, type: "hire", category: "Equipe" },
      { name: "Vendedor + Comissão", monthly_impact: -5500, start_in_months: 1, duration_months: null, type: "hire", category: "Equipe" },
      { name: "Reajuste salarial 10%", monthly_impact: -3000, start_in_months: 3, duration_months: null, type: "expense", category: "Equipe" },
    ],
  },
  {
    category: "Marketing",
    icon: Megaphone,
    items: [
      { name: "Campanha Google Ads", monthly_impact: -3000, start_in_months: 0, duration_months: 3, type: "expense", category: "Marketing" },
      { name: "Influencer parceria", monthly_impact: -5000, start_in_months: 1, duration_months: 2, type: "investment", category: "Marketing" },
      { name: "Anúncios Meta Ads", monthly_impact: -2500, start_in_months: 0, duration_months: 6, type: "expense", category: "Marketing" },
      { name: "SEO + Conteúdo", monthly_impact: -1800, start_in_months: 0, duration_months: null, type: "expense", category: "Marketing" },
    ],
  },
  {
    category: "Receita",
    icon: TrendingUp,
    items: [
      { name: "Cliente recorrente B2B", monthly_impact: 5000, start_in_months: 1, duration_months: null, type: "revenue", category: "Receita" },
      { name: "Lançamento novo produto", monthly_impact: 15000, start_in_months: 3, duration_months: null, type: "revenue", category: "Receita" },
      { name: "Aumento de preço 10%", monthly_impact: 4000, start_in_months: 1, duration_months: null, type: "revenue", category: "Receita" },
      { name: "Parceria afiliados", monthly_impact: 2500, start_in_months: 2, duration_months: null, type: "revenue", category: "Receita" },
    ],
  },
  {
    category: "Otimização",
    icon: PiggyBank,
    items: [
      { name: "Cancelar SaaS ociosos", monthly_impact: 800, start_in_months: 0, duration_months: null, type: "saving", category: "Otimização" },
      { name: "Renegociar fornecedores", monthly_impact: 1500, start_in_months: 1, duration_months: null, type: "saving", category: "Otimização" },
      { name: "Migrar para cloud barato", monthly_impact: 600, start_in_months: 1, duration_months: null, type: "saving", category: "Otimização" },
      { name: "Reduzir aluguel (home office)", monthly_impact: 3500, start_in_months: 2, duration_months: null, type: "saving", category: "Otimização" },
    ],
  },
  {
    category: "Capital",
    icon: Building2,
    items: [
      { name: "Empréstimo bancário", monthly_impact: -2500, start_in_months: 1, duration_months: 24, type: "loan", category: "Capital" },
      { name: "Aporte de sócios", monthly_impact: 50000, start_in_months: 0, duration_months: 1, type: "revenue", category: "Capital" },
      { name: "Investimento em equipamento", monthly_impact: -15000, start_in_months: 0, duration_months: 1, type: "investment", category: "Capital" },
      { name: "Aumento Simples Nacional", monthly_impact: -1200, start_in_months: 0, duration_months: null, type: "tax", category: "Capital" },
    ],
  },
];

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtBRLShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
  return `R$ ${n.toFixed(0)}`;
};

export function ScenariosTab({ customerProductId }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [horizon, setHorizon] = useState(12);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showBaseline, setShowBaseline] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Equipe");
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const { toast } = useToast();

  const enabledScenarios = useMemo(() => scenarios.filter((s) => s.enabled), [scenarios]);

  const totals = useMemo(() => {
    const monthly = enabledScenarios.reduce((acc, s) => acc + s.monthly_impact, 0);
    const positive = enabledScenarios.filter((s) => s.monthly_impact > 0).reduce((a, s) => a + s.monthly_impact, 0);
    const negative = enabledScenarios.filter((s) => s.monthly_impact < 0).reduce((a, s) => a + s.monthly_impact, 0);
    return { monthly, positive, negative, count: enabledScenarios.length };
  }, [enabledScenarios]);

  const addScenario = (preset?: Omit<Scenario, "id" | "enabled">) => {
    const base: Scenario = preset
      ? { ...preset, id: crypto.randomUUID(), enabled: true }
      : {
          id: crypto.randomUUID(),
          name: "Nova simulação",
          monthly_impact: -1000,
          start_in_months: 1,
          duration_months: null,
          type: "expense",
          enabled: true,
        };
    setScenarios((s) => [...s, base]);
    toast({ title: "Cenário adicionado", description: base.name });
  };

  const updateScenario = (id: string, patch: Partial<Scenario>) => {
    setScenarios((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const removeScenario = (id: string) => {
    setScenarios((s) => s.filter((x) => x.id !== id));
  };

  const duplicateScenario = (id: string) => {
    const orig = scenarios.find((s) => s.id === id);
    if (!orig) return;
    setScenarios((s) => [...s, { ...orig, id: crypto.randomUUID(), name: `${orig.name} (cópia)` }]);
  };

  const toggleAll = (enabled: boolean) => {
    setScenarios((s) => s.map((x) => ({ ...x, enabled })));
  };

  const runSimulation = async (withAi = false) => {
    if (enabledScenarios.length === 0) {
      toast({ title: "Adicione um cenário", description: "Crie ao menos um cenário ativo para simular.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("financial-predict", {
        body: {
          customer_product_id: customerProductId,
          horizon_months: horizon,
          scenarios: enabledScenarios.map(({ id, enabled, ...rest }) => rest),
          mode: withAi ? "analysis" : "forecast",
        },
      });
      console.log("financial-predict invoke result", { data, error, customerProductId, horizon, scenarios: enabledScenarios.length, withAi });
      if (error) throw error;
      if (data?.error === "rate_limited") {
        toast({ title: "Limite da IA atingido", description: "Tente novamente em alguns minutos.", variant: "destructive" });
        return;
      }
      setResult(data);
      toast({ title: "Simulação concluída", description: `${horizon} meses projetados com ${enabledScenarios.length} cenário(s).` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro na simulação", description: e?.message || "Falha ao projetar cenário", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ scenarios, horizon, generated_at: new Date().toISOString() }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cenarios-cfo-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = result
    ? result.baseline.map((b: any, i: number) => ({
        month: b.month.slice(5),
        baseline: Math.round(b.balance),
        scenario: Math.round(result.scenario[i]?.balance ?? 0),
        delta: Math.round((result.scenario[i]?.balance ?? 0) - b.balance),
      }))
    : [];

  const m = result?.metrics;
  const finalBaseline = result?.baseline?.[result.baseline.length - 1]?.balance ?? 0;
  const finalScenario = result?.scenario?.[result.scenario.length - 1]?.balance ?? 0;
  const totalDelta = finalScenario - finalBaseline;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-5">
        {/* HERO HEADER */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/60 to-card/40 p-5 backdrop-blur">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.15),transparent_60%)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-primary/15 p-2 ring-1 ring-primary/30">
                  <Wand2 className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Simulador de Cenários</h2>
                <Badge variant="secondary" className="ml-1 gap-1">
                  <Sparkles className="h-3 w-3" /> CFO Virtual
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Projete decisões estratégicas — contratações, investimentos, novas receitas — e visualize o impacto no seu caixa em tempo real.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label className="text-xs text-muted-foreground">Horizonte</Label>
                <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v))}>
                  <SelectTrigger className="h-7 w-24 border-0 bg-transparent text-xs focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 meses</SelectItem>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">12 meses</SelectItem>
                    <SelectItem value="24">24 meses</SelectItem>
                    <SelectItem value="36">36 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={exportJSON} disabled={scenarios.length === 0} className="h-9 w-9">
                    <FileDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar cenários (JSON)</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Quick stats */}
          {totals.count > 0 && (
            <div className="relative mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
              <StatPill icon={Target} label="Cenários ativos" value={String(totals.count)} tone="primary" />
              <StatPill icon={ArrowUpRight} label="Receitas/mês" value={fmtBRLShort(totals.positive)} tone="emerald" />
              <StatPill icon={ArrowDownRight} label="Custos/mês" value={fmtBRLShort(totals.negative)} tone="rose" />
              <StatPill
                icon={totals.monthly >= 0 ? TrendingUp : TrendingDown}
                label="Impacto líquido/mês"
                value={fmtBRLShort(totals.monthly)}
                tone={totals.monthly >= 0 ? "emerald" : "rose"}
              />
            </div>
          )}
        </div>

        {/* TEMPLATE LIBRARY */}
        <Card className="overflow-hidden border-border/60 bg-card/40 backdrop-blur">
          <div className="border-b border-border/60 bg-gradient-to-r from-card/60 to-transparent px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold">Biblioteca de Templates</h3>
                <Badge variant="outline" className="text-[10px]">Toque para adicionar</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => addScenario()} className="h-8 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Personalizado
              </Button>
            </div>
          </div>

          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-border/40 bg-transparent p-2">
              {TEMPLATE_LIBRARY.map((cat) => {
                const Icon = cat.icon;
                return (
                  <TabsTrigger
                    key={cat.category}
                    value={cat.category}
                    className="gap-1.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
                  >
                    <Icon className="h-3.5 w-3.5" /> {cat.category}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {TEMPLATE_LIBRARY.map((cat) => (
              <TabsContent key={cat.category} value={cat.category} className="m-0 p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {cat.items.map((item, i) => {
                    const meta = TYPE_META[item.type];
                    const Icon = meta.icon;
                    const positive = item.monthly_impact > 0;
                    return (
                      <button
                        key={i}
                        onClick={() => addScenario(item)}
                        className={cn(
                          "group relative flex items-start gap-3 rounded-xl border border-border/50 bg-background/50 p-3 text-left transition-all",
                          "hover:border-primary/40 hover:bg-background/80 hover:shadow-md hover:-translate-y-0.5"
                        )}
                      >
                        <div className={cn("rounded-lg p-2 ring-1", meta.bg, meta.ring)}>
                          <Icon className={cn("h-4 w-4", meta.tone)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium leading-tight truncate">{item.name}</div>
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <span className={cn("font-semibold", positive ? "text-emerald-400" : "text-rose-400")}>
                              {positive ? "+" : ""}{fmtBRLShort(item.monthly_impact)}/mês
                            </span>
                            {item.duration_months && (
                              <span className="text-muted-foreground">• {item.duration_months}m</span>
                            )}
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </Card>

        {/* ACTIVE SCENARIOS */}
        {scenarios.length > 0 && (
          <Card className="border-border/60 bg-card/40 backdrop-blur">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Cenários no plano</h3>
                <Badge variant="secondary" className="text-[10px]">{scenarios.length}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => toggleAll(true)} className="h-7 text-xs">
                  <Eye className="h-3 w-3 mr-1" /> Ativar todos
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleAll(false)} className="h-7 text-xs">
                  <EyeOff className="h-3 w-3 mr-1" /> Desativar
                </Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button variant="ghost" size="sm" onClick={() => setScenarios([])} className="h-7 text-xs text-rose-400 hover:text-rose-500">
                  <Trash2 className="h-3 w-3 mr-1" /> Limpar
                </Button>
              </div>
            </div>

            <div className="divide-y divide-border/40">
              {scenarios.map((s) => {
                const meta = TYPE_META[s.type];
                const Icon = meta.icon;
                const isExpanded = expandedScenario === s.id;
                const positive = s.monthly_impact > 0;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "transition-colors",
                      s.enabled ? "bg-transparent" : "bg-muted/20 opacity-60"
                    )}
                  >
                    {/* Compact row */}
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <Switch
                        checked={s.enabled}
                        onCheckedChange={(v) => updateScenario(s.id, { enabled: v })}
                      />
                      <div className={cn("rounded-lg p-1.5 ring-1 shrink-0", meta.bg, meta.ring)}>
                        <Icon className={cn("h-4 w-4", meta.tone)} />
                      </div>
                      <Input
                        value={s.name}
                        onChange={(e) => updateScenario(s.id, { name: e.target.value })}
                        className="h-8 flex-1 border-0 bg-transparent px-1 font-medium focus-visible:ring-1"
                      />
                      <div className={cn("text-sm font-bold tabular-nums shrink-0 px-2", positive ? "text-emerald-400" : "text-rose-400")}>
                        {positive ? "+" : ""}{fmtBRL(s.monthly_impact)}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:inline-flex">
                        {s.start_in_months === 0 ? "Imediato" : `M+${s.start_in_months}`}
                        {s.duration_months ? ` · ${s.duration_months}m` : " · ∞"}
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setExpandedScenario(isExpanded ? null : s.id)}
                            className="h-7 w-7"
                          >
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{isExpanded ? "Recolher" : "Editar detalhes"}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => duplicateScenario(s.id)} className="h-7 w-7">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Duplicar</TooltipContent>
                      </Tooltip>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeScenario(s.id)}
                        className="h-7 w-7 text-rose-400 hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Expanded editor */}
                    {isExpanded && (
                      <div className="border-t border-border/40 bg-background/40 px-4 py-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Tipo</Label>
                            <Select value={s.type} onValueChange={(v: any) => updateScenario(s.id, { type: v })}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(TYPE_META).map(([k, v]) => {
                                  const I = v.icon;
                                  return (
                                    <SelectItem key={k} value={k}>
                                      <span className="flex items-center gap-2">
                                        <I className={cn("h-3.5 w-3.5", v.tone)} />
                                        {v.label}
                                      </span>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Início (meses)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={s.start_in_months}
                              onChange={(e) => updateScenario(s.id, { start_in_months: Number(e.target.value) })}
                              className="h-9"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Duração (vazio = ∞)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={s.duration_months ?? ""}
                              onChange={(e) =>
                                updateScenario(s.id, { duration_months: e.target.value ? Number(e.target.value) : null })
                              }
                              className="h-9"
                              placeholder="Recorrente"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Impacto mensal</Label>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                type="number"
                                value={s.monthly_impact}
                                onChange={(e) => updateScenario(s.id, { monthly_impact: Number(e.target.value) })}
                                className="h-8 w-32 text-right tabular-nums"
                              />
                            </div>
                          </div>
                          <Slider
                            value={[s.monthly_impact]}
                            onValueChange={([v]) => updateScenario(s.id, { monthly_impact: v })}
                            min={-50000}
                            max={50000}
                            step={100}
                            className="py-1"
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                            <span>-R$ 50k</span>
                            <span>0</span>
                            <span>+R$ 50k</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer with totals */}
            <div className="border-t border-border/60 bg-gradient-to-r from-card/60 to-transparent px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Impacto líquido combinado:{" "}
                  <span className={cn("font-bold text-base", totals.monthly >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {totals.monthly >= 0 ? "+" : ""}{fmtBRL(totals.monthly)}/mês
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => runSimulation(false)} disabled={loading} className="gap-2 h-9">
                    <Gauge className="h-4 w-4" />
                    {loading ? "Simulando..." : "Simular impacto"}
                  </Button>
                  <Button
                    onClick={() => runSimulation(true)}
                    disabled={loading}
                    variant="secondary"
                    className="gap-2 h-9 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 hover:from-primary/30"
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
                    {loading ? "Analisando..." : "Análise IA Completa"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* RESULTS */}
        {result && (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard
                icon={DollarSign}
                label="Saldo atual"
                value={fmtBRL(m.current_balance)}
                tone="cyan"
              />
              <KpiCard
                icon={Flame}
                label="Burn rate"
                value={`${fmtBRL(Math.abs(m.burn_rate))}/mês`}
                tone={m.burn_rate > 0 ? "rose" : "emerald"}
              />
              <KpiCard
                icon={Gauge}
                label="Runway"
                value={m.runway_months ? `${m.runway_months} meses` : "∞ Saudável"}
                tone={m.runway_months && m.runway_months < 6 ? "rose" : "emerald"}
                hint={m.runway_months && m.runway_months < 6 ? "Atenção: caixa baixo" : undefined}
              />
              <KpiCard
                icon={totalDelta >= 0 ? TrendingUp : TrendingDown}
                label="Δ vs Baseline"
                value={`${totalDelta >= 0 ? "+" : ""}${fmtBRLShort(totalDelta)}`}
                tone={totalDelta >= 0 ? "emerald" : "rose"}
                hint={`Saldo final: ${fmtBRLShort(finalScenario)}`}
              />
            </div>

            {/* Insolvency alert */}
            {(m.scenario_insolvency_month || m.baseline_insolvency_month) && (
              <Card className="border-rose-500/40 bg-gradient-to-r from-rose-500/10 to-rose-500/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-rose-500/20 p-2 ring-1 ring-rose-500/40">
                    <AlertTriangle className="h-5 w-5 text-rose-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-semibold text-rose-400">⚠ Risco de insolvência detectado</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {m.baseline_insolvency_month && (
                        <p>• <strong>Cenário base:</strong> caixa fica negativo em <span className="text-rose-300 font-semibold">{m.baseline_insolvency_month}</span></p>
                      )}
                      {m.scenario_insolvency_month && enabledScenarios.length > 0 && (
                        <p>• <strong>Com cenários:</strong> caixa fica negativo em <span className="text-rose-300 font-semibold">{m.scenario_insolvency_month}</span></p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Chart */}
            <Card className="border-border/60 bg-card/40 backdrop-blur p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" /> Projeção comparativa de caixa
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {horizon} meses • baseline (sem cenários) vs cenário (com simulações)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Mostrar baseline</Label>
                  <Switch checked={showBaseline} onCheckedChange={setShowBaseline} />
                </div>
              </div>

              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={chartData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="g-base" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g-scen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={fmtBRLShort} width={70} />
                  <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" opacity={0.5} />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: any) => fmtBRL(Number(v))}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {showBaseline && (
                    <Area
                      type="monotone"
                      dataKey="baseline"
                      name="Baseline"
                      stroke="hsl(217 91% 60%)"
                      fill="url(#g-base)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="scenario"
                    name="Com cenários"
                    stroke="hsl(var(--primary))"
                    fill="url(#g-scen)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* AI Analysis */}
            {result.ai_analysis && (
              <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card/40 to-transparent p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-lg bg-primary/20 p-1.5 ring-1 ring-primary/40">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold">Análise estratégica do CFO Virtual</h3>
                  <Badge variant="secondary" className="ml-auto text-[10px] gap-1">
                    <Zap className="h-3 w-3" /> IA
                  </Badge>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-headings:text-primary prose-p:my-2 prose-ul:my-2 prose-strong:text-foreground">
                  <ReactMarkdown>{result.ai_analysis}</ReactMarkdown>
                </div>
              </Card>
            )}
          </>
        )}

        {/* EMPTY STATE */}
        {!result && scenarios.length === 0 && (
          <Card className="border-dashed border-2 border-border/60 bg-card/20 p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center mb-4">
              <Wand2 className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Comece sua simulação</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Escolha templates da biblioteca acima ou crie um cenário personalizado para projetar o impacto financeiro de suas decisões estratégicas.
            </p>
            <Button onClick={() => addScenario()} className="gap-2">
              <Plus className="h-4 w-4" /> Criar primeiro cenário
            </Button>
          </Card>
        )}

        {!result && scenarios.length > 0 && (
          <Card className="border-dashed border-border/60 bg-card/20 p-8 text-center">
            <Gauge className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Você tem {scenarios.length} cenário(s) configurado(s). Clique em <strong>Simular impacto</strong> para ver a projeção.
            </p>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}

function StatPill({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "primary" | "emerald" | "rose" | "amber" }) {
  const tones = {
    primary: "text-primary bg-primary/10 ring-primary/30",
    emerald: "text-emerald-400 bg-emerald-500/10 ring-emerald-500/30",
    rose: "text-rose-400 bg-rose-500/10 ring-rose-500/30",
    amber: "text-amber-400 bg-amber-500/10 ring-amber-500/30",
  }[tone];
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-background/40 px-3 py-2 backdrop-blur">
      <div className={cn("rounded-lg p-1.5 ring-1", tones)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{label}</div>
        <div className="text-sm font-bold tabular-nums truncate">{value}</div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: any;
  label: string;
  value: string;
  tone: "cyan" | "emerald" | "rose" | "amber";
  hint?: string;
}) {
  const tones = {
    cyan: "text-cyan-400 ring-cyan-500/30 bg-cyan-500/5",
    emerald: "text-emerald-400 ring-emerald-500/30 bg-emerald-500/5",
    rose: "text-rose-400 ring-rose-500/30 bg-rose-500/5",
    amber: "text-amber-400 ring-amber-500/30 bg-amber-500/5",
  }[tone];
  return (
    <Card className={cn("p-4 border bg-card/40 backdrop-blur ring-1", tones)}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <Icon className={cn("h-4 w-4", tones.split(" ")[0])} />
      </div>
      <div className={cn("text-2xl font-bold tabular-nums leading-tight", tones.split(" ")[0])}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1.5 truncate">{hint}</div>}
    </Card>
  );
}
