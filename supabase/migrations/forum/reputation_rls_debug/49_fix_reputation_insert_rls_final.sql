-- =============================================
-- Migration 49: Fix Final RLS pentru INSERT pe forum_reputation_logs
-- =============================================
-- Descriere: Forțează actualizarea policy-ului INSERT să folosească profiles.role corect
-- Dependințe: 47_fix_reputation_rls_use_profiles_role.sql
-- =============================================

-- =============================================
-- 1. Verifică și re-creă politica INSERT
-- =============================================

-- Șterge politica INSERT veche (forțează recrearea)
DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;

-- Re-creăm politica INSERT folosind profiles.role direct
-- IMPORTANT: Folosim COALESCE pentru a evita NULL în verificare
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Admin award: doar admini (nelimitat), post_id poate fi NULL
      -- Folosim profiles.role direct (mai simplu și mai safe)
      (
        is_admin_award = true
        AND COALESCE((SELECT role FROM profiles WHERE id = auth.uid()), '') = 'admin'
        -- post_id poate fi NULL pentru admin awards
      )
      -- Like simplu: oricine (putere 0+), post_id obligatoriu, NU admin award
      OR (
        points = 1 
        AND is_admin_award = false 
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
'Permite acordarea reputației: like simplu (oricine), dislike/amplificat (putere 1+), admin award (doar admini din profiles.role, nelimitat, post_id nullable). Folosește profiles.role direct cu COALESCE pentru siguranță.';

