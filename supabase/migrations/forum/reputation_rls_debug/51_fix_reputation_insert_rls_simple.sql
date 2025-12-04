-- =============================================
-- Migration 51: Fix Simplu RLS pentru INSERT - Test Direct
-- =============================================
-- Descriere: Simplifică verificarea admin folosind o abordare mai directă
-- Dependințe: 50_fix_reputation_insert_rls_security_definer.sql
-- =============================================

-- =============================================
-- 1. Șterge PRIMUL policy-ul care depinde de funcție
-- =============================================

-- IMPORTANT: Trebuie să ștergem policy-ul PRIMUL pentru că depinde de funcție
DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;

-- =============================================
-- 2. Folosește funcția existentă is_admin_user() din site migrations
-- =============================================

-- IMPORTANT: Nu creăm o funcție nouă, folosim funcția existentă is_admin_user()
-- care verifică profiles.role = 'admin' și funcționează corect
-- Această funcție este definită în 20250128000008_FINAL_FIX_RLS.sql

-- Verifică dacă funcția există, dacă nu, o creăm
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  );
$$;

-- =============================================
-- 3. Re-creă politica INSERT cu verificare simplificată
-- =============================================

-- Re-creăm politica INSERT - verificăm PRIMUL admin award pentru a evita conflicte
-- (Policy-ul a fost deja șters la pasul 1)
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Admin award: verificăm PRIMUL pentru a evita conflicte
      -- Folosim funcția existentă is_admin_user() care verifică profiles.role = 'admin'
      (
        is_admin_award = true
        AND public.is_admin_user() = true
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
'Permite acordarea reputației: like simplu (oricine), dislike/amplificat (putere 1+), admin award (doar admini din profiles.role, nelimitat, post_id nullable). Folosește funcția existentă is_admin_user() cu verificare explicită = true.';

