import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  FileBarChart, Download, Printer, ChevronRight, TrendingUp, TrendingDown,
  ArrowDownRight, ArrowUpRight, Sparkles, FileText, Loader2, ChevronLeft, FileDown,
} from "lucide-react";
import { generateDREPDF } from "@/lib/generateDREPDF";

interface Props { customerProductId: string }

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${isFinite(v) ? v.toFixed(1) : "0.0"}%`;

interface Tx {
  type: string;
  amount: number;
  date: string | null;
  description: string | null;
  source: string | null;
  payment_method: string | null;
}

const SALARY_KEYWORDS = ["salário", "salario", "folha", "pagamento funcion", "ferias", "férias", "13º", "13o"];
const TAX_KEYWORDS = ["imposto", "das ", "darf", "iss", "icms", "irpj", "csll", "cofins", "pis ", "inss"];
const FIN_KEYWORDS = ["juros", "tarifa", "iof", "anuidade banc", "tac"];
const MARKETING_KEYWORDS = ["ads", "anúncio", "anuncio", "marketing", "google ads", "meta ads", "facebook ads"];
const INFRA_KEYWORDS = ["aluguel", "internet", "energia", "água", "agua", "telefone", "luz", "saas", "hospedagem", "cloud"];

function classify(desc: string): "salary" | "tax" | "financial" | "marketing" | "infra" | "other" {
  const d = (desc || "").toLowerCase();
  if (SALARY_KEYWORDS.some(k => d.includes(k))) return "salary";
  if (TAX_KEYWORDS.some(k => d.includes(k))) return "tax";
  if (FIN_KEYWORDS.some(k => d.includes(k))) return "financial";
  if (MARKETING_KEYWORDS.some(k => d.includes(k))) return "marketing";
  if (INFRA_KEYWORDS.some(k => d.includes(k))) return "infra";
  return "other";
}

export function DRETab({ customerProductId }: Props) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const period = new Date(year, month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("financial_agent_transactions")
        .select("type, amount, date, description, source, payment_method")
        .eq("customer_product_id", customerProductId)
        .gte("date", start)
        .lte("date", end);
      if (error) {
        toast({ title: "Erro ao carregar DRE", description: error.message, variant: "destructive" });
      }
      setTxs((data ?? []) as Tx[]);
      setLoading(false);
    };
    load();
  }, [month, year, customerProductId]);

  const dre = useMemo(() => {
    const incomes = txs.filter(t => t.type === "income");
    const expenses = txs.filter(t => t.type !== "income");
    const receitaBruta = incomes.reduce((a, t) => a + Number(t.amount), 0);

    const buckets = { salary: 0, tax: 0, financial: 0, marketing: 0, infra: 0, other: 0 };
    expenses.forEach(t => {
      buckets[classify(t.description || "")] += Number(t.amount);
    });

    const deducoes = buckets.tax;
    const receitaLiq = receitaBruta - deducoes;
    const custos = 0; // sem categoria CPV explícita ainda
    const lucroBruto = receitaLiq - custos;

    const despOp = {
      pessoal: buckets.salary,
      marketing: buckets.marketing,
      administrativas: buckets.other,
      infraestrutura: buckets.infra,
    };
    const totalOp = despOp.pessoal + despOp.marketing + despOp.administrativas + despOp.infraestrutura;
    const ebitda = lucroBruto - totalOp;
    const despFin = buckets.financial;
    const lucroLiq = ebitda - despFin;

    return {
      receitaBruta, deducoes, receitaLiq, custos, lucroBruto,
      despOp, totalOp, ebitda, despFin, lucroLiq,
      mb: receitaLiq ? (lucroBruto / receitaLiq) * 100 : 0,
      me: receitaLiq ? (ebitda / receitaLiq) * 100 : 0,
      ml: receitaLiq ? (lucroLiq / receitaLiq) * 100 : 0,
    };
  }, [txs]);

  const goPrev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const goNext = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handlePrint = () => window.print();

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify({ period, dre }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `dre-${year}-${month + 1}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    try {
      const blob = generateDREPDF({ period, txCount: txs.length, ...dre });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `DRE-${year}-${String(month + 1).padStart(2, "0")}.pdf`; a.click();
      URL.revokeObjectURL(url);

      // Snapshot no banco
      const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      await (supabase as any).from("financial_report_snapshots").insert({
        customer_product_id: customerProductId,
        report_type: "dre",
        period_start: start,
        period_end: end,
        title: `DRE ${period}`,
        payload: { ...dre, txCount: txs.length },
      });
      toast({ title: "PDF gerado", description: "Relatório arquivado no histórico." });
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: e?.message ?? "Tente novamente", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-indigo-500/10 via-background to-blue-500/10 p-6">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-500 text-xs font-medium mb-2">
              <FileBarChart className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider">Demonstrativo Contábil</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">DRE Automático</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-xl">
              Demonstração do Resultado calculada a partir das suas transações reais.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={goPrev}><ChevronLeft className="w-4 h-4" /></Button>
            <Badge variant="outline" className="text-xs capitalize">{period}</Badge>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={goNext}><ChevronRight className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-3.5 h-3.5 mr-1" /> Imprimir</Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON}><Download className="w-3.5 h-3.5 mr-1" /> JSON</Button>
            <Button className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white border-0" onClick={handleExportPDF}>
              <FileDown className="w-3.5 h-3.5 mr-1" /> Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Calculando DRE…
        </Card>
      ) : txs.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="font-semibold">Sem transações neste período</p>
          <p className="text-xs text-muted-foreground mt-1">
            Importe um extrato ou cadastre transações para gerar o DRE automaticamente.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <MarginCard label="Margem Bruta" pct={dre.mb} value={dre.lucroBruto} color="emerald" />
            <MarginCard label="Margem EBITDA" pct={dre.me} value={dre.ebitda} color="blue" />
            <MarginCard label="Margem Líquida" pct={dre.ml} value={dre.lucroLiq} color="violet" />
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="p-5 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-indigo-500/5 to-transparent">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <h3 className="font-semibold capitalize">Demonstração do Resultado · {period}</h3>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30" variant="outline">
                <Sparkles className="w-3 h-3 mr-1" /> Calculado de {txs.length} transação(ões)
              </Badge>
            </div>

            <div className="p-2 sm:p-5 space-y-1">
              <DreLine label="(+) Receita Bruta" value={dre.receitaBruta} bold positive />
              <DreLine label="(−) Deduções (impostos s/ vendas)" value={-dre.deducoes} indent />
              <DreSubtotal label="(=) Receita Líquida" value={dre.receitaLiq} />

              <DreLine label="(−) Custo dos Produtos/Serviços (CPV/CSV)" value={-dre.custos} indent />
              <DreSubtotal label="(=) Lucro Bruto" value={dre.lucroBruto} pct={dre.mb} />

              <DreLine label="(−) Despesas Operacionais" value={-dre.totalOp} bold />
              <DreLine label="Pessoal & encargos" value={-dre.despOp.pessoal} indent dimmed />
              <DreLine label="Marketing & vendas" value={-dre.despOp.marketing} indent dimmed />
              <DreLine label="Administrativas / Outras" value={-dre.despOp.administrativas} indent dimmed />
              <DreLine label="Infraestrutura & TI" value={-dre.despOp.infraestrutura} indent dimmed />

              <DreSubtotal label="(=) EBITDA" value={dre.ebitda} pct={dre.me} highlight />

              <DreLine label="(−) Despesas Financeiras" value={-dre.despFin} indent />

              <DreFinal label="(=) Lucro Líquido do Exercício" value={dre.lucroLiq} pct={dre.ml} />
            </div>

            <div className="px-5 py-3 bg-muted/30 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Gerado em {new Date().toLocaleString("pt-BR")}</span>
              <span>Categorização automática por palavras-chave nas descrições</span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function MarginCard({ label, pct, value, color }: { label: string; pct: number; value: number; color: "emerald" | "blue" | "violet" }) {
  const colorMap = {
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-500",
    blue: "from-blue-500/15 to-blue-500/5 text-blue-500",
    violet: "from-violet-500/15 to-violet-500/5 text-violet-500",
  };
  return (
    <Card className={`p-5 border-border/50 bg-gradient-to-br ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {pct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      </div>
      <p className="text-3xl font-bold">{fmtPct(pct)}</p>
      <p className="text-xs text-muted-foreground mt-1">{fmtBRL(value)}</p>
    </Card>
  );
}

function DreLine({ label, value, indent, bold, positive, dimmed }: any) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors ${indent ? "pl-8" : ""}`}>
      <span className={`text-sm ${bold ? "font-semibold" : ""} ${dimmed ? "text-muted-foreground" : ""}`}>
        {indent && <ChevronRight className="w-3 h-3 inline -ml-4 mr-1 text-muted-foreground" />}
        {label}
      </span>
      <span className={`text-sm tabular-nums font-mono ${value < 0 ? "text-rose-500" : positive ? "text-emerald-500" : ""} ${bold ? "font-bold" : ""}`}>
        {value < 0 ? `(${fmtBRL(Math.abs(value))})` : fmtBRL(value)}
      </span>
    </div>
  );
}

function DreSubtotal({ label, value, pct, highlight }: { label: string; value: number; pct?: number; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-3 rounded-xl border ${
      highlight
        ? "bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-blue-500/30"
        : "bg-muted/40 border-border/50"
    } my-1.5`}>
      <span className="text-sm font-bold">{label}</span>
      <div className="flex items-center gap-3">
        {pct !== undefined && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{fmtPct(pct)}</Badge>}
        <span className="text-base font-bold tabular-nums font-mono">{fmtBRL(value)}</span>
      </div>
    </div>
  );
}

function DreFinal({ label, value, pct }: { label: string; value: number; pct: number }) {
  const positive = value >= 0;
  return (
    <div className={`flex items-center justify-between px-4 py-4 rounded-2xl mt-2 ${
      positive
        ? "bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/40"
        : "bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-transparent border border-rose-500/40"
    }`}>
      <div className="flex items-center gap-2">
        {positive ? <ArrowUpRight className="w-5 h-5 text-emerald-500" /> : <ArrowDownRight className="w-5 h-5 text-rose-500" />}
        <span className="text-base font-bold">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <Badge className={positive ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/40" : "bg-rose-500/20 text-rose-500 border-rose-500/40"} variant="outline">
          {fmtPct(pct)}
        </Badge>
        <span className={`text-2xl font-bold tabular-nums font-mono ${positive ? "text-emerald-500" : "text-rose-500"}`}>{fmtBRL(value)}</span>
      </div>
    </div>
  );
}
