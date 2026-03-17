import * as React from "react";
import { Link } from "react-router-dom";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

type PromoSlide = {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href?: string;
  image?: string;
};

const defaultSlides: PromoSlide[] = [
  {
    id: "promo-1",
    eyebrow: "Oferta do dia",
    title: "Automatize cobranças e reduza inadimplência",
    subtitle: "Ative o Gestão de Cobranças em minutos",
    href: "/p/gestao-cobrancas",
    image: "/images/banners/banner-oferta.jpg",
  },
  {
    id: "promo-2",
    eyebrow: "Teste grátis",
    title: "Experimente nossos sistemas por 7 dias",
    subtitle: "Sem cartão. Cancelamento simples.",
    href: "/teste-gratis",
    image: "/images/banners/banner-trial.jpg",
  },
  {
    id: "promo-3",
    eyebrow: "Novidade",
    title: "Agentes de IA prontos para microempresas",
    subtitle: "Configuração guiada e suporte dedicado",
    href: "/planos",
    image: "/images/banners/banner-novidade.jpg",
  },
];

export function PromoCarousel({ slides = defaultSlides }: { slides?: PromoSlide[] }) {
  const [api, setApi] = React.useState<CarouselApi | null>(null);
  const [dbSlides, setDbSlides] = React.useState<PromoSlide[] | null>(null);
  const [current, setCurrent] = React.useState(0);

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
    return () => { isMounted = false; };
  }, []);

  React.useEffect(() => {
    if (!api) return;

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    onSelect();

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduceMotion) return;

    const interval = window.setInterval(() => api.scrollNext(), 4500);
    return () => {
      window.clearInterval(interval);
      api.off("select", onSelect);
    };
  }, [api]);

  const activeSlides = (dbSlides && dbSlides.length > 0 ? dbSlides : slides) ?? slides;

  return (
    <section aria-label="Ofertas e promoções" className="w-full relative group/carousel">
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "start" }}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {activeSlides.map((s) => (
            <CarouselItem key={s.id} className="pl-0">
              <SlideContent slide={s} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Navigation arrows */}
      <button
        onClick={() => api?.scrollPrev()}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/30 backdrop-blur-md border border-border/30 flex items-center justify-center text-foreground/70 hover:bg-background/60 hover:text-foreground transition-all opacity-0 group-hover/carousel:opacity-100"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => api?.scrollNext()}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/30 backdrop-blur-md border border-border/30 flex items-center justify-center text-foreground/70 hover:bg-background/60 hover:text-foreground transition-all opacity-0 group-hover/carousel:opacity-100"
        aria-label="Próximo slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {activeSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => api?.scrollTo(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current
                ? "w-8 bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
                : "w-2 bg-foreground/30 hover:bg-foreground/50"
            }`}
            aria-label={`Ir para slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

function SlideContent({ slide }: { slide: PromoSlide }) {
  const Wrapper = slide.href ? LinkOrAnchor : "div";

  return (
    <div className="relative w-full h-[140px] sm:h-[160px] md:h-[180px] overflow-hidden">
      {/* Background image */}
      {slide.image && (
        <img
          src={slide.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="eager"
        />
      )}

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/20" />
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-primary/50 to-transparent" />

      {/* Content */}
      <Wrapper href={slide.href} className="relative z-[1] h-full">
        <div className="container mx-auto px-6 h-full flex items-center">
          <div className="max-w-lg space-y-1.5 sm:space-y-2">
            {slide.eyebrow && (
              <span className="inline-block text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]">
                {slide.eyebrow}
              </span>
            )}
            <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-extrabold text-foreground leading-snug drop-shadow-md">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground/90 drop-shadow-sm">
                {slide.subtitle}
              </p>
            )}
            {slide.href && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 hover:border-primary/50 transition-all">
                Saiba mais
                <ArrowRight className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>
      </Wrapper>
    </div>
  );
}

function LinkOrAnchor({
  href,
  children,
  className,
}: {
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!href) return <div className={className}>{children}</div>;

  const isExternal = /^https?:\/\//i.test(href);
  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={`block ${className}`}>
        {children}
      </a>
    );
  }

  return (
    <Link to={href} className={`block ${className}`}>
      {children}
    </Link>
  );
}
