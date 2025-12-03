-- Drop the problematic admin policy that causes recursion through profiles
DROP POLICY IF EXISTS "Admin can manage products" ON public.products;