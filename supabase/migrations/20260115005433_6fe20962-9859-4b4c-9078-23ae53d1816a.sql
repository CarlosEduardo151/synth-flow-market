
-- =============================================
-- TABELA: ticket_messages
-- =============================================
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ticket messages" ON public.ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_messages.ticket_id
      AND (st.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Users can insert ticket messages" ON public.ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_messages.ticket_id
      AND st.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage ticket messages" ON public.ticket_messages
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- ADICIONAR COLUNA is_featured em customer_reviews
-- =============================================
ALTER TABLE public.customer_reviews ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
