-- Migration: Add youtube_url column to catches table
-- Created: 2025-12-15
-- Description: Add support for YouTube links in catches, separate from video_url

ALTER TABLE IF EXISTS public.catches 
ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.catches.youtube_url IS 'YouTube video URL (separate from video_url which is for uploaded videos)';
