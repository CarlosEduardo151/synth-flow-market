import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Eye, EyeOff, Save, Key } from "lucide-react";
import { AI_PROVIDERS, type AIProvider } from "@/components/admin/ai/aiProviders";

interface Credential {
  id: string;
  credential_key: string;
  credential_value: string | null;
}

const AI_PRODUCT_SLUG = "ai";
const providerKey = (provider: string) => `${provider}_api_key`;

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("not_authenticated");
  return userId;
}

export function AdminAICredentials() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editedKeys, setEditedKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from("product_credentials")
        .select("id, credential_key, credential_value")
        .eq("product_slug", AI_PRODUCT_SLUG)
        .order("credential_key");

      if (error) throw error;
      setCredentials(data || []);
      
      // Initialize edited keys with current values
      const keys: Record<string, string> = {};
      data?.forEach(cred => {
        // credential_key = "<provider>_api_key"
        const provider = String(cred.credential_key).replace(/_api_key$/, "");
        keys[provider] = cred.credential_value || "";
      });
      setEditedKeys(keys);
    } catch (error) {
      console.error("Error fetching credentials:", error);
      toast.error("Erro ao carregar credenciais");
    } finally {
      setLoading(false);
    }
  };

  const existingByProvider = useMemo(() => {
    const map = new Map<string, Credential>();
    for (const c of credentials) {
      const provider = String(c.credential_key).replace(/_api_key$/, "");
      map.set(provider, c);
    }
    return map;
  }, [credentials]);

  const providersToShow = useMemo(() => {
    // Só faz sentido cadastrar chaves para provedores que exigem key.
    return AI_PROVIDERS.filter((p) => p.needsKey).map((p) => p.value);
  }, []);

  const handleSave = async (provider: string) => {
    setSaving(provider);
    try {
      const user_id = await requireUserId();
      const api_key = editedKeys[provider] || "";
      const is_active = api_key.trim().length > 0;
      const key = providerKey(provider);

      // A tabela pode começar vazia. Primeiro tenta UPDATE; se não existir linha, faz INSERT.
      const { data: updated, error: updateError } = await supabase
        .from("product_credentials")
        .update({ credential_value: api_key })
        .eq("product_slug", AI_PRODUCT_SLUG)
        .eq("credential_key", key)
        .select("id");

      if (updateError) throw updateError;
      if (!updated || updated.length === 0) {
        const { error: insertError } = await supabase
          .from("product_credentials")
          .insert({
            user_id,
            product_slug: AI_PRODUCT_SLUG,
            credential_key: key,
            credential_value: api_key,
          });
        if (insertError) throw insertError;
      }
      
      toast.success(`Credencial ${provider.toUpperCase()} salva com sucesso!`);
      fetchCredentials();
    } catch (error) {
      console.error("Error saving credential:", error);
      const message =
        error instanceof Error && error.message === "not_authenticated"
          ? "Você precisa estar logado para salvar credenciais"
          : "Erro ao salvar credencial";
      toast.error(message);
    } finally {
      setSaving(null);
    }
  };

  const handleToggleActive = async (provider: string, isActive: boolean) => {
    try {
      const user_id = await requireUserId();
      const current = editedKeys[provider] ?? existingByProvider.get(provider)?.credential_value ?? "";
      const nextValue = isActive ? current : "";
      setEditedKeys((prev) => ({ ...prev, [provider]: nextValue }));

      const key = providerKey(provider);

      // Não guardamos um "is_active" separado; ativar/desativar = ter/limpar a key.
      const { data: updated, error: updateError } = await supabase
        .from("product_credentials")
        .update({ credential_value: nextValue })
        .eq("product_slug", AI_PRODUCT_SLUG)
        .eq("credential_key", key)
        .select("id");

      if (updateError) throw updateError;
      if (!updated || updated.length === 0) {
        const { error: insertError } = await supabase
          .from("product_credentials")
          .insert({
            user_id,
            product_slug: AI_PRODUCT_SLUG,
            credential_key: key,
            credential_value: nextValue,
          });
        if (insertError) throw insertError;
      }
      
      toast.success(`${provider.toUpperCase()} ${isActive ? 'ativado' : 'desativado'}`);
      fetchCredentials();
    } catch (error) {
      console.error("Error toggling credential:", error);
      const message =
        error instanceof Error && error.message === "not_authenticated"
          ? "Você precisa estar logado para alterar status"
          : "Erro ao alterar status";
      toast.error(message);
    }
  };

  const getProviderLabel = (provider: string) =>
    AI_PROVIDERS.find((p) => p.value === provider)?.label || provider;

  const getProviderDescription = (provider: string) =>
    AI_PROVIDERS.find((p) => p.value === provider)?.description || "";

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Credenciais de IA
        </CardTitle>
        <CardDescription>
          Configure suas chaves de API para os provedores de IA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {providersToShow.map((provider) => {
          const cred = existingByProvider.get(provider);
          const isConfigured = !!((editedKeys[provider] ?? cred?.credential_value) || "").trim();
          const isActive = isConfigured;

          return (
          <div key={provider} className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{getProviderLabel(provider)}</h3>
                <p className="text-sm text-muted-foreground">
                  {getProviderDescription(provider)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`active-${provider}`} className="text-sm">
                  Ativo
                </Label>
                <Switch
                  id={`active-${provider}`}
                  checked={isActive}
                  onCheckedChange={(checked) => handleToggleActive(provider, checked)}
                  disabled={!isConfigured}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type={showKeys[provider] ? "text" : "password"}
                  placeholder={`Insira sua chave ${getProviderLabel(provider)}`}
                  value={editedKeys[provider] ?? cred?.credential_value ?? ""}
                  onChange={(e) => setEditedKeys(prev => ({
                    ...prev,
                    [provider]: e.target.value
                  }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowKeys(prev => ({
                    ...prev,
                    [provider]: !prev[provider]
                  }))}
                >
                  {showKeys[provider] ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                onClick={() => handleSave(provider)}
                disabled={saving === provider}
              >
                {saving === provider ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>

            {isConfigured ? (
              <p className="text-xs text-muted-foreground">Chave configurada ✓</p>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma chave configurada</p>
            )}
          </div>
        );
        })}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Onde obter as chaves?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              <strong>OpenAI:</strong>{" "}
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                platform.openai.com/api-keys
              </a>
            </li>
            <li>
              <strong>Google Gemini:</strong>{" "}
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                aistudio.google.com/app/apikey
              </a>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
