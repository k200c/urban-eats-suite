-- Fix orders table: Drop restrictive policies and create permissive ones
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can create orders for anyone" ON public.orders;

-- Create PERMISSIVE policy (default) for orders - allows anyone to insert
CREATE POLICY "Allow public order creation"
ON public.orders
FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

-- Fix order_items table: Drop restrictive policies and create permissive ones
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff can create order items" ON public.order_items;

-- Create PERMISSIVE policy for order_items
CREATE POLICY "Allow public order items creation"
ON public.order_items
FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

-- Fix customers table: Allow inserts and updates for the trigger
DROP POLICY IF EXISTS "System can manage customers" ON public.customers;

-- Create PERMISSIVE policy for customers insert
CREATE POLICY "Allow customer creation"
ON public.customers
FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

-- Create PERMISSIVE policy for customers update
CREATE POLICY "Allow customer update"
ON public.customers
FOR UPDATE
TO public, anon, authenticated
USING (true)
WITH CHECK (true);