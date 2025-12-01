-- Update handle_new_user trigger to also set username from metadata
-- Migration: 20250130000001_update_handle_new_user_trigger.sql
-- 
-- PROBLEMA: Trigger-ul existent nu setează username-ul, dar username-ul este NOT NULL în baza de date
-- SOLUȚIA: Actualizăm trigger-ul să genereze automat username-ul dacă nu este în metadata
-- SIGUR: Folosește CREATE OR REPLACE (nu șterge funcția, doar o actualizează) și ON CONFLICT DO NOTHING

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_display_name TEXT;
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
      -- Convert full name to username: "Ion Popescu" -> "ionpopescu" or "ion_popescu"
      -- Remove diacritics and convert to lowercase, replace spaces with underscore or remove
      user_username := LOWER(REGEXP_REPLACE(
        REGEXP_REPLACE(user_display_name, '[ăâîșțĂÂÎȘȚ]', 'a', 'g'), -- Replace Romanian diacritics
        '[^a-z0-9_-]', '_', 'g' -- Replace other non-alphanumeric with underscore
      ));
      -- Remove multiple consecutive underscores
      user_username := REGEXP_REPLACE(user_username, '_+', '_', 'g');
      -- Remove leading/trailing underscores
      user_username := TRIM(BOTH '_' FROM user_username);
      -- Replace underscores with nothing for cleaner username (optional - can keep underscores)
      user_username := REPLACE(user_username, '_', '');
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
  
  -- Insert profile with username (REQUIRED - username is NOT NULL)
  INSERT INTO public.profiles (id, email, display_name, username, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    user_display_name,
    final_username,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate inserts (safe - doesn't break existing profiles)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

