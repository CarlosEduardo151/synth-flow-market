import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  PieChart, Plus, Sparkles, AlertTriangle, CheckCircle2, TrendingUp,
  Wallet, Trash2, Target, Loader2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props { customerProductId: string }

interface Cat {
  id: string;
  name: string;
  budget_amount: number;
  color: string;
  spent: number;
}

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const COLORS = [
  "from-pink-500 to-rose-500",
  "from-blue-500 to-indigo-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-violet-500 to-purple-500",
  "from-cyan-500 to-blue-500",
  "from-yellow-500 to-amber-500",
];

export function BudgetCategoriesTab({ customerProductId }: Props) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", budget_amount: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    // Tenta ler de financial_budgets; se a tabela não existir o erro será tratado.
    const { data: budgets, error } = await (supabase as any)
      .from("financial_budgets")
      .select("id, name, budget_amount, color, category, alert_threshold")
      .eq("customer_product_id", customerProductId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
      setCats([]);
      setLoading(false);
      return;
    }

    // Calcular gasto do mês por categoria a partir das transações
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const { data: txs } = await supabase
      .from("financial_agent_transactions")
      .select("amount, description, type")
      .eq("customer_product_id", customerProductId)
      .neq("type", "income")
      .gte("date", start)
      .lte("date", end);

    const enriched: Cat[] = (budgets ?? []).map((b: any) => {
      const nameLower = (b.name || "").toLowerCase();
      const spent = (txs ?? [])
        .filter((t) => (t.description || "").toLowerCase().includes(nameLower))
        .reduce((a, t) => a + Number(t.amount), 0);
      return { ...b, budget_amount: Number(b.budget_amount), spent };
    });

    setCats(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, [customerProductId]);

  const totals = useMemo(() => {
    const budget = cats.reduce((a, c) => a + c.budget_amount, 0);
    const spent = cats.reduce((a, c) => a + c.spent, 0);
    const pct = budget ? (spent / budget) * 100 : 0;
    const exceeded = cats.filter((c) => c.spent > c.budget_amount).length;
    const warning = cats.filter((c) => c.spent / c.budget_amount >= 0.8 && c.spent <= c.budget_amount).length;
    return { budget, spent, pct, exceeded, warning };
  }, [cats]);

  const handleSave = async () => {
    if (!form.name || !form.budget_amount) {
      toast({ title: "Preencha os campos", variant: "destructive" });
      return;
    }
    setSaving(true);
    const colorClass = COLORS[cats.length % COLORS.length];
    const { error } = await (supabase as any).from("financial_budgets").insert({
      customer_product_id: customerProductId,
      name: form.name,
      category: form.name,
      budget_amount: Number(form.budget_amount),
      color: colorClass,
      period: "monthly",
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Orçamento criado" });
      setOpen(false);
      setForm({ name: "", budget_amount: "" });
      load();
    }
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("financial_budgets").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <div className="space-y-6">
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
              Defina um teto mensal para cada categoria. Os gastos são calculados a partir das suas transações reais.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0 hover:opacity-90 shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova categoria de orçamento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Nome (também usado para casar com transações)</Label>
                  <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Marketing" />
                </div>
                <div>
                  <Label className="text-xs">Limite mensal</Label>
                  <Input type="number" value={form.budget_amount} onChange={(e) => setForm(f => ({ ...f, budget_amount: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={Wallet} label="Orçamento Total" value={fmtBRL(totals.budget)} tone="text-foreground" />
        <KPI icon={TrendingUp} label="Gasto no Mês" value={fmtBRL(totals.spent)} tone="text-violet-500" />
        <KPI icon={AlertTriangle} label="Estouradas" value={String(totals.exceeded)} tone="text-rose-500" />
        <KPI icon={CheckCircle2} label="Próx. do limite" value={String(totals.warning)} tone="text-amber-500" />
      </div>

      {totals.budget > 0 && (
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
          </div>
          <div className="relative h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 rounded-full transition-all"
              style={{ width: `${Math.min(totals.pct, 100)}%` }}
            />
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Carregando…
        </Card>
      ) : cats.length === 0 ? (
        <Card className="p-12 text-center">
          <PieChart className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Nenhuma categoria de orçamento</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Cadastre categorias para acompanhar limites de gasto. O sistema calcula automaticamente o que foi gasto no mês a partir das suas transações reais.
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {cats.map((c) => {
            const pct = c.budget_amount ? (c.spent / c.budget_amount) * 100 : 0;
            const status = pct >= 100 ? "exceeded" : pct >= 80 ? "warning" : "ok";
            return (
              <Card key={c.id} className="group relative p-5 border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all overflow-hidden">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${c.color || "from-violet-500 to-purple-500"}`} />
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.color || "from-violet-500 to-purple-500"} flex items-center justify-center shrink-0 shadow-md`}>
                      <PieChart className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">Mensal · renovação dia 1</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" onClick={() => remove(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <div>
                    <span className="text-2xl font-bold">{fmtBRL(c.spent)}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">/ {fmtBRL(c.budget_amount)}</span>
                  </div>
                  <Badge
                    className={
                      status === "exceeded" ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                      : status === "warning" ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                      : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
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
                      : `bg-gradient-to-r ${c.color || "from-violet-500 to-purple-500"}`
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>

                {status === "exceeded" && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-rose-500 bg-rose-500/5 border border-rose-500/20 rounded-lg px-2.5 py-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Estourou em {fmtBRL(c.spent - c.budget_amount)} este mês</span>
                  </div>
                )}
                {status === "warning" && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-500 bg-amber-500/5 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                    <Target className="w-3.5 h-3.5 shrink-0" />
                    <span>{fmtBRL(c.budget_amount - c.spent)} restantes — atenção</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
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
