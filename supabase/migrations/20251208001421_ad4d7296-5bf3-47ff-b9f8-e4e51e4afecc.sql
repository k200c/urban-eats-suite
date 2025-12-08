-- Add generated_caption column to social_media_posts table
ALTER TABLE public.social_media_posts 
ADD COLUMN IF NOT EXISTS generated_caption text;

-- Update status column to support new workflow statuses
-- The status column already exists as text, so we just need to ensure valid values
COMMENT ON COLUMN public.social_media_posts.status IS 'Post status: draft, generating, scheduled, published, failed';