-- =============================================
-- Migration 58: Fix Subcategorii și Reputație RLS după Migration 57
-- =============================================
-- Descriere: Fix policy-urile pentru subcategorii și reputație după simplificarea funcțiilor
-- Motiv: Policy-urile trebuie actualizate să funcționeze cu noile funcții
-- Dependințe: 57_simplify_admin_check_use_profiles_only.sql
-- =============================================

-- =============================================
-- 1. Fix Policy pentru Subcategorii
-- =============================================

-- Șterge policy-ul vechi
DROP POLICY IF EXISTS "Subcategorii active vizibile" ON forum_subcategories;

-- Re-creă policy-ul care funcționează corect
-- IMPORTANT: moderator_only = false înseamnă că toată lumea poate vedea
-- moderator_only = true înseamnă că doar admini/moderatori pot vedea
CREATE POLICY "Subcategorii active vizibile" ON forum_subcategories
  FOR SELECT USING (
    is_active = true
    AND (
      moderator_only = false
      OR is_forum_moderator() -- Verifică profiles.role IN ('admin', 'moderator')
    )
  );

-- =============================================
-- 2. Fix Policy pentru Reputație (elimină = true)
-- =============================================

DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;

-- Re-creă policy-ul fără = true (poate cauza probleme în WITH CHECK)
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Admin award: verificăm PRIMUL pentru a evita conflicte
      -- Folosim is_forum_admin() FĂRĂ = true (poate cauza probleme în WITH CHECK)
      (
        is_admin_award = true
        AND is_forum_admin()
      )
      -- Like simplu: oricine (putere 0+), post_id obligatoriu, NU admin award
      OR (
        is_admin_award = false
        AND points = 1 
        AND post_id IS NOT NULL
      )
      -- Dislike sau amplificat: doar putere 1+ (50+ reputație), post_id obligatoriu, NU admin award
      OR (
        is_admin_award = false
        AND post_id IS NOT NULL
        AND points != 1
        AND EXISTS (
          SELECT 1 FROM forum_users fu
          WHERE fu.user_id = auth.uid() AND fu.reputation_power >= 1
        )
      )
    )
  );

COMMENT ON POLICY "Acordare reputație" ON forum_reputation_logs IS 
'Permite acordarea reputației: like simplu (oricine), dislike/amplificat (putere 1+), admin award (doar admini din profiles.role, nelimitat, post_id nullable). Folosește is_forum_admin() FĂRĂ = true pentru a evita problemele în WITH CHECK.';

COMMENT ON POLICY "Subcategorii active vizibile" ON forum_subcategories IS 
'Permite vizualizarea subcategoriilor active. Dacă moderator_only = false, toată lumea poate vedea. Dacă moderator_only = true, doar admini/moderatori (profiles.role IN (''admin'', ''moderator'')) pot vedea.';

