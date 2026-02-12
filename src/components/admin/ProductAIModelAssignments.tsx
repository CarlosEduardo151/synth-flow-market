import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Bot } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { allProducts } from "@/products";
import { AI_PROVIDERS, GLOBAL_AI_PRODUCT_SLUG, type AIProvider } from "@/components/admin/ai/aiProviders";

type Row = {
  id: string;
  product_slug: string;
  provider: string;
  model: string;
  credential_id?: string | null;
  is_active: boolean;
  updated_at?: string | null;
};

type CredentialRow = {
  id: string;
  provider: string;
  is_active: boolean;
  api_key?: string;
};

type ProductCredential = {
  id: string;
  credential_key: string;
  credential_value: string | null;
};

export function ProductAIModelAssignments() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CredentialRow[]>([]);

  const [draft, setDraft] = useState({
    scope: "global" as "global" | "product",
    product_slug: "agente-financeiro",
    provider: "openai" as AIProvider,
    model: "gpt-4o-mini",
  });

  const isLovableProvider = useMemo(() => draft.provider === "lovable", [draft.provider]);

  useEffect(() => {
    void Promise.all([fetchRows(), fetchCredentials()]);
  }, []);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_ai_assignments" as any)
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar modelos por produto");
    } else {
      setRows((data || []) as any);
    }
    setLoading(false);
  };

  const fetchCredentials = async () => {
    // Fonte única de credenciais (por usuário): product_credentials (product_slug = 'ai')
    const { data, error } = await supabase
      .from("product_credentials")
      .select("id, credential_key, credential_value")
      .eq("product_slug", "ai")
      .order("credential_key");
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar credenciais");
      return;
    }

    const normalized: CredentialRow[] = ((data || []) as ProductCredential[])
      .map((c) => {
        const provider = String(c.credential_key).replace(/_api_key$/, "");
        const is_active = !!(c.credential_value || "").trim();
        return { id: c.id, provider, is_active };
      })
      // Só mantém providers conhecidos
      .filter((c) => AI_PROVIDERS.some((p) => p.value === (c.provider as any)));

    setCredentials(normalized);
  };

  const credentialByProvider = useMemo(() => {
    // Pode existir mais de 1 linha por provider; preferimos a que estiver ativa.
    const map = new Map<string, CredentialRow>();
    for (const c of credentials) {
      const current = map.get(c.provider);
      if (!current) {
        map.set(c.provider, c);
        continue;
      }
      // Se a atual do mapa não é ativa e achamos uma ativa, substitui.
      if (!current.is_active && c.is_active) {
        map.set(c.provider, c);
      }
    }
    return map;
  }, [credentials]);

  const effectiveProductSlug = useMemo(() => {
    return draft.scope === "global" ? GLOBAL_AI_PRODUCT_SLUG : draft.product_slug;
  }, [draft.scope, draft.product_slug]);

  const upsert = async () => {
    try {
      const providerNeedsKey = AI_PROVIDERS.find((p) => p.value === draft.provider)?.needsKey;
      const cred = credentialByProvider.get(draft.provider);
      if (providerNeedsKey && (!cred || !cred.is_active)) {
        toast.error("Configure e ative a credencial deste provedor antes de usar este modelo");
        return;
      }

      const payload = {
        product_slug: effectiveProductSlug.trim(),
        provider: draft.provider,
        model: draft.model.trim(),
        credential_id: draft.provider === "lovable" ? null : cred?.id ?? null,
        is_active: true,
      };
      if (!payload.product_slug || !payload.provider || !payload.model) {
        toast.error("Preencha produto, provedor e modelo");
        return;
      }
      setSavingId("new");
      const { error } = await supabase
        .from("product_ai_assignments" as any)
        .upsert(payload, { onConflict: "product_slug,provider,model" });
      if (error) throw error;
      toast.success("Configuração salva");
      await fetchRows();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar");
    } finally {
      setSavingId(null);
    }
  };

  const globalRow = useMemo(() => rows.find((r) => r.product_slug === GLOBAL_AI_PRODUCT_SLUG), [rows]);
  const productRows = useMemo(
    () => rows.filter((r) => r.product_slug !== GLOBAL_AI_PRODUCT_SLUG),
    [rows]
  );

  const toggleActive = async (id: string, is_active: boolean) => {
    try {
      setSavingId(id);
      const { error } = await supabase
        .from("product_ai_assignments" as any)
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
      await fetchRows();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar status");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Modelo de IA (Global e por Produto)
        </CardTitle>
        <CardDescription>
          Defina um modelo padrão (vale para todos) e, se precisar, sobrescreva para produtos específicos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Escopo</Label>
            <RadioGroup
              value={draft.scope}
              onValueChange={(v) => setDraft((p) => ({ ...p, scope: v as any }))}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <RadioGroupItem value="global" id="scope-global" />
                <Label htmlFor="scope-global" className="cursor-pointer">
                  Padrão (todos os produtos)
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <RadioGroupItem value="product" id="scope-product" />
                <Label htmlFor="scope-product" className="cursor-pointer">
                  Específico por produto
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Produto</Label>
            {draft.scope === "global" ? (
              <Input value="(padrão para todos)" disabled />
            ) : (
              <Select
                value={draft.product_slug}
                onValueChange={(v) => setDraft((p) => ({ ...p, product_slug: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {allProducts.map((p) => (
                    <SelectItem key={p.slug} value={p.slug}>
                      {p.title} ({p.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Provedor</Label>
            <Select value={draft.provider} onValueChange={(v) => setDraft((p) => ({ ...p, provider: v as AIProvider }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.filter((p) => p.value !== "lovable").map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Modelo</Label>
            <Input
              value={draft.model}
              onChange={(e) => setDraft((p) => ({ ...p, model: e.target.value }))}
              placeholder={"ex: gpt-4o-mini / gemini-1.5-pro"}
            />
          </div>
        </div>

          {!isLovableProvider && (
            <p className="text-xs text-muted-foreground">
              Este provedor usa a credencial configurada em “Credenciais de IA”.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={upsert} disabled={savingId === "new"} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {savingId === "new" ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        <div className="border-t pt-4">
          <div className="text-sm font-medium mb-3">Configurações atuais</div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma configuração definida.</div>
          ) : (
            <div className="space-y-3">
              {globalRow && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 border rounded-lg">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">Padrão (todos os produtos)</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {globalRow.provider} • {globalRow.model}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Ativo</Label>
                    <Switch
                      checked={!!globalRow.is_active}
                      onCheckedChange={(checked) => toggleActive(globalRow.id, checked)}
                      disabled={savingId === globalRow.id}
                    />
                  </div>
                </div>
              )}

              {rows.map((r) => (
                r.product_slug === GLOBAL_AI_PRODUCT_SLUG ? null : (
                <div key={r.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 border rounded-lg">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.product_slug}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.provider} • {r.model}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Ativo</Label>
                    <Switch
                      checked={!!r.is_active}
                      onCheckedChange={(checked) => toggleActive(r.id, checked)}
                      disabled={savingId === r.id}
                    />
                  </div>
                </div>
                )
              ))}
            </div>
          )}
        </div>

        {rows.length > 0 && productRows.length === 0 && globalRow && (
          <p className="text-xs text-muted-foreground">
            Apenas o padrão global está definido. Para sobrescrever, crie uma configuração “Específico por produto”.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
