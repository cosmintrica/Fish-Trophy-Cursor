-- =============================================
-- Migration 46: Fix RLS pentru Postări - Folosește is_forum_admin()
-- =============================================
-- Descriere: Actualizează policy-urile pentru forum_posts să folosească is_forum_admin()
-- în loc de profiles.role pentru consistență cu restul sistemului
-- Dependințe: 18_fix_rls_recursion_FIXED.sql, 34_fix_delete_posts_rls_final.sql
-- =============================================

-- =============================================
-- 1. FIX: Politica SELECT - Folosește is_forum_admin()
-- =============================================

-- Șterge politica SELECT veche
DROP POLICY IF EXISTS "Postări vizibile" ON forum_posts;

-- Re-creează politica SELECT care folosește is_forum_admin()
CREATE POLICY "Postări vizibile" ON forum_posts
FOR SELECT
USING (
  -- Postări active (vizibile pentru toți, dacă nu sunt shadow banned)
  (
    is_deleted = false 
    AND (
      NOT has_active_restriction(user_id, 'shadow_ban')
      OR auth.uid() = user_id  -- Autorul vede propria postare shadow banned
      OR is_forum_admin()
      OR is_forum_moderator()
    )
  )
  OR
  -- Postări șterse vizibile pentru owner
  (is_deleted = true AND auth.uid() = user_id)
  OR
  -- Postări șterse vizibile pentru admin/moderator (folosește is_forum_admin())
  (is_deleted = true AND (is_forum_admin() OR is_forum_moderator()))
);

-- =============================================
-- 2. FIX: Politica UPDATE - Folosește is_forum_admin()
-- =============================================

-- Șterge politica UPDATE veche
DROP POLICY IF EXISTS "Editare postări" ON forum_posts;

-- Re-creează politica UPDATE folosind is_forum_admin()
CREATE POLICY "Editare postări" ON forum_posts
FOR UPDATE 
USING (
  -- Owner-ul postării
  auth.uid() = user_id
  OR
  -- Admin - folosește is_forum_admin() pentru consistență
  is_forum_admin()
  OR
  -- Moderator pentru subcategoria respectivă
  EXISTS (
    SELECT 1 FROM forum_moderators fm
    JOIN forum_subcategories fs ON (fm.subcategory_id = fs.id OR fm.category_id = fs.category_id)
    JOIN forum_topics ft ON ft.subcategory_id = fs.id
    WHERE fm.user_id = auth.uid() AND ft.id = topic_id
  )
)
WITH CHECK (true);  -- IMPORTANT: Permite modificarea care face rândul "invizibil" (is_deleted=true)

-- =============================================
-- Comentarii
-- =============================================

COMMENT ON POLICY "Postări vizibile" ON forum_posts IS 
'Permite SELECT pe postări active pentru toți, și pe postări șterse pentru owner/admin/moderator. 
Folosește is_forum_admin() și is_forum_moderator() pentru consistență cu restul sistemului.';

COMMENT ON POLICY "Editare postări" ON forum_posts IS 
'Permite UPDATE (inclusiv soft delete) pentru: owner, admin (is_forum_admin()), moderator. 
WITH CHECK (true) permite modificări care fac rândul invizibil pentru SELECT normal.';

