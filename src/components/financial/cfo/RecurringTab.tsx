import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Repeat, Plus, Calendar, Zap, Pause, Play, Edit3, Trash2,
  ArrowDownRight, ArrowUpRight, Clock, TrendingUp, CalendarClock,
} from "lucide-react";

interface Props { customerProductId: string }

interface Recurring {
  id: string; name: string; amount: number; type: "income" | "expense";
  frequency: "weekly" | "monthly" | "yearly"; nextDate: string;
  category: string; active: boolean; logo?: string; color: string;
}

const MOCK: Recurring[] = [
  { id: "1", name: "Aluguel do Escritório", amount: 4500, type: "expense", frequency: "monthly", nextDate: "01/05", category: "Estrutura", active: true, color: "bg-amber-500" },
  { id: "2", name: "Salário — João Silva", amount: 6500, type: "expense", frequency: "monthly", nextDate: "05/05", category: "Folha", active: true, color: "bg-blue-500" },
  { id: "3", name: "Salário — Maria Costa", amount: 4800, type: "expense", frequency: "monthly", nextDate: "05/05", category: "Folha", active: true, color: "bg-blue-500" },
  { id: "4", name: "Netflix Empresarial", amount: 89.9, type: "expense", frequency: "monthly", nextDate: "12/05", category: "Assinaturas", active: true, color: "bg-rose-500" },
  { id: "5", name: "Notion Team", amount: 240, type: "expense", frequency: "monthly", nextDate: "15/05", category: "Software", active: true, color: "bg-foreground" },
  { id: "6", name: "Mensalidade Cliente Acme", amount: 8900, type: "income", frequency: "monthly", nextDate: "10/05", category: "Receita", active: true, color: "bg-emerald-500" },
  { id: "7", name: "Domínio anual .com.br", amount: 40, type: "expense", frequency: "yearly", nextDate: "20/11", category: "Infra", active: true, color: "bg-violet-500" },
  { id: "8", name: "Limpeza semanal", amount: 180, type: "expense", frequency: "weekly", nextDate: "Sex", category: "Estrutura", active: false, color: "bg-cyan-500" },
];

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const freqLabel: Record<string, string> = { weekly: "Semanal", monthly: "Mensal", yearly: "Anual" };

export function RecurringTab({ customerProductId: _ }: Props) {
  const [items, setItems] = useState<Recurring[]>(MOCK);
  const monthlyOut = items.filter(i => i.active && i.type === "expense" && i.frequency === "monthly").reduce((a, i) => a + i.amount, 0);
  const monthlyIn = items.filter(i => i.active && i.type === "income" && i.frequency === "monthly").reduce((a, i) => a + i.amount, 0);
  const net = monthlyIn - monthlyOut;

  return (
    <div className="space-y-6">
      {/* Hero */}
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
              O sistema lança automaticamente todo mês: salários, aluguéis, assinaturas e receitas fixas.
            </p>
          </div>
          <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 hover:opacity-90 shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Nova Recorrência
          </Button>
        </div>
      </div>

      {/* Net summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5 border-border/50 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">Receita Recorrente / mês</span>
          </div>
          <p className="text-2xl font-bold text-emerald-500">{fmtBRL(monthlyIn)}</p>
        </Card>
        <Card className="p-5 border-border/50 bg-gradient-to-br from-rose-500/10 to-rose-500/5">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-medium text-muted-foreground">Despesa Recorrente / mês</span>
          </div>
          <p className="text-2xl font-bold text-rose-500">{fmtBRL(monthlyOut)}</p>
        </Card>
        <Card className={`p-5 border-border/50 bg-gradient-to-br ${net >= 0 ? "from-violet-500/10 to-fuchsia-500/5" : "from-rose-500/10 to-orange-500/5"}`}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className={`w-4 h-4 ${net >= 0 ? "text-violet-500" : "text-rose-500"}`} />
            <span className="text-xs font-medium text-muted-foreground">Saldo Líquido Recorrente</span>
          </div>
          <p className={`text-2xl font-bold ${net >= 0 ? "text-violet-500" : "text-rose-500"}`}>{fmtBRL(net)}</p>
        </Card>
      </div>

      {/* Timeline list */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-cyan-500" />
            <h3 className="font-semibold">Próximos lançamentos automáticos</h3>
          </div>
          <Badge variant="outline" className="text-xs">{items.filter(i => i.active).length} ativos</Badge>
        </div>
        <div className="divide-y divide-border/50">
          {items.map((it) => (
            <div key={it.id} className={`group p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors ${!it.active ? "opacity-50" : ""}`}>
              {/* Date pill */}
              <div className="shrink-0 w-14 text-center">
                <div className="rounded-xl border border-border/50 bg-background py-1.5">
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wider">próx</p>
                  <p className="text-sm font-bold">{it.nextDate}</p>
                </div>
              </div>

              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl ${it.color}/15 flex items-center justify-center shrink-0`}>
                {it.type === "income" ? <ArrowUpRight className={`w-4 h-4 text-emerald-500`} /> : <ArrowDownRight className="w-4 h-4 text-rose-500" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-sm truncate">{it.name}</p>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{it.category}</Badge>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{freqLabel[it.frequency]}</span>
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-cyan-500" />Auto</span>
                </div>
              </div>

              {/* Amount */}
              <div className="text-right shrink-0">
                <p className={`font-bold text-base ${it.type === "income" ? "text-emerald-500" : "text-foreground"}`}>
                  {it.type === "income" ? "+" : "−"} {fmtBRL(it.amount)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Switch
                  checked={it.active}
                  onCheckedChange={(v) => setItems(p => p.map(x => x.id === it.id ? { ...x, active: v } : x))}
                />
                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100"><Edit3 className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
