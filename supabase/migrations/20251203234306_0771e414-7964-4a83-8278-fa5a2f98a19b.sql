-- Create a PERMISSIVE policy for public product viewing
CREATE POLICY "Anyone can view products" 
ON public.products 
FOR SELECT 
TO public
USING (true);