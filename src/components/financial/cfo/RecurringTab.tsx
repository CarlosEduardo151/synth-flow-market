import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Repeat, Plus, Zap, Trash2, ArrowDownRight, ArrowUpRight, Clock, TrendingUp,
  CalendarClock, Loader2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props { customerProductId: string }

interface Recurring {
  id: string;
  title: string;
  amount: number;
  event_type: string;
  recurring_interval: string | null;
  event_date: string;
  category: string | null;
  status: string;
}

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const freqLabel: Record<string, string> = { weekly: "Semanal", monthly: "Mensal", quarterly: "Trimestral", yearly: "Anual" };

export function RecurringTab({ customerProductId }: Props) {
  const [items, setItems] = useState<Recurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", amount: "", event_type: "expense",
    recurring_interval: "monthly", event_date: "", category: "",
  });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("financial_calendar_events")
      .select("id, title, amount, event_type, recurring_interval, event_date, category, status")
      .eq("customer_product_id", customerProductId)
      .eq("recurring", true)
      .order("event_date", { ascending: true });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setItems((data ?? []) as Recurring[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [customerProductId]);

  const totals = useMemo(() => {
    const monthlyOnly = items.filter(i => i.recurring_interval === "monthly" && i.status !== "cancelled");
    const monthlyIn = monthlyOnly.filter(i => i.event_type === "income").reduce((a, i) => a + Number(i.amount), 0);
    const monthlyOut = monthlyOnly.filter(i => i.event_type !== "income").reduce((a, i) => a + Number(i.amount), 0);
    return { monthlyIn, monthlyOut, net: monthlyIn - monthlyOut };
  }, [items]);

  const handleSave = async () => {
    if (!form.title || !form.amount || !form.event_date) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("financial_calendar_events").insert({
      customer_product_id: customerProductId,
      title: form.title,
      amount: Number(form.amount),
      event_type: form.event_type,
      event_date: form.event_date,
      category: form.category || null,
      recurring: true,
      recurring_interval: form.recurring_interval,
      status: "pending",
    });
    setSaving(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Recorrência criada" });
      setOpen(false);
      setForm({ title: "", amount: "", event_type: "expense", recurring_interval: "monthly", event_date: "", category: "" });
      load();
    }
  };

  const toggleStatus = async (item: Recurring, enabled: boolean) => {
    const newStatus = enabled ? "pending" : "cancelled";
    const { error } = await supabase.from("financial_calendar_events")
      .update({ status: newStatus })
      .eq("id", item.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("financial_calendar_events").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Removido" }); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-cyan-500/10 via-background to-blue-500/10 p-6">
        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-cyan-500 text-xs font-medium mb-2">
              <Repeat className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider">Piloto Automático</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Transações Recorrentes</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-xl">
              Cadastre lançamentos que se repetem automaticamente: salários, aluguéis, assinaturas e receitas fixas.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 hover:opacity-90 shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Nova Recorrência
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova recorrência</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Descrição</Label>
                  <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Valor</Label>
                    <Input type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Próxima data</Label>
                    <Input type="date" value={form.event_date} onChange={(e) => setForm(f => ({ ...f, event_date: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select value={form.event_type} onValueChange={(v) => setForm(f => ({ ...f, event_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Receita</SelectItem>
                        <SelectItem value="expense">Despesa</SelectItem>
                        <SelectItem value="salary">Folha</SelectItem>
                        <SelectItem value="tax">Imposto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Frequência</Label>
                    <Select value={form.recurring_interval} onValueChange={(v) => setForm(f => ({ ...f, recurring_interval: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Categoria (opcional)</Label>
                  <Input value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ex: Folha, Estrutura" />
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

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5 border-border/50 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">Receita Recorrente / mês</span>
          </div>
          <p className="text-2xl font-bold text-emerald-500">{fmtBRL(totals.monthlyIn)}</p>
        </Card>
        <Card className="p-5 border-border/50 bg-gradient-to-br from-rose-500/10 to-rose-500/5">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-medium text-muted-foreground">Despesa Recorrente / mês</span>
          </div>
          <p className="text-2xl font-bold text-rose-500">{fmtBRL(totals.monthlyOut)}</p>
        </Card>
        <Card className={`p-5 border-border/50 bg-gradient-to-br ${totals.net >= 0 ? "from-violet-500/10 to-fuchsia-500/5" : "from-rose-500/10 to-orange-500/5"}`}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className={`w-4 h-4 ${totals.net >= 0 ? "text-violet-500" : "text-rose-500"}`} />
            <span className="text-xs font-medium text-muted-foreground">Saldo Líquido Recorrente</span>
          </div>
          <p className={`text-2xl font-bold ${totals.net >= 0 ? "text-violet-500" : "text-rose-500"}`}>{fmtBRL(totals.net)}</p>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-cyan-500" />
            <h3 className="font-semibold">Lançamentos automáticos</h3>
          </div>
          <Badge variant="outline" className="text-xs">{items.filter(i => i.status !== "cancelled").length} ativos</Badge>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Carregando…
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Repeat className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">Nenhuma recorrência cadastrada</p>
            <p className="text-xs text-muted-foreground mt-1">Crie sua primeira recorrência para automatizar lançamentos.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {items.map((it) => {
              const active = it.status !== "cancelled";
              const dateStr = new Date(it.event_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
              return (
                <div key={it.id} className={`group p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors ${!active ? "opacity-50" : ""}`}>
                  <div className="shrink-0 w-14 text-center">
                    <div className="rounded-xl border border-border/50 bg-background py-1.5">
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">próx</p>
                      <p className="text-sm font-bold">{dateStr}</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    {it.event_type === "income"
                      ? <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                      : <ArrowDownRight className="w-4 h-4 text-rose-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-sm truncate">{it.title}</p>
                      {it.category && <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{it.category}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{freqLabel[it.recurring_interval ?? "monthly"]}</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-cyan-500" />Auto</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold text-base ${it.event_type === "income" ? "text-emerald-500" : "text-foreground"}`}>
                      {it.event_type === "income" ? "+" : "−"} {fmtBRL(Number(it.amount))}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch checked={active} onCheckedChange={(v) => toggleStatus(it, v)} />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 opacity-0 group-hover:opacity-100" onClick={() => remove(it.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
