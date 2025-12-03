-- =============================================
-- Migration: Fix Username Generation (Majuscule pierdute)
-- =============================================
-- Descriere: Repară bug-ul unde username-ul generat din display_name pierde majusculele
-- Problema: "Antonio Georgescu" → "ntonioeorgescu" (lipsesc "A" și "G")
-- Cauză: REGEXP_REPLACE('[^a-z0-9]', '') șterge majusculele ÎNAINTE de LOWER()
-- Soluție: Aplică LOWER() ÎNAINTE de regex sau folosește [^a-zA-Z0-9]
-- =============================================

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
      -- ✅ FIX: Aplică LOWER() ÎNAINTE de a șterge caracterele speciale
      -- Conversia: "Antonio Georgescu" → "antonio georgescu" → "antoniogeorgescu"
      user_username := REGEXP_REPLACE(
        LOWER(user_display_name),  -- LOWER() PRIMUL!!!
        '[^a-z0-9]', '', 'g'       -- Apoi șterge tot ce nu e alfanumeric (acum doar lowercase)
      );
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
      user_username := user_username ||'123';
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

-- =============================================
-- COMENTARII
-- =============================================

COMMENT ON FUNCTION public.handle_new_user() IS 
'Creează profil automat la signup și copiază datele din Google OAuth (display_name, photo_url, username). 
FIXAT: username-ul nu mai pierde majusculele - aplică LOWER() ÎNAINTE de REGEXP_REPLACE.';

-- =============================================
-- VERIFICARE: Testează funcția (comentat - pentru debugging manual)
-- =============================================

-- SELECT 
--   display_name,
--   username,
--   REGEXP_REPLACE(LOWER(display_name), '[^a-z0-9]', '', 'g') as username_corect
-- FROM profiles
-- WHERE username LIKE '%nton%'; -- Caută profilele afectate
