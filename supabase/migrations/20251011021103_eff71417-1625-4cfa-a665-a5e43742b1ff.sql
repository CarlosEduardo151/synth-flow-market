-- Create persistent notifications table
CREATE TABLE public.persistent_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  view_count INTEGER NOT NULL DEFAULT 0,
  max_views INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.persistent_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.persistent_notifications
FOR SELECT
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Users can update their own notifications (to increment view count)
CREATE POLICY "Users can update their own notifications"
ON public.persistent_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can create notifications
CREATE POLICY "Admins can create notifications"
ON public.persistent_notifications
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Admins can manage all notifications
CREATE POLICY "Admins can manage notifications"
ON public.persistent_notifications
FOR ALL
USING (is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_persistent_notifications_user_active 
ON public.persistent_notifications(user_id, is_active) 
WHERE is_active = true;

-- Function to automatically deactivate notifications after max views
CREATE OR REPLACE FUNCTION public.check_notification_max_views()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.view_count >= NEW.max_views THEN
    NEW.is_active = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check max views on update
CREATE TRIGGER check_notification_views
BEFORE UPDATE ON public.persistent_notifications
FOR EACH ROW
EXECUTE FUNCTION public.check_notification_max_views();