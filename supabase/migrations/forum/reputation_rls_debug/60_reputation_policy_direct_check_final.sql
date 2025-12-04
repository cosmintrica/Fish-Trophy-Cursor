-- =============================================
-- Migration 60: Reputație Policy - Verificare Directă Finală
-- =============================================
-- Descriere: Simplifică complet policy-ul pentru reputație cu verificare directă în profiles
-- Motiv: Funcțiile pot avea probleme în WITH CHECK, verificarea directă este mai sigură
-- Dependințe: 59_force_reputation_policy_final.sql
-- =============================================

-- =============================================
-- 1. Șterge TOATE policy-urile INSERT pentru forum_reputation_logs
-- =============================================

DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;
DROP POLICY IF EXISTS "Utilizatorii pot acorda reputație" ON forum_reputation_logs;
DROP POLICY IF EXISTS "Reputație acordare" ON forum_reputation_logs;

-- =============================================
-- 2. Re-creă policy-ul cu verificare DIRECTĂ în profiles (fără funcții)
-- =============================================

-- IMPORTANT: Folosim verificare DIRECTĂ în profiles pentru a evita orice problemă cu funcții în WITH CHECK
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    -- Verificări de bază
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Admin award: verificare DIRECTĂ în profiles (fără funcții)
      (
        is_admin_award = true
        AND EXISTS (
          SELECT 1 
          FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.role = 'admin'
        )
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
'Permite acordarea reputației: like simplu (oricine), dislike/amplificat (putere 1+), admin award (doar admini din profiles.role, nelimitat, post_id nullable). Folosește verificare DIRECTĂ în profiles (fără funcții) pentru a evita problemele cu WITH CHECK.';

