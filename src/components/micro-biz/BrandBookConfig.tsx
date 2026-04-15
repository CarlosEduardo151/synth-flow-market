import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Palette, Type, Grid3X3, Check, Plus, X, BookOpen, ChevronDown, ChevronUp
} from "lucide-react";

export interface BrandBook {
  headingFont: string;
  bodyFont: string;
  colors: string[];
  gridEnabled: boolean;
  gridColumns: number;
  gridMargin: number;
}

const FONT_PRESETS = [
  { label: "Inter", value: "Inter" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "Roboto", value: "Roboto" },
  { label: "Poppins", value: "Poppins" },
  { label: "Oswald", value: "Oswald" },
  { label: "Bebas Neue", value: "Bebas Neue" },
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Raleway", value: "Raleway" },
];

const COLOR_PALETTES = [
  { label: "Dark Tech Neon", colors: ["#000000", "#0D0D0D", "#00D4FF", "#A855F7", "#FFFFFF"] },
  { label: "Luxo Dourado", colors: ["#0A0A0A", "#1A1A2E", "#D4AF37", "#F5E6CC", "#FFFFFF"] },
  { label: "Fresh Vibrante", colors: ["#1B1B2F", "#162447", "#1F4068", "#E43F5A", "#FFFFFF"] },
  { label: "Clean Minimal", colors: ["#FFFFFF", "#F8F9FA", "#212529", "#0D6EFD", "#198754"] },
];

const DEFAULT_BRAND: BrandBook = {
  headingFont: "Inter",
  bodyFont: "Inter",
  colors: ["#000000", "#FFFFFF", "#A855F7", "#00D4FF", "#facc15"],
  gridEnabled: true,
  gridColumns: 12,
  gridMargin: 5,
};

interface Props {
  value: BrandBook;
  onChange: (val: BrandBook) => void;
}

export function BrandBookConfig({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [newColor, setNewColor] = useState("#A855F7");

  const addColor = () => {
    if (value.colors.length >= 8) return;
    if (!value.colors.includes(newColor)) {
      onChange({ ...value, colors: [...value.colors, newColor] });
    }
  };

  const removeColor = (idx: number) => {
    onChange({ ...value, colors: value.colors.filter((_, i) => i !== idx) });
  };

  const applyPalette = (colors: string[]) => {
    onChange({ ...value, colors });
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <BookOpen className="h-4 w-4 text-primary" />
        <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest flex-1">
          BRAND BOOK — MANUAL DE IDENTIDADE
        </p>
        <Badge variant="outline" className="text-[9px] font-mono">
          {value.headingFont} + {value.bodyFont} · {value.colors.length} cores
        </Badge>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Tipografia */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Type className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                TIPOGRAFIA (MÁX. 2 FONTES)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-muted-foreground">TÍTULOS</label>
                <div className="flex flex-wrap gap-1">
                  {FONT_PRESETS.map(f => (
                    <Button
                      key={f.value + "-h"}
                      variant={value.headingFont === f.value ? "default" : "outline"}
                      size="sm"
                      className="text-[9px] font-mono h-6 px-2"
                      style={{ fontFamily: f.value }}
                      onClick={() => onChange({ ...value, headingFont: f.value })}
                    >
                      {value.headingFont === f.value && <Check className="h-2.5 w-2.5 mr-0.5" />}
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-muted-foreground">CORPO</label>
                <div className="flex flex-wrap gap-1">
                  {FONT_PRESETS.map(f => (
                    <Button
                      key={f.value + "-b"}
                      variant={value.bodyFont === f.value ? "default" : "outline"}
                      size="sm"
                      className="text-[9px] font-mono h-6 px-2"
                      style={{ fontFamily: f.value }}
                      onClick={() => onChange({ ...value, bodyFont: f.value })}
                    >
                      {value.bodyFont === f.value && <Check className="h-2.5 w-2.5 mr-0.5" />}
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <Card className="bg-muted/20">
              <CardContent className="p-3 space-y-1">
                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">PREVIEW</p>
                <p style={{ fontFamily: value.headingFont }} className="text-lg font-bold">
                  Título Principal — {value.headingFont}
                </p>
                <p style={{ fontFamily: value.bodyFont }} className="text-sm text-muted-foreground">
                  Este é o corpo do texto que aparecerá nos criativos. — {value.bodyFont}
                </p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Paleta de Cores */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Palette className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                PALETA DE CORES (CÓDIGOS HEX EXATOS)
              </p>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {COLOR_PALETTES.map(p => (
                <button
                  key={p.label}
                  onClick={() => applyPalette(p.colors)}
                  className="p-2 rounded-lg border hover:border-primary/60 transition-all space-y-1.5"
                >
                  <div className="flex gap-0.5">
                    {p.colors.map((c, i) => (
                      <div key={i} className="h-4 flex-1 rounded-sm" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <p className="text-[9px] font-mono text-muted-foreground text-center">{p.label}</p>
                </button>
              ))}
            </div>

            {/* Current colors */}
            <div className="flex flex-wrap gap-2 items-center">
              {value.colors.map((c, i) => (
                <div key={i} className="flex items-center gap-1 rounded-md border px-1.5 py-1 bg-background">
                  <div className="h-5 w-5 rounded-sm border" style={{ backgroundColor: c }} />
                  <span className="text-[9px] font-mono font-bold">{c}</span>
                  <button onClick={() => removeColor(i)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {value.colors.length < 8 && (
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="h-6 w-8 rounded border cursor-pointer"
                  />
                  <Button variant="ghost" size="sm" className="h-6 text-[9px] font-mono" onClick={addColor}>
                    <Plus className="h-3 w-3 mr-0.5" /> Adicionar
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Grid */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                GRID DE ALINHAMENTO
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-[10px] font-mono cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.gridEnabled}
                  onChange={(e) => onChange({ ...value, gridEnabled: e.target.checked })}
                  className="rounded"
                />
                Mostrar grid no compositor
              </label>
              <div className="flex items-center gap-1">
                <label className="text-[9px] font-mono text-muted-foreground">COLUNAS:</label>
                {[6, 8, 12].map(n => (
                  <Button
                    key={n}
                    variant={value.gridColumns === n ? "default" : "outline"}
                    size="sm"
                    className="h-6 w-8 text-[9px] font-mono"
                    onClick={() => onChange({ ...value, gridColumns: n })}
                  >
                    {n}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <label className="text-[9px] font-mono text-muted-foreground">MARGEM:</label>
                {[3, 5, 8].map(n => (
                  <Button
                    key={n}
                    variant={value.gridMargin === n ? "default" : "outline"}
                    size="sm"
                    className="h-6 w-8 text-[9px] font-mono"
                    onClick={() => onChange({ ...value, gridMargin: n })}
                  >
                    {n}%
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-2 rounded-md bg-primary/5 border border-primary/20">
            <p className="text-[9px] font-mono text-muted-foreground leading-relaxed">
              💡 <strong>Dica de agência:</strong> Mantenha no máximo 2 fontes e 5 cores. O que separa o amador do profissional é a consistência e o espaço em branco. Anúncios profissionais deixam o design "respirar".
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export { DEFAULT_BRAND };
