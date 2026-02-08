-- Migration: Sync Profiles updates to Forum Users
-- Description: Automatically updates forum_users when profiles (username/avatar) changes
-- Author: Antigravity

-- 1. Create Sync Function
CREATE OR REPLACE FUNCTION public.sync_profiles_to_forum()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sync username and avatar if changed
  IF (OLD.username IS DISTINCT FROM NEW.username) OR 
     (OLD.photo_url IS DISTINCT FROM NEW.photo_url) THEN
     
    UPDATE public.forum_users
    SET 
      username = NEW.username,
      avatar_url = NEW.photo_url,
      updated_at = NOW()
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Create Trigger
DROP TRIGGER IF EXISTS on_profile_update_sync_forum ON public.profiles;

CREATE TRIGGER on_profile_update_sync_forum
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profiles_to_forum();

-- 3. Add Comment
COMMENT ON FUNCTION public.sync_profiles_to_forum IS 'Synchronizes username and avatar changes from profiles to forum_users table';
COMMENT ON TRIGGER on_profile_update_sync_forum ON public.profiles IS 'Trigger to keep forum_users in sync with profiles changes';
