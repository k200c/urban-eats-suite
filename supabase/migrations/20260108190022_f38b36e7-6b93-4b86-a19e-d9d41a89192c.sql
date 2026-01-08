-- Add is_addable column to product_ingredients table
ALTER TABLE public.product_ingredients 
ADD COLUMN IF NOT EXISTS is_addable boolean NOT NULL DEFAULT true;