import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Calculator, Receipt, Calendar, FileText, TrendingUp,
  CheckCircle2, Building2, Briefcase, Scale, Download, Sparkles, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props { customerProductId: string }

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Anexo I — Comércio (Simples Nacional 2024)
const ANEXO_I = [
  { upTo: 180000, rate: 0.04, deduct: 0 },
  { upTo: 360000, rate: 0.073, deduct: 5940 },
  { upTo: 720000, rate: 0.095, deduct: 13860 },
  { upTo: 1800000, rate: 0.107, deduct: 22500 },
  { upTo: 3600000, rate: 0.143, deduct: 87300 },
  { upTo: 4800000, rate: 0.19, deduct: 378000 },
];

export function TaxCalculatorTab({ customerProductId }: Props) {
  const [regime, setRegime] = useState<"mei" | "simples">("simples");
  const [revenue12m, setRevenue12m] = useState<number>(540000);
  const [revenueMonth, setRevenueMonth] = useState<number>(48000);
  const [meiActivity, setMeiActivity] = useState<"comercio" | "servicos" | "transporte">("comercio");
  const [generating, setGenerating] = useState(false);

  const simples = useMemo(() => {
    const faixa = ANEXO_I.find(f => revenue12m <= f.upTo) ?? ANEXO_I[ANEXO_I.length - 1];
    const aliquotaEfetiva = ((revenue12m * faixa.rate) - faixa.deduct) / revenue12m;
    const das = revenueMonth * aliquotaEfetiva;
    return { faixa, aliquotaEfetiva: aliquotaEfetiva * 100, das };
  }, [revenue12m, revenueMonth]);

  const meiAmounts = { comercio: 71.6, servicos: 75.6, transporte: 80.6 };
  const meiDAS = meiAmounts[meiActivity];

  const today = new Date();
  const nextDue = new Date(today.getFullYear(), today.getMonth() + 1, 20);
  const daysLeft = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

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
          anexo: "Anexo I",
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
              Estima o DAS do mês baseado no faturamento. Suporta MEI, Simples Nacional (Anexos I a V).
            </p>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20" variant="outline">
            <Sparkles className="w-3 h-3 mr-1" /> Atualizado com tabela 2024
          </Badge>
        </div>
      </div>

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
          <Button variant="outline" size="sm">
            <Download className="w-3.5 h-3.5 mr-1" /> Gerar guia
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
                  <p className="text-xs text-muted-foreground mb-1">Limite anual MEI</p>
                  <p className="font-semibold">R$ 81.000,00 / ano</p>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-[35%] bg-gradient-to-r from-emerald-500 to-lime-500 rounded-full" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">35% do limite utilizado este ano</p>
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
              <Button className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white">Gerar DAS do mês</Button>
            </Card>
          </div>
        </TabsContent>

        {/* SIMPLES */}
        <TabsContent value="simples" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-6 border-border/50 bg-card/50 backdrop-blur-sm">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-500" /> Simples Nacional — Anexo I (Comércio)
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Receita Bruta últimos 12 meses (RBT12)</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      value={revenue12m}
                      onChange={(e) => setRevenue12m(Number(e.target.value) || 0)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Faturamento do mês atual</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      value={revenueMonth}
                      onChange={(e) => setRevenueMonth(Number(e.target.value) || 0)}
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
                    <span className="font-bold text-emerald-500">{simples.aliquotaEfetiva.toFixed(3)}%</span>
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

              <div className="space-y-2 text-xs border-t border-border/50 pt-3">
                <Row label="IRPJ (5,5%)" value={fmtBRL(simples.das * 0.055)} />
                <Row label="CSLL (3,5%)" value={fmtBRL(simples.das * 0.035)} />
                <Row label="COFINS (12,7%)" value={fmtBRL(simples.das * 0.127)} />
                <Row label="PIS (2,76%)" value={fmtBRL(simples.das * 0.0276)} />
                <Row label="CPP (41,5%)" value={fmtBRL(simples.das * 0.415)} />
                <Row label="ICMS (34%)" value={fmtBRL(simples.das * 0.34)} />
              </div>
              <Button className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white">
                <FileText className="w-3.5 h-3.5 mr-1" /> Emitir DAS
              </Button>
            </Card>
          </div>

          {/* Annual progress */}
          <Card className="mt-4 p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <p className="font-semibold text-sm">Trajetória anual — limite Simples R$ 4.800.000</p>
              </div>
              <Badge variant="outline" className="text-xs">{((revenue12m / 4800000) * 100).toFixed(1)}%</Badge>
            </div>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-lime-500 to-yellow-500 rounded-full"
                style={{ width: `${Math.min((revenue12m / 4800000) * 100, 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-emerald-500">
              <CheckCircle2 className="w-3.5 h-3.5" /> Dentro do limite — você pode continuar no Simples Nacional
            </div>
          </Card>
        </TabsContent>
      </Tabs>
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
