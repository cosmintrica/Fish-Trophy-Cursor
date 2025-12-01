-- =============================================
-- Migration 19: Sincronizare Admin din Profiles la Forum
-- =============================================
-- Descriere: Sincronizează automat rolul de admin din profiles.role = 'admin'
-- cu forum_users.role_id pentru a acorda automat admin pe forum dacă e admin pe site.
-- =============================================

-- 1. Funcție helper pentru a obține ID-ul rolului 'admin' din forum_roles
CREATE OR REPLACE FUNCTION get_forum_admin_role_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  admin_role_id UUID;
BEGIN
  SELECT id INTO admin_role_id
  FROM forum_roles
  WHERE name = 'admin'
  LIMIT 1;
  
  RETURN admin_role_id;
END;
$$;

-- 2. Funcție care sincronizează rolul de admin când se creează un forum_user
CREATE OR REPLACE FUNCTION sync_forum_user_role_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role_id UUID;
  user_is_admin BOOLEAN;
BEGIN
  -- Verifică dacă utilizatorul este admin în profiles
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = NEW.user_id
      AND role = 'admin'
  ) INTO user_is_admin;
  
  -- Dacă este admin, setează role_id la admin
  IF user_is_admin THEN
    SELECT get_forum_admin_role_id() INTO admin_role_id;
    
    IF admin_role_id IS NOT NULL THEN
      NEW.role_id := admin_role_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Trigger care sincronizează rolul la crearea forum_user
CREATE TRIGGER trigger_sync_forum_user_role_on_insert
  BEFORE INSERT ON forum_users
  FOR EACH ROW
  EXECUTE FUNCTION sync_forum_user_role_on_insert();

-- 4. Funcție care sincronizează rolul când se schimbă profiles.role
CREATE OR REPLACE FUNCTION sync_forum_user_role_on_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role_id UUID;
  forum_user_exists BOOLEAN;
BEGIN
  -- Verifică dacă există un forum_user pentru acest utilizator
  SELECT EXISTS (
    SELECT 1
    FROM forum_users
    WHERE user_id = NEW.id
  ) INTO forum_user_exists;
  
  -- Dacă nu există forum_user, nu facem nimic (va fi creat când utilizatorul accesează forumul)
  IF NOT forum_user_exists THEN
    RETURN NEW;
  END IF;
  
  -- Obține ID-ul rolului admin
  SELECT get_forum_admin_role_id() INTO admin_role_id;
  
  IF admin_role_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Dacă utilizatorul devine admin, setează role_id
  IF NEW.role = 'admin' AND (OLD.role IS NULL OR OLD.role != 'admin') THEN
    UPDATE forum_users
    SET role_id = admin_role_id
    WHERE user_id = NEW.id;
  -- Dacă utilizatorul nu mai este admin, șterge role_id (sau setează la NULL)
  ELSIF NEW.role != 'admin' AND OLD.role = 'admin' THEN
    UPDATE forum_users
    SET role_id = NULL
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Trigger care sincronizează rolul când se schimbă profiles.role
CREATE TRIGGER trigger_sync_forum_user_role_on_profile_update
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION sync_forum_user_role_on_profile_update();

-- 6. Sincronizare pentru utilizatorii existenți care sunt deja admin
-- (pentru utilizatorii care au deja forum_user creat)
DO $$
DECLARE
  admin_role_id UUID;
BEGIN
  SELECT get_forum_admin_role_id() INTO admin_role_id;
  
  IF admin_role_id IS NOT NULL THEN
    UPDATE forum_users fu
    SET role_id = admin_role_id
    FROM profiles p
    WHERE fu.user_id = p.id
      AND p.role = 'admin'
      AND (fu.role_id IS NULL OR fu.role_id != admin_role_id);
  END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_forum_admin_role_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_forum_admin_role_id TO anon;

-- Comentarii
COMMENT ON FUNCTION sync_forum_user_role_on_insert IS 'Sincronizează automat role_id la crearea forum_user dacă utilizatorul este admin în profiles';
COMMENT ON FUNCTION sync_forum_user_role_on_profile_update IS 'Sincronizează automat role_id când se schimbă profiles.role la admin/user';
COMMENT ON TRIGGER trigger_sync_forum_user_role_on_insert ON forum_users IS 'Sincronizează rolul de admin la crearea forum_user';
COMMENT ON TRIGGER trigger_sync_forum_user_role_on_profile_update ON profiles IS 'Sincronizează rolul de admin când se schimbă profiles.role';

