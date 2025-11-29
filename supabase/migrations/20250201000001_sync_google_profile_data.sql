-- Sync Google OAuth profile data (photo_url, display_name) from auth.users to profiles
-- Migration: 20250201000001_sync_google_profile_data.sql
-- 
-- PROBLEMA: Conturile Google nu afișează corect photo_url și display_name până nu sunt modificate manual
-- SOLUȚIA: Actualizăm trigger-ul handle_new_user să copieze photo_url și creăm un trigger de sincronizare
-- SIGUR: Folosește CREATE OR REPLACE și ON CONFLICT DO UPDATE pentru sincronizare

-- 1. Actualizăm handle_new_user să copieze photo_url din Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_display_name TEXT;
  user_photo_url TEXT;
  user_username TEXT;
  final_username TEXT;
  counter INTEGER := 1;
BEGIN
  -- Try to get display_name from metadata, prioritizing Google's full_name or name
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NULL
  );
  
  -- Get photo_url from Google OAuth metadata (avatar_url or picture)
  user_photo_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NULL
  );
  
  -- If still null, use email prefix (before @) as last resort, but never full email
  IF user_display_name IS NULL OR user_display_name = '' THEN
    user_display_name := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  
  -- Get username from metadata (set during signup)
  user_username := NEW.raw_user_meta_data->>'username';
  
  -- If no username in metadata, generate one from display_name (full name) or email
  IF user_username IS NULL OR user_username = '' THEN
    -- First try to generate from display_name (full name) - more unique and safe
    IF user_display_name IS NOT NULL AND user_display_name != '' THEN
      -- Convert full name to username: "Ion Popescu" -> "ionpopescu"
      -- Remove diacritics and convert to lowercase, replace spaces with nothing
      user_username := LOWER(REGEXP_REPLACE(
        REGEXP_REPLACE(user_display_name, '[ăâîșțĂÂÎȘȚ]', 'a', 'g'), -- Replace Romanian diacritics
        '[^a-z0-9]', '', 'g' -- Remove all non-alphanumeric characters
      ));
    END IF;
    
    -- If still empty or too short, fallback to email prefix
    IF user_username IS NULL OR user_username = '' OR LENGTH(user_username) < 3 THEN
      user_username := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9_-]', '', 'g'));
    END IF;
    
    -- Ensure it's at least 3 characters and max 30
    IF LENGTH(user_username) < 3 THEN
      user_username := user_username || '123';
    END IF;
    IF LENGTH(user_username) > 30 THEN
      user_username := SUBSTRING(user_username, 1, 30);
    END IF;
  ELSE
    -- Normalize username from metadata (lowercase, only alphanumeric, underscore, dash)
    user_username := LOWER(REGEXP_REPLACE(user_username, '[^a-z0-9_-]', '', 'g'));
    -- Ensure format is valid
    IF LENGTH(user_username) < 3 THEN
      user_username := user_username || '123';
    END IF;
    IF LENGTH(user_username) > 30 THEN
      user_username := SUBSTRING(user_username, 1, 30);
    END IF;
  END IF;
  
  -- Make username unique by appending number if needed
  final_username := user_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(final_username)) LOOP
    final_username := user_username || counter::TEXT;
    counter := counter + 1;
    -- Safety limit - use UUID prefix if too many retries
    IF counter > 1000 THEN
      final_username := user_username || '_' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 8);
      EXIT;
    END IF;
  END LOOP;
  
  -- Insert profile with username and photo_url (REQUIRED - username is NOT NULL)
  INSERT INTO public.profiles (id, email, display_name, username, photo_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    user_display_name,
    final_username,
    user_photo_url, -- Copy photo_url from Google OAuth
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate inserts (safe - doesn't break existing profiles)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Creează funcție pentru sincronizarea datelor Google OAuth când se actualizează user_metadata
CREATE OR REPLACE FUNCTION public.sync_google_profile_data()
RETURNS trigger AS $$
DECLARE
  new_display_name TEXT;
  new_photo_url TEXT;
BEGIN
  -- Only sync if raw_user_meta_data changed
  IF NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data THEN
    -- Get display_name from metadata
    new_display_name := COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NULL
    );
    
    -- Get photo_url from metadata
    new_photo_url := COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NULL
    );
    
    -- Update profile only if we have new data and it's different from existing
    IF new_display_name IS NOT NULL OR new_photo_url IS NOT NULL THEN
      UPDATE public.profiles
      SET 
        display_name = COALESCE(new_display_name, display_name), -- Only update if not null
        photo_url = COALESCE(new_photo_url, photo_url), -- Only update if not null
        updated_at = NOW()
      WHERE id = NEW.id
      AND (
        (new_display_name IS NOT NULL AND display_name IS DISTINCT FROM new_display_name)
        OR (new_photo_url IS NOT NULL AND photo_url IS DISTINCT FROM new_photo_url)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Creează trigger pentru sincronizare (dacă nu există deja)
DROP TRIGGER IF EXISTS sync_google_profile_on_auth_update ON auth.users;
CREATE TRIGGER sync_google_profile_on_auth_update
AFTER UPDATE ON auth.users
FOR EACH ROW
WHEN (NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data)
EXECUTE FUNCTION public.sync_google_profile_data();

-- 4. Actualizează profilele existente care nu au photo_url dar au în user_metadata
UPDATE public.profiles p
SET 
  photo_url = COALESCE(
    (SELECT raw_user_meta_data->>'avatar_url' FROM auth.users WHERE id = p.id),
    (SELECT raw_user_meta_data->>'picture' FROM auth.users WHERE id = p.id),
    photo_url
  ),
  display_name = COALESCE(
    (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE id = p.id),
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = p.id),
    (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = p.id),
    display_name
  ),
  updated_at = NOW()
WHERE photo_url IS NULL 
  OR display_name IS NULL
  OR (photo_url = '' AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = p.id 
    AND (raw_user_meta_data->>'avatar_url' IS NOT NULL OR raw_user_meta_data->>'picture' IS NOT NULL)
  ));

-- Comentarii pentru documentație
COMMENT ON FUNCTION public.handle_new_user() IS 'Creează profil automat la signup și copiază datele din Google OAuth (display_name, photo_url, username)';
COMMENT ON FUNCTION public.sync_google_profile_data() IS 'Sincronizează display_name și photo_url din auth.users.raw_user_meta_data în profiles când se actualizează';

