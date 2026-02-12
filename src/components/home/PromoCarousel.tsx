import * as React from "react";
import { Link } from "react-router-dom";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";

type PromoSlide = {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href?: string;
};

const defaultSlides: PromoSlide[] = [
  {
    id: "promo-1",
    eyebrow: "Oferta do dia",
    title: "Automatize cobranças e reduza inadimplência",
    subtitle: "Ative o Gestão de Cobranças em minutos",
    href: "/p/gestao-cobrancas",
  },
  {
    id: "promo-2",
    eyebrow: "Teste grátis",
    title: "Experimente nossos sistemas por 7 dias",
    subtitle: "Sem cartão. Cancelamento simples.",
    href: "/teste-gratis",
  },
  {
    id: "promo-3",
    eyebrow: "Novidade",
    title: "Agentes de IA prontos para microempresas",
    subtitle: "Configuração guiada e suporte dedicado",
    href: "/planos",
  },
];

export function PromoCarousel({ slides = defaultSlides }: { slides?: PromoSlide[] }) {
  const [api, setApi] = React.useState<CarouselApi | null>(null);
  const [dbSlides, setDbSlides] = React.useState<PromoSlide[] | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("promo_carousel_slides")
        .select("id,title,subtitle,eyebrow,href,is_active,sort_order,created_at")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!isMounted) return;
      if (error) {
        console.error("PromoCarousel load slides error:", error);
        setDbSlides([]);
        return;
      }

      const mapped: PromoSlide[] = (data ?? []).map((r: any) => ({
        id: r.id,
        title: r.title,
        subtitle: r.subtitle ?? undefined,
        eyebrow: r.eyebrow ?? undefined,
        href: r.href ?? undefined,
      }));
      setDbSlides(mapped);
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!api) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduceMotion) return;

    const interval = window.setInterval(() => {
      api.scrollNext();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [api]);

  const activeSlides = (dbSlides && dbSlides.length > 0 ? dbSlides : slides) ?? slides;

  return (
    <section aria-label="Ofertas e promoções" className="w-full">
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "start" }}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {activeSlides.map((s) => (
            <CarouselItem key={s.id} className="pl-0">
              <div className="w-full">
                <div className="w-full border-y border-border bg-gradient-to-r from-card/20 via-card/40 to-card/20 backdrop-blur supports-[backdrop-filter]:bg-card/20">
                  <div className="container mx-auto px-4">
                    <div className="h-24 md:h-28 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        {s.eyebrow && (
                          <p className="text-xs text-muted-foreground tracking-wide uppercase">
                            {s.eyebrow}
                          </p>
                        )}
                        <p className="truncate text-base md:text-lg font-semibold text-foreground">
                          {s.title}
                        </p>
                        {s.subtitle && (
                          <p className="truncate text-sm text-muted-foreground">{s.subtitle}</p>
                        )}
                      </div>

                      <div className="hidden sm:flex items-center gap-3">
                        {s.href ? (
                          <ButtonLikeLink href={s.href} />
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                            <span>Atualiza a cada 3s</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}

function ButtonLikeLink({ href }: { href: string }) {
  const isExternal = /^https?:\/\//i.test(href);
  const className =
    "inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        Ver detalhes
        <ArrowRight className="h-4 w-4" />
      </a>
    );
  }

  return (
    <Link to={href} className={className}>
      Ver detalhes
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

