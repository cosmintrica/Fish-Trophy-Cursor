-- =============================================
-- Migration 53: Fix Final RLS pentru INSERT - Verificare Directă
-- =============================================
-- Descriere: Folosește verificare directă în policy, fără funcție
-- Motiv: Policy-urile pe profiles permit SELECT pentru toți, deci verificarea directă funcționează
-- Dependințe: 51_fix_reputation_insert_rls_simple.sql
-- =============================================

-- =============================================
-- 1. Șterge policy-ul INSERT veche
-- =============================================

DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;

-- =============================================
-- 2. Re-creă politica INSERT cu verificare DIRECTĂ (fără funcție)
-- =============================================

-- IMPORTANT: Folosim verificare directă în policy pentru că:
-- 1. Policy-urile pe profiles permit SELECT pentru toți (Public can view profiles)
-- 2. Nu avem nevoie de funcție SECURITY DEFINER dacă RLS pe profiles permite accesul
-- 3. Verificarea directă este mai simplă și mai rapidă

CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Admin award: verificăm PRIMUL pentru a evita conflicte
      -- Verificare DIRECTĂ în profiles (policy-urile permit SELECT pentru toți)
      (
        is_admin_award = true
        AND EXISTS (
          SELECT 1 FROM public.profiles p
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
'Permite acordarea reputației: like simplu (oricine), dislike/amplificat (putere 1+), admin award (doar admini din profiles.role, nelimitat, post_id nullable). Folosește verificare directă în profiles (policy-urile permit SELECT pentru toți).';

