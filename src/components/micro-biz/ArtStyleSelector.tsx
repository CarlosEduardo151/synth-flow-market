import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Palette, Car, Shirt, ShoppingBasket, PenLine, Check } from "lucide-react";

export interface ArtStyle {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  prompt: string;
}

const PRESET_STYLES: ArtStyle[] = [
  {
    id: "automotive-dark-tech",
    label: "Automotivo Dark Tech",
    icon: <Car className="h-5 w-5" />,
    description: "Estética cinematográfica com neon roxo/ciano. Ideal para oficinas, autopeças e serviços automotivos.",
    prompt: `[VISUAL STYLE]: Enterprise Dark Tech with a "Black & Neon" color palette. Background must be pure black with deep texture. Content cards are dark grey. Details and highlights are Roxo Neon and Azul Ciano, creating dramatic edge lighting.
[LAYOUT]: Cinematic macro photography style. The product floats over a textured dark pedestal with dramatic neon purple and blue backlighting creating metallic sheen. Dynamic geometric sans-serif typography. CTA button in bold neon ciano on darker gray card. Subtle glowing topographic line maps in pure black background with bokeh and light particle effects.
[TECHNICAL]: High resolution, cinematic studio photography, extremely detailed textures, 8k, photorealistic quality, depth of field focused on product.`,
  },
  {
    id: "moda-chic-elegante",
    label: "Moda Chic Elegante",
    icon: <Shirt className="h-5 w-5" />,
    description: "Visual editorial de luxo com neon roxo/magenta. Perfeito para boutiques, bazares e moda feminina.",
    prompt: `[VISUAL STYLE]: Elegant Neon Chic with deep pure black background, dark grey cards, and dramatic highlights in Roxo Neon and soft Magenta creating a luxurious edge.
[LAYOUT]: Editorial-style studio photography. Product displayed on textured dark pedestal or elegant dark grey card with high-end studio lighting and subtle neon rim light. Mix of sophisticated serif for accent titles and clean sans-serif for info. CTA in bold Roxo Neon. Pure black background with soft Roxo/Magenta gradients and delicate glowing light particles.
[TECHNICAL]: High resolution, editorial photography style, extremely detailed textures (fabric, metallic details), 8k, photorealistic quality, soft focus background.`,
  },
  {
    id: "mercado-fresh-urban",
    label: "Mercado Fresh Urban",
    icon: <ShoppingBasket className="h-5 w-5" />,
    description: "Vibrante e premium com neon + dourado. Ideal para mercados, padarias e alimentação.",
    prompt: `[VISUAL STYLE]: Fresh Urban Market Tech with deep pure black background, dark grey cards, and vibrant highlights of Roxo Neon, Azul Ciano, and metallic gold accents.
[LAYOUT]: High-quality macro photography of vibrant products on dark textured wood surface with dramatic studio lighting and bokeh neon background. Geometric friendly sans-serif typography in white/gold mix. CTA in bold Azul Ciano. Deep black background with glowing topography maps in Roxo/Ciano tones and soft bokeh particle effects.
[TECHNICAL]: High resolution, macro photography style, extremely detailed textures (food, metallic accents), 8k, photorealistic quality, very shallow depth of field on foreground.`,
  },
];

interface Props {
  value: { styleId: string | null; customPrompt: string };
  onChange: (val: { styleId: string | null; customPrompt: string }) => void;
}

export function ArtStyleSelector({ value, onChange }: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const selected = value.styleId;

  const handleSelect = (id: string) => {
    if (selected === id) {
      onChange({ styleId: null, customPrompt: value.customPrompt });
    } else {
      onChange({ styleId: id, customPrompt: "" });
      setShowCustom(false);
    }
  };

  const handleCustomToggle = () => {
    setShowCustom(!showCustom);
    onChange({ styleId: null, customPrompt: value.customPrompt });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-primary" />
        <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
          ESTILO DA ARTE
        </p>
      </div>
      <p className="text-[10px] text-muted-foreground font-mono">
        Escolha um modelo de estilo ou escreva suas próprias instruções para a IA gerar a arte do seu produto.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PRESET_STYLES.map((style) => (
          <Card
            key={style.id}
            className={`cursor-pointer transition-all hover:border-primary/60 ${
              selected === style.id
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border"
            }`}
            onClick={() => handleSelect(style.id)}
          >
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${selected === style.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {style.icon}
                  </div>
                  <span className="text-xs font-mono font-bold">{style.label}</span>
                </div>
                {selected === style.id && (
                  <Badge variant="default" className="text-[9px] px-1.5 py-0">
                    <Check className="h-3 w-3 mr-0.5" /> Selecionado
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{style.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom prompt toggle */}
      <div className="pt-1">
        <Button
          variant={showCustom ? "secondary" : "outline"}
          size="sm"
          className="text-[10px] font-mono"
          onClick={handleCustomToggle}
        >
          <PenLine className="h-3 w-3 mr-1" />
          {showCustom ? "Fechar Editor" : "Escrever Instruções Personalizadas"}
        </Button>
      </div>

      {showCustom && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Textarea
            placeholder="Descreva como você quer a arte. Ex: 'Fundo rosa claro, estilo minimalista, com flores ao redor do produto, tipografia elegante em dourado...'"
            value={value.customPrompt}
            onChange={(e) => onChange({ styleId: null, customPrompt: e.target.value })}
            className="text-xs font-mono min-h-[100px] resize-y"
          />
          <p className="text-[9px] text-muted-foreground font-mono">
            💡 Dica: Seja específico sobre cores, estilo, elementos visuais e tom da arte.
          </p>
        </div>
      )}
    </div>
  );
}

export { PRESET_STYLES };
