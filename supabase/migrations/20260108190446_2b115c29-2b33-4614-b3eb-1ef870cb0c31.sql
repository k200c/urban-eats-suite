-- Add unique constraint on product name for upsert operations
ALTER TABLE public.products ADD CONSTRAINT products_name_unique UNIQUE (name);