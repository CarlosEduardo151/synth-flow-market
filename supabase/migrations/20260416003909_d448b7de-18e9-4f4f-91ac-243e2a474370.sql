
CREATE OR REPLACE FUNCTION public.auto_deliver_order_products()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when status changes TO approved, paid, or completed
  IF NEW.status IN ('approved', 'paid', 'completed')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'paid', 'completed'))
  THEN
    PERFORM public.deliver_order_products(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_deliver_on_order_status ON public.orders;

CREATE TRIGGER trg_auto_deliver_on_order_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_deliver_order_products();
