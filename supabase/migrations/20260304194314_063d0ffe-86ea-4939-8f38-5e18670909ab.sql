
CREATE OR REPLACE FUNCTION public.get_email_by_document(doc_type text, doc_value text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  found_user_id uuid;
  found_email text;
BEGIN
  IF doc_type = 'cnpj' THEN
    SELECT user_id INTO found_user_id
    FROM public.fleet_partner_workshops
    WHERE cnpj = doc_value
    LIMIT 1;
    
    IF found_user_id IS NULL THEN
      SELECT user_id INTO found_user_id
      FROM public.fleet_operators
      WHERE cnpj = doc_value
      LIMIT 1;
    END IF;
  ELSE
    SELECT user_id INTO found_user_id
    FROM public.profiles
    WHERE cpf = doc_value
    LIMIT 1;
  END IF;

  IF found_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT email INTO found_email
  FROM auth.users
  WHERE id = found_user_id;

  RETURN found_email;
END;
$$;
