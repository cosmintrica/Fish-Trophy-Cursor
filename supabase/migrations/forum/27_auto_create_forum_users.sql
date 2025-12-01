-- =============================================
-- Migration 27: Creare Automată Forum Users
-- =============================================
-- Descriere: Creează automat forum_user când se creează un user în auth.users
-- și populează forum_users pentru utilizatorii existenți
-- Dependințe: 04_users.sql, 19_sync_admin_from_profiles.sql
-- =============================================

-- =============================================
-- 1. FUNCȚIE: Creare automată forum_user
-- =============================================

CREATE OR REPLACE FUNCTION create_forum_user_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  username_base TEXT;
  username_final TEXT;
  username_counter INTEGER := 1;
  username_exists BOOLEAN;
  admin_role_id UUID;
  user_is_admin BOOLEAN;
BEGIN
  -- Obține username direct din profiles.username (pentru linkuri/identificare)
  SELECT username INTO username_final
  FROM profiles
  WHERE id = NEW.id;
  
  -- Dacă nu există în profiles încă (nu ar trebui să se întâmple)
  IF username_final IS NULL THEN
    username_final := SPLIT_PART(NEW.email, '@', 1);
    IF username_final IS NULL OR username_final = '' THEN
      username_final := 'pescar';
    END IF;
  END IF;
  
  -- Verifică dacă utilizatorul este admin în profiles
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.id AND role = 'admin'
  ) INTO user_is_admin;
  
  -- Obține ID-ul rolului admin dacă este cazul
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
    NEW.id,
    username_final,
    admin_role_id,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    0,
    0,
    0,
    'ou_de_peste',
    '{}',
    false,
    NOW(),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Dacă există deja (nu ar trebui să se întâmple), nu face nimic
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error dar nu opri trigger-ul
    RAISE WARNING 'Error creating forum_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- =============================================
-- 2. TRIGGER: Creare automată la signup
-- =============================================

DROP TRIGGER IF EXISTS trigger_create_forum_user_on_signup ON auth.users;

CREATE TRIGGER trigger_create_forum_user_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_forum_user_on_signup();

-- =============================================
-- 3. POPULARE: Creează forum_users pentru utilizatorii existenți
-- =============================================

-- Creează forum_users pentru toți utilizatorii din profiles care nu au înregistrare
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
)
SELECT 
  p.id AS user_id,
  -- Folosește username direct din profiles
  p.username,
  -- Setează role_id dacă este admin
  CASE 
    WHEN p.role = 'admin' THEN (SELECT id FROM forum_roles WHERE name = 'admin' LIMIT 1)
    ELSE NULL
  END AS role_id,
  -- Avatar URL din profiles (dacă există)
  NULL AS avatar_url,
  0 AS post_count,
  0 AS topic_count,
  0 AS reputation_points,
  'ou_de_peste' AS rank,
  '{}' AS badges,
  false AS is_online,
  NOW() AS last_seen_at,
  NOW() AS created_at,
  NOW() AS updated_at
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM forum_users fu WHERE fu.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- =============================================
-- 4. FUNCȚIE HELPER: Obține sau creează forum_user
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
  
  -- Obține username din profiles
  SELECT 
    COALESCE(
      NULLIF(TRIM(display_name), ''),
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
-- 5. GRANT PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION create_forum_user_on_signup() TO authenticated;
GRANT EXECUTE ON FUNCTION create_forum_user_on_signup() TO anon;
GRANT EXECUTE ON FUNCTION get_or_create_forum_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_forum_user(UUID) TO anon;

-- =============================================
-- Comentarii
-- =============================================

COMMENT ON FUNCTION create_forum_user_on_signup IS 'Creează automat forum_user când se creează un user în auth.users';
COMMENT ON FUNCTION get_or_create_forum_user IS 'Obține sau creează forum_user pentru un user_id dat';

