import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

type SlideRow = {
  id: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  href: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type Draft = {
  title: string;
  subtitle: string;
  eyebrow: string;
  href: string;
  is_active: boolean;
  sort_order: number;
};

const emptyDraft: Draft = {
  title: "",
  subtitle: "",
  eyebrow: "",
  href: "",
  is_active: true,
  sort_order: 0,
};

function normalizeHref(href: string) {
  const v = href.trim();
  if (!v) return null;
  return v;
}

export function PromoCarouselAdmin() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [slides, setSlides] = useState<SlideRow[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [creating, setCreating] = useState(false);

  const orderedSlides = useMemo(
    () =>
      [...slides].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.created_at.localeCompare(b.created_at)
      ),
    [slides]
  );

  const loadSlides = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promo_carousel_slides")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("PromoCarouselAdmin loadSlides error:", error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os slides do carrossel.",
        variant: "destructive",
      });
      setSlides([]);
      setLoading(false);
      return;
    }

    setSlides((data ?? []) as SlideRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadSlides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createSlide = async () => {
    if (!draft.title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Preencha o título do slide.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    const payload = {
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim() ? draft.subtitle.trim() : null,
      eyebrow: draft.eyebrow.trim() ? draft.eyebrow.trim() : null,
      href: normalizeHref(draft.href),
      is_active: draft.is_active,
      sort_order: Number.isFinite(draft.sort_order) ? draft.sort_order : 0,
    };

    const { error } = await supabase.from("promo_carousel_slides").insert(payload);
    if (error) {
      console.error("PromoCarouselAdmin createSlide error:", error);
      toast({
        title: "Erro ao criar",
        description: "Não foi possível criar o slide.",
        variant: "destructive",
      });
      setCreating(false);
      return;
    }

    toast({
      title: "Slide criado",
      description: "O slide foi adicionado ao carrossel.",
    });
    setDraft(emptyDraft);
    setCreating(false);
    loadSlides();
  };

  const updateSlide = async (id: string, patch: Partial<SlideRow>) => {
    setSavingIds((p) => ({ ...p, [id]: true }));
    const { error } = await supabase.from("promo_carousel_slides").update(patch).eq("id", id);

    if (error) {
      console.error("PromoCarouselAdmin updateSlide error:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
      setSavingIds((p) => ({ ...p, [id]: false }));
      return;
    }

    setSlides((prev) => prev.map((s) => (s.id === id ? ({ ...s, ...patch } as SlideRow) : s)));
    setSavingIds((p) => ({ ...p, [id]: false }));
  };

  const deleteSlide = async (id: string) => {
    setDeletingIds((p) => ({ ...p, [id]: true }));
    const { error } = await supabase.from("promo_carousel_slides").delete().eq("id", id);
    if (error) {
      console.error("PromoCarouselAdmin deleteSlide error:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o slide.",
        variant: "destructive",
      });
      setDeletingIds((p) => ({ ...p, [id]: false }));
      return;
    }

    setSlides((prev) => prev.filter((s) => s.id !== id));
    setDeletingIds((p) => ({ ...p, [id]: false }));
    toast({
      title: "Slide removido",
      description: "O slide foi excluído.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Carrossel de promoções (Home)</CardTitle>
          <Button variant="outline" onClick={loadSlides} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="promo_title">Título</Label>
              <Input
                id="promo_title"
                value={draft.title}
                onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                placeholder="Ex: 50% OFF no Gestão de Cobranças"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo_subtitle">Subtítulo</Label>
              <Input
                id="promo_subtitle"
                value={draft.subtitle}
                onChange={(e) => setDraft((p) => ({ ...p, subtitle: e.target.value }))}
                placeholder="Ex: Somente hoje"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="promo_eyebrow">Etiqueta (opcional)</Label>
              <Input
                id="promo_eyebrow"
                value={draft.eyebrow}
                onChange={(e) => setDraft((p) => ({ ...p, eyebrow: e.target.value }))}
                placeholder="Ex: Oferta, Novidade, Teste grátis"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo_href">Link (opcional)</Label>
              <Input
                id="promo_href"
                value={draft.href}
                onChange={(e) => setDraft((p) => ({ ...p, href: e.target.value }))}
                placeholder="Ex: /p/gestao-cobrancas ou https://..."
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.is_active}
                onCheckedChange={(v) => setDraft((p) => ({ ...p, is_active: v }))}
                id="promo_active"
              />
              <Label htmlFor="promo_active">Ativo</Label>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="promo_order" className="min-w-24">
                Ordem
              </Label>
              <Input
                id="promo_order"
                type="number"
                value={draft.sort_order}
                onChange={(e) => setDraft((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                className="w-28"
              />
            </div>

            <div className="md:ml-auto">
              <Button onClick={createSlide} disabled={creating} className="gap-2">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Adicionar slide
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slides</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          ) : orderedSlides.length === 0 ? (
            <p className="text-muted-foreground">
              Nenhum slide cadastrado. Enquanto isso, a Home usa os slides padrão.
            </p>
          ) : (
            <div className="space-y-4">
              {orderedSlides.map((s) => {
                const saving = !!savingIds[s.id];
                const deleting = !!deletingIds[s.id];

                return (
                  <div key={s.id} className="rounded-lg border border-border p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input
                          value={s.title}
                          onChange={(e) =>
                            setSlides((prev) =>
                              prev.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Subtítulo</Label>
                        <Input
                          value={s.subtitle ?? ""}
                          onChange={(e) =>
                            setSlides((prev) =>
                              prev.map((x) => (x.id === s.id ? { ...x, subtitle: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label>Etiqueta</Label>
                        <Input
                          value={s.eyebrow ?? ""}
                          onChange={(e) =>
                            setSlides((prev) =>
                              prev.map((x) => (x.id === s.id ? { ...x, eyebrow: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Link</Label>
                        <Input
                          value={s.href ?? ""}
                          onChange={(e) =>
                            setSlides((prev) =>
                              prev.map((x) => (x.id === s.id ? { ...x, href: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={s.is_active}
                          onCheckedChange={(v) =>
                            setSlides((prev) =>
                              prev.map((x) => (x.id === s.id ? { ...x, is_active: v } : x))
                            )
                          }
                          id={`active-${s.id}`}
                        />
                        <Label htmlFor={`active-${s.id}`}>Ativo</Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="min-w-24">Ordem</Label>
                        <Input
                          type="number"
                          value={s.sort_order}
                          onChange={(e) =>
                            setSlides((prev) =>
                              prev.map((x) =>
                                x.id === s.id ? { ...x, sort_order: Number(e.target.value) } : x
                              )
                            )
                          }
                          className="w-28"
                        />
                      </div>

                      <div className="md:ml-auto flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            updateSlide(s.id, {
                              title: s.title.trim(),
                              subtitle: s.subtitle?.trim() ? s.subtitle.trim() : null,
                              eyebrow: s.eyebrow?.trim() ? s.eyebrow.trim() : null,
                              href: normalizeHref(s.href ?? "") ?? null,
                              is_active: s.is_active,
                              sort_order: s.sort_order ?? 0,
                            })
                          }
                          disabled={saving || deleting}
                          className="gap-2"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Salvar
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => deleteSlide(s.id)}
                          disabled={saving || deleting}
                          className="gap-2"
                        >
                          {deleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
