-- =============================================
-- Migration 55: Fix Final RLS pentru INSERT - Funcție cu Parametru
-- =============================================
-- Descriere: Creează funcție SECURITY DEFINER care primește user_id ca parametru
-- Motiv: auth.uid() poate să nu fie disponibil corect în contextul WITH CHECK
-- Dependințe: 54_fix_reputation_insert_rls_security_definer_final.sql
-- =============================================

-- =============================================
-- 1. Creează funcție SECURITY DEFINER cu parametru user_id
-- =============================================

-- Șterge funcția veche (dacă există)
DROP FUNCTION IF EXISTS is_admin_for_reputation(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_admin_for_reputation() CASCADE;

-- Creează funcție SECURITY DEFINER care primește user_id ca parametru
-- Aceasta evită problemele cu auth.uid() în contextul WITH CHECK
CREATE OR REPLACE FUNCTION is_admin_for_reputation(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Verifică dacă user_id este NULL
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- SECURITY DEFINER permite accesul la profiles fără RLS
  -- IMPORTANT: Verifică profiles.role = 'admin', NU forum_users.role_id
  -- Aceasta este sursa de adevăr pentru admin pe site
  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = user_id;
  
  -- Verifică dacă role este 'admin'
  RETURN COALESCE(v_role, '') = 'admin';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin_for_reputation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_for_reputation(UUID) TO anon;

-- =============================================
-- 2. Șterge policy-ul INSERT veche
-- =============================================

DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;

-- =============================================
-- 3. Re-creă politica INSERT folosind funcția cu parametru
-- =============================================

CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Admin award: verificăm PRIMUL pentru a evita conflicte
      -- Folosim funcție SECURITY DEFINER cu parametru explicit auth.uid()
      (
        is_admin_award = true
        AND is_admin_for_reputation(auth.uid()) = true
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
'Permite acordarea reputației: like simplu (oricine), dislike/amplificat (putere 1+), admin award (doar admini din profiles.role, nelimitat, post_id nullable). Folosește funcție SECURITY DEFINER cu parametru explicit (is_admin_for_reputation(auth.uid())) pentru a evita problemele cu auth.uid() în WITH CHECK.';

COMMENT ON FUNCTION is_admin_for_reputation(UUID) IS 
'Verifică dacă utilizatorul cu user_id dat este admin din profiles.role. SECURITY DEFINER pentru a bypass complet RLS pe profiles. Primește user_id ca parametru pentru a evita problemele cu auth.uid() în contextul WITH CHECK.';

