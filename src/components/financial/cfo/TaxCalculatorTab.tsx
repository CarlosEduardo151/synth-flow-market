import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calculator, Receipt, Calendar, FileText, TrendingUp,
  CheckCircle2, Building2, Briefcase, Scale, Download, Sparkles, Loader2,
  RefreshCw, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ANEXOS, ANEXO_LABELS, fmtBRL, parseBR, sanitizeMoneyInput, calcSimples } from "./tax/taxTables";
import { TaxHistoryPanel } from "./tax/TaxHistoryPanel";

interface Props { customerProductId: string }

const SIMPLES_LIMIT = 4_800_000;
const MEI_LIMIT = 81_000;

export function TaxCalculatorTab({ customerProductId }: Props) {
  const [regime, setRegime] = useState<"mei" | "simples">("simples");
  const [anexoKey, setAnexoKey] = useState<string>("Anexo I");
  const [revenue12mStr, setRevenue12mStr] = useState<string>("0,00");
  const [revenueMonthStr, setRevenueMonthStr] = useState<string>("0,00");
  const revenue12m = useMemo(() => parseBR(revenue12mStr), [revenue12mStr]);
  const revenueMonth = useMemo(() => parseBR(revenueMonthStr), [revenueMonthStr]);
  const [meiActivity, setMeiActivity] = useState<"comercio" | "servicos" | "transporte">("comercio");
  const [generating, setGenerating] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const simples = useMemo(
    () => calcSimples(anexoKey, revenue12m, revenueMonth),
    [anexoKey, revenue12m, revenueMonth],
  );

  const meiAmounts = { comercio: 71.6, servicos: 75.6, transporte: 80.6 };
  const meiDAS = meiAmounts[meiActivity];

  const today = new Date();
  const nextDue = new Date(today.getFullYear(), today.getMonth() + 1, 20);
  const daysLeft = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const limit = regime === "mei" ? MEI_LIMIT : SIMPLES_LIMIT;
  const usagePct = Math.min((revenue12m / limit) * 100, 100);
  const isNearLimit = usagePct >= 80;

  // Auto-preenche RBT12 e mês atual ao abrir
  useEffect(() => {
    if (customerProductId) {
      autoFill(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerProductId]);

  async function autoFill(silent = false) {
    if (!customerProductId) return;
    setAutoFilling(true);
    try {
      const now = new Date();
      const [{ data: rbt }, { data: monthRev }] = await Promise.all([
        supabase.rpc("calculate_rbt12", { _customer_product_id: customerProductId }),
        supabase.rpc("get_revenue_month", {
          _customer_product_id: customerProductId,
          _year: now.getFullYear(),
          _month: now.getMonth() + 1,
        }),
      ]);
      const rbtVal = Number(rbt ?? 0);
      const monthVal = Number(monthRev ?? 0);
      setRevenue12mStr(rbtVal.toFixed(2).replace(".", ","));
      setRevenueMonthStr(monthVal.toFixed(2).replace(".", ","));
      if (!silent) toast.success("Valores atualizados a partir das transações");
    } catch (e: any) {
      if (!silent) toast.error(e?.message ?? "Falha ao buscar transações");
    } finally {
      setAutoFilling(false);
    }
  }

  async function handleGenerate() {
    if (!customerProductId) {
      toast.error("Produto não identificado");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("financial-generate-das", {
        body: {
          customerProductId,
          regime,
          meiActivity,
          revenueMonth,
          revenue12m,
          anexo: anexoKey,
        },
      });
      if (error) throw error;
      const url = (data as any)?.pdf_url;
      if (url) {
        window.open(url, "_blank");
        toast.success("Guia DAS gerada com sucesso");
      } else {
        toast.success("Guia gerada");
      }
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar guia");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-emerald-500/10 via-background to-lime-500/10 p-6">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 text-xs font-medium mb-2">
              <Scale className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider">Brasil · Receita Federal</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Calculadora de Impostos</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-xl">
              Calcula DAS para MEI e Simples Nacional (Anexos I a V). Auto-preenche dados das suas transações.
            </p>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20" variant="outline">
            <Sparkles className="w-3 h-3 mr-1" /> Tabela 2024 + Fator R
          </Badge>
        </div>
      </div>

      {/* Alerta desenquadramento */}
      {isNearLimit && (
        <Card className="p-4 border-red-500/30 bg-gradient-to-r from-red-500/10 via-orange-500/5 to-transparent">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Atenção: você atingiu {usagePct.toFixed(1)}% do limite anual</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Limite {regime === "mei" ? "MEI" : "Simples Nacional"}: {fmtBRL(limit)}.
                {regime === "mei" ? " Considere migrar para Simples Nacional antes de exceder." : " Acima desse valor há desenquadramento e migração para Lucro Presumido/Real."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Due date alert */}
      <Card className="p-5 border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-semibold text-sm">Próximo vencimento DAS</p>
              <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30" variant="outline">
                {daysLeft} dias
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Vence em <strong>{nextDue.toLocaleDateString("pt-BR")}</strong> — gere a guia até o dia 20 do mês seguinte
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}
            Gerar guia
          </Button>
        </div>
      </Card>

      <Tabs value={regime} onValueChange={(v) => setRegime(v as any)}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="mei" className="gap-2"><Briefcase className="w-3.5 h-3.5" /> MEI</TabsTrigger>
          <TabsTrigger value="simples" className="gap-2"><Building2 className="w-3.5 h-3.5" /> Simples Nacional</TabsTrigger>
        </TabsList>

        {/* MEI */}
        <TabsContent value="mei" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-6 border-border/50 bg-card/50 backdrop-blur-sm">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-500" /> Microempreendedor Individual
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Tipo de atividade</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[
                      { v: "comercio", label: "Comércio/Indústria" },
                      { v: "servicos", label: "Serviços" },
                      { v: "transporte", label: "Transporte" },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        onClick={() => setMeiActivity(opt.v as any)}
                        className={`px-3 py-2 rounded-xl text-xs border transition-all ${
                          meiActivity === opt.v
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                            : "border-border/50 hover:border-border bg-background"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-muted/30 p-4 border border-border/50">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">Limite anual MEI · RBT12 atual</p>
                    <button
                      onClick={() => autoFill()}
                      disabled={autoFilling}
                      className="text-[11px] text-emerald-500 hover:text-emerald-600 flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${autoFilling ? "animate-spin" : ""}`} /> Atualizar
                    </button>
                  </div>
                  <p className="font-semibold text-sm">{fmtBRL(revenue12m)} / {fmtBRL(MEI_LIMIT)}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${usagePct >= 80 ? "bg-gradient-to-r from-orange-500 to-red-500" : "bg-gradient-to-r from-emerald-500 to-lime-500"}`}
                      style={{ width: `${Math.min((revenue12m / MEI_LIMIT) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {Math.min((revenue12m / MEI_LIMIT) * 100, 100).toFixed(1)}% do limite utilizado
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6 border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="w-4 h-4 text-emerald-500" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DAS deste mês</p>
              </div>
              <p className="text-4xl font-bold text-emerald-500 mb-3">{fmtBRL(meiDAS)}</p>
              <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border/50 pt-3">
                <Row label="INSS (5% s/min)" value={fmtBRL(meiDAS - (meiActivity === "comercio" ? 1 : meiActivity === "servicos" ? 5 : 6))} />
                <Row label={meiActivity === "servicos" ? "ISS" : "ICMS"} value={fmtBRL(meiActivity === "comercio" ? 1 : meiActivity === "servicos" ? 5 : 6)} />
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white">
                {generating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                Gerar DAS do mês
              </Button>
            </Card>
          </div>
        </TabsContent>

        {/* SIMPLES */}
        <TabsContent value="simples" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-6 border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500" /> Simples Nacional
                </h3>
                <Button variant="outline" size="sm" onClick={() => autoFill()} disabled={autoFilling}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${autoFilling ? "animate-spin" : ""}`} />
                  Auto-preencher
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Anexo</Label>
                  <Select value={anexoKey} onValueChange={setAnexoKey}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(ANEXOS).map((k) => (
                        <SelectItem key={k} value={k}>{ANEXO_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Receita Bruta últimos 12 meses (RBT12)</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={revenue12mStr}
                      onChange={(e) => setRevenue12mStr(sanitizeMoneyInput(e.target.value))}
                      placeholder="0,00"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Faturamento do mês atual</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={revenueMonthStr}
                      onChange={(e) => setRevenueMonthStr(sanitizeMoneyInput(e.target.value))}
                      placeholder="0,00"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-muted/30 p-4 border border-border/50 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Faixa atual</span>
                    <span className="font-semibold">Até {fmtBRL(simples.faixa.upTo)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Alíquota nominal</span>
                    <span className="font-semibold">{(simples.faixa.rate * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Parcela a deduzir</span>
                    <span className="font-semibold">{fmtBRL(simples.faixa.deduct)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-border/50">
                    <span className="text-foreground font-medium">Alíquota efetiva</span>
                    <span className="font-bold text-emerald-500">{(simples.aliquotaEfetiva * 100).toFixed(3)}%</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-lime-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-emerald-500" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DAS estimado</p>
              </div>
              <p className="text-4xl font-bold text-emerald-500 mb-1">{fmtBRL(simples.das)}</p>
              <p className="text-xs text-muted-foreground mb-4">Sobre {fmtBRL(revenueMonth)} de faturamento</p>

              <div className="text-xs text-muted-foreground border-t border-border/50 pt-3">
                Detalhamento completo por tributo (IRPJ, CSLL, COFINS, PIS, CPP, ICMS/ISS) é gerado no PDF de acordo com o {anexoKey}.
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white">
                {generating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1" />}
                Emitir DAS
              </Button>
            </Card>
          </div>

          {/* Annual progress */}
          <Card className="mt-4 p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <p className="font-semibold text-sm">Trajetória anual — limite Simples {fmtBRL(SIMPLES_LIMIT)}</p>
              </div>
              <Badge variant="outline" className="text-xs">{((revenue12m / SIMPLES_LIMIT) * 100).toFixed(1)}%</Badge>
            </div>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${
                  isNearLimit
                    ? "bg-gradient-to-r from-orange-500 to-red-500"
                    : "bg-gradient-to-r from-emerald-500 via-lime-500 to-yellow-500"
                }`}
                style={{ width: `${Math.min((revenue12m / SIMPLES_LIMIT) * 100, 100)}%` }}
              />
            </div>
            <div className={`flex items-center gap-2 mt-3 text-xs ${isNearLimit ? "text-red-500" : "text-emerald-500"}`}>
              {isNearLimit ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {isNearLimit ? "Próximo do limite — risco de desenquadramento" : "Dentro do limite — você pode continuar no Simples Nacional"}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Histórico */}
      <TaxHistoryPanel customerProductId={customerProductId} refreshKey={refreshKey} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
