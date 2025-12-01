-- =============================================
-- Migration 18: Fix RLS Infinite Recursion (FIXED - renamed functions)
-- =============================================
-- Descriere: Introduce funcții SECURITY DEFINER pentru verificarea rolurilor
-- și actualizează politicile pentru a evita recursivitatea infinită.
-- 
-- IMPORTANT: Funcțiile sunt redenumite în is_forum_admin() și is_forum_moderator()
-- pentru a evita conflictul cu funcția existentă is_admin(uid uuid) din site.
-- =============================================

-- 1. Funcție SECURITY DEFINER pentru verificare admin FORUM
-- REDENUMITĂ pentru a evita conflictul cu is_admin(uid uuid) din site
CREATE OR REPLACE FUNCTION is_forum_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM forum_users fu
    JOIN forum_roles fr ON fu.role_id = fr.id
    WHERE fu.user_id = auth.uid()
      AND fr.name = 'admin'
  );
END;
$$;

-- 2. Funcție SECURITY DEFINER pentru verificare moderator FORUM (sau admin)
-- REDENUMITĂ pentru claritate
CREATE OR REPLACE FUNCTION is_forum_moderator()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM forum_users fu
    JOIN forum_roles fr ON fu.role_id = fr.id
    WHERE fu.user_id = auth.uid()
      AND fr.name IN ('admin', 'moderator')
  );
END;
$$;

-- 3. Drop existing policies causing recursion

-- forum_roles
DROP POLICY IF EXISTS "Doar adminii pot gestiona roluri" ON forum_roles;

-- forum_user_ranks
DROP POLICY IF EXISTS "Doar adminii pot gestiona ranguri" ON forum_user_ranks;

-- forum_categories
DROP POLICY IF EXISTS "Doar adminii pot gestiona categorii" ON forum_categories;

-- forum_subforums
DROP POLICY IF EXISTS "Doar adminii pot gestiona sub-forumuri" ON forum_subforums;

-- forum_subcategories
DROP POLICY IF EXISTS "Doar adminii pot gestiona subcategorii" ON forum_subcategories;
DROP POLICY IF EXISTS "Subcategorii active vizibile" ON forum_subcategories;

-- forum_users
DROP POLICY IF EXISTS "Utilizatorii își pot edita profilul" ON forum_users;

-- 4. Re-create policies using helper functions (REDENUMITE)

-- forum_roles
CREATE POLICY "Doar adminii pot gestiona roluri" ON forum_roles
  FOR ALL USING (is_forum_admin());

-- forum_user_ranks
CREATE POLICY "Doar adminii pot gestiona ranguri" ON forum_user_ranks
  FOR ALL USING (is_forum_admin());

-- forum_categories
CREATE POLICY "Doar adminii pot gestiona categorii" ON forum_categories
  FOR ALL USING (is_forum_admin());

-- forum_subforums
CREATE POLICY "Doar adminii pot gestiona sub-forumuri" ON forum_subforums
  FOR ALL USING (is_forum_admin());

-- forum_subcategories
CREATE POLICY "Subcategorii active vizibile" ON forum_subcategories
  FOR SELECT USING (
    is_active = true
    AND (
      moderator_only = false
      OR is_forum_moderator()
    )
  );

CREATE POLICY "Doar adminii pot gestiona subcategorii" ON forum_subcategories
  FOR ALL USING (is_forum_admin());

-- forum_users
CREATE POLICY "Utilizatorii își pot edita profilul" ON forum_users
  FOR UPDATE USING (
    auth.uid() = user_id
    OR is_forum_admin()
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_forum_admin TO authenticated;
GRANT EXECUTE ON FUNCTION is_forum_admin TO anon;
GRANT EXECUTE ON FUNCTION is_forum_moderator TO authenticated;
GRANT EXECUTE ON FUNCTION is_forum_moderator TO anon;

