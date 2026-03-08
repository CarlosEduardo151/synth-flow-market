
-- Cache Inteligente de Preços - Indexação Sob Demanda
CREATE TABLE public.fleet_price_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_key text NOT NULL,
  descricao_original text NOT NULL,
  category text NOT NULL DEFAULT 'peca',
  
  -- Preços descobertos
  min_price numeric NOT NULL DEFAULT 0,
  avg_price numeric NOT NULL DEFAULT 0,
  max_fair numeric NOT NULL DEFAULT 0,
  median_price numeric NOT NULL DEFAULT 0,
  
  -- Fonte e rastreabilidade
  source text NOT NULL DEFAULT 'mercadolivre',
  source_url text,
  raw_prices jsonb DEFAULT '[]'::jsonb,
  
  -- Metadata
  hit_count integer NOT NULL DEFAULT 1,
  region text NOT NULL DEFAULT 'BR-010',
  
  -- Timestamps
  scraped_at timestamp with time zone NOT NULL DEFAULT now(),
  last_hit_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Unique constraint: one cache entry per search key + region
  UNIQUE(search_key, region)
);

-- Index for fast lookups
CREATE INDEX idx_fleet_price_cache_search ON public.fleet_price_cache(search_key);
CREATE INDEX idx_fleet_price_cache_scraped ON public.fleet_price_cache(scraped_at);

-- RLS
ALTER TABLE public.fleet_price_cache ENABLE ROW LEVEL SECURITY;

-- Service role full access (edge functions)
CREATE POLICY "Service role full access price cache"
  ON public.fleet_price_cache FOR ALL
  USING (true) WITH CHECK (true);

-- Authenticated users can read cache
CREATE POLICY "Authenticated can read price cache"
  ON public.fleet_price_cache FOR SELECT
  TO authenticated
  USING (true);

-- Grant permissions
GRANT SELECT ON public.fleet_price_cache TO authenticated;
GRANT ALL ON public.fleet_price_cache TO service_role;

-- Also for services table
CREATE TABLE public.fleet_service_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key text NOT NULL,
  descricao_original text NOT NULL,
  
  horas_ref numeric NOT NULL DEFAULT 0,
  taxa_minima numeric NOT NULL DEFAULT 0,
  taxa_media numeric NOT NULL DEFAULT 0,
  taxa_max_fair numeric NOT NULL DEFAULT 0,
  
  source text NOT NULL DEFAULT 'regional',
  hit_count integer NOT NULL DEFAULT 1,
  region text NOT NULL DEFAULT 'BR-010',
  
  last_hit_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  UNIQUE(service_key, region)
);

ALTER TABLE public.fleet_service_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access service cache"
  ON public.fleet_service_cache FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read service cache"
  ON public.fleet_service_cache FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.fleet_service_cache TO authenticated;
GRANT ALL ON public.fleet_service_cache TO service_role;
