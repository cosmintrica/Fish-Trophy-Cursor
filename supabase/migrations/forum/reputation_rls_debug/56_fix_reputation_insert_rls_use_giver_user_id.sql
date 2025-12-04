-- =============================================
-- Migration 56: Fix Final RLS pentru INSERT - Folosește giver_user_id direct
-- =============================================
-- Descriere: Folosește giver_user_id în loc de auth.uid() pentru a evita problemele cu contextul
-- Motiv: auth.uid() poate să nu fie disponibil corect în contextul WITH CHECK, dar giver_user_id este disponibil
-- Dependințe: 55_fix_reputation_insert_rls_param_function.sql
-- =============================================

-- =============================================
-- 1. Șterge policy-ul INSERT veche
-- =============================================

DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;

-- =============================================
-- 2. Re-creă politica INSERT folosind giver_user_id direct
-- =============================================

-- IMPORTANT: Folosim giver_user_id direct în loc de auth.uid() pentru funcție
-- Deoarece policy-ul verifică deja că auth.uid() = giver_user_id,
-- putem folosi giver_user_id direct în funcție pentru a evita problemele cu contextul

CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Admin award: verificăm PRIMUL pentru a evita conflicte
      -- Folosim giver_user_id direct în loc de auth.uid() pentru a evita problemele cu contextul
      (
        is_admin_award = true
        AND is_admin_for_reputation(giver_user_id) = true
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
'Permite acordarea reputației: like simplu (oricine), dislike/amplificat (putere 1+), admin award (doar admini din profiles.role, nelimitat, post_id nullable). Folosește giver_user_id direct în funcție (is_admin_for_reputation(giver_user_id)) pentru a evita problemele cu auth.uid() în contextul WITH CHECK.';

