import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeftRight, Globe2, TrendingUp, TrendingDown, Plus, RefreshCw,
  Sparkles, Wallet,
} from "lucide-react";

interface Props { customerProductId: string }

interface Account {
  code: string; name: string; symbol: string; flag: string;
  balance: number; rateBRL: number; change24h: number; color: string;
}

const ACCOUNTS: Account[] = [
  { code: "BRL", name: "Real Brasileiro", symbol: "R$", flag: "🇧🇷", balance: 124500, rateBRL: 1, change24h: 0, color: "from-green-500 to-emerald-500" },
  { code: "USD", name: "Dólar Americano", symbol: "$", flag: "🇺🇸", balance: 8200, rateBRL: 5.12, change24h: 0.42, color: "from-blue-500 to-indigo-500" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", balance: 3400, rateBRL: 5.58, change24h: -0.18, color: "from-violet-500 to-purple-500" },
  { code: "GBP", name: "Libra Esterlina", symbol: "£", flag: "🇬🇧", balance: 1200, rateBRL: 6.48, change24h: 0.31, color: "from-rose-500 to-pink-500" },
];

export function MultiCurrencyTab({ customerProductId: _ }: Props) {
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("BRL");
  const [amount, setAmount] = useState<number>(1000);

  const totalBRL = useMemo(() => ACCOUNTS.reduce((a, c) => a + c.balance * c.rateBRL, 0), []);

  const converted = useMemo(() => {
    const f = ACCOUNTS.find(a => a.code === from)!;
    const t = ACCOUNTS.find(a => a.code === to)!;
    const inBRL = amount * f.rateBRL;
    return inBRL / t.rateBRL;
  }, [from, to, amount]);

  const fmt = (code: string, v: number) => {
    const a = ACCOUNTS.find(x => x.code === code)!;
    return `${a.symbol} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-blue-500/10 via-background to-purple-500/10 p-6">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-500 text-xs font-medium mb-2">
              <Globe2 className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider">Operação Internacional</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Multi-Moeda</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-xl">
              Gerencie saldos em diferentes moedas. Cotações atualizadas em tempo real para conversão automática.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm"><RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar cotações</Button>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 hover:opacity-90">
              <Plus className="w-4 h-4 mr-1" /> Nova moeda
            </Button>
          </div>
        </div>
      </div>

      {/* Patrimônio consolidado */}
      <Card className="p-6 border-border/50 bg-gradient-to-br from-foreground/5 via-background to-blue-500/5 relative overflow-hidden">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Sparkles className="w-3 h-3" /> Atualizado agora
        </div>
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-blue-500" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Patrimônio consolidado em BRL</span>
        </div>
        <p className="text-4xl font-bold tracking-tight">
          R$ {totalBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className="flex items-center gap-1 text-emerald-500"><TrendingUp className="w-3 h-3" /> +R$ 1.247 hoje</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">+0,82% últimas 24h</span>
        </div>
      </Card>

      {/* Account cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ACCOUNTS.map((acc) => (
          <Card key={acc.code} className="relative p-5 border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all overflow-hidden group">
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${acc.color}`} />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl leading-none">{acc.flag}</span>
                <div>
                  <p className="font-bold text-sm leading-tight">{acc.code}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{acc.name}</p>
                </div>
              </div>
              {acc.code !== "BRL" && (
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${acc.change24h >= 0 ? "text-emerald-500 border-emerald-500/30" : "text-rose-500 border-rose-500/30"}`}
                >
                  {acc.change24h >= 0 ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
                  {Math.abs(acc.change24h).toFixed(2)}%
                </Badge>
              )}
            </div>
            <p className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Saldo</p>
            <p className="text-xl font-bold mb-1">{fmt(acc.code, acc.balance)}</p>
            {acc.code !== "BRL" && (
              <p className="text-[11px] text-muted-foreground">
                ≈ R$ {(acc.balance * acc.rateBRL).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            )}
            {acc.code !== "BRL" && (
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">1 {acc.code} =</span>
                <span className="font-semibold">R$ {acc.rateBRL.toFixed(4)}</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Converter */}
      <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <ArrowLeftRight className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold">Conversor instantâneo</h3>
        </div>
        <div className="grid md:grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">De</label>
            <div className="rounded-2xl border border-border/50 bg-background p-3">
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold mb-2 outline-none cursor-pointer"
              >
                {ACCOUNTS.map(a => <option key={a.code} value={a.code}>{a.flag} {a.code} — {a.name}</option>)}
              </select>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="border-0 px-0 text-2xl font-bold h-auto focus-visible:ring-0"
              />
            </div>
          </div>
          <Button
            size="icon"
            variant="outline"
            className="rounded-full mb-3 mx-auto"
            onClick={() => { const t = from; setFrom(to); setTo(t); }}
          >
            <ArrowLeftRight className="w-4 h-4" />
          </Button>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Para</label>
            <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-3">
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold mb-2 outline-none cursor-pointer"
              >
                {ACCOUNTS.map(a => <option key={a.code} value={a.code}>{a.flag} {a.code} — {a.name}</option>)}
              </select>
              <p className="text-2xl font-bold text-blue-500">
                {converted.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Cotação cruzada via BRL · spread comercial estimado
        </p>
      </Card>
    </div>
  );
}
