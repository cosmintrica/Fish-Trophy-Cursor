-- Migration: Add visibility fields for profile information
-- Created: 2025-01-28

-- Add visibility columns for profile fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_county_publicly BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_city_publicly BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_website_publicly BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_youtube_publicly BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.show_county_publicly IS 'Whether to show county on public profile';
COMMENT ON COLUMN public.profiles.show_city_publicly IS 'Whether to show city on public profile';
COMMENT ON COLUMN public.profiles.show_website_publicly IS 'Whether to show website on public profile';
COMMENT ON COLUMN public.profiles.show_youtube_publicly IS 'Whether to show YouTube channel on public profile';

