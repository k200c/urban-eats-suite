-- Drop the existing check constraint on status column
ALTER TABLE public.social_media_posts
DROP CONSTRAINT IF EXISTS social_media_posts_status_check;

-- Add new check constraint with all required status values
ALTER TABLE public.social_media_posts
ADD CONSTRAINT social_media_posts_status_check
CHECK (status IN ('draft', 'generating', 'scheduled', 'published', 'failed'));