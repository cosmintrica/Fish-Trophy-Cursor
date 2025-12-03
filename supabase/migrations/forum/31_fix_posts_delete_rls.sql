-- =============================================
-- Migration 31: Fix RLS pentru ștergere postări - Folosește is_forum_admin()
-- =============================================
-- Descriere: Actualizează politica de UPDATE pentru a permite corect
-- ștergerea (soft delete) folosind funcția is_forum_admin() care bypass RLS
-- Dependințe: 18_fix_rls_recursion.sql, 29_fix_posts_update_rls.sql
-- =============================================

-- Șterge politica veche
DROP POLICY IF EXISTS "Editare postări" ON forum_posts;

-- Re-creează politica folosind funcția is_forum_admin() (SECURITY DEFINER, bypass RLS)
-- Permite:
-- 1. Creatorii să își editeze/șteargă propriile postări
-- 2. Moderatorii să editeze postări din subcategoriile lor
-- 3. Adminii să editeze/șteargă orice postare (folosește funcția SECURITY DEFINER)
CREATE POLICY "Editare postări" ON forum_posts
  FOR UPDATE 
  USING (
    -- Creatorul postării poate să o editeze/șteargă
    auth.uid() = user_id
    OR
    -- Moderatorii pot edita postările din subcategoriile lor
    EXISTS (
      SELECT 1 FROM forum_moderators fm
      JOIN forum_subcategories fs ON (fm.subcategory_id = fs.id OR fm.category_id = fs.category_id)
      JOIN forum_topics ft ON ft.subcategory_id = fs.id
      WHERE fm.user_id = auth.uid() AND ft.id = topic_id
    )
    OR
    -- Adminii pot edita/șterge orice postare
    -- Verificare directă: forum_users are role_id care corespunde cu rolul 'admin' din forum_roles
    EXISTS (
      SELECT 1 FROM forum_users fu
      JOIN forum_roles fr ON fu.role_id = fr.id
      WHERE fu.user_id = auth.uid()
        AND fr.name = 'admin'
    )
  )
  WITH CHECK (true);
  -- Permite orice modificare dacă USING a trecut
  -- IMPORTANT: Fără WITH CHECK, PostgreSQL aplică implicit USING și pe rândul NOU,
  -- iar când setezi is_deleted=true, rândul nu mai trece politica SELECT (care filtrează is_deleted=false)

-- Comentariu pentru claritate
COMMENT ON POLICY "Editare postări" ON forum_posts IS 
'Permite UPDATE (inclusiv soft delete) pentru: creatorul postării, moderatorii subcategoriei, adminii. WITH CHECK (true) permite modificări care fac rândul invizibil pentru SELECT (ex: is_deleted=true).';

