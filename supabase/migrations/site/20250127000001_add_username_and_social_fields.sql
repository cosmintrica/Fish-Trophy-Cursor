-- Migration: Add username and social media fields to profiles
-- Created: 2025-01-27

-- Step 1: Add new columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_last_changed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS youtube_channel TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

-- Step 2: Populate username for existing users (from display_name or email)
-- Replace spaces with underscores and make lowercase
UPDATE profiles 
SET username = LOWER(REGEXP_REPLACE(display_name, '[^a-zA-Z0-9]', '_', 'g'))
WHERE display_name IS NOT NULL AND username IS NULL;

-- For users without display_name, use email prefix
UPDATE profiles 
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL;

-- Add sequential number to duplicate usernames
WITH duplicates AS (
  SELECT username, ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as rn
  FROM profiles
  WHERE username IS NOT NULL
)
UPDATE profiles p
SET username = p.username || '_' || d.rn
FROM duplicates d
WHERE p.username = d.username AND d.rn > 1;

-- Step 3: Set username as NOT NULL and UNIQUE
ALTER TABLE profiles ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(LOWER(username));

-- Step 4: Add check constraint for username format (alphanumeric, underscore, dash, 3-30 chars)
ALTER TABLE profiles ADD CONSTRAINT username_format 
  CHECK (username ~ '^[a-zA-Z0-9_-]{3,30}$');

-- Step 5: Create function to check username change frequency (max 2 times per year)
CREATE OR REPLACE FUNCTION check_username_change_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.username IS DISTINCT FROM NEW.username THEN
    -- Check if last change was less than 6 months ago (182 days)
    IF OLD.username_last_changed_at IS NOT NULL 
       AND OLD.username_last_changed_at > NOW() - INTERVAL '182 days' THEN
      RAISE EXCEPTION 'Username can only be changed twice per year. Last change was on %', OLD.username_last_changed_at;
    END IF;
    
    -- Update the timestamp
    NEW.username_last_changed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for username change limit
DROP TRIGGER IF EXISTS username_change_limit_trigger ON profiles;
CREATE TRIGGER username_change_limit_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_username_change_limit();

-- Step 7: Add privacy setting for gear visibility
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_gear_publicly BOOLEAN DEFAULT false;

-- Step 8: Enable RLS policies for new columns (idempotent)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist and recreate them
DROP POLICY IF EXISTS "Usernames are publicly readable" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Allow public to read usernames (needed for public profiles)
CREATE POLICY "Usernames are publicly readable" ON profiles
  FOR SELECT
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

COMMENT ON COLUMN profiles.username IS 'Unique username for the user, can be changed max 2 times per year';
COMMENT ON COLUMN profiles.username_last_changed_at IS 'Timestamp of last username change';
COMMENT ON COLUMN profiles.youtube_channel IS 'YouTube channel URL';
COMMENT ON COLUMN profiles.photo_url IS 'Profile photo URL (avatar)';
COMMENT ON COLUMN profiles.cover_photo_url IS 'Cover photo URL for profile page';
COMMENT ON COLUMN profiles.show_gear_publicly IS 'Whether to show fishing gear on public profile (default: false)';
