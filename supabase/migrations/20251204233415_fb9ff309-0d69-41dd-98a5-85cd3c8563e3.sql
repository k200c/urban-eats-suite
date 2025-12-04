-- Drop the existing restrictive policy and create a more permissive one for guest orders
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;

-- Allow anyone (including anonymous users) to create orders
-- This is needed for walk-in customers who don't have accounts
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO public
WITH CHECK (true);

-- Also add policy for order_items to allow inserting items for the order
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;

CREATE POLICY "Anyone can create order items"
ON public.order_items
FOR INSERT
TO public
WITH CHECK (true);