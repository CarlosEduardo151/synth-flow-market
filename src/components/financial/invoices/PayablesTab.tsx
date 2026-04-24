import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { emitFinancialDataChanged, useFinancialDataChanged } from "@/lib/financialEvents";
import { Receipt, Plus, Search, Check, AlertTriangle, Clock, Trash2, Loader2, Repeat, DollarSign, Wallet } from "lucide-react";

interface Props { customerProductId: string }

const fmtBRL = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CATEGORIES = ["Aluguel", "Energia", "Internet", "Telefone", "Salários", "Fornecedores", "Impostos", "Marketing", "Software/SaaS", "Outros"];

export function PayablesTab({ customerProductId }: Props) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState<any>({
    title: "", supplier: "", category: "", amount: "", due_date: "", notes: "",
    payment_method: "pix", recurring: false, recurring_interval: "monthly",
  });

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("financial_agent_invoices")
      .select("*")
      .eq("customer_product_id", customerProductId)
      .order("due_date", { ascending: true });
    setList(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [customerProductId]);
  useFinancialDataChanged(() => { load(); });

  const filtered = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return list.filter(i => {
      if (search && !i.title?.toLowerCase().includes(search.toLowerCase()) && !i.supplier?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === "pending") return i.status === "pending";
      if (filter === "paid") return i.status === "paid";
      if (filter === "overdue") return i.status === "pending" && new Date(i.due_date) < today;
      if (filter === "this_week") {
        const wk = new Date(today); wk.setDate(wk.getDate() + 7);
        return i.status === "pending" && new Date(i.due_date) <= wk;
      }
      return true;
    });
  }, [list, search, filter]);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const pending = list.filter(i => i.status === "pending");
    const overdue = pending.filter(i => new Date(i.due_date) < today);
    const paidThisMonth = list.filter(i => {
      if (i.status !== "paid" || !i.paid_at) return false;
      const d = new Date(i.paid_at);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });
    return {
      pendingTotal: pending.reduce((a, i) => a + Number(i.amount || 0), 0),
      overdueTotal: overdue.reduce((a, i) => a + Number(i.amount || 0), 0),
      paidThisMonth: paidThisMonth.reduce((a, i) => a + Number(i.amount || 0), 0),
      count: list.length,
    };
  }, [list]);

  async function add() {
    if (!form.title || !form.amount || !form.due_date) { toast.error("Preencha os campos obrigatórios"); return; }
    const { error } = await (supabase as any).from("financial_agent_invoices").insert({
      customer_product_id: customerProductId,
      title: form.title, supplier: form.supplier || null, category: form.category || null,
      amount: Number(form.amount), due_date: form.due_date, notes: form.notes || null,
      payment_method: form.payment_method,
      recurring: form.recurring, recurring_interval: form.recurring ? form.recurring_interval : null,
      source: "manual", status: "pending",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Conta adicionada");
    setOpen(false);
    setForm({ title: "", supplier: "", category: "", amount: "", due_date: "", notes: "", payment_method: "pix", recurring: false, recurring_interval: "monthly" });
    load();
  }

  async function markPaid(inv: any) {
    if (!confirm(`Marcar "${inv.title}" como paga e lançar despesa?`)) return;
    try {
      // Idempotência: só atualiza se ainda estava pendente. Se outra aba/clique já pagou, não faz nada.
      const { data: updated, error: upErr } = await (supabase as any)
        .from("financial_agent_invoices")
        .update({ status: "paid", paid_at: new Date().toISOString(), paid_amount: inv.amount })
        .eq("id", inv.id)
        .eq("status", "pending")
        .select("id");
      if (upErr) throw upErr;
      if (!updated || updated.length === 0) {
        toast.message("Esta fatura já foi paga.");
        load();
        return;
      }

      await (supabase as any).from("financial_agent_transactions").insert({
        customer_product_id: customerProductId,
        type: "expense", amount: Number(inv.amount),
        description: inv.title + (inv.supplier ? ` — ${inv.supplier}` : ""),
        date: new Date().toISOString().slice(0, 10),
        payment_method: inv.payment_method, source: `payable:${inv.id}`,
      });

      // Generate next recurring invoice (com guarda contra duplicação)
      if (inv.recurring && inv.recurring_interval) {
        const next = new Date(inv.due_date);
        if (inv.recurring_interval === "monthly") next.setMonth(next.getMonth() + 1);
        else if (inv.recurring_interval === "weekly") next.setDate(next.getDate() + 7);
        else if (inv.recurring_interval === "yearly") next.setFullYear(next.getFullYear() + 1);
        const nextDate = next.toISOString().slice(0, 10);

        // Verifica se a próxima ocorrência já existe (por parent_invoice_id ou por título+data+cp)
        const { data: existing } = await (supabase as any)
          .from("financial_agent_invoices")
          .select("id")
          .eq("customer_product_id", customerProductId)
          .eq("title", inv.title)
          .eq("due_date", nextDate)
          .limit(1);

        if (!existing || existing.length === 0) {
          await (supabase as any).from("financial_agent_invoices").insert({
            customer_product_id: customerProductId,
            title: inv.title, supplier: inv.supplier, category: inv.category,
            amount: inv.amount, due_date: nextDate,
            notes: inv.notes, payment_method: inv.payment_method,
            recurring: true, recurring_interval: inv.recurring_interval,
            parent_invoice_id: inv.id, source: "recurring", status: "pending",
          });
        }
      }
      toast.success("Pagamento registrado");
      emitFinancialDataChanged("invoice-paid");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir conta?")) return;
    const { error } = await (supabase as any).from("financial_agent_invoices").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
  }

  function statusFor(inv: any) {
    if (inv.status === "paid") return { label: "Paga", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", Icon: Check };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(inv.due_date); const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
    if (days < 0) return { label: `Vencida ${Math.abs(days)}d`, cls: "bg-rose-500/15 text-rose-500 border-rose-500/30", Icon: AlertTriangle };
    if (days <= 3) return { label: days === 0 ? "Hoje" : `${days}d`, cls: "bg-amber-500/15 text-amber-500 border-amber-500/30", Icon: Clock };
    return { label: `Em ${days}d`, cls: "bg-blue-500/15 text-blue-500 border-blue-500/30", Icon: Receipt };
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Contas a Pagar</h3>
          <p className="text-xs text-muted-foreground">Despesas e fornecedores</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
          <Plus className="w-4 h-4 mr-1" /> Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={Wallet} label="Total" value={String(stats.count)} tone="text-foreground" />
        <KPI icon={Clock} label="A Pagar" value={fmtBRL(stats.pendingTotal)} tone="text-amber-500" />
        <KPI icon={AlertTriangle} label="Vencidas" value={fmtBRL(stats.overdueTotal)} tone="text-rose-500" />
        <KPI icon={DollarSign} label="Pago no Mês" value={fmtBRL(stats.paidThisMonth)} tone="text-emerald-500" />
      </div>

      <Card className="p-3 border-border/50">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} className="pl-9" placeholder="Buscar..." />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="overdue">Vencidas</SelectItem>
              <SelectItem value="this_week">Próximos 7 dias</SelectItem>
              <SelectItem value="paid">Pagas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <Card className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Nenhuma conta</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(inv => {
            const st = statusFor(inv);
            const Icon = st.Icon;
            return (
              <Card key={inv.id} className="p-4 border-border/50 bg-card/50 hover:bg-card transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{inv.title}</p>
                        <Badge className={`${st.cls} text-[10px]`} variant="outline">{st.label}</Badge>
                        {inv.recurring && <Badge variant="outline" className="text-[10px]"><Repeat className="w-2.5 h-2.5 mr-1" />Recorrente</Badge>}
                        {inv.category && <Badge variant="outline" className="text-[10px]">{inv.category}</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {inv.supplier && `${inv.supplier} · `}
                        Vence {new Date(inv.due_date).toLocaleDateString("pt-BR")}
                        {inv.payment_method && ` · ${inv.payment_method.toUpperCase()}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-amber-500">{fmtBRL(inv.amount)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {inv.status === "pending" && <Button size="sm" variant="outline" className="text-emerald-500 border-emerald-500/30" onClick={() => markPaid(inv)}><Check className="w-3.5 h-3.5 mr-1" /> Pagar</Button>}
                    <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => remove(inv.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova conta a pagar</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Título *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Aluguel" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Fornecedor</Label>
                <Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
              <div><Label className="text-xs">Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Valor *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label className="text-xs">Vencimento *</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Forma de pagamento</Label>
              <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Observações</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Checkbox id="rec" checked={form.recurring} onCheckedChange={(c) => setForm({ ...form, recurring: !!c })} />
              <Label htmlFor="rec" className="text-sm">Conta recorrente</Label>
              {form.recurring && (
                <Select value={form.recurring_interval} onValueChange={v => setForm({ ...form, recurring_interval: v })}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={add}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
    </Card>
  );
}
