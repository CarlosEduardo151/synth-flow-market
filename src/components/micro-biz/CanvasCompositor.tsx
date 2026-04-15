import { useRef, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Download, Type, Plus, Trash2, Move, RotateCw,
  Layers, Eye, EyeOff, Sparkles
} from "lucide-react";

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

interface Props {
  baseImageUrl: string;
  suggestedTexts?: { headline?: string; cta?: string }[];
  onExport?: (dataUrl: string) => void;
}

export function CanvasCompositor({ baseImageUrl, suggestedTexts, onExport }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Load base image
  useEffect(() => {
    if (!baseImageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setBaseImage(img);
    img.src = baseImageUrl;
  }, [baseImageUrl]);

  // Render canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = baseImage.width;
    canvas.height = baseImage.height;

    // Draw base
    ctx.drawImage(baseImage, 0, 0);

    // Draw overlays
    overlays.filter(o => o.visible).forEach(o => {
      ctx.save();
      const px = (o.x / 100) * canvas.width;
      const py = (o.y / 100) * canvas.height;
      ctx.translate(px, py);
      ctx.rotate((o.rotation * Math.PI) / 180);

      // Scale for perspective effect
      if (o.perspective > 0) {
        const scaleY = 1 - o.perspective * 0.005;
        ctx.transform(1, 0, o.perspective * 0.01, scaleY, 0, 0);
      }

      const scaledFontSize = (o.fontSize / 100) * canvas.width * 0.08;
      ctx.font = `${o.fontWeight} ${scaledFontSize}px "Inter", "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      (ctx as any).letterSpacing = `${o.letterSpacing}px`;

      // Glow effect
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

      // Main shadow
      ctx.shadowColor = o.shadowColor;
      ctx.shadowBlur = o.shadowBlur;
      ctx.shadowOffsetX = o.shadowOffsetX;
      ctx.shadowOffsetY = o.shadowOffsetY;

      // Main text
      ctx.fillStyle = o.color;
      ctx.fillText(o.text, 0, 0);

      // Highlight edge (top-left light)
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(o.text, -1, -1);
      ctx.globalAlpha = 1;

      ctx.restore();
    });
  }, [baseImage, overlays]);

  useEffect(() => { render(); }, [render]);

  const addOverlay = (text: string, preset?: Partial<TextOverlay>) => {
    const id = crypto.randomUUID();
    setOverlays(prev => [...prev, {
      ...DEFAULT_OVERLAY,
      id, text,
      y: 30 + prev.length * 15,
      ...preset,
    }]);
    setSelectedId(id);
  };

  const updateOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const removeOverlay = (id: string) => {
    setOverlays(prev => prev.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onExport?.(dataUrl);
    const link = document.createElement("a");
    link.download = "arte-final.png";
    link.href = dataUrl;
    link.click();
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 100;
    const my = ((e.clientY - rect.top) / rect.height) * 100;

    const hit = [...overlays].reverse().find(o => {
      const dx = Math.abs(mx - o.x);
      const dy = Math.abs(my - o.y);
      return dx < 15 && dy < 8;
    });

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
    const mx = ((e.clientX - rect.left) / rect.width) * 100;
    const my = ((e.clientY - rect.top) / rect.height) * 100;
    updateOverlay(dragging, { x: mx - dragOffset.x, y: my - dragOffset.y });
  };

  const handleMouseUp = () => setDragging(null);

  const selected = overlays.find(o => o.id === selectedId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <Layers className="h-4 w-4" /> COMPOSITOR 3D — ETAPA 2
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Canvas Preview */}
          <div className="relative rounded-lg border overflow-hidden bg-black">
            <canvas
              ref={canvasRef}
              className="w-full h-auto cursor-move"
              style={{ maxHeight: 500 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            {!baseImage && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs font-mono">
                Aguardando imagem base da Etapa 1...
              </div>
            )}
          </div>

          {/* Quick-add presets */}
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
              ⚡ TEXTOS RÁPIDOS
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_TEXTS.map(p => (
                <Button
                  key={p.label}
                  variant="outline"
                  size="sm"
                  className="text-[10px] font-mono"
                  onClick={() => addOverlay(p.text, { color: p.color, glowColor: p.glowColor, glowIntensity: p.glowIntensity })}
                >
                  <Plus className="h-3 w-3 mr-1" /> {p.label}
                </Button>
              ))}
              {suggestedTexts?.slice(0, 2).map((s, i) => (
                s.headline && (
                  <Button
                    key={i}
                    variant="secondary"
                    size="sm"
                    className="text-[10px] font-mono"
                    onClick={() => addOverlay(s.headline!, { fontSize: 40 })}
                  >
                    <Sparkles className="h-3 w-3 mr-1" /> {s.headline!.slice(0, 20)}...
                  </Button>
                )
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] font-mono"
                onClick={() => addOverlay("SEU TEXTO")}
              >
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
                  <div
                    key={o.id}
                    className={`flex items-center gap-2 p-2 rounded-md border text-xs font-mono cursor-pointer transition-colors ${
                      selectedId === o.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                    onClick={() => setSelectedId(o.id)}
                  >
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

          {/* Selected overlay editor */}
          {selected && (
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                ✏️ EDITAR: {selected.text}
              </p>
              <Input
                value={selected.text}
                onChange={(e) => updateOverlay(selected.id, { text: e.target.value })}
                className="text-xs font-mono font-bold"
                placeholder="Texto do overlay"
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-muted-foreground">TAMANHO</label>
                  <Slider value={[selected.fontSize]} onValueChange={([v]) => updateOverlay(selected.id, { fontSize: v })} min={12} max={120} step={1} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-muted-foreground">ROTAÇÃO</label>
                  <Slider value={[selected.rotation]} onValueChange={([v]) => updateOverlay(selected.id, { rotation: v })} min={-45} max={45} step={1} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-muted-foreground">BRILHO NEON</label>
                  <Slider value={[selected.glowIntensity]} onValueChange={([v]) => updateOverlay(selected.id, { glowIntensity: v })} min={0} max={40} step={1} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-muted-foreground">PERSPECTIVA 3D</label>
                  <Slider value={[selected.perspective]} onValueChange={([v]) => updateOverlay(selected.id, { perspective: v })} min={-30} max={30} step={1} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-muted-foreground">SOMBRA</label>
                  <Slider value={[selected.shadowBlur]} onValueChange={([v]) => updateOverlay(selected.id, { shadowBlur: v })} min={0} max={40} step={1} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-muted-foreground">ESPAÇAMENTO</label>
                  <Slider value={[selected.letterSpacing]} onValueChange={([v]) => updateOverlay(selected.id, { letterSpacing: v })} min={0} max={20} step={1} />
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <label className="text-[9px] font-mono text-muted-foreground">COR:</label>
                <input type="color" value={selected.color} onChange={(e) => updateOverlay(selected.id, { color: e.target.value })} className="h-6 w-8 rounded border cursor-pointer" />
                <label className="text-[9px] font-mono text-muted-foreground">NEON:</label>
                <input type="color" value={selected.glowColor} onChange={(e) => updateOverlay(selected.id, { glowColor: e.target.value })} className="h-6 w-8 rounded border cursor-pointer" />
                <label className="text-[9px] font-mono text-muted-foreground">SOMBRA:</label>
                <input type="color" value={selected.shadowColor.startsWith("rgba") ? "#000000" : selected.shadowColor} onChange={(e) => updateOverlay(selected.id, { shadowColor: e.target.value })} className="h-6 w-8 rounded border cursor-pointer" />
              </div>
            </div>
          )}

          {/* Export */}
          <div className="flex gap-2 pt-2 border-t">
            <Button onClick={handleExport} disabled={!baseImage || overlays.length === 0} size="sm" className="text-xs font-mono">
              <Download className="h-3 w-3 mr-1" /> Exportar PNG Final
            </Button>
            <Badge variant="outline" className="text-[9px] font-mono">
              {overlays.length} camada{overlays.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
