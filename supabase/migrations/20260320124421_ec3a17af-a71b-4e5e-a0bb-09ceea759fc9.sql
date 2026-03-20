-- Fix Beef Patty addon_price_kids: 0.50 → 2.50 for Kids Menu items
UPDATE public.ingredients
SET addon_price_kids = 2.50
WHERE id = '42ca577e-a895-42f5-9e46-e207dfba282f'
  AND name = 'Beef Patty';

-- Link Beef Patty to Kids Cheeseburger (already linked to Smash Burger Plain)
INSERT INTO public.product_ingredients (product_id, ingredient_id, is_default, is_removable, is_addable)
VALUES (
  '39852f78-69d9-4d80-bd65-54ca2f2c1b31',  -- Kids Cheeseburger
  '42ca577e-a895-42f5-9e46-e207dfba282f',  -- Beef Patty
  false,  -- not included by default
  false,  -- can't remove what's not there
  true    -- can add it
)
ON CONFLICT DO NOTHING;