-- Fix do linter: RLS Enabled No Policy (coupons, installments)

-- -----------------------
-- COUPONS
-- -----------------------
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar tudo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='coupons' AND policyname='Coupons: admin can manage'
  ) THEN
    CREATE POLICY "Coupons: admin can manage"
    ON public.coupons
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END$$;

-- Qualquer pessoa pode consultar cupons ativos (necessário para aplicar cupom no checkout)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='coupons' AND policyname='Coupons: public can view active'
  ) THEN
    CREATE POLICY "Coupons: public can view active"
    ON public.coupons
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);
  END IF;
END$$;

-- -----------------------
-- INSTALLMENTS
-- -----------------------
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar tudo (painel admin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='installments' AND policyname='Installments: admin can manage'
  ) THEN
    CREATE POLICY "Installments: admin can manage"
    ON public.installments
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END$$;

-- Usuário pode ver suas parcelas quando a parcela pertence a um pedido dele
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='installments' AND policyname='Installments: user can view own via order'
  ) THEN
    CREATE POLICY "Installments: user can view own via order"
    ON public.installments
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = installments.order_id
          AND o.user_id = auth.uid()
      )
    );
  END IF;
END$$;

-- Usuário pode inserir parcelas apenas para pedidos dele (fluxo PIX)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='installments' AND policyname='Installments: user can insert own via order'
  ) THEN
    CREATE POLICY "Installments: user can insert own via order"
    ON public.installments
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = installments.order_id
          AND o.user_id = auth.uid()
      )
    );
  END IF;
END$$;
