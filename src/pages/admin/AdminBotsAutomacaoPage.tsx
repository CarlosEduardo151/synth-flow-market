import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useAdminCheck } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Copy, RefreshCw, Save } from "lucide-react";

type Language = "python" | "ts";

type CustomerProductRow = {
  id: string;
  product_slug: string;
  product_title: string | null;
  webhook_token: string | null;
  is_active: boolean;
  created_at: string;
};

const SUPABASE_FUNCTIONS_BASE = "https://lqduauyrwwlrbtnxkiev.supabase.co/functions/v1";

export default function AdminBotsAutomacaoPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<CustomerProductRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  const selected = useMemo(
    () => products.find((p) => p.id === selectedId) || null,
    [products, selectedId],
  );

  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState<string>("# cole aqui o script do bot\n");
  const [savingScript, setSavingScript] = useState(false);
  const [ensuringToken, setEnsuringToken] = useState(false);
  const [rotatingToken, setRotatingToken] = useState(false);

  const webhookUrl = useMemo(() => {
    if (!selected?.id || !selected?.webhook_token) return "";
    const params = new URLSearchParams({
      customer_product_id: selected.id,
      token: selected.webhook_token,
    });
    return `${SUPABASE_FUNCTIONS_BASE}/whatsapp-ingest?${params.toString()}`;
  }, [selected?.id, selected?.webhook_token]);

  const refreshList = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("customer_products")
        .select("id, product_slug, product_title, webhook_token, is_active, created_at")
        .eq("product_slug", "bots-automacao")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts((data || []) as CustomerProductRow[]);
      if (!selectedId && data?.[0]?.id) setSelectedId(data[0].id);
    } catch (e) {
      console.error(e);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos bots-automacao.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user || !isAdmin) {
        setLoading(false);
        return;
      }
      refreshList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, adminLoading, user, isAdmin]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copiado!", description: "Texto copiado para a área de transferência." });
    } catch {
      toast({ title: "Falha ao copiar", description: "Copie manualmente.", variant: "destructive" });
    }
  };

  const ensureToken = async () => {
    if (!selected?.id) return;
    setEnsuringToken(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke(
        "admin-customer-product-webhook",
        { body: { action: "ensure", customer_product_id: selected.id } },
      );
      if (error) throw error;
      if (!data?.webhook_token) throw new Error("missing_webhook_token");
      await refreshList();
      toast({ title: "Token pronto", description: "webhook_token gerado/confirmado com sucesso." });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Não foi possível gerar o token.", variant: "destructive" });
    } finally {
      setEnsuringToken(false);
    }
  };

  const rotateToken = async () => {
    if (!selected?.id) return;
    setRotatingToken(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke(
        "admin-customer-product-webhook",
        { body: { action: "rotate", customer_product_id: selected.id } },
      );
      if (error) throw error;
      if (!data?.webhook_token) throw new Error("missing_webhook_token");
      await refreshList();
      toast({ title: "Token rotacionado", description: "Cole a nova URL no Z-API." });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Não foi possível rotacionar o token.", variant: "destructive" });
    } finally {
      setRotatingToken(false);
    }
  };

  const loadScript = async () => {
    if (!selected?.id) return;
    try {
      const { data, error } = await (supabase as any).functions.invoke("bot-scripts-admin", {
        body: { action: "get", customer_product_id: selected.id },
      });
      if (error) throw error;
      if (data?.script?.language) setLanguage(data.script.language);
      if (typeof data?.code === "string" && data.code.length) setCode(data.code);
    } catch (e) {
      console.error(e);
      // silencioso: script pode não existir ainda
    }
  };

  useEffect(() => {
    if (selected?.id) loadScript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const saveScript = async () => {
    if (!selected?.id) return;
    setSavingScript(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke("bot-scripts-admin", {
        body: {
          action: "save_script",
          customer_product_id: selected.id,
          language,
          code,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error("save_failed");
      toast({ title: "Script salvo", description: "Script gravado no bucket privado bot_scripts." });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Não foi possível salvar o script.", variant: "destructive" });
    } finally {
      setSavingScript(false);
    }
  };

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Acesso negado</CardTitle>
              <CardDescription>Você precisa ser admin para acessar esta página.</CardDescription>
            </CardHeader>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Bot className="h-7 w-7 text-primary" />
              Bots de Automação — Configuração (Admin)
            </h1>
            <p className="text-muted-foreground">WhatsApp (Z-API) + scripts privados por cliente.</p>
          </div>
          <Button variant="outline" onClick={refreshList} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Seletor de customer_product */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Clientes (bots-automacao)</CardTitle>
              <CardDescription>Selecione qual customer_product_id configurar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.product_title || "Bots de Automação"} — {p.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selected && (
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={selected.is_active ? "default" : "secondary"}>
                      {selected.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button variant="ghost" size="sm" className="gap-2" onClick={() => copy(selected.id)}>
                      <Copy className="h-4 w-4" />
                      Copiar ID
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground break-all">{selected.id}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Webhook WhatsApp */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Webhook WhatsApp (Z-API → Supabase)</CardTitle>
              <CardDescription>
                Gere o token e cole esta URL no provedor. Ela grava os eventos em <code>whatsapp_inbox_events</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Label>Webhook URL</Label>
                  <Input value={webhookUrl || "(gere o token para montar a URL)"} readOnly />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={ensureToken}
                    disabled={!selected?.id || ensuringToken}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {ensuringToken ? "Gerando..." : "Gerar/Confirmar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={rotateToken}
                    disabled={!selected?.id || rotatingToken}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {rotatingToken ? "Rotacionando..." : "Rotacionar"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => webhookUrl && copy(webhookUrl)}
                    disabled={!webhookUrl}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Dica: se você rotacionar o token, o webhook antigo para de funcionar imediatamente.
              </div>
            </CardContent>
          </Card>

          {/* Script */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Script do Bot (privado por cliente)</CardTitle>
              <CardDescription>
                Este código fica no bucket privado <code>bot_scripts</code> e é gerenciado via Edge Function admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-1">
                  <Label>Linguagem</Label>
                  <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="ts">TypeScript</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 flex items-end justify-end">
                  <Button onClick={saveScript} disabled={!selected?.id || savingScript} className="gap-2">
                    <Save className="h-4 w-4" />
                    {savingScript ? "Salvando..." : "Salvar script"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Código</Label>
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="min-h-[320px] font-mono"
                  placeholder="Cole aqui o código do bot"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
