
-- Fix Kids Menu pricing: Chips addon_price_kids → €2.00
UPDATE public.ingredients SET addon_price_kids = 2.00 WHERE LOWER(name) = 'chips';

-- Add Capri Sun ingredient for Kids Menu pricing (€1.50)
INSERT INTO public.ingredients (name, ingredient_type, addon_price, addon_price_kids, in_stock)
VALUES ('Capri Sun', 'drink', 1.50, 1.50, true)
ON CONFLICT DO NOTHING;
