
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE public.crm_client_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  client_name text NOT NULL,
  client_phone text,
  interaction_date timestamptz NOT NULL DEFAULT now(),
  summary text NOT NULL,
  topics text[] DEFAULT '{}',
  sentiment text DEFAULT 'neutro',
  raw_message_count int DEFAULT 0,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('portuguese', coalesce(client_name, '') || ' ' || coalesce(summary, ''))
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_client_memories_search_idx ON public.crm_client_memories USING gin(search_vector);
CREATE INDEX crm_client_memories_client_name_trgm_idx ON public.crm_client_memories USING gin(client_name extensions.gin_trgm_ops);
CREATE INDEX crm_client_memories_cp_idx ON public.crm_client_memories(customer_product_id);
CREATE INDEX crm_client_memories_date_idx ON public.crm_client_memories(interaction_date DESC);

ALTER TABLE public.crm_client_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage crm_client_memories"
ON public.crm_client_memories FOR ALL TO public
USING (owns_customer_product(customer_product_id))
WITH CHECK (owns_customer_product(customer_product_id));

CREATE POLICY "Admins can manage crm_client_memories"
ON public.crm_client_memories FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

GRANT ALL ON public.crm_client_memories TO service_role;

-- Search function returning JSON to avoid type issues
CREATE OR REPLACE FUNCTION public.search_crm_memories(
  p_customer_product_id uuid,
  p_query text,
  p_limit int DEFAULT 20
)
RETURNS TABLE(
  mem_id uuid,
  mem_client_name text,
  mem_client_phone text,
  mem_interaction_date timestamptz,
  mem_summary text,
  mem_topics text[],
  mem_sentiment text,
  mem_raw_message_count int
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (m.id)
    m.id,
    m.client_name,
    m.client_phone,
    m.interaction_date,
    m.summary,
    m.topics,
    m.sentiment,
    m.raw_message_count
  FROM crm_client_memories m
  WHERE m.customer_product_id = p_customer_product_id
    AND (
      m.search_vector @@ plainto_tsquery('portuguese', p_query)
      OR extensions.similarity(m.client_name, p_query) > 0.2
      OR m.client_name ILIKE '%' || p_query || '%'
      OR m.summary ILIKE '%' || p_query || '%'
    )
  ORDER BY m.id, m.interaction_date DESC
  LIMIT p_limit;
$$;
