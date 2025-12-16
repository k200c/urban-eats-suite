-- 1. Add the missing columns for the new AI features
ALTER TABLE social_media_posts
ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'single',
ADD COLUMN IF NOT EXISTS ai_preference TEXT DEFAULT 'upload_media',
ADD COLUMN IF NOT EXISTS visual_prompt TEXT,
ADD COLUMN IF NOT EXISTS idea TEXT;

-- 2. Ensure 'media_urls' is correctly formatted (Text Array)
ALTER TABLE social_media_posts
ADD COLUMN IF NOT EXISTS media_urls TEXT[];

-- 3. Fix the Status Constraint (Critical)
-- The app might be trying to set status to 'generating', which the DB might reject.
ALTER TABLE social_media_posts DROP CONSTRAINT IF EXISTS social_media_posts_status_check;

ALTER TABLE social_media_posts 
ADD CONSTRAINT social_media_posts_status_check 
CHECK (status IN ('draft', 'generating', 'scheduled', 'published', 'failed'));