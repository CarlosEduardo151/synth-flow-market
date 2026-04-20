import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar as CalIcon, ChevronLeft, ChevronRight, ArrowDownRight, ArrowUpRight,
  AlertTriangle, Sparkles, Receipt, Users, Plus, Loader2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props { customerProductId: string }

interface CalEvent {
  id: string;
  event_date: string;
  event_type: "income" | "expense" | "salary" | "tax" | "other";
  title: string;
  amount: number;
  status: string;
}

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TYPE_META: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  income:  { icon: ArrowUpRight,   color: "text-emerald-500", bg: "bg-emerald-500", label: "Receita" },
  expense: { icon: ArrowDownRight, color: "text-rose-500",    bg: "bg-rose-500",    label: "Despesa" },
  salary:  { icon: Users,          color: "text-blue-500",    bg: "bg-blue-500",    label: "Folha" },
  tax:     { icon: Receipt,        color: "text-amber-500",   bg: "bg-amber-500",   label: "Imposto" },
  other:   { icon: CalIcon,        color: "text-muted-foreground", bg: "bg-muted-foreground", label: "Outro" },
};

export function CashCalendarTab({ customerProductId }: Props) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    title: "", amount: "", event_type: "expense", event_date: "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const monthName = new Date(year, month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const loadEvents = async () => {
    setLoading(true);
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${daysInMonth}`;
    const { data, error } = await supabase
      .from("financial_calendar_events")
      .select("id, event_date, event_type, title, amount, status")
      .eq("customer_product_id", customerProductId)
      .gte("event_date", start)
      .lte("event_date", end)
      .order("event_date", { ascending: true });
    if (error) {
      toast({ title: "Erro ao carregar eventos", description: error.message, variant: "destructive" });
    } else {
      setEvents((data ?? []) as CalEvent[]);
    }
    setLoading(false);
  };

  useEffect(() => { loadEvents(); }, [month, year, customerProductId]);

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalEvent[]>();
    events.forEach(e => {
      const d = parseInt(e.event_date.slice(8, 10), 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(e);
    });
    return map;
  }, [events]);

  const totals = useMemo(() => {
    const income = events.filter(e => e.event_type === "income").reduce((a, e) => a + Number(e.amount), 0);
    const expense = events.filter(e => e.event_type !== "income").reduce((a, e) => a + Number(e.amount), 0);
    return { income, expense, net: income - expense };
  }, [events]);

  const selectedEvents = selectedDay ? eventsByDay.get(selectedDay) ?? [] : [];

  const goPrev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const goNext = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const handleSave = async () => {
    if (!form.title || !form.amount || !form.event_date) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("financial_calendar_events").insert({
      customer_product_id: customerProductId,
      title: form.title,
      amount: Number(form.amount),
      event_type: form.event_type,
      event_date: form.event_date,
      status: "pending",
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Evento agendado" });
      setOpenDialog(false);
      setForm({ title: "", amount: "", event_type: "expense", event_date: "" });
      loadEvents();
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-orange-500/10 via-background to-pink-500/10 p-6">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-orange-500 text-xs font-medium mb-2">
              <CalIcon className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider">Cash Calendar</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Calendário Financeiro</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-xl">
              Visualize o caixa dia a dia. Receitas, despesas, salários e impostos em um só painel.
            </p>
          </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0 hover:opacity-90 shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Lançamento agendado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo lançamento agendado</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Título</Label>
                  <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Aluguel maio" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Data</Label>
                    <Input type="date" value={form.event_date} onChange={(e) => setForm(f => ({ ...f, event_date: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={form.event_type} onValueChange={(v) => setForm(f => ({ ...f, event_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                      <SelectItem value="salary">Folha</SelectItem>
                      <SelectItem value="tax">Imposto</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        <Card className="p-5 border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-bold text-lg capitalize">{monthName}</p>
              <p className="text-xs text-muted-foreground">
                {loading ? "Carregando…" : `${events.length} ${events.length === 1 ? "evento" : "eventos"}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={goPrev}><ChevronLeft className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}>Hoje</Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={goNext}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="text-center text-[10px] uppercase tracking-wider text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const evs = eventsByDay.get(day) ?? [];
              const isSelected = selectedDay === day;
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dayIncome = evs.filter(e => e.event_type === "income").reduce((a, e) => a + Number(e.amount), 0);
              const dayExpense = evs.filter(e => e.event_type !== "income").reduce((a, e) => a + Number(e.amount), 0);
              const dayNet = dayIncome - dayExpense;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`relative aspect-square rounded-xl p-1.5 text-left transition-all border ${
                    isSelected
                      ? "border-orange-500/50 bg-gradient-to-br from-orange-500/15 to-pink-500/10 shadow-md"
                      : isToday
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/40 bg-background/50 hover:border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`text-[11px] font-bold ${isToday ? "text-primary" : ""}`}>{day}</span>
                    {evs.length > 0 && <span className="text-[9px] text-muted-foreground">{evs.length}</span>}
                  </div>
                  {evs.length > 0 && (
                    <div className="absolute bottom-1.5 left-1.5 flex gap-0.5">
                      {Array.from(new Set(evs.map(e => e.event_type))).slice(0, 4).map((t) => (
                        <span key={t} className={`w-1.5 h-1.5 rounded-full ${TYPE_META[t]?.bg ?? "bg-muted"}`} />
                      ))}
                    </div>
                  )}
                  {evs.length > 0 && (
                    <div className={`absolute bottom-1.5 right-1.5 text-[8px] font-bold ${dayNet >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {dayNet >= 0 ? "+" : "−"}{Math.abs(dayNet) >= 1000 ? `${(Math.abs(dayNet)/1000).toFixed(0)}k` : Math.abs(dayNet).toFixed(0)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-border/50">
            {Object.entries(TYPE_META).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${v.bg}`} />
                {v.label}
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-3">
          <Card className="p-5 border-border/50 bg-gradient-to-br from-card to-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Resumo do mês</p>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5"><ArrowUpRight className="w-3 h-3 text-emerald-500" />Entradas</span>
                <span className="text-sm font-bold text-emerald-500">{fmtBRL(totals.income)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5"><ArrowDownRight className="w-3 h-3 text-rose-500" />Saídas</span>
                <span className="text-sm font-bold text-rose-500">{fmtBRL(totals.expense)}</span>
              </div>
              <div className="border-t border-border/50 pt-2.5 flex justify-between items-center">
                <span className="text-xs font-medium">Saldo do período</span>
                <span className={`text-lg font-bold ${totals.net >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{fmtBRL(totals.net)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-base">Dia {selectedDay ?? "—"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedEvents.length} {selectedEvents.length === 1 ? "evento" : "eventos"}
                </p>
              </div>
            </div>

            {selectedEvents.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                <CalIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nenhum evento neste dia
              </div>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((ev) => {
                  const meta = TYPE_META[ev.event_type] ?? TYPE_META.other;
                  const Icon = meta.icon;
                  return (
                    <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg ${meta.bg}/15 flex items-center justify-center shrink-0`}>
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{ev.title}</p>
                        <p className="text-[10px] text-muted-foreground">{meta.label}</p>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${ev.event_type === "income" ? "text-emerald-500" : "text-foreground"}`}>
                        {ev.event_type === "income" ? "+" : "−"}{fmtBRL(Number(ev.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
