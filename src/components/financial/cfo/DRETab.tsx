import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileBarChart, Download, Printer, Mail, ChevronRight, TrendingUp,
  TrendingDown, ArrowDownRight, ArrowUpRight, Sparkles, FileText,
} from "lucide-react";

interface Props { customerProductId: string }

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const DATA = {
  receitaBruta: 184500,
  deducoes: 16830,
  custos: 62400,
  despOperacionais: {
    pessoal: 28400,
    marketing: 4720,
    administrativas: 9100,
    infraestrutura: 6400,
  },
  despFinanceiras: 1840,
  outras: -1200,
};

const RECEITA_LIQ = DATA.receitaBruta - DATA.deducoes;
const LUCRO_BRUTO = RECEITA_LIQ - DATA.custos;
const TOTAL_OP = Object.values(DATA.despOperacionais).reduce((a, b) => a + b, 0);
const EBITDA = LUCRO_BRUTO - TOTAL_OP;
const LUCRO_LIQ = EBITDA - DATA.despFinanceiras + DATA.outras;

const MARGEM_BRUTA = (LUCRO_BRUTO / RECEITA_LIQ) * 100;
const MARGEM_EBITDA = (EBITDA / RECEITA_LIQ) * 100;
const MARGEM_LIQUIDA = (LUCRO_LIQ / RECEITA_LIQ) * 100;

export function DRETab({ customerProductId: _ }: Props) {
  const [period] = useState("Abril 2026");

  return (
    <div className="space-y-6">
      {/* Hero */}
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
              Demonstração do Resultado do Exercício gerada automaticamente. Pronto para o contador.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-xs">Período: {period}</Badge>
            <Button variant="outline" size="sm"><Mail className="w-3.5 h-3.5 mr-1" /> Enviar contador</Button>
            <Button variant="outline" size="sm"><Printer className="w-3.5 h-3.5 mr-1" /> Imprimir</Button>
            <Button className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white border-0">
              <Download className="w-3.5 h-3.5 mr-1" /> PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Margens */}
      <div className="grid md:grid-cols-3 gap-4">
        <MarginCard label="Margem Bruta" pct={MARGEM_BRUTA} value={LUCRO_BRUTO} color="emerald" />
        <MarginCard label="Margem EBITDA" pct={MARGEM_EBITDA} value={EBITDA} color="blue" />
        <MarginCard label="Margem Líquida" pct={MARGEM_LIQUIDA} value={LUCRO_LIQ} color="violet" />
      </div>

      {/* DRE waterfall card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-indigo-500/5 to-transparent">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold">Demonstração do Resultado · {period}</h3>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30" variant="outline">
            <Sparkles className="w-3 h-3 mr-1" /> Validado
          </Badge>
        </div>

        <div className="p-2 sm:p-5 space-y-1">
          <DreLine label="(+) Receita Bruta de Vendas" value={DATA.receitaBruta} bold positive />
          <DreLine label="(−) Deduções (impostos s/ vendas, devoluções)" value={-DATA.deducoes} indent />
          <DreSubtotal label="(=) Receita Líquida" value={RECEITA_LIQ} />

          <DreLine label="(−) Custo dos Produtos/Serviços Vendidos (CPV/CSV)" value={-DATA.custos} indent />
          <DreSubtotal label="(=) Lucro Bruto" value={LUCRO_BRUTO} pct={MARGEM_BRUTA} />

          <DreLine label="(−) Despesas Operacionais" value={-TOTAL_OP} bold />
          <DreLine label="Pessoal & encargos" value={-DATA.despOperacionais.pessoal} indent dimmed />
          <DreLine label="Marketing & vendas" value={-DATA.despOperacionais.marketing} indent dimmed />
          <DreLine label="Administrativas" value={-DATA.despOperacionais.administrativas} indent dimmed />
          <DreLine label="Infraestrutura & TI" value={-DATA.despOperacionais.infraestrutura} indent dimmed />

          <DreSubtotal label="(=) EBITDA" value={EBITDA} pct={MARGEM_EBITDA} highlight />

          <DreLine label="(−) Despesas Financeiras (juros, tarifas)" value={-DATA.despFinanceiras} indent />
          <DreLine label="(±) Outras receitas/despesas" value={DATA.outras} indent />

          <DreFinal label="(=) Lucro Líquido do Exercício" value={LUCRO_LIQ} pct={MARGEM_LIQUIDA} />
        </div>

        <div className="px-5 py-3 bg-muted/30 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>Gerado automaticamente em {new Date().toLocaleString("pt-BR")}</span>
          <span>Padrão: CPC 26 (R1) · Lei 11.638/07</span>
        </div>
      </Card>
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
        {pct !== undefined && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{fmtPct(pct)}</Badge>
        )}
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
