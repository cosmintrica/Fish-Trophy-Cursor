-- =============================================
-- Migration 87: Fix All Forum RLS for INSERT/UPDATE/DELETE
-- =============================================
-- Descriere: Fix policy-urile pentru INSERT/UPDATE/DELETE pe forum_categories, forum_subcategories și forum_subforums
-- Motiv: Policy-ul "FOR ALL" nu funcționează corect pentru INSERT (necesită WITH CHECK)
-- =============================================

-- =============================================
-- 1. Fix forum_categories RLS
-- =============================================

-- Șterge policy-ul vechi
DROP POLICY IF EXISTS "Doar adminii pot gestiona categorii" ON forum_categories;

-- Creează policy-uri separate pentru SELECT, INSERT, UPDATE, DELETE
-- SELECT - deja există "Categorii active vizibile pentru toți", nu o ștergem

-- INSERT - necesită WITH CHECK
CREATE POLICY "Doar adminii pot crea categorii" ON forum_categories
  FOR INSERT 
  WITH CHECK (is_forum_admin());

-- UPDATE - necesită USING pentru verificare
CREATE POLICY "Doar adminii pot actualiza categorii" ON forum_categories
  FOR UPDATE 
  USING (is_forum_admin())
  WITH CHECK (is_forum_admin());

-- DELETE - necesită USING pentru verificare
CREATE POLICY "Doar adminii pot șterge categorii" ON forum_categories
  FOR DELETE 
  USING (is_forum_admin());

-- =============================================
-- 2. Fix forum_subcategories RLS
-- =============================================

-- Șterge policy-ul vechi
DROP POLICY IF EXISTS "Doar adminii pot gestiona subcategorii" ON forum_subcategories;

-- Creează policy-uri separate pentru SELECT, INSERT, UPDATE, DELETE
-- SELECT - deja există "Subcategorii active vizibile", nu o ștergem

-- INSERT - necesită WITH CHECK
CREATE POLICY "Doar adminii pot crea subcategorii" ON forum_subcategories
  FOR INSERT 
  WITH CHECK (is_forum_admin());

-- UPDATE - necesită USING pentru verificare
CREATE POLICY "Doar adminii pot actualiza subcategorii" ON forum_subcategories
  FOR UPDATE 
  USING (is_forum_admin())
  WITH CHECK (is_forum_admin());

-- DELETE - necesită USING pentru verificare
CREATE POLICY "Doar adminii pot șterge subcategorii" ON forum_subcategories
  FOR DELETE 
  USING (is_forum_admin());

-- =============================================
-- 3. Fix forum_subforums RLS
-- =============================================

-- Șterge policy-ul vechi
DROP POLICY IF EXISTS "Doar adminii pot gestiona sub-forumuri" ON forum_subforums;

-- Creează policy-uri separate pentru SELECT, INSERT, UPDATE, DELETE
-- SELECT - deja există "Sub-forumuri active vizibile pentru toți", nu o ștergem

-- INSERT - necesită WITH CHECK
CREATE POLICY "Doar adminii pot crea sub-forumuri" ON forum_subforums
  FOR INSERT 
  WITH CHECK (is_forum_admin());

-- UPDATE - necesită USING pentru verificare
CREATE POLICY "Doar adminii pot actualiza sub-forumuri" ON forum_subforums
  FOR UPDATE 
  USING (is_forum_admin())
  WITH CHECK (is_forum_admin());

-- DELETE - necesită USING pentru verificare
CREATE POLICY "Doar adminii pot șterge sub-forumuri" ON forum_subforums
  FOR DELETE 
  USING (is_forum_admin());

-- Comentarii
COMMENT ON POLICY "Doar adminii pot crea categorii" ON forum_categories IS 
'Permite doar adminilor să creeze categorii. Folosește is_forum_admin() pentru verificare.';

COMMENT ON POLICY "Doar adminii pot actualiza categorii" ON forum_categories IS 
'Permite doar adminilor să actualizeze categorii. Folosește is_forum_admin() pentru verificare.';

COMMENT ON POLICY "Doar adminii pot șterge categorii" ON forum_categories IS 
'Permite doar adminilor să șteargă categorii. Folosește is_forum_admin() pentru verificare.';

COMMENT ON POLICY "Doar adminii pot crea subcategorii" ON forum_subcategories IS 
'Permite doar adminilor să creeze subcategorii. Folosește is_forum_admin() pentru verificare.';

COMMENT ON POLICY "Doar adminii pot actualiza subcategorii" ON forum_subcategories IS 
'Permite doar adminilor să actualizeze subcategorii. Folosește is_forum_admin() pentru verificare.';

COMMENT ON POLICY "Doar adminii pot șterge subcategorii" ON forum_subcategories IS 
'Permite doar adminilor să șteargă subcategorii. Folosește is_forum_admin() pentru verificare.';

COMMENT ON POLICY "Doar adminii pot crea sub-forumuri" ON forum_subforums IS 
'Permite doar adminilor să creeze sub-forumuri. Folosește is_forum_admin() pentru verificare.';

COMMENT ON POLICY "Doar adminii pot actualiza sub-forumuri" ON forum_subforums IS 
'Permite doar adminilor să actualizeze sub-forumuri. Folosește is_forum_admin() pentru verificare.';

COMMENT ON POLICY "Doar adminii pot șterge sub-forumuri" ON forum_subforums IS 
'Permite doar adminilor să șteargă sub-forumuri. Folosește is_forum_admin() pentru verificare.';

