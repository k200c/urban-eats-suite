-- Fix 1: Replace overly permissive social_media_posts RLS policy
DROP POLICY IF EXISTS "Staff Full Access" ON public.social_media_posts;

CREATE POLICY "Staff can manage social posts"
ON public.social_media_posts FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Remove overly permissive customers table policies
DROP POLICY IF EXISTS "Allow customer creation" ON public.customers;
DROP POLICY IF EXISTS "Allow customer update" ON public.customers;

-- The trigger update_customer_on_order runs as SECURITY DEFINER so it can still update customers
-- Staff/admin can still manage customers via existing policies

-- Fix 3: Update storage bucket policies to require staff role
DROP POLICY IF EXISTS "Authenticated users can upload social media content" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view social media content" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update social media content" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete social media content" ON storage.objects;

-- Create staff-only storage policies
CREATE POLICY "Staff can upload social content"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'social-media-content' AND
  (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Staff can view social content"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'social-media-content' AND
  (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Staff can update social content"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'social-media-content' AND
  (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Staff can delete social content"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'social-media-content' AND
  (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);