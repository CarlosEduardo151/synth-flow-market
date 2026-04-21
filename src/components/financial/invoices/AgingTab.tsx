import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Clock, CheckCircle2, RefreshCw, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props { customerProductId: string }

interface AgingItem {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  status: string;
  source: "payable" | "receivable";
  client_or_supplier?: string | null;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const BUCKETS = [
  { key: "current",  label: "A vencer",       min: -Infinity, max: 0,  tone: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: CheckCircle2 },
  { key: "1-30",     label: "1–30 dias",      min: 1,   max: 30,       tone: "bg-amber-500/15 text-amber-500 border-amber-500/30",       icon: Clock },
  { key: "31-60",    label: "31–60 dias",     min: 31,  max: 60,       tone: "bg-orange-500/15 text-orange-500 border-orange-500/30",    icon: Clock },
  { key: "61-90",    label: "61–90 dias",     min: 61,  max: 90,       tone: "bg-rose-500/15 text-rose-500 border-rose-500/30",          icon: AlertTriangle },
  { key: "90+",      label: "Acima de 90",    min: 91,  max: Infinity, tone: "bg-red-600/15 text-red-600 border-red-600/30",             icon: AlertTriangle },
] as const;

export function AgingTab({ customerProductId }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<AgingItem[]>([]);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [{ data: payables }, { data: receivables }] = await Promise.all([
      (supabase as any)
        .from("financial_agent_invoices")
        .select("id, title, amount, due_date, status, supplier")
        .eq("customer_product_id", customerProductId)
        .in("status", ["pending", "overdue"]),
      (supabase as any)
        .from("financial_receivables")
        .select("id, invoice_number, total, due_date, status, client_name")
        .eq("customer_product_id", customerProductId)
        .in("status", ["sent", "overdue"]),
    ]);

    const list: AgingItem[] = [
      ...(payables || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        amount: Number(p.amount),
        due_date: p.due_date,
        status: p.status,
        source: "payable" as const,
        client_or_supplier: p.supplier,
      })),
      ...(receivables || []).map((r: any) => ({
        id: r.id,
        title: r.invoice_number || "Fatura",
        amount: Number(r.total),
        due_date: r.due_date,
        status: r.status,
        source: "receivable" as const,
        client_or_supplier: r.client_name,
      })),
    ];
    setItems(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, [customerProductId]);

  const refreshOverdue = async () => {
    setRefreshing(true);
    try {
      const { error } = await (supabase as any).rpc("update_overdue_invoices");
      if (error) throw error;
      toast({ title: "Status atualizado" });
      await load();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const enriched = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return items.map((it) => {
      const due = new Date(it.due_date + "T00:00:00");
      const days = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      return { ...it, daysOverdue: days };
    });
  }, [items]);

  const grouped = useMemo(() => {
    const out: Record<string, { payable: AgingItem[]; receivable: AgingItem[]; totalP: number; totalR: number }> = {};
    BUCKETS.forEach((b) => { out[b.key] = { payable: [], receivable: [], totalP: 0, totalR: 0 }; });
    enriched.forEach((it: any) => {
      const bucket = BUCKETS.find((b) => it.daysOverdue >= b.min && it.daysOverdue <= b.max);
      if (!bucket) return;
      const target = out[bucket.key];
      if (it.source === "payable") { target.payable.push(it); target.totalP += it.amount; }
      else { target.receivable.push(it); target.totalR += it.amount; }
    });
    return out;
  }, [enriched]);

  const totalP = enriched.filter(i => i.source === "payable").reduce((a, i) => a + i.amount, 0);
  const totalR = enriched.filter(i => i.source === "receivable").reduce((a, i) => a + i.amount, 0);

  const exportPDF = async () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFillColor(245, 158, 11);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("Relatório de Aging", 14, 16);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 23);

    doc.setTextColor(20, 20, 20);
    let y = 38;
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("Resumo por bucket", 14, y);

    autoTable(doc, {
      startY: y + 4,
      head: [["Bucket", "A pagar (R$)", "A receber (R$)"]],
      body: BUCKETS.map((b) => [
        b.label,
        fmtBRL(grouped[b.key].totalP),
        fmtBRL(grouped[b.key].totalR),
      ]),
      foot: [["Total", fmtBRL(totalP), fmtBRL(totalR)]],
      headStyles: { fillColor: [245, 158, 11], textColor: 255 },
      footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: "bold" },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [["Tipo", "Documento", "Cliente/Fornecedor", "Vencimento", "Dias", "Valor"]],
      body: enriched
        .sort((a: any, b: any) => b.daysOverdue - a.daysOverdue)
        .map((it: any) => [
          it.source === "payable" ? "A pagar" : "A receber",
          it.title,
          it.client_or_supplier || "—",
          new Date(it.due_date).toLocaleDateString("pt-BR"),
          it.daysOverdue > 0 ? `+${it.daysOverdue}` : `${it.daysOverdue}`,
          fmtBRL(it.amount),
        ]),
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      styles: { fontSize: 8 },
      columnStyles: { 5: { halign: "right" } },
    });

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `aging-${new Date().toISOString().slice(0,10)}.pdf`; a.click();
    URL.revokeObjectURL(url);

    await (supabase as any).from("financial_report_snapshots").insert({
      customer_product_id: customerProductId,
      report_type: "aging",
      title: `Aging ${new Date().toLocaleDateString("pt-BR")}`,
      payload: { totalP, totalR, buckets: grouped },
    });
  };

  if (loading) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Carregando aging…
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold tracking-tight">Aging — vencimentos e atrasos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visão consolidada de quanto está vencendo e há quantos dias.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshOverdue} disabled={refreshing}>
            {refreshing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
            Atualizar status
          </Button>
          <Button size="sm" onClick={exportPDF} className="bg-amber-500 hover:bg-amber-600 text-white">
            <FileDown className="w-3.5 h-3.5 mr-1" /> Exportar PDF
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="p-5 border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-rose-500/5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total a pagar</p>
          <p className="text-2xl font-bold text-rose-500 mt-1">{fmtBRL(totalP)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{enriched.filter(i => i.source === "payable").length} título(s)</p>
        </Card>
        <Card className="p-5 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total a receber</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{fmtBRL(totalR)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{enriched.filter(i => i.source === "receivable").length} título(s)</p>
        </Card>
      </div>

      <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {BUCKETS.map((b) => {
          const Icon = b.icon;
          const g = grouped[b.key];
          return (
            <Card key={b.key} className="p-4 border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" />
                <p className="text-xs font-semibold">{b.label}</p>
              </div>
              <div className="space-y-1">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">A pagar</p>
                  <p className="text-sm font-bold tabular-nums">{fmtBRL(g.totalP)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">A receber</p>
                  <p className="text-sm font-bold tabular-nums">{fmtBRL(g.totalR)}</p>
                </div>
              </div>
              <Badge variant="outline" className={`mt-2 text-[10px] ${b.tone}`}>
                {g.payable.length + g.receivable.length} título(s)
              </Badge>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h4 className="font-semibold text-sm">Detalhe por título ({enriched.length})</h4>
        </div>
        {enriched.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/50" />
            <p className="text-sm font-semibold">Tudo em dia!</p>
            <p className="text-xs mt-1">Nenhum título pendente ou vencido.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {enriched
              .sort((a: any, b: any) => b.daysOverdue - a.daysOverdue)
              .map((it: any) => {
                const isOverdue = it.daysOverdue > 0;
                return (
                  <div key={`${it.source}-${it.id}`} className="p-3 flex items-center gap-3 hover:bg-muted/30">
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${
                      it.source === "payable" ? "bg-rose-500/10 text-rose-500 border-rose-500/30" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                    }`}>
                      {it.source === "payable" ? "A pagar" : "A receber"}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{it.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {it.client_or_supplier || "—"} · vence {new Date(it.due_date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] tabular-nums shrink-0 ${
                      isOverdue ? "bg-rose-500/10 text-rose-500 border-rose-500/30" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                    }`}>
                      {isOverdue ? `+${it.daysOverdue}d` : `${Math.abs(it.daysOverdue)}d`}
                    </Badge>
                    <p className={`text-sm font-bold tabular-nums shrink-0 w-28 text-right ${
                      it.source === "payable" ? "text-rose-500" : "text-emerald-500"
                    }`}>
                      {fmtBRL(it.amount)}
                    </p>
                  </div>
                );
              })}
          </div>
        )}
      </Card>
    </div>
  );
}
