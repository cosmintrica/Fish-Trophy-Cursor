-- =============================================
-- Migration 95: Consolidate Admin RLS Management
-- =============================================
-- Descriere: Fix 403 Forbidden la ștergere (UPDATE is_active=false) pentru admini.
-- Motiv: Politicile curente pot intra în conflict sau au verificări redundante.
-- =============================================

-- 1. Redefine is_forum_admin() to be as efficient and robust as possible
-- SECURITY DEFINER allows it to check profiles table regardless of RLS on that table.
CREATE OR REPLACE FUNCTION is_forum_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Get role directly from profiles (source of truth for admin status)
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(v_role, '') = 'admin';
END;
$$;

-- 2. Asigură permissions
GRANT EXECUTE ON FUNCTION is_forum_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_forum_admin() TO anon;

-- 3. Fix forum_categories policies
DROP POLICY IF EXISTS "Doar adminii pot gestiona categorii" ON forum_categories;
DROP POLICY IF EXISTS "Doar adminii pot crea categorii" ON forum_categories;
DROP POLICY IF EXISTS "Doar adminii pot actualiza categorii" ON forum_categories;
DROP POLICY IF EXISTS "Doar adminii pot șterge categorii" ON forum_categories;

CREATE POLICY "Admin full management forum_categories" ON forum_categories
  FOR ALL
  USING (is_forum_admin())
  WITH CHECK (is_forum_admin());

-- 4. Fix forum_subcategories policies
DROP POLICY IF EXISTS "Doar adminii pot gestiona subcategorii" ON forum_subcategories;
DROP POLICY IF EXISTS "Doar adminii pot crea subcategorii" ON forum_subcategories;
DROP POLICY IF EXISTS "Doar adminii pot actualiza subcategorii" ON forum_subcategories;
DROP POLICY IF EXISTS "Doar adminii pot șterge subcategorii" ON forum_subcategories;

CREATE POLICY "Admin full management forum_subcategories" ON forum_subcategories
  FOR ALL
  USING (is_forum_admin())
  WITH CHECK (is_forum_admin());

-- 5. Fix forum_subforums policies
DROP POLICY IF EXISTS "Doar adminii pot gestiona sub-forumuri" ON forum_subforums;
DROP POLICY IF EXISTS "Doar adminii pot crea sub-forumuri" ON forum_subforums;
DROP POLICY IF EXISTS "Doar adminii pot actualiza sub-forumuri" ON forum_subforums;
DROP POLICY IF EXISTS "Doar adminii pot șterge sub-forumuri" ON forum_subforums;

CREATE POLICY "Admin full management forum_subforums" ON forum_subforums
  FOR ALL
  USING (is_forum_admin())
  WITH CHECK (is_forum_admin());

-- 6. Fix forum_settings policies (just in case they have similar issues)
ALTER TABLE forum_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Doar adminii pot gestiona setări" ON forum_settings;
CREATE POLICY "Admin management forum_settings" ON forum_settings
  FOR ALL
  USING (is_forum_admin())
  WITH CHECK (is_forum_admin());

-- SELECT for forum_settings should be public
DROP POLICY IF EXISTS "Setări vizibile public" ON forum_settings;
CREATE POLICY "Setări vizibile public" ON forum_settings
  FOR SELECT
  USING (true);

-- Comentarii explicative
COMMENT ON POLICY "Admin full management forum_categories" ON forum_categories IS 'Administrare completă (CUD) bazată pe profiles.role = admin';
COMMENT ON POLICY "Admin full management forum_subcategories" ON forum_subcategories IS 'Administrare completă (CUD) bazată pe profiles.role = admin';
COMMENT ON POLICY "Admin full management forum_subforums" ON forum_subforums IS 'Administrare completă (CUD) bazată pe profiles.role = admin';
