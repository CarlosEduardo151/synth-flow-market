import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Camera, Sparkles, Eye, Upload, ImagePlus, RefreshCw,
  Pencil, Rocket, ArrowRight
} from "lucide-react";

interface Props {
  customerProductId: string;
}

export function MicroBizVision({ customerProductId }: Props) {
  const [imageUrl, setImageUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["micro-biz-products", customerProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from("micro_biz_products" as any)
        .select("*")
        .eq("customer_product_id", customerProductId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!customerProductId,
  });

  const analyzeImage = useMutation({
    mutationFn: async (payload: { image_url?: string; image_base64?: string; mime_type?: string }) => {
      const { data, error } = await supabase.functions.invoke("micro-biz-vision", {
        body: { customer_product_id: customerProductId, ...payload },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Produto analisado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["micro-biz-products"] });
    },
    onError: (e) => toast.error("Erro: " + (e as Error).message),
  });

  const handleFileDrop = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são aceitas.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreviewSrc(result);
      const base64 = result.split(",")[1];
      analyzeImage.mutate({ image_base64: base64, mime_type: file.type });
    };
    reader.readAsDataURL(file);
  }, [analyzeImage]);

  const handleUrlAnalyze = () => {
    if (!imageUrl) return;
    setPreviewSrc(imageUrl);
    analyzeImage.mutate({ image_url: imageUrl });
    setImageUrl("");
  };

  const vision = analyzeImage.data?.vision_analysis;
  const creative = analyzeImage.data?.creative;

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> Estúdio Vision IA
          </CardTitle>
          <CardDescription>
            Arraste uma foto ou cole a URL — a IA analisa, descreve e gera criativos automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag & Drop Area */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
              ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFileDrop(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileDrop(e.target.files)}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium">Arraste a foto do produto aqui</p>
                <p className="text-sm text-muted-foreground">ou clique para selecionar · JPG, PNG, WebP</p>
              </div>
            </div>
          </div>

          {/* URL fallback */}
          <div className="flex gap-2">
            <Input
              placeholder="Ou cole a URL da imagem: https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="text-sm"
            />
            <Button onClick={handleUrlAnalyze} disabled={!imageUrl || analyzeImage.isPending} size="sm">
              <Sparkles className="h-4 w-4 mr-1" />
              Analisar
            </Button>
          </div>

          {/* Processing Indicator */}
          {analyzeImage.isPending && (
            <div className="flex items-center justify-center gap-3 p-6">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Vision IA analisando produto...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Split View: Original vs Creative */}
      {vision && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" /> Resultado da Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Original Photo */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">📸 Foto Original</p>
                <div className="rounded-lg border overflow-hidden bg-muted/20 aspect-square flex items-center justify-center">
                  {previewSrc ? (
                    <img src={previewSrc} alt="Original" className="w-full h-full object-contain" />
                  ) : (
                    <ImagePlus className="h-12 w-12 text-muted-foreground/30" />
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Nome:</span> <strong>{vision.nome_sugerido || "—"}</strong></p>
                  <p><span className="text-muted-foreground">Categoria:</span> {vision.categoria || "—"}</p>
                  <p><span className="text-muted-foreground">Preço sugerido:</span> {vision.preco_sugerido_brl || "—"}</p>
                  <p><span className="text-muted-foreground">Público:</span> {vision.publico_alvo || "—"}</p>
                  <div className="flex gap-1 mt-1">
                    {(vision.cores_dominantes || []).map((c: string) => (
                      <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: AI Creative */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">✨ Criativo Gerado pela IA</p>
                <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-accent/5 p-4 space-y-3">
                  {(creative?.copies || []).map((copy: any, i: number) => (
                    <div key={i} className={`p-3 rounded-lg border ${i === 0 ? "bg-primary/10 border-primary/30" : "bg-background"}`}>
                      <p className="font-semibold text-sm">{copy.headline}</p>
                      <p className="text-xs text-muted-foreground mt-1">{copy.body}</p>
                      <Badge className="mt-2" variant={i === 0 ? "default" : "outline"}>{copy.cta}</Badge>
                    </div>
                  ))}
                </div>

                {/* Selling Points */}
                {vision.pontos_venda?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Pontos de Venda:</p>
                    {vision.pontos_venda.map((p: string, i: number) => (
                      <p key={i} className="text-xs flex items-center gap-1">
                        <ArrowRight className="h-3 w-3 text-primary" /> {p}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => analyzeImage.mutate({ image_url: previewSrc || "" })}>
                <RefreshCw className="h-4 w-4 mr-1" /> Gerar Nova Versão
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Pencil className="h-4 w-4 mr-1" /> Editar Texto com IA
              </Button>
              <Button size="sm" disabled>
                <Rocket className="h-4 w-4 mr-1" /> Impulsionar no Instagram (R$ 5/dia)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Produtos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : !(products as any[])?.length ? (
            <p className="text-muted-foreground text-sm">Nenhum produto ainda. Analise uma foto acima para começar.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(products as any[]).map((p: any) => (
                <div key={p.id} className="p-3 rounded-lg border flex gap-3 hover:bg-muted/20 transition-colors">
                  {p.photo_url && <img src={p.photo_url} alt={p.name} className="w-16 h-16 rounded object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{p.category || "Sem categoria"}</Badge>
                      {p.price && <span className="text-xs font-medium">R$ {Number(p.price).toFixed(2)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
