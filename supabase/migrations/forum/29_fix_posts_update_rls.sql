-- =============================================
-- Migration 29: Fix RLS pentru UPDATE pe forum_posts
-- =============================================
-- Descriere: Actualizează politica de UPDATE pentru a permite corect
-- soft delete și editare de către admini folosind verificare directă
-- Dependințe: 15_rls_content.sql
-- =============================================

-- Șterge politica veche care folosește verificări manuale
DROP POLICY IF EXISTS "Editare postări" ON forum_posts;

-- Re-creează politica folosind verificare directă (ca în migrarea 15)
-- Permite:
-- 1. Creatorii să își editeze propriile postări
-- 2. Moderatorii să editeze postări din subcategoriile lor
-- 3. Adminii să editeze/șteargă orice postare (inclusiv soft delete)
CREATE POLICY "Editare postări" ON forum_posts
  FOR UPDATE USING (
    -- Creatorul postării poate să o editeze
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
    -- Adminii pot edita/șterge orice postare (verificare directă)
    EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (SELECT id FROM forum_roles WHERE name = 'admin')
    )
  );

-- Comentariu pentru claritate
COMMENT ON POLICY "Editare postări" ON forum_posts IS 
'Permite UPDATE pentru: creatorul postării, moderatorii subcategoriei, adminii (soft delete inclusiv). Folosește verificare directă pentru a evita probleme RLS.';

