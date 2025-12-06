-- Fix marketing_posts RLS policy to use has_role() function for consistency
DROP POLICY IF EXISTS "Admin can manage marketing posts" ON public.marketing_posts;

CREATE POLICY "Admin can manage marketing posts"
ON public.marketing_posts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));