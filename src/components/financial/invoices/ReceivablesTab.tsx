import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Receipt, Plus, Search, CheckCircle2, Download, Edit3, Trash2, Send, Clock, AlertTriangle, Loader2, TrendingUp, DollarSign } from "lucide-react";
import { QuoteEditorDialog } from "../quotes/QuoteEditorDialog";
import { downloadQuotePDF } from "@/lib/generateQuotePDF";

interface Props { customerProductId: string }

const fmtBRL = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-muted text-muted-foreground border-border" },
  sent: { label: "Enviada", cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  paid: { label: "Paga", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  overdue: { label: "Vencida", cls: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
  cancelled: { label: "Cancelada", cls: "bg-muted text-muted-foreground border-border" },
};

export function ReceivablesTab({ customerProductId }: Props) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("financial_receivables")
      .select("*")
      .eq("customer_product_id", customerProductId)
      .order("created_at", { ascending: false });
    // Auto-mark overdue
    const today = new Date().toISOString().slice(0, 10);
    const overdueIds = (data || []).filter((r: any) =>
      ["sent", "draft"].includes(r.status) && r.due_date < today
    ).map((r: any) => r.id);
    if (overdueIds.length) {
      await (supabase as any).from("financial_receivables").update({ status: "overdue" }).in("id", overdueIds);
      const { data: refreshed } = await (supabase as any).from("financial_receivables").select("*")
        .eq("customer_product_id", customerProductId).order("created_at", { ascending: false });
      setList(refreshed || []);
    } else {
      setList(data || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [customerProductId]);

  const filtered = useMemo(() => list.filter(r =>
    (statusFilter === "all" || r.status === statusFilter) &&
    (!search || r.client_name?.toLowerCase().includes(search.toLowerCase()) || r.invoice_number?.toLowerCase().includes(search.toLowerCase()))
  ), [list, search, statusFilter]);

  const stats = useMemo(() => ({
    pending: list.filter(r => ["sent", "draft"].includes(r.status)).reduce((a, r) => a + Number(r.total || 0), 0),
    overdue: list.filter(r => r.status === "overdue").reduce((a, r) => a + Number(r.total || 0), 0),
    paid: list.filter(r => r.status === "paid").reduce((a, r) => a + Number(r.total || 0), 0),
    count: list.length,
  }), [list]);

  async function setStatus(id: string, status: string) {
    const patch: any = { status };
    if (status === "sent") patch.sent_at = new Date().toISOString();
    if (status === "paid") { patch.paid_at = new Date().toISOString(); }
    const { error } = await (supabase as any).from("financial_receivables").update(patch).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Status atualizado"); load(); }
  }

  async function markPaidAndRegisterIncome(rec: any) {
    if (!confirm(`Marcar ${rec.invoice_number} como paga e registrar receita?`)) return;
    try {
      await (supabase as any).from("financial_receivables").update({ status: "paid", paid_at: new Date().toISOString(), paid_amount: rec.total }).eq("id", rec.id);
      await (supabase as any).from("financial_agent_transactions").insert({
        customer_product_id: customerProductId,
        type: "income",
        amount: Number(rec.total),
        description: `${rec.invoice_number} — ${rec.client_name}`,
        date: new Date().toISOString().slice(0, 10),
        source: "receivable",
      });
      toast.success("Pagamento registrado e receita lançada");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir fatura?")) return;
    const { error } = await (supabase as any).from("financial_receivables").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
  }

  async function downloadPDF(r: any) {
    const { data: items } = await (supabase as any).from("financial_receivable_items").select("*").eq("receivable_id", r.id).order("sort_order");
    downloadQuotePDF({
      type: "invoice",
      number: r.invoice_number,
      date: new Date(r.created_at).toLocaleDateString("pt-BR"),
      dueDate: r.due_date ? new Date(r.due_date).toLocaleDateString("pt-BR") : null,
      client: { name: r.client_name, email: r.client_email, phone: r.client_phone, document: r.client_document, address: r.client_address },
      items: (items || []).map((i: any) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), discount: Number(i.discount), total: Number(i.total) })),
      subtotal: Number(r.subtotal), discount: Number(r.discount), tax: Number(r.tax), total: Number(r.total),
      notes: r.notes, terms: null,
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Faturas a Receber</h3>
          <p className="text-xs text-muted-foreground">Cobranças emitidas para clientes</p>
        </div>
        <Button onClick={() => { setEditingId(null); setEditorOpen(true); }} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0">
          <Plus className="w-4 h-4 mr-1" /> Nova Fatura
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={Receipt} label="Total" value={String(stats.count)} tone="text-foreground" />
        <KPI icon={Clock} label="A Receber" value={fmtBRL(stats.pending)} tone="text-blue-500" />
        <KPI icon={AlertTriangle} label="Vencidas" value={fmtBRL(stats.overdue)} tone="text-rose-500" />
        <KPI icon={DollarSign} label="Recebido" value={fmtBRL(stats.paid)} tone="text-emerald-500" />
      </div>

      <Card className="p-3 border-border/50">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} className="pl-9" placeholder="Buscar..." />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <Card className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Nenhuma fatura</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const st = STATUS[r.status] || STATUS.draft;
            const today = new Date().toISOString().slice(0, 10);
            const daysToDue = Math.ceil((new Date(r.due_date).getTime() - new Date(today).getTime()) / 86400000);
            return (
              <Card key={r.id} className="p-4 border-border/50 bg-card/50 hover:bg-card transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{r.invoice_number}</p>
                        <Badge className={`${st.cls} text-[10px]`} variant="outline">{st.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{r.client_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Vence {new Date(r.due_date).toLocaleDateString("pt-BR")}
                        {r.status !== "paid" && daysToDue >= 0 && daysToDue <= 7 && ` · em ${daysToDue}d`}
                        {r.status === "paid" && r.paid_at && ` · pago em ${new Date(r.paid_at).toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-emerald-500">{fmtBRL(r.total)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap justify-end shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => downloadPDF(r)}><Download className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(r.id); setEditorOpen(true); }}><Edit3 className="w-3.5 h-3.5" /></Button>
                    {r.status === "draft" && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "sent")}><Send className="w-3.5 h-3.5 mr-1" /> Enviar</Button>}
                    {["sent", "overdue"].includes(r.status) && <Button size="sm" variant="outline" className="text-emerald-500 border-emerald-500/30" onClick={() => markPaidAndRegisterIncome(r)}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Marcar paga</Button>}
                    <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => remove(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <QuoteEditorDialog
        customerProductId={customerProductId}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        quoteId={editingId}
        mode="receivable"
        onSaved={load}
      />
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
