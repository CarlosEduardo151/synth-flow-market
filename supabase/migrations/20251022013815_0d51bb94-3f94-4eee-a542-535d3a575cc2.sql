-- Corrigir função para incluir search_path
CREATE OR REPLACE FUNCTION update_starapp_hotels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;