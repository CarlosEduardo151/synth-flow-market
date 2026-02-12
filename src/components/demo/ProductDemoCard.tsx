import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { Product } from "@/types/product";

type Props = {
  product: Product;
};

export function ProductDemoCard({ product }: Props) {
  const videoSrc = useMemo(() => `/videos/${product.slug}.mp4`, [product.slug]);
  const [hasVideo, setHasVideo] = useState(true);

  return (
    <article className="tech-border overflow-hidden hover-glow">
      <div className="p-4 sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-bold truncate">{product.title}</h3>
            <p className="text-sm text-muted-foreground truncate">{product.short}</p>
          </div>

          {!hasVideo && (
            <Badge variant="secondary" className="shrink-0">
              Em breve
            </Badge>
          )}
        </header>

        <div className="mt-4">
          {hasVideo ? (
            <AspectRatio ratio={16 / 9}>
              <video
                src={videoSrc}
                controls
                playsInline
                preload="metadata"
                onError={() => setHasVideo(false)}
                className="h-full w-full rounded-xl bg-muted object-cover"
              />
            </AspectRatio>
          ) : (
            <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-4">
              <p className="font-medium">Vídeo em produção</p>
              <p className="text-sm text-muted-foreground mt-1">
                Assim que o arquivo <span className="font-mono">{`/public/videos/${product.slug}.mp4`}</span> estiver no ar,
                ele aparece aqui automaticamente.
              </p>
            </div>
          )}
        </div>

        <footer className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/produto/${product.slug}`}>Ver produto</Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/teste-gratis">Testar</Link>
          </Button>
        </footer>
      </div>
    </article>
  );
}
