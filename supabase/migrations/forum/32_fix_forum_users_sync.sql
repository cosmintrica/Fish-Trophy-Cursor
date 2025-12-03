-- =============================================
-- Migration 32: Fix Sincronizare Date Forum Users
-- =============================================
-- Descriere: Corectează sincronizarea datelor din profiles către forum_users
-- Problema: get_or_create_forum_user() folosea display_name în loc de username
-- Dependințe: 27_auto_create_forum_users.sql
-- =============================================

-- =============================================
-- 1. FIX FUNCȚIE: get_or_create_forum_user
-- =============================================

CREATE OR REPLACE FUNCTION get_or_create_forum_user(p_user_id UUID)
RETURNS forum_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_forum_user forum_users;
  username_base TEXT;
  username_final TEXT;
  username_counter INTEGER := 1;
  username_exists BOOLEAN;
  admin_role_id UUID;
  user_is_admin BOOLEAN;
  v_user auth.users;
BEGIN
  -- Încearcă să obțină forum_user existent
  SELECT * INTO v_forum_user
  FROM forum_users
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- Dacă există, returnează-l
  IF v_forum_user IS NOT NULL THEN
    RETURN v_forum_user;
  END IF;
  
  -- Dacă nu există, obține datele user-ului
  SELECT * INTO v_user
  FROM auth.users
  WHERE id = p_user_id
  LIMIT 1;
  
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- Obține username din profiles (FIXAT: folosește username, nu display_name)
  SELECT 
    COALESCE(
      NULLIF(TRIM(username), ''),  -- ✅ CORECT: username din profiles
      SPLIT_PART(email, '@', 1),
      'pescar'
    )
  INTO username_final
  FROM profiles
  WHERE id = p_user_id;
  
  -- Verifică dacă username există și generează unul unic
  username_base := username_final;
  username_counter := 1;
  username_exists := true;
  
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM forum_users WHERE username = username_final
    ) INTO username_exists;
    
    EXIT WHEN NOT username_exists;
    
    username_final := username_base || username_counter::TEXT;
    username_counter := username_counter + 1;
  END LOOP;
  
  -- Verifică dacă este admin
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id AND role = 'admin'
  ) INTO user_is_admin;
  
  IF user_is_admin THEN
    SELECT id INTO admin_role_id
    FROM forum_roles
    WHERE name = 'admin'
    LIMIT 1;
  END IF;
  
  -- Creează forum_user
  INSERT INTO forum_users (
    user_id,
    username,
    role_id,
    avatar_url,
    post_count,
    topic_count,
    reputation_points,
    rank,
    badges,
    is_online,
    last_seen_at,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    username_final,
    admin_role_id,
    COALESCE(v_user.raw_user_meta_data->>'avatar_url', NULL),
    0,
    0,
    0,
    'ou_de_peste',
    '{}',
    false,
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING * INTO v_forum_user;
  
  RETURN v_forum_user;
EXCEPTION
  WHEN unique_violation THEN
    -- Dacă există deja (race condition), obține-l
    SELECT * INTO v_forum_user
    FROM forum_users
    WHERE user_id = p_user_id
    LIMIT 1;
    RETURN v_forum_user;
END;
$$;

-- =============================================
-- 2. UPDATE: Repopulează utilizatorii existenți
-- =============================================

-- Actualizează toți utilizatorii existenți cu date corecte
UPDATE forum_users fu
SET 
    username = COALESCE(p.username, SPLIT_PART(p.email, '@', 1), 'pescar'),
    avatar_url = COALESCE(p.photo_url, fu.avatar_url),
    role_id = CASE 
        WHEN p.role = 'admin' THEN (SELECT id FROM forum_roles WHERE name = 'admin')
        ELSE fu.role_id
    END
FROM profiles p
WHERE fu.user_id = p.id;

-- =============================================
-- Comentarii
-- =============================================

COMMENT ON FUNCTION get_or_create_forum_user IS 
'Obține sau creează forum_user pentru un user_id dat. FIXAT: folosește profiles.username în loc de display_name.';
