-- Migration: Add cover_position column to profiles table
-- Created: 2025-11-28

-- Add cover_position column as JSONB to store position, scale, and rotation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cover_position JSONB DEFAULT '{"x": 50, "y": 50, "scale": 100, "rotation": 0}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.cover_position IS 'Cover photo position settings: x (0-100), y (0-100), scale (50-200), rotation (0-360)';

