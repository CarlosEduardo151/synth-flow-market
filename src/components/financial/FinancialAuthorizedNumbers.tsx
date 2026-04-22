import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ShieldCheck, Crown, UserCheck } from "lucide-react";

interface Props {
  customerProductId: string;
}

interface AuthorizedNumber {
  id: string;
  phone: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

const normalize = (p: string) => p.replace(/\D/g, "");

export function FinancialAuthorizedNumbers({ customerProductId }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<AuthorizedNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("financial_whatsapp_authorized_numbers")
      .select("id, phone, label, is_active, created_at")
      .eq("customer_product_id", customerProductId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    }
    setItems((data as AuthorizedNumber[]) || []);
    setLoading(false);
  }, [customerProductId, toast]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const normalized = normalize(phone);
    if (normalized.length < 10) {
      toast({
        title: "Número inválido",
        description: "Inclua DDD + número (ex: 5511999999999).",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("financial_whatsapp_authorized_numbers")
      .insert({
        customer_product_id: customerProductId,
        phone: normalized,
        label: label.trim() || null,
        is_active: true,
      });
    setSaving(false);
    if (error) {
      toast({
        title: "Não foi possível adicionar",
        description: error.message.includes("duplicate") || error.message.includes("unique")
          ? "Esse número já está cadastrado."
          : error.message,
        variant: "destructive",
      });
      return;
    }
    setPhone("");
    setLabel("");
    toast({ title: "Chefão adicionado", description: "Esse número agora pode falar com o agente." });
    load();
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await (supabase as any)
      .from("financial_whatsapp_authorized_numbers")
      .update({ is_active: !current })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any)
      .from("financial_whatsapp_authorized_numbers")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Removido", description: "Número não pode mais falar com o agente." });
    load();
  };

  const formatPhone = (p: string) => {
    const n = normalize(p);
    if (n.length === 13) return `+${n.slice(0, 2)} (${n.slice(2, 4)}) ${n.slice(4, 9)}-${n.slice(9)}`;
    if (n.length === 12) return `+${n.slice(0, 2)} (${n.slice(2, 4)}) ${n.slice(4, 8)}-${n.slice(8)}`;
    return n;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle>Números autorizados (chefões)</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Apenas os números cadastrados aqui podem conversar com o Agente Financeiro.
          Mensagens de qualquer outro contato são ignoradas — assim, clientes aleatórios não disparam o agente.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add form */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
            <div className="space-y-1">
              <Label htmlFor="fwa-phone">Número (com DDI + DDD)</Label>
              <Input
                id="fwa-phone"
                placeholder="5511999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fwa-label">Apelido (opcional)</Label>
              <Input
                id="fwa-label"
                placeholder="Ex: Sócio João, Gerente Maria"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={60}
              />
            </div>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Adicionar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Você pode cadastrar quantos números quiser. Use o switch para pausar temporariamente
            sem precisar excluir.
          </p>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Crown className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum chefão cadastrado.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Enquanto não houver números aqui, o agente <strong>não responde a ninguém</strong>.
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                <div className={`rounded-md p-2 ${it.is_active ? "bg-primary/10" : "bg-muted"}`}>
                  <UserCheck className={`h-4 w-4 ${it.is_active ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm">{formatPhone(it.phone)}</span>
                    {it.label && (
                      <Badge variant="outline" className="text-[10px]">{it.label}</Badge>
                    )}
                    {!it.is_active && (
                      <Badge variant="secondary" className="text-[10px]">Pausado</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={it.is_active}
                      onCheckedChange={() => toggleActive(it.id, it.is_active)}
                    />
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {it.is_active ? "Ativo" : "Pausado"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(it.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
