import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, FileText, CheckCircle2, Clock, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtBRL } from "./taxTables";
import { toast } from "sonner";

interface DasGuide {
  id: string;
  regime: string;
  anexo: string | null;
  competencia_month: number;
  competencia_year: number;
  total_amount: number;
  due_date: string;
  payment_status: string;
  pdf_url: string | null;
  paid_at: string | null;
}

interface Props {
  customerProductId: string;
  refreshKey?: number;
}

const STATUS_BADGE: Record<string, { label: string; cls: string; icon: any }> = {
  pending: { label: "Pendente", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30", icon: Clock },
  paid: { label: "Paga", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: CheckCircle2 },
  overdue: { label: "Vencida", cls: "bg-red-500/15 text-red-500 border-red-500/30", icon: AlertCircle },
  cancelled: { label: "Cancelada", cls: "bg-muted text-muted-foreground border-border", icon: AlertCircle },
};

export function TaxHistoryPanel({ customerProductId, refreshKey }: Props) {
  const [guides, setGuides] = useState<DasGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    if (!customerProductId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("financial_das_guides")
      .select("id, regime, anexo, competencia_month, competencia_year, total_amount, due_date, payment_status, pdf_url, paid_at")
      .eq("customer_product_id", customerProductId)
      .order("competencia_year", { ascending: false })
      .order("competencia_month", { ascending: false })
      .limit(24);
    if (!error && data) setGuides(data as DasGuide[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [customerProductId, refreshKey]);

  async function markAsPaid(id: string) {
    setUpdatingId(id);
    const { error } = await supabase
      .from("financial_das_guides")
      .update({ payment_status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Guia marcada como paga");
      load();
    }
    setUpdatingId(null);
  }

  return (
    <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-500" />
          <h3 className="font-semibold text-sm">Histórico de Guias DAS</h3>
        </div>
        <Badge variant="outline" className="text-xs">{guides.length} guia(s)</Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando...
        </div>
      ) : guides.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhuma guia DAS gerada ainda. Use "Emitir DAS" acima.
        </div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {guides.map((g) => {
            const st = STATUS_BADGE[g.payment_status] ?? STATUS_BADGE.pending;
            const Icon = st.icon;
            return (
              <div key={g.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-background transition-colors">
                <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">
                      {String(g.competencia_month).padStart(2, "0")}/{g.competencia_year}
                    </p>
                    <Badge className={`${st.cls} text-[10px]`} variant="outline">
                      <Icon className="w-2.5 h-2.5 mr-1" /> {st.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground uppercase">{g.regime}{g.anexo ? ` · ${g.anexo}` : ""}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vence em {new Date(g.due_date).toLocaleDateString("pt-BR")}
                    {g.paid_at && ` · Pago em ${new Date(g.paid_at).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-emerald-500">{fmtBRL(Number(g.total_amount))}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {g.pdf_url && (
                    <Button size="sm" variant="ghost" onClick={() => window.open(g.pdf_url!, "_blank")}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {g.payment_status === "pending" || g.payment_status === "overdue" ? (
                    <Button size="sm" variant="outline" disabled={updatingId === g.id} onClick={() => markAsPaid(g.id)}>
                      {updatingId === g.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Marcar paga"}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
