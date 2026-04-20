import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Plus, Search, Send, CheckCircle2, XCircle, Download, Edit3, Trash2, ArrowRightLeft, Sparkles, TrendingUp, Clock, Loader2 } from "lucide-react";
import { QuoteEditorDialog } from "./QuoteEditorDialog";
import { downloadQuotePDF } from "@/lib/generateQuotePDF";

interface Props { customerProductId: string }

const fmtBRL = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-muted text-muted-foreground border-border" },
  sent: { label: "Enviado", cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  approved: { label: "Aprovado", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  rejected: { label: "Recusado", cls: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
  expired: { label: "Expirado", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  converted: { label: "Convertido", cls: "bg-violet-500/15 text-violet-500 border-violet-500/30" },
};

export function QuotesTab({ customerProductId }: Props) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("financial_quotes")
      .select("*")
      .eq("customer_product_id", customerProductId)
      .order("created_at", { ascending: false });
    if (!error) setList(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [customerProductId]);

  const filtered = useMemo(() => list.filter(q =>
    (statusFilter === "all" || q.status === statusFilter) &&
    (!search || q.client_name?.toLowerCase().includes(search.toLowerCase()) || q.quote_number?.toLowerCase().includes(search.toLowerCase()))
  ), [list, search, statusFilter]);

  const stats = useMemo(() => ({
    total: list.length,
    pending: list.filter(q => ["draft", "sent"].includes(q.status)).length,
    approved: list.filter(q => q.status === "approved" || q.status === "converted").length,
    pipeline: list.filter(q => ["sent", "approved"].includes(q.status)).reduce((a, q) => a + Number(q.total || 0), 0),
  }), [list]);

  async function setStatus(id: string, status: string) {
    const patch: any = { status };
    if (status === "sent") patch.sent_at = new Date().toISOString();
    if (status === "approved") patch.approved_at = new Date().toISOString();
    if (status === "rejected") patch.rejected_at = new Date().toISOString();
    const { error } = await (supabase as any).from("financial_quotes").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Status atualizado"); load(); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir orçamento?")) return;
    const { error } = await (supabase as any).from("financial_quotes").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
  }

  async function convertToInvoice(quote: any) {
    if (!confirm(`Converter ${quote.quote_number} em fatura?`)) return;
    try {
      const { data: numData } = await (supabase as any).rpc("next_invoice_number", { _cp_id: customerProductId });
      const { data: items } = await (supabase as any).from("financial_quote_items").select("*").eq("quote_id", quote.id);
      const due = new Date(); due.setDate(due.getDate() + 15);
      const { data: rec, error } = await (supabase as any).from("financial_receivables").insert({
        customer_product_id: customerProductId,
        invoice_number: numData,
        quote_id: quote.id,
        client_name: quote.client_name,
        client_email: quote.client_email,
        client_phone: quote.client_phone,
        client_document: quote.client_document,
        client_address: quote.client_address,
        discount: quote.discount, tax: quote.tax,
        due_date: due.toISOString().slice(0, 10),
        notes: quote.notes,
      }).select("id").single();
      if (error) throw error;
      if (items?.length) {
        await (supabase as any).from("financial_receivable_items").insert(items.map((i: any, idx: number) => ({
          receivable_id: rec.id,
          description: i.description, quantity: i.quantity, unit_price: i.unit_price,
          discount: i.discount, total: i.total, sort_order: idx,
        })));
      }
      await (supabase as any).from("financial_quotes").update({ status: "converted", converted_receivable_id: rec.id }).eq("id", quote.id);
      toast.success("Fatura criada — veja em Faturas › A Receber");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function downloadPDF(q: any) {
    const { data: items } = await (supabase as any).from("financial_quote_items").select("*").eq("quote_id", q.id).order("sort_order");
    downloadQuotePDF({
      type: "quote",
      number: q.quote_number,
      date: new Date(q.created_at).toLocaleDateString("pt-BR"),
      validUntil: q.valid_until ? new Date(q.valid_until).toLocaleDateString("pt-BR") : null,
      client: { name: q.client_name, email: q.client_email, phone: q.client_phone, document: q.client_document, address: q.client_address },
      items: (items || []).map((i: any) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), discount: Number(i.discount), total: Number(i.total) })),
      subtotal: Number(q.subtotal), discount: Number(q.discount), tax: Number(q.tax), total: Number(q.total),
      notes: q.notes, terms: q.terms,
    });
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-indigo-500/10 via-background to-violet-500/10 p-6">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-500 text-xs font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider">Propostas Comerciais</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Orçamentos para Clientes</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-xl">
              Crie cotações profissionais, exporte em PDF e converta em fatura quando aprovado.
            </p>
          </div>
          <Button onClick={() => { setEditingId(null); setEditorOpen(true); }} className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white border-0 hover:opacity-90 shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Novo Orçamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={FileText} label="Total" value={String(stats.total)} tone="text-foreground" />
        <KPI icon={Clock} label="Em aberto" value={String(stats.pending)} tone="text-blue-500" />
        <KPI icon={CheckCircle2} label="Aprovados" value={String(stats.approved)} tone="text-emerald-500" />
        <KPI icon={TrendingUp} label="Pipeline" value={fmtBRL(stats.pipeline)} tone="text-violet-500" />
      </div>

      <Card className="p-4 border-border/50">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} className="pl-9" placeholder="Buscar por cliente ou número..." />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Nenhum orçamento</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Orçamento" para começar.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(q => {
            const st = STATUS[q.status] || STATUS.draft;
            return (
              <Card key={q.id} className="p-4 border-border/50 bg-card/50 hover:bg-card transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{q.quote_number}</p>
                        <Badge className={`${st.cls} text-[10px]`} variant="outline">{st.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{q.client_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Criado {new Date(q.created_at).toLocaleDateString("pt-BR")}
                        {q.valid_until && ` · válido até ${new Date(q.valid_until).toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-indigo-500">{fmtBRL(q.total)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap justify-end shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => downloadPDF(q)} title="Baixar PDF"><Download className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(q.id); setEditorOpen(true); }} title="Editar"><Edit3 className="w-3.5 h-3.5" /></Button>
                    {q.status === "draft" && <Button size="sm" variant="outline" onClick={() => setStatus(q.id, "sent")}><Send className="w-3.5 h-3.5 mr-1" /> Enviar</Button>}
                    {q.status === "sent" && <>
                      <Button size="sm" variant="outline" className="text-emerald-500 border-emerald-500/30" onClick={() => setStatus(q.id, "approved")}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aprovar</Button>
                      <Button size="sm" variant="outline" className="text-rose-500 border-rose-500/30" onClick={() => setStatus(q.id, "rejected")}><XCircle className="w-3.5 h-3.5 mr-1" /> Recusar</Button>
                    </>}
                    {q.status === "approved" && <Button size="sm" variant="outline" className="text-violet-500 border-violet-500/30" onClick={() => convertToInvoice(q)}><ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Faturar</Button>}
                    <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => remove(q.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
        mode="quote"
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
      <p className={`text-xl font-bold ${tone}`}>{value}</p>
    </Card>
  );
}
