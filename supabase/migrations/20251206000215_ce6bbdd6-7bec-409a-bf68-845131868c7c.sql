-- 1. Create social_media_posts table
CREATE TABLE public.social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_idea TEXT NOT NULL,
  brief TEXT,
  post_type TEXT NOT NULL CHECK (post_type IN ('Single', 'Carousel', 'Reel')),
  media_urls TEXT[] DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

-- 3. Create Staff Full Access policy (authenticated users can do all operations)
CREATE POLICY "Staff Full Access"
ON public.social_media_posts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Create storage bucket for social media content
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES (
  'social-media-content',
  'social-media-content',
  false,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
);

-- 5. Storage policies for authenticated users
CREATE POLICY "Authenticated users can upload social media content"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'social-media-content');

CREATE POLICY "Authenticated users can view social media content"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'social-media-content');

CREATE POLICY "Authenticated users can delete social media content"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'social-media-content');

CREATE POLICY "Authenticated users can update social media content"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'social-media-content');