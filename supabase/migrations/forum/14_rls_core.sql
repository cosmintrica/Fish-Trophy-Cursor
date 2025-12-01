-- =============================================
-- Migration 14: RLS Policies - Core Tables
-- =============================================
-- Descriere: Politici Row Level Security pentru categorii, roluri, utilizatori
-- Dependințe: 02_roles.sql, 03_categories.sql, 04_users.sql
-- =============================================

-- =============================================
-- ACTIVARE RLS
-- =============================================

ALTER TABLE forum_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_user_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_subforums ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_users ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLITICI ROLURI ȘI RANGURI
-- =============================================

-- Roluri - citire pentru toți, modificare doar pentru admini
CREATE POLICY "Roluri vizibile pentru toți" ON forum_roles
  FOR SELECT USING (true);

CREATE POLICY "Doar adminii pot gestiona roluri" ON forum_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (
          SELECT id FROM forum_roles WHERE name = 'admin'
        )
    )
  );

-- Ranguri - citire pentru toți, modificare doar pentru admini
CREATE POLICY "Ranguri vizibile pentru toți" ON forum_user_ranks
  FOR SELECT USING (true);

CREATE POLICY "Doar adminii pot gestiona ranguri" ON forum_user_ranks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (
          SELECT id FROM forum_roles WHERE name = 'admin'
        )
    )
  );

-- =============================================
-- POLITICI CATEGORII ȘI IERARHIE
-- =============================================

-- Categorii - citire pentru toți (dacă active), modificare doar admini
CREATE POLICY "Categorii active vizibile pentru toți" ON forum_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Doar adminii pot gestiona categorii" ON forum_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (
          SELECT id FROM forum_roles WHERE name = 'admin'
        )
    )
  );

-- Sub-forumuri - același pattern
CREATE POLICY "Sub-forumuri active vizibile pentru toți" ON forum_subforums
  FOR SELECT USING (is_active = true);

CREATE POLICY "Doar adminii pot gestiona sub-forumuri" ON forum_subforums
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (
          SELECT id FROM forum_roles WHERE name = 'admin'
        )
    )
  );

-- Subcategorii - citire pentru toți (dacă active), moderator_only pentru moderatori
CREATE POLICY "Subcategorii active vizibile" ON forum_subcategories
  FOR SELECT USING (
    is_active = true
    AND (
      moderator_only = false
      OR EXISTS (
        SELECT 1 FROM forum_users fu
        WHERE fu.user_id = auth.uid()
          AND fu.role_id IN (
            SELECT id FROM forum_roles WHERE name IN ('admin', 'moderator')
          )
      )
    )
  );

CREATE POLICY "Doar adminii pot gestiona subcategorii" ON forum_subcategories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (
          SELECT id FROM forum_roles WHERE name = 'admin'
        )
    )
  );

-- =============================================
-- POLITICI UTILIZATORI
-- =============================================

-- Profiluri - vizibile pentru toți, editabile doar de proprietar sau admin
CREATE POLICY "Profiluri vizibile pentru toți" ON forum_users
  FOR SELECT USING (true);

CREATE POLICY "Utilizatorii își pot crea profilul" ON forum_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilizatorii își pot edita profilul" ON forum_users
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM forum_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role_id IN (
          SELECT id FROM forum_roles WHERE name = 'admin'
        )
    )
  );

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON POLICY "Roluri vizibile pentru toți" ON forum_roles IS 'Toți pot vedea rolurile disponibile';
COMMENT ON POLICY "Categorii active vizibile pentru toți" ON forum_categories IS 'Doar categoriile active sunt vizibile publicului';
COMMENT ON POLICY "Profiluri vizibile pentru toți" ON forum_users IS 'Toate profilurile sunt publice (inclusiv reputația - ZERO privat)';
