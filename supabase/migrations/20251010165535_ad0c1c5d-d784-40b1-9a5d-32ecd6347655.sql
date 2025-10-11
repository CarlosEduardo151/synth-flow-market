-- Add FK from order_installments.order_id to orders.id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'order_installments_order_id_fkey'
      AND n.nspname = 'public'
  ) THEN
    ALTER TABLE public.order_installments
    ADD CONSTRAINT order_installments_order_id_fkey
    FOREIGN KEY (order_id)
    REFERENCES public.orders(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Helpful index for performance
CREATE INDEX IF NOT EXISTS idx_order_installments_order_id
  ON public.order_installments(order_id);
