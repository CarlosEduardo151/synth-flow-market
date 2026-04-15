import { useRef, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Download, Type, Plus, Trash2, Move,
  Layers, Eye, EyeOff, Sparkles, Loader2, Wand2, Zap, Grid3X3
} from "lucide-react";
import type { BrandBook } from "./BrandBookConfig";

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  rotation: number;
  fontWeight: string;
  letterSpacing: number;
  glowColor: string;
  glowIntensity: number;
  perspective: number;
  visible: boolean;
}

const DEFAULT_OVERLAY: Omit<TextOverlay, "id" | "text"> = {
  x: 50, y: 50, fontSize: 48, color: "#FFFFFF",
  shadowColor: "rgba(0,0,0,0.8)", shadowBlur: 12, shadowOffsetX: 4, shadowOffsetY: 4,
  rotation: 0, fontWeight: "900", letterSpacing: 4,
  glowColor: "#a855f7", glowIntensity: 0, perspective: 0, visible: true,
};

const PRESET_TEXTS = [
  { label: "PROMOÇÃO", text: "PROMOÇÃO", color: "#facc15", glowColor: "#facc15", glowIntensity: 20 },
  { label: "OFERTA", text: "SUPER OFERTA", color: "#22d3ee", glowColor: "#22d3ee", glowIntensity: 15 },
  { label: "NOVO", text: "NOVO", color: "#a855f7", glowColor: "#a855f7", glowIntensity: 18 },
  { label: "FRETE GRÁTIS", text: "FRETE GRÁTIS", color: "#4ade80", glowColor: "#4ade80", glowIntensity: 12 },
];

const AI_EFFECTS = [
  { label: "Brilho Neon", prompt: "Add dramatic neon purple and cyan glow effects around the edges of the product, with light rays and lens flares. Keep the product intact. Add sparkle particles." },
  { label: "Fogo & Energia", prompt: "Add dramatic fire and energy effects around the product, with flames, sparks, and heat distortion. The product must remain intact and centered." },
  { label: "Luxo Dourado", prompt: "Add luxurious gold particle effects, golden sparkles, and elegant bokeh lights around the product. Add a subtle gold rim light on the product edges." },
  { label: "Splash & Explosão", prompt: "Add a dramatic paint splash and explosion effect behind the product with vibrant colors. Product stays intact in the center with dynamic debris." },
];

interface Props {
  baseImageUrl: string;
  suggestedTexts?: { headline?: string; cta?: string }[];
  brandBook?: BrandBook;
  onExport?: (dataUrl: string) => void;
}

export function CanvasCompositor({ baseImageUrl, suggestedTexts, brandBook, onExport }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [aiLoading, setAiLoading] = useState(false);
  const [currentBaseUrl, setCurrentBaseUrl] = useState(baseImageUrl);
  const [customAiPrompt, setCustomAiPrompt] = useState("");
  const [aiHistory, setAiHistory] = useState<string[]>([baseImageUrl]);
  const [showGrid, setShowGrid] = useState(brandBook?.gridEnabled ?? true);

  // Load base image — handle CORS by proxying through a canvas-safe approach
  useEffect(() => {
    if (!currentBaseUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setBaseImage(img);
    img.onerror = () => {
      // Fallback: try without crossOrigin (won't export but will display)
      const img2 = new Image();
      img2.onload = () => setBaseImage(img2);
      img2.src = currentBaseUrl;
    };
    img.src = currentBaseUrl;
  }, [currentBaseUrl]);

  // Sync when parent URL changes
  useEffect(() => {
    if (baseImageUrl !== currentBaseUrl) {
      setCurrentBaseUrl(baseImageUrl);
      setAiHistory(prev => [...prev, baseImageUrl]);
    }
  }, [baseImageUrl]);

  // Render canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = baseImage.width;
    canvas.height = baseImage.height;
    ctx.drawImage(baseImage, 0, 0);

    // Grid overlay
    if (showGrid && brandBook) {
      const cols = brandBook.gridColumns || 12;
      const marginPx = (brandBook.gridMargin / 100) * canvas.width;
      const usableWidth = canvas.width - marginPx * 2;
      const colWidth = usableWidth / cols;

      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = "#00D4FF";
      ctx.lineWidth = 1;

      // Margin guides
      ctx.setLineDash([8, 4]);
      ctx.strokeStyle = "#FF4444";
      ctx.strokeRect(marginPx, marginPx, canvas.width - marginPx * 2, canvas.height - marginPx * 2);

      // Column lines
      ctx.strokeStyle = "#00D4FF";
      ctx.setLineDash([4, 8]);
      for (let i = 0; i <= cols; i++) {
        const x = marginPx + i * colWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Center guides
      ctx.strokeStyle = "#A855F7";
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      ctx.restore();
    }

    const headingFont = brandBook?.headingFont || "Inter";

    overlays.filter(o => o.visible).forEach(o => {
      ctx.save();
      const px = (o.x / 100) * canvas.width;
      const py = (o.y / 100) * canvas.height;
      ctx.translate(px, py);
      ctx.rotate((o.rotation * Math.PI) / 180);

      if (o.perspective !== 0) {
        const scaleY = 1 - Math.abs(o.perspective) * 0.003;
        ctx.transform(1, 0, o.perspective * 0.008, scaleY, 0, 0);
      }

      const scaledFontSize = (o.fontSize / 100) * canvas.width * 0.08;
      ctx.font = `${o.fontWeight} ${scaledFontSize}px "${headingFont}", "Inter", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (o.letterSpacing > 0) {
        (ctx as any).letterSpacing = `${o.letterSpacing}px`;
      }

      // Glow
      if (o.glowIntensity > 0) {
        ctx.shadowColor = o.glowColor;
        ctx.shadowBlur = o.glowIntensity * 3;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = o.glowColor;
        ctx.globalAlpha = 0.4;
        ctx.fillText(o.text, 0, 0);
        ctx.globalAlpha = 1;
      }

      // 3D shadow layers
      for (let i = 6; i > 0; i--) {
        ctx.shadowColor = "transparent";
        ctx.fillStyle = `rgba(0,0,0,${0.15 * (i / 6)})`;
        ctx.fillText(o.text, o.shadowOffsetX * (i / 3), o.shadowOffsetY * (i / 3) + i * 1.5);
      }

      ctx.shadowColor = o.shadowColor;
      ctx.shadowBlur = o.shadowBlur;
      ctx.shadowOffsetX = o.shadowOffsetX;
      ctx.shadowOffsetY = o.shadowOffsetY;
      ctx.fillStyle = o.color;
      ctx.fillText(o.text, 0, 0);

      // Highlight
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(o.text, -1, -1);
      ctx.globalAlpha = 1;
      ctx.restore();
    });
  }, [baseImage, overlays, showGrid, brandBook]);

  useEffect(() => { render(); }, [render]);

  const addOverlay = (text: string, preset?: Partial<TextOverlay>) => {
    const id = crypto.randomUUID();
    setOverlays(prev => [...prev, { ...DEFAULT_OVERLAY, id, text, y: 30 + prev.length * 15, ...preset }]);
    setSelectedId(id);
  };

  const updateOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const removeOverlay = (id: string) => {
    setOverlays(prev => prev.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // ═══ AI COMPOSE — Envia imagem para OpenAI editar com efeitos ═══
  const handleAiCompose = async (prompt: string) => {
    if (!currentBaseUrl || aiLoading) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("micro-biz-vision", {
        body: { action: "ai-compose", base_image_url: currentBaseUrl, compose_prompt: prompt },
      });
      if (error) throw error;
      if (data?.image_url) {
        setCurrentBaseUrl(data.image_url);
        setAiHistory(prev => [...prev, data.image_url]);
        toast.success("Efeito AI aplicado com sucesso!");
      }
    } catch (e) {
      toast.error("Erro no AI Compose: " + (e as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleUndo = () => {
    if (aiHistory.length > 1) {
      const prev = [...aiHistory];
      prev.pop();
      setAiHistory(prev);
      setCurrentBaseUrl(prev[prev.length - 1]);
    }
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL("image/png");
      onExport?.(dataUrl);
      const link = document.createElement("a");
      link.download = "arte-final-novalink.png";
      link.href = dataUrl;
      link.click();
    } catch {
      toast.error("Erro ao exportar. A imagem pode ter restrições de CORS. Tente aplicar um efeito AI primeiro.");
    }
  };

  // Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 100;
    const my = ((e.clientY - rect.top) / rect.height) * 100;
    const hit = [...overlays].reverse().find(o => Math.abs(mx - o.x) < 15 && Math.abs(my - o.y) < 8);
    if (hit) {
      setDragging(hit.id);
      setSelectedId(hit.id);
      setDragOffset({ x: mx - hit.x, y: my - hit.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    updateOverlay(dragging, {
      x: ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.x,
      y: ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.y,
    });
  };

  const handleMouseUp = () => setDragging(null);
  const selected = overlays.find(o => o.id === selectedId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <Layers className="h-4 w-4" /> COMPOSITOR AI — ETAPA 2
          </CardTitle>
          <CardDescription className="text-[10px] font-mono">
            Adicione efeitos visuais via IA + tipografia 3D com sombras e brilho. Arraste os textos no canvas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Canvas */}
          <div className="relative rounded-lg border overflow-hidden bg-black">
            <div className="absolute top-2 right-2 z-10">
              <Button
                variant={showGrid ? "default" : "outline"}
                size="sm"
                className="text-[9px] font-mono h-6 bg-black/60 hover:bg-black/80"
                onClick={() => setShowGrid(!showGrid)}
              >
                <Grid3X3 className="h-3 w-3 mr-1" />
                {showGrid ? "Grid ON" : "Grid OFF"}
              </Button>
            </div>
            <canvas
              ref={canvasRef}
              className="w-full h-auto cursor-move"
              style={{ maxHeight: 520 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            {!baseImage && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs font-mono p-4 text-center">
                Carregando imagem base...
              </div>
            )}
            {aiLoading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-xs font-mono text-white">AI processando efeitos visuais...</p>
                </div>
              </div>
            )}
          </div>

          {/* AI Effects — Like After Effects */}
          <div className="space-y-3 p-3 rounded-lg border bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                🪄 EFEITOS AI (AFTER EFFECTS)
              </p>
              {aiHistory.length > 1 && (
                <Button variant="ghost" size="sm" className="text-[10px] font-mono h-6" onClick={handleUndo}>
                  ↩ Desfazer
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {AI_EFFECTS.map(fx => (
                <Button
                  key={fx.label}
                  variant="outline"
                  size="sm"
                  className="text-[10px] font-mono h-auto py-2 flex-col gap-1"
                  disabled={aiLoading || !currentBaseUrl}
                  onClick={() => handleAiCompose(fx.prompt)}
                >
                  <Wand2 className="h-4 w-4" />
                  {fx.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder="Ou descreva o efeito que você quer: 'Adicionar explosão de partículas douradas atrás do produto...'"
                value={customAiPrompt}
                onChange={(e) => setCustomAiPrompt(e.target.value)}
                className="text-[10px] font-mono min-h-[50px] resize-none"
              />
              <Button
                size="sm"
                className="text-[10px] font-mono shrink-0"
                disabled={!customAiPrompt.trim() || aiLoading || !currentBaseUrl}
                onClick={() => { handleAiCompose(customAiPrompt); setCustomAiPrompt(""); }}
              >
                <Zap className="h-3 w-3 mr-1" /> Aplicar
              </Button>
            </div>
          </div>

          {/* Quick-add text presets */}
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
              ⚡ TIPOGRAFIA 3D
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_TEXTS.map(p => (
                <Button key={p.label} variant="outline" size="sm" className="text-[10px] font-mono"
                  onClick={() => addOverlay(p.text, { color: p.color, glowColor: p.glowColor, glowIntensity: p.glowIntensity })}>
                  <Plus className="h-3 w-3 mr-1" /> {p.label}
                </Button>
              ))}
              {suggestedTexts?.slice(0, 2).map((s, i) => (
                s.headline && (
                  <Button key={i} variant="secondary" size="sm" className="text-[10px] font-mono"
                    onClick={() => addOverlay(s.headline!, { fontSize: 40 })}>
                    <Sparkles className="h-3 w-3 mr-1" /> {s.headline!.slice(0, 20)}...
                  </Button>
                )
              ))}
              <Button variant="ghost" size="sm" className="text-[10px] font-mono"
                onClick={() => addOverlay("SEU TEXTO")}>
                <Type className="h-3 w-3 mr-1" /> Texto Livre
              </Button>
            </div>
          </div>

          {/* Layer list */}
          {overlays.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                📐 CAMADAS ({overlays.length})
              </p>
              <div className="space-y-1">
                {overlays.map(o => (
                  <div key={o.id}
                    className={`flex items-center gap-2 p-2 rounded-md border text-xs font-mono cursor-pointer transition-colors ${
                      selectedId === o.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                    onClick={() => setSelectedId(o.id)}>
                    <button onClick={(e) => { e.stopPropagation(); updateOverlay(o.id, { visible: !o.visible }); }}>
                      {o.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                    </button>
                    <span className="flex-1 truncate font-bold" style={{ color: o.color }}>{o.text}</span>
                    <Move className="h-3 w-3 text-muted-foreground" />
                    <button onClick={(e) => { e.stopPropagation(); removeOverlay(o.id); }}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overlay editor */}
          {selected && (
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                ✏️ EDITAR: {selected.text}
              </p>
              <Input value={selected.text} onChange={(e) => updateOverlay(selected.id, { text: e.target.value })}
                className="text-xs font-mono font-bold" placeholder="Texto do overlay" />
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "TAMANHO", key: "fontSize", min: 12, max: 120 },
                  { label: "ROTAÇÃO", key: "rotation", min: -45, max: 45 },
                  { label: "BRILHO NEON", key: "glowIntensity", min: 0, max: 40 },
                  { label: "PERSPECTIVA 3D", key: "perspective", min: -30, max: 30 },
                  { label: "SOMBRA", key: "shadowBlur", min: 0, max: 40 },
                  { label: "ESPAÇAMENTO", key: "letterSpacing", min: 0, max: 20 },
                ].map(s => (
                  <div key={s.key} className="space-y-1">
                    <label className="text-[9px] font-mono text-muted-foreground">{s.label}</label>
                    <Slider value={[(selected as any)[s.key]]}
                      onValueChange={([v]) => updateOverlay(selected.id, { [s.key]: v })}
                      min={s.min} max={s.max} step={1} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                {[
                  { label: "COR", key: "color" },
                  { label: "NEON", key: "glowColor" },
                  { label: "SOMBRA", key: "shadowColor" },
                ].map(c => (
                  <div key={c.key} className="flex items-center gap-1">
                    <label className="text-[9px] font-mono text-muted-foreground">{c.label}:</label>
                    <input type="color"
                      value={(selected as any)[c.key]?.startsWith("rgba") ? "#000000" : (selected as any)[c.key]}
                      onChange={(e) => updateOverlay(selected.id, { [c.key]: e.target.value })}
                      className="h-6 w-8 rounded border cursor-pointer" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export */}
          <div className="flex gap-2 pt-2 border-t">
            <Button onClick={handleExport} disabled={!baseImage} size="sm" className="text-xs font-mono">
              <Download className="h-3 w-3 mr-1" /> Exportar PNG Final
            </Button>
            <Badge variant="outline" className="text-[9px] font-mono">
              {overlays.length} camada{overlays.length !== 1 ? "s" : ""} · {aiHistory.length - 1} efeito{aiHistory.length - 1 !== 1 ? "s" : ""} AI
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
