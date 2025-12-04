-- =============================================
-- Migration 54: Fix Final RLS pentru INSERT - SECURITY DEFINER Final
-- =============================================
-- Descriere: Creează funcție SECURITY DEFINER care bypass complet RLS pe profiles
-- Motiv: Verificarea directă în WITH CHECK poate avea probleme cu RLS chiar dacă policy-urile permit SELECT
-- Dependințe: 53_fix_reputation_insert_rls_direct.sql
-- =============================================

-- =============================================
-- 1. Creează funcție SECURITY DEFINER care bypass complet RLS
-- =============================================

-- Șterge funcția veche (dacă există)
DROP FUNCTION IF EXISTS is_admin_for_reputation() CASCADE;

-- Creează funcție SECURITY DEFINER care bypass complet RLS pe profiles
-- IMPORTANT: Verifică profiles.role = 'admin', NU forum_users.role_id
CREATE OR REPLACE FUNCTION is_admin_for_reputation()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
BEGIN
  -- Verifică dacă utilizatorul este autentificat
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- SECURITY DEFINER permite accesul la profiles fără RLS
  -- IMPORTANT: Verifică profiles.role = 'admin', NU forum_users.role_id
  -- Aceasta este sursa de adevăr pentru admin pe site
  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = v_user_id;
  
  -- Verifică dacă role este 'admin'
  RETURN COALESCE(v_role, '') = 'admin';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin_for_reputation() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_for_reputation() TO anon;

-- =============================================
-- 2. Șterge policy-ul INSERT veche
-- =============================================

DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;

-- =============================================
-- 3. Re-creă politica INSERT folosind funcția SECURITY DEFINER
-- =============================================

CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Admin award: verificăm PRIMUL pentru a evita conflicte
      -- Folosim funcție SECURITY DEFINER care bypass complet RLS
      (
        is_admin_award = true
        AND is_admin_for_reputation()
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
'Permite acordarea reputației: like simplu (oricine), dislike/amplificat (putere 1+), admin award (doar admini din profiles.role, nelimitat, post_id nullable). Folosește funcție SECURITY DEFINER (is_admin_for_reputation) care bypass complet RLS pe profiles.';

COMMENT ON FUNCTION is_admin_for_reputation IS 
'Verifică dacă utilizatorul curent este admin din profiles.role. SECURITY DEFINER pentru a bypass complet RLS pe profiles în contextul WITH CHECK.';

