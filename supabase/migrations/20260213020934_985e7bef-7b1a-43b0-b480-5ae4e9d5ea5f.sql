-- Add display_order column to customer_reviews
ALTER TABLE public.customer_reviews 
ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- Add customer_photo_url column if missing
ALTER TABLE public.customer_reviews 
ADD COLUMN IF NOT EXISTS customer_photo_url text;