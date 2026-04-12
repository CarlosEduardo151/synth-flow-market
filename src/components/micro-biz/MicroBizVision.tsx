import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Camera, Sparkles, Eye, Upload, ImagePlus, RefreshCw,
  Rocket, ArrowRight, Image as ImageIcon, Loader2
} from "lucide-react";
import { ArtStyleSelector, PRESET_STYLES } from "./ArtStyleSelector";

interface Props {
  customerProductId: string;
}

export function MicroBizVision({ customerProductId }: Props) {
  const [imageUrl, setImageUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [artStyle, setArtStyle] = useState<{ styleId: string | null; customPrompt: string }>({ styleId: null, customPrompt: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const getStylePrompt = () => {
    if (artStyle.customPrompt) return artStyle.customPrompt;
    if (artStyle.styleId) {
      return PRESET_STYLES.find((s) => s.id === artStyle.styleId)?.prompt || "";
    }
    return "";
  };

  const analyzeImage = useMutation({
    mutationFn: async (payload: { image_url?: string; image_base64?: string; mime_type?: string }) => {
      const { data, error } = await supabase.functions.invoke("micro-biz-vision", {
        body: { customer_product_id: customerProductId, style_prompt: getStylePrompt(), ...payload },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.generated_image_url) {
        toast.success("Produto analisado e arte gerada com sucesso!");
      } else {
        toast.success("Produto analisado! Arte não pôde ser gerada.");
      }
      queryClient.invalidateQueries({ queryKey: ["micro-biz-products"] });
    },
    onError: (e) => toast.error("Erro: " + (e as Error).message),
  });

  const regenerateArt = useMutation({
    mutationFn: async (prompt: string) => {
      const { data, error } = await supabase.functions.invoke("micro-biz-vision", {
        body: {
          action: "generate-art",
          prompt,
          creative_id: analyzeImage.data?.creative_id,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success("Nova arte gerada!"),
    onError: (e) => toast.error("Erro ao gerar arte: " + (e as Error).message),
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
  const generatedImg = regenerateArt.data?.image_url || analyzeImage.data?.generated_image_url;

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-mono">
            <Camera className="h-5 w-5" /> ESTÚDIO VISION IA
          </CardTitle>
          <CardDescription className="text-xs">
            Arraste uma foto ou cole a URL — a IA analisa, descreve e gera criativos automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                <p className="font-medium text-sm">Arraste a foto do produto aqui</p>
                <p className="text-xs text-muted-foreground">ou clique para selecionar · JPG, PNG, WebP</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Ou cole a URL da imagem: https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="text-xs font-mono"
            />
            <Button onClick={handleUrlAnalyze} disabled={!imageUrl || analyzeImage.isPending} size="sm">
              <Sparkles className="h-4 w-4 mr-1" />
              Analisar
            </Button>
          </div>

          {analyzeImage.isPending && (
            <div className="flex items-center justify-center gap-3 p-6">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground font-mono">Vision IA analisando produto + gerando arte...</p>
            </div>
          )}

          {/* Art Style Selector */}
          <div className="pt-2 border-t">
            <ArtStyleSelector value={artStyle} onChange={setArtStyle} />
          </div>
        </CardContent>
      </Card>

      {/* Results: 3-column split */}
      {vision && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Eye className="h-4 w-4" /> RESULTADO DA ANÁLISE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Col 1: Original Photo */}
              <div className="space-y-3">
                <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">📸 FOTO ORIGINAL</p>
                <div className="rounded-lg border overflow-hidden bg-muted/20 aspect-square flex items-center justify-center">
                  {previewSrc ? (
                    <img src={previewSrc} alt="Original" className="w-full h-full object-contain" />
                  ) : (
                    <ImagePlus className="h-12 w-12 text-muted-foreground/30" />
                  )}
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <p><span className="text-muted-foreground">Nome:</span> <strong>{vision.nome_sugerido || "—"}</strong></p>
                  <p><span className="text-muted-foreground">Categoria:</span> {vision.categoria || "—"}</p>
                  <p><span className="text-muted-foreground">Preço:</span> {vision.preco_sugerido_brl || "—"}</p>
                  <p><span className="text-muted-foreground">Público:</span> {vision.publico_alvo || "—"}</p>
                  <p><span className="text-muted-foreground">Qualidade:</span> {vision.qualidade_foto || "—"}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {(vision.cores_dominantes || []).map((c: string) => (
                      <Badge key={c} variant="outline" className="text-[9px] font-mono">{c}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Col 2: Generated Art */}
              <div className="space-y-3">
                <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">🎨 ARTE GERADA (FLUX.1)</p>
                <div className="rounded-lg border overflow-hidden bg-gradient-to-br from-primary/5 to-accent/5 aspect-square flex items-center justify-center">
                  {regenerateArt.isPending ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <p className="text-[10px] font-mono text-muted-foreground">Gerando nova arte...</p>
                    </div>
                  ) : generatedImg ? (
                    <img src={generatedImg} alt="Arte Gerada" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-[10px] font-mono text-muted-foreground text-center">
                        Arte não disponível.<br />Clique em "Gerar Nova Arte" abaixo.
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-mono"
                  disabled={!creative?.art_prompt || regenerateArt.isPending}
                  onClick={() => creative?.art_prompt && regenerateArt.mutate(creative.art_prompt)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Gerar Nova Arte
                </Button>
                {creative?.art_prompt && (
                  <details className="text-[10px] font-mono text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">Ver prompt usado</summary>
                    <p className="mt-1 p-2 bg-muted/30 rounded text-[9px] leading-relaxed">{creative.art_prompt}</p>
                  </details>
                )}
              </div>

              {/* Col 3: Copies */}
              <div className="space-y-3">
                <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">✨ COPIES GERADAS</p>
                <div className="space-y-2">
                  {(creative?.copies || []).map((copy: any, i: number) => (
                    <div key={i} className={`p-3 rounded-lg border ${i === 0 ? "bg-primary/10 border-primary/30" : "bg-background"}`}>
                      <p className="font-semibold text-xs font-mono">{copy.headline}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{copy.body}</p>
                      <Badge className="mt-2 text-[9px]" variant={i === 0 ? "default" : "outline"}>{copy.cta}</Badge>
                    </div>
                  ))}
                </div>

                {vision.pontos_venda?.length > 0 && (
                  <div className="space-y-1 pt-2 border-t">
                    <p className="text-[10px] font-mono font-bold text-muted-foreground">PONTOS DE VENDA:</p>
                    {vision.pontos_venda.map((p: string, i: number) => (
                      <p key={i} className="text-[10px] font-mono flex items-center gap-1">
                        <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" /> {p}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-mono"
                onClick={() => {
                  if (previewSrc?.startsWith("data:")) {
                    const base64 = previewSrc.split(",")[1];
                    analyzeImage.mutate({ image_base64: base64, mime_type: "image/jpeg" });
                  } else if (previewSrc) {
                    analyzeImage.mutate({ image_url: previewSrc });
                  }
                }}
                disabled={!previewSrc || analyzeImage.isPending}
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Reanalisar Produto
              </Button>
              <Button size="sm" className="text-xs font-mono" disabled>
                <Rocket className="h-3 w-3 mr-1" /> Impulsionar no Instagram (R$ 5/dia)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
