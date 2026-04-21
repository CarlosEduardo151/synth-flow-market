import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeftRight, Globe2, RefreshCw, Sparkles, Wallet, Loader2, Plus, Trash2, Star, StarOff,
} from "lucide-react";

interface Props { customerProductId: string }

interface Quote { code: string; name: string; symbol: string; flag: string; rateBRL: number }
interface Account {
  id: string;
  currency_code: string;
  account_name: string;
  balance: number;
  is_primary: boolean;
  notes: string | null;
}

const CURRENCIES = [
  { code: "BRL", name: "Real Brasileiro", symbol: "R$", flag: "🇧🇷" },
  { code: "USD", name: "Dólar Americano", symbol: "$",  flag: "🇺🇸" },
  { code: "EUR", name: "Euro",            symbol: "€",  flag: "🇪🇺" },
  { code: "GBP", name: "Libra Esterlina", symbol: "£",  flag: "🇬🇧" },
  { code: "ARS", name: "Peso Argentino",  symbol: "$",  flag: "🇦🇷" },
  { code: "CLP", name: "Peso Chileno",    symbol: "$",  flag: "🇨🇱" },
  { code: "CAD", name: "Dólar Canadense", symbol: "$",  flag: "🇨🇦" },
  { code: "JPY", name: "Iene Japonês",    symbol: "¥",  flag: "🇯🇵" },
];

const COLOR_MAP: Record<string, string> = {
  BRL: "from-emerald-500 to-green-500",
  USD: "from-blue-500 to-indigo-500",
  EUR: "from-violet-500 to-purple-500",
  GBP: "from-rose-500 to-pink-500",
  ARS: "from-sky-500 to-cyan-500",
  CLP: "from-red-500 to-orange-500",
  CAD: "from-red-400 to-rose-500",
  JPY: "from-pink-500 to-fuchsia-500",
};

export function MultiCurrencyTab({ customerProductId }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("BRL");
  const [amount, setAmount] = useState<number>(1000);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    currency_code: "USD", account_name: "", balance: "0", is_primary: false, notes: "",
  });
  const { toast } = useToast();

  const fetchQuotes = async () => {
    setLoadingQuotes(true);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/BRL");
      const json = await res.json();
      if (!json?.rates) throw new Error("Sem cotações");
      const list: Quote[] = CURRENCIES.map(c => ({
        ...c,
        rateBRL: c.code === "BRL" ? 1 : 1 / Number(json.rates[c.code] ?? 0),
      })).filter(c => c.rateBRL > 0);
      setQuotes(list);
      setUpdatedAt(new Date());
    } catch (e: any) {
      toast({ title: "Erro ao carregar cotações", description: e?.message ?? "Tente novamente", variant: "destructive" });
    } finally {
      setLoadingQuotes(false);
    }
  };

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    const { data, error } = await (supabase as any)
      .from("financial_currency_accounts")
      .select("*")
      .eq("customer_product_id", customerProductId)
      .order("is_primary", { ascending: false })
      .order("currency_code");
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setAccounts((data || []) as Account[]);
    setLoadingAccounts(false);
  };

  useEffect(() => { fetchQuotes(); }, []);
  useEffect(() => { fetchAccounts(); }, [customerProductId]);

  const converted = useMemo(() => {
    if (quotes.length === 0) return 0;
    const f = quotes.find(a => a.code === from);
    const t = quotes.find(a => a.code === to);
    if (!f || !t) return 0;
    return (amount * f.rateBRL) / t.rateBRL;
  }, [from, to, amount, quotes]);

  const consolidatedBRL = useMemo(() => {
    if (quotes.length === 0) return 0;
    return accounts.reduce((sum, acc) => {
      const q = quotes.find(x => x.code === acc.currency_code);
      return sum + Number(acc.balance) * (q?.rateBRL ?? 0);
    }, 0);
  }, [accounts, quotes]);

  const handleSave = async () => {
    if (!form.account_name.trim()) {
      toast({ title: "Informe um nome para a conta", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("financial_currency_accounts").insert({
      customer_product_id: customerProductId,
      currency_code: form.currency_code,
      account_name: form.account_name.trim(),
      balance: Number(form.balance) || 0,
      is_primary: form.is_primary,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Conta criada" });
      setOpen(false);
      setForm({ currency_code: "USD", account_name: "", balance: "0", is_primary: false, notes: "" });
      fetchAccounts();
    }
  };

  const updateBalance = async (id: string, balance: number) => {
    const { error } = await (supabase as any)
      .from("financial_currency_accounts")
      .update({ balance })
      .eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchAccounts();
  };

  const togglePrimary = async (acc: Account) => {
    const { error } = await (supabase as any)
      .from("financial_currency_accounts")
      .update({ is_primary: !acc.is_primary })
      .eq("id", acc.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchAccounts();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta conta?")) return;
    const { error } = await (supabase as any).from("financial_currency_accounts").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchAccounts();
  };

  const fmtCurrency = (code: string, value: number) => {
    try {
      return value.toLocaleString("pt-BR", { style: "currency", currency: code, minimumFractionDigits: 2 });
    } catch {
      return `${code} ${value.toFixed(2)}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-blue-500/10 via-background to-purple-500/10 p-6">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-500 text-xs font-medium mb-2">
              <Globe2 className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider">Tesouraria Multi-Moeda</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Multi-Moeda</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-xl">
              Cadastre contas em diferentes moedas, consolide o saldo total em BRL e converta valores em tempo real.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={fetchQuotes} disabled={loadingQuotes}>
              {loadingQuotes ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              Atualizar cotações
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                  <Plus className="w-4 h-4 mr-1" /> Nova conta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova conta multi-moeda</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Moeda</Label>
                      <Select value={form.currency_code} onValueChange={(v) => setForm(f => ({ ...f, currency_code: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map(c => (
                            <SelectItem key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Saldo inicial</Label>
                      <Input type="number" step="0.01" value={form.balance}
                        onChange={(e) => setForm(f => ({ ...f, balance: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Nome da conta</Label>
                    <Input value={form.account_name}
                      placeholder="Ex.: Wise USD, Conta Itaú, Carteira PIX"
                      onChange={(e) => setForm(f => ({ ...f, account_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Notas (opcional)</Label>
                    <Input value={form.notes}
                      onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_primary}
                      onCheckedChange={(v) => setForm(f => ({ ...f, is_primary: v }))} />
                    <Label className="text-xs">Conta principal desta moeda</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Saldo consolidado */}
      <Card className="p-6 border-border/50 bg-gradient-to-br from-foreground/5 via-background to-blue-500/5 relative overflow-hidden">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Sparkles className="w-3 h-3" />
          {updatedAt ? `Cotações ${updatedAt.toLocaleTimeString("pt-BR")}` : "—"}
        </div>
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-blue-500" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Saldo total consolidado</span>
        </div>
        <p className="text-4xl font-bold mt-2">
          {consolidatedBRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {accounts.length} {accounts.length === 1 ? "conta" : "contas"} em {new Set(accounts.map(a => a.currency_code)).size} {new Set(accounts.map(a => a.currency_code)).size === 1 ? "moeda" : "moedas"}
        </p>
      </Card>

      {/* Contas cadastradas */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-500" /> Suas contas
          </h3>
          <Badge variant="outline" className="text-xs">{accounts.length}</Badge>
        </div>
        {loadingAccounts ? (
          <div className="p-12 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Carregando…
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">Nenhuma conta cadastrada</p>
            <p className="text-xs text-muted-foreground mt-1">Adicione uma conta para começar a consolidar saldos.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {accounts.map((acc) => {
              const q = quotes.find(x => x.code === acc.currency_code);
              const meta = CURRENCIES.find(c => c.code === acc.currency_code);
              const inBRL = Number(acc.balance) * (q?.rateBRL ?? 0);
              const colorClass = COLOR_MAP[acc.currency_code] ?? "from-slate-500 to-slate-600";
              return (
                <Card key={acc.id} className="relative p-4 border-border/50 bg-card/50 hover:shadow-lg transition-all overflow-hidden group">
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${colorClass}`} />
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl shrink-0">{meta?.flag}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-sm leading-tight truncate">{acc.account_name}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{acc.currency_code} — {meta?.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => togglePrimary(acc)} title="Marcar como principal">
                        {acc.is_primary ? <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> : <StarOff className="w-3.5 h-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" onClick={() => remove(acc.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Saldo</p>
                    <Input
                      type="number" step="0.01"
                      defaultValue={Number(acc.balance)}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (!isNaN(v) && v !== Number(acc.balance)) updateBalance(acc.id, v);
                      }}
                      className="border-0 px-0 text-xl font-bold h-auto focus-visible:ring-0 bg-transparent"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ≈ {inBRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                  {acc.is_primary && (
                    <Badge className="absolute top-2 right-2 bg-amber-500/15 text-amber-500 border-amber-500/30 text-[9px]" variant="outline">
                      Principal
                    </Badge>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* Cotações de referência */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="font-semibold text-sm">Cotações de referência (1 unidade → R$)</h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
          {loadingQuotes && quotes.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-4 border-border/50 bg-card/50 h-24 animate-pulse" />
              ))
            : quotes.filter(q => q.code !== "BRL").map((q) => (
                <div key={q.code} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                  <span className="text-2xl">{q.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{q.code}</p>
                    <p className="text-[10px] text-muted-foreground">{q.name}</p>
                  </div>
                  <p className="text-base font-bold tabular-nums">R$ {q.rateBRL.toFixed(4)}</p>
                </div>
              ))}
        </div>
      </Card>

      {/* Conversor */}
      <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <ArrowLeftRight className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold">Conversor instantâneo</h3>
        </div>
        <div className="grid md:grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">De</label>
            <div className="rounded-2xl border border-border/50 bg-background p-3">
              <select value={from} onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold mb-2 outline-none cursor-pointer">
                {quotes.map(a => <option key={a.code} value={a.code}>{a.flag} {a.code} — {a.name}</option>)}
              </select>
              <Input type="number" value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="border-0 px-0 text-2xl font-bold h-auto focus-visible:ring-0" />
            </div>
          </div>
          <Button size="icon" variant="outline" className="rounded-full mb-3 mx-auto"
            onClick={() => { const t = from; setFrom(to); setTo(t); }}>
            <ArrowLeftRight className="w-4 h-4" />
          </Button>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Para</label>
            <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-3">
              <select value={to} onChange={(e) => setTo(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold mb-2 outline-none cursor-pointer">
                {quotes.map(a => <option key={a.code} value={a.code}>{a.flag} {a.code} — {a.name}</option>)}
              </select>
              <p className="text-2xl font-bold text-blue-500">
                {converted.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Conversão cruzada via BRL · valores podem diferir do spread bancário
        </p>
      </Card>
    </div>
  );
}
