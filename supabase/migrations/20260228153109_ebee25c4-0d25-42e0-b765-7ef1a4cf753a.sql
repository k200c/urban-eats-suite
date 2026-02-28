
ALTER TABLE public.ingredients
  ADD COLUMN ingredient_type text NOT NULL DEFAULT 'other',
  ADD COLUMN addon_price numeric(10,2) NOT NULL DEFAULT 0.50,
  ADD COLUMN addon_price_kids numeric(10,2) NOT NULL DEFAULT 0.50;

CREATE INDEX idx_ingredients_name ON public.ingredients(name);

-- Seed pricing rules
UPDATE public.ingredients SET ingredient_type = 'meat', addon_price = 2.50, addon_price_kids = 2.50 WHERE name ILIKE '%bacon%';
UPDATE public.ingredients SET ingredient_type = 'cheese', addon_price = 2.00, addon_price_kids = 2.00 WHERE name ILIKE '%halloumi%';
UPDATE public.ingredients SET ingredient_type = 'sauce', addon_price = 1.50, addon_price_kids = 0.00
  WHERE name ILIKE '%sauce%' OR name ILIKE '%mayo%' OR name ILIKE '%aioli%' OR name ILIKE '%relish%';
