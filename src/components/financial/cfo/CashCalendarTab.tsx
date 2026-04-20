import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalIcon, ChevronLeft, ChevronRight, ArrowDownRight, ArrowUpRight,
  AlertTriangle, Sparkles, Receipt, Users, Building, Zap, Plus,
} from "lucide-react";

interface Props { customerProductId: string }

interface Event {
  day: number; type: "income" | "expense" | "tax" | "salary";
  title: string; amount: number;
}

const EVENTS: Event[] = [
  { day: 1, type: "expense", title: "Aluguel escritório", amount: 4500 },
  { day: 5, type: "salary", title: "Folha de pagamento", amount: 11300 },
  { day: 7, type: "income", title: "Recebimento Cliente A", amount: 8900 },
  { day: 10, type: "income", title: "Mensalidade Acme Corp", amount: 8900 },
  { day: 12, type: "expense", title: "Netflix Empresarial", amount: 89.9 },
  { day: 15, type: "expense", title: "Notion Team", amount: 240 },
  { day: 15, type: "income", title: "Recebimento Cliente B", amount: 4200 },
  { day: 20, type: "tax", title: "DAS Simples Nacional", amount: 3420 },
  { day: 22, type: "expense", title: "Energia + Internet", amount: 1820 },
  { day: 25, type: "income", title: "Vendas e-commerce", amount: 14500 },
  { day: 28, type: "expense", title: "Fornecedor XYZ", amount: 6200 },
  { day: 30, type: "expense", title: "Marketing Ads", amount: 4720 },
];

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TYPE_META: Record<Event["type"], { icon: any; color: string; bg: string; label: string }> = {
  income: { icon: ArrowUpRight, color: "text-emerald-500", bg: "bg-emerald-500", label: "Receita" },
  expense: { icon: ArrowDownRight, color: "text-rose-500", bg: "bg-rose-500", label: "Despesa" },
  salary: { icon: Users, color: "text-blue-500", bg: "bg-blue-500", label: "Folha" },
  tax: { icon: Receipt, color: "text-amber-500", bg: "bg-amber-500", label: "Imposto" },
};

export function CashCalendarTab({ customerProductId: _ }: Props) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const monthName = new Date(year, month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventsByDay = useMemo(() => {
    const map = new Map<number, Event[]>();
    EVENTS.forEach(e => {
      if (!map.has(e.day)) map.set(e.day, []);
      map.get(e.day)!.push(e);
    });
    return map;
  }, []);

  const totals = useMemo(() => {
    const income = EVENTS.filter(e => e.type === "income").reduce((a, e) => a + e.amount, 0);
    const expense = EVENTS.filter(e => e.type !== "income").reduce((a, e) => a + e.amount, 0);
    return { income, expense, net: income - expense };
  }, []);

  // Cumulative balance projection per day
  const balanceByDay = useMemo(() => {
    let bal = 124500;
    const map = new Map<number, number>();
    for (let d = 1; d <= daysInMonth; d++) {
      const evs = eventsByDay.get(d) ?? [];
      evs.forEach(e => bal += e.type === "income" ? e.amount : -e.amount);
      map.set(d, bal);
    }
    return map;
  }, [eventsByDay, daysInMonth]);

  const lowestBalance = Math.min(...balanceByDay.values());
  const lowestDay = [...balanceByDay.entries()].find(([_, v]) => v === lowestBalance)?.[0];

  const selectedEvents = selectedDay ? eventsByDay.get(selectedDay) ?? [] : [];

  const goPrev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const goNext = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-6">
      {/* Hero */}
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
              Visualize o caixa dia a dia. Receitas, despesas, salários e impostos em um só painel inteligente.
            </p>
          </div>
          <Button className="bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0 hover:opacity-90 shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Lançamento agendado
          </Button>
        </div>
      </div>

      {/* Alert: dia mais apertado */}
      {lowestDay && lowestBalance < 50000 && (
        <Card className="p-4 border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-semibold">Atenção ao dia {lowestDay}</p>
              <p className="text-xs text-muted-foreground">
                Saldo projetado mais baixo do mês: <strong className="text-amber-500">{fmtBRL(lowestBalance)}</strong>
              </p>
            </div>
            <Button variant="outline" size="sm">Ver detalhes</Button>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        {/* Calendar */}
        <Card className="p-5 border-border/50 bg-card/50 backdrop-blur-sm">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-bold text-lg capitalize">{monthName}</p>
              <p className="text-xs text-muted-foreground">{EVENTS.length} eventos programados</p>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={goPrev}><ChevronLeft className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}>Hoje</Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={goNext}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="text-center text-[10px] uppercase tracking-wider text-muted-foreground font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const evs = eventsByDay.get(day) ?? [];
              const isSelected = selectedDay === day;
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dayIncome = evs.filter(e => e.type === "income").reduce((a, e) => a + e.amount, 0);
              const dayExpense = evs.filter(e => e.type !== "income").reduce((a, e) => a + e.amount, 0);
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
                    {evs.length > 0 && (
                      <span className="text-[9px] text-muted-foreground">{evs.length}</span>
                    )}
                  </div>
                  {/* Dots */}
                  {evs.length > 0 && (
                    <div className="absolute bottom-1.5 left-1.5 flex gap-0.5">
                      {Array.from(new Set(evs.map(e => e.type))).slice(0, 4).map((t) => (
                        <span key={t} className={`w-1.5 h-1.5 rounded-full ${TYPE_META[t].bg}`} />
                      ))}
                    </div>
                  )}
                  {/* Net amount */}
                  {evs.length > 0 && (
                    <div className={`absolute bottom-1.5 right-1.5 text-[8px] font-bold ${dayNet >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {dayNet >= 0 ? "+" : "−"}{Math.abs(dayNet) >= 1000 ? `${(Math.abs(dayNet)/1000).toFixed(0)}k` : Math.abs(dayNet).toFixed(0)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-border/50">
            {(Object.entries(TYPE_META) as [Event["type"], typeof TYPE_META[Event["type"]]][]).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${v.bg}`} />
                {v.label}
              </div>
            ))}
          </div>
        </Card>

        {/* Side panel */}
        <div className="space-y-3">
          {/* Month summary */}
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

          {/* Selected day detail */}
          <Card className="p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-base">
                  Dia {selectedDay ?? "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedEvents.length} {selectedEvents.length === 1 ? "evento" : "eventos"}
                </p>
              </div>
              {selectedDay && (
                <Badge variant="outline" className="text-xs">
                  Saldo: {fmtBRL(balanceByDay.get(selectedDay) ?? 0)}
                </Badge>
              )}
            </div>

            {selectedEvents.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                <CalIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nenhum evento neste dia
              </div>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((ev, i) => {
                  const meta = TYPE_META[ev.type];
                  const Icon = meta.icon;
                  return (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg ${meta.bg}/15 flex items-center justify-center shrink-0`}>
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{ev.title}</p>
                        <p className="text-[10px] text-muted-foreground">{meta.label}</p>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${ev.type === "income" ? "text-emerald-500" : "text-foreground"}`}>
                        {ev.type === "income" ? "+" : "−"}{fmtBRL(ev.amount)}
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
