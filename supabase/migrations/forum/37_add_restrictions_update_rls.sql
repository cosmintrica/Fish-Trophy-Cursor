-- =============================================
-- Migration 37: RLS Policy pentru UPDATE pe forum_user_restrictions
-- =============================================
-- Descriere: Permite doar adminilor și moderatorilor să actualizeze restricțiile (de ex. să le dezactiveze)
-- Dependințe: 05_restrictions.sql, 15_rls_content.sql
-- =============================================

-- Policy pentru UPDATE - doar adminii și moderatorii pot actualiza restricțiile
DROP POLICY IF EXISTS "Doar moderatori/admini pot actualiza restricții" ON forum_user_restrictions;

CREATE POLICY "Doar moderatori/admini pot actualiza restricții" ON forum_user_restrictions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (
          SELECT id FROM forum_roles WHERE name IN ('admin', 'moderator')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (
          SELECT id FROM forum_roles WHERE name IN ('admin', 'moderator')
        )
    )
  );

-- Comentarii
COMMENT ON POLICY "Doar moderatori/admini pot actualiza restricții" ON forum_user_restrictions IS 
  'Permite doar adminilor și moderatorilor să actualizeze restricțiile (de ex. să le dezactiveze prin is_active = false)';

