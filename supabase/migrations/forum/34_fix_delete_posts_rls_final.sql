-- =============================================
-- Migration 34: Fix Final RLS pentru Ștergere Postări
-- =============================================
-- Descriere: Rezolvă problema RLS când adminii șterg postări
-- Problema: Politica SELECT bloca returnarea rândului după UPDATE când is_deleted=true
-- Soluția: Permite SELECT pe postări șterse pentru owner/admin/moderator
-- Dependințe: 15_rls_content.sql, 31_fix_posts_delete_rls.sql
-- =============================================

-- =============================================
-- 1. FIX: Politica SELECT - Permite vizualizarea postărilor șterse
-- =============================================

-- Șterge politica SELECT veche
DROP POLICY IF EXISTS "Postări vizibile" ON forum_posts;

-- Re-creează politica SELECT care permite vizualizarea postărilor șterse de owner/admin
CREATE POLICY "Postări vizibile" ON forum_posts
FOR SELECT
USING (
  -- Postări active (vizibile pentru toți, dacă nu sunt shadow banned)
  (
    is_deleted = false 
    AND (
      NOT has_active_restriction(user_id, 'shadow_ban')
      OR auth.uid() = user_id  -- Autorul vede propria postare shadow banned
      OR EXISTS (
        SELECT 1 FROM forum_users fu
        WHERE fu.user_id = auth.uid()
          AND fu.role_id IN (
            SELECT id FROM forum_roles 
            WHERE name IN ('admin', 'moderator')
          )
      )
    )
  )
  OR
  -- Postări șterse vizibile pentru owner (pentru a putea vedea confirmarea după delete)
  (is_deleted = true AND auth.uid() = user_id)
  OR
  -- Postări șterse vizibile pentru admin (verificare din profiles.role)
  (is_deleted = true AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  OR
  -- Moderatori văd toate postările (inclusiv șterse)
  (
    is_deleted = true 
    AND EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (
          SELECT id FROM forum_roles 
          WHERE name IN ('admin', 'moderator')
        )
    )
  )
);

-- =============================================
-- 2. FIX: Politica UPDATE - Folosește profiles.role pentru admin
-- =============================================

-- Șterge politica UPDATE veche
DROP POLICY IF EXISTS "Editare postări" ON forum_posts;

-- Re-creează politica UPDATE simplificată
CREATE POLICY "Editare postări" ON forum_posts
FOR UPDATE 
USING (
  -- Owner-ul postării
  auth.uid() = user_id
  OR
  -- Admin - verificare DIRECTĂ din profiles.role (mai simplu și mai rapid)
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
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
Rezolvă problema unde UPDATE-ul eșua pentru că politica SELECT bloca returnarea rândului după is_deleted=true.';

COMMENT ON POLICY "Editare postări" ON forum_posts IS 
'Permite UPDATE (inclusiv soft delete) pentru: owner, admin (din profiles.role), moderator. 
WITH CHECK (true) permite modificări care fac rândul invizibil pentru SELECT normal.';

-- =============================================
-- VERIFICARE: Testează politicile
-- =============================================

-- Query pentru verificare (comentat - poate fi rulat manual)
-- SELECT 
--     policyname,
--     cmd,
--     with_check,
--     LEFT(qual::text, 100) as using_clause_preview
-- FROM pg_policies 
-- WHERE tablename = 'forum_posts'
--   AND policyname IN ('Postări vizibile', 'Editare postări')
-- ORDER BY cmd, policyname;
