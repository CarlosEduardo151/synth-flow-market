import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeftRight, Globe2, TrendingUp, TrendingDown, RefreshCw, Sparkles, Wallet, Loader2,
} from "lucide-react";

interface Props { customerProductId: string }

interface Account {
  code: string; name: string; symbol: string; flag: string; rateBRL: number;
}

const CURRENCIES: Omit<Account, "rateBRL">[] = [
  { code: "BRL", name: "Real Brasileiro", symbol: "R$", flag: "🇧🇷" },
  { code: "USD", name: "Dólar Americano", symbol: "$",  flag: "🇺🇸" },
  { code: "EUR", name: "Euro",            symbol: "€",  flag: "🇪🇺" },
  { code: "GBP", name: "Libra Esterlina", symbol: "£",  flag: "🇬🇧" },
];

const COLORS: Record<string, string> = {
  BRL: "from-green-500 to-emerald-500",
  USD: "from-blue-500 to-indigo-500",
  EUR: "from-violet-500 to-purple-500",
  GBP: "from-rose-500 to-pink-500",
};

export function MultiCurrencyTab({ customerProductId: _ }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("BRL");
  const [amount, setAmount] = useState<number>(1000);
  const { toast } = useToast();

  const fetchRates = async () => {
    setLoading(true);
    try {
      // API pública gratuita de cotações com base BRL
      const res = await fetch("https://open.er-api.com/v6/latest/BRL");
      const json = await res.json();
      if (!json?.rates) throw new Error("Sem cotações");
      // rates: 1 BRL = X foreign. Queremos 1 foreign = Y BRL → 1 / rates[code]
      const list: Account[] = CURRENCIES.map(c => ({
        ...c,
        rateBRL: c.code === "BRL" ? 1 : 1 / Number(json.rates[c.code] ?? 0),
      })).filter(c => c.rateBRL > 0);
      setAccounts(list);
      setUpdatedAt(new Date());
    } catch (e: any) {
      toast({ title: "Erro ao carregar cotações", description: e?.message ?? "Tente novamente", variant: "destructive" });
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRates(); }, []);

  const converted = useMemo(() => {
    if (accounts.length === 0) return 0;
    const f = accounts.find(a => a.code === from);
    const t = accounts.find(a => a.code === to);
    if (!f || !t) return 0;
    const inBRL = amount * f.rateBRL;
    return inBRL / t.rateBRL;
  }, [from, to, amount, accounts]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-blue-500/10 via-background to-purple-500/10 p-6">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-500 text-xs font-medium mb-2">
              <Globe2 className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider">Cotações em tempo real</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Multi-Moeda</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-xl">
              Cotações públicas atualizadas (open.er-api.com). Use o conversor para operar em diferentes moedas.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={fetchRates} disabled={loading}>
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              Atualizar cotações
            </Button>
          </div>
        </div>
      </div>

      <Card className="p-6 border-border/50 bg-gradient-to-br from-foreground/5 via-background to-blue-500/5 relative overflow-hidden">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Sparkles className="w-3 h-3" />
          {updatedAt ? `Atualizado ${updatedAt.toLocaleTimeString("pt-BR")}` : "—"}
        </div>
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-blue-500" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Cotações de referência (1 unidade → R$)</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Os saldos por moeda serão consolidados quando você cadastrar contas multi-moeda nas suas transações.
        </p>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loading && accounts.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5 border-border/50 bg-card/50 h-32 animate-pulse" />
            ))
          : accounts.map((acc) => (
              <Card key={acc.code} className="relative p-5 border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all overflow-hidden group">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${COLORS[acc.code]}`} />
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl leading-none">{acc.flag}</span>
                    <div>
                      <p className="font-bold text-sm leading-tight">{acc.code}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{acc.name}</p>
                    </div>
                  </div>
                </div>
                {acc.code !== "BRL" && (
                  <>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">1 {acc.code}</p>
                    <p className="text-2xl font-bold">R$ {acc.rateBRL.toFixed(4)}</p>
                  </>
                )}
                {acc.code === "BRL" && (
                  <>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Moeda base</p>
                    <p className="text-2xl font-bold">1,0000</p>
                  </>
                )}
              </Card>
            ))}
      </div>

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
                {accounts.map(a => <option key={a.code} value={a.code}>{a.flag} {a.code} — {a.name}</option>)}
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
                {accounts.map(a => <option key={a.code} value={a.code}>{a.flag} {a.code} — {a.name}</option>)}
              </select>
              <p className="text-2xl font-bold text-blue-500">
                {converted.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Cotação cruzada via BRL · valores podem diferir do spread do seu banco
        </p>
      </Card>
    </div>
  );
}
