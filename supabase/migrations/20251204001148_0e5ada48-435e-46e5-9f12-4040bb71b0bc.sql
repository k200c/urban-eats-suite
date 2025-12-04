-- Create ingredients table for removable items
CREATE TABLE public.ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

-- Everyone can view ingredients
CREATE POLICY "Ingredients are viewable by everyone" 
ON public.ingredients 
FOR SELECT 
USING (true);

-- Create product_ingredients junction table
CREATE TABLE public.product_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, ingredient_id)
);

-- Enable RLS
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;

-- Everyone can view product ingredients
CREATE POLICY "Product ingredients are viewable by everyone" 
ON public.product_ingredients 
FOR SELECT 
USING (true);

-- Seed ingredients
INSERT INTO public.ingredients (name) VALUES
  ('Lettuce'),
  ('Tomato'),
  ('Onions'),
  ('Pickles'),
  ('House Sauce');

-- Link ingredients to Urban Legend burger
INSERT INTO public.product_ingredients (product_id, ingredient_id, is_default)
SELECT 
  '405e8403-04d3-47cd-bdaf-c842a0f8f0df'::uuid,
  id,
  true
FROM public.ingredients;

-- Seed modifier groups
INSERT INTO public.modifier_groups (id, name, min_selection, max_selection) VALUES
  ('a1b2c3d4-1111-1111-1111-111111111111', 'Add-ons', 0, 10),
  ('a1b2c3d4-2222-2222-2222-222222222222', 'Drinks', 0, 1)
ON CONFLICT DO NOTHING;

-- Seed modifiers for Add-ons group
INSERT INTO public.modifiers (group_id, name, price_adjustment) VALUES
  ('a1b2c3d4-1111-1111-1111-111111111111', 'Beef Patty', 2.50),
  ('a1b2c3d4-1111-1111-1111-111111111111', 'Bacon', 2.00),
  ('a1b2c3d4-1111-1111-1111-111111111111', 'Cheese', 1.00),
  ('a1b2c3d4-1111-1111-1111-111111111111', 'Add Handcut Chips', 3.00),
  ('a1b2c3d4-1111-1111-1111-111111111111', 'Add Small Portion of Loaded Fries', 6.50);

-- Seed modifiers for Drinks group
INSERT INTO public.modifiers (group_id, name, price_adjustment) VALUES
  ('a1b2c3d4-2222-2222-2222-222222222222', 'Coke', 2.30),
  ('a1b2c3d4-2222-2222-2222-222222222222', 'Coke Zero', 2.30),
  ('a1b2c3d4-2222-2222-2222-222222222222', 'Fanta Orange', 2.30),
  ('a1b2c3d4-2222-2222-2222-222222222222', 'Water', 2.00),
  ('a1b2c3d4-2222-2222-2222-222222222222', 'Capri Sun', 1.50);

-- Link Add-ons group to ALL burgers
INSERT INTO public.product_modifiers (product_id, group_id)
SELECT id, 'a1b2c3d4-1111-1111-1111-111111111111'::uuid
FROM public.products
WHERE category = 'Burgers'
ON CONFLICT DO NOTHING;