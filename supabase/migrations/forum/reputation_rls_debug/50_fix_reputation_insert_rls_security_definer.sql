-- =============================================
-- Migration 50: Fix Final RLS pentru INSERT - Folosește funcție SECURITY DEFINER
-- =============================================
-- Descriere: Creează funcție SECURITY DEFINER pentru verificarea admin în RLS INSERT
-- Motiv: Verificarea directă profiles.role în WITH CHECK poate cauza probleme
-- Dependințe: 47_fix_reputation_rls_use_profiles_role.sql, 49_fix_reputation_insert_rls_final.sql
-- =============================================

-- =============================================
-- 1. Creează funcție SECURITY DEFINER pentru verificare admin
-- =============================================

CREATE OR REPLACE FUNCTION is_admin_from_profiles()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Verifică dacă utilizatorul este autentificat
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verifică direct dacă utilizatorul este admin din profiles.role
  -- SECURITY DEFINER permite accesul la tabele fără RLS
  RETURN COALESCE((SELECT role FROM profiles WHERE id = auth.uid()), '') = 'admin';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin_from_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_from_profiles() TO anon;

-- =============================================
-- 2. Re-creă politica INSERT folosind funcția SECURITY DEFINER
-- =============================================

-- Șterge politica INSERT veche
DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;

-- Re-creăm politica INSERT folosind funcția SECURITY DEFINER
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Admin award: doar admini (nelimitat), post_id poate fi NULL
      -- Folosim funcția SECURITY DEFINER pentru verificare admin
      (
        is_admin_award = true
        AND is_admin_from_profiles()
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
'Permite acordarea reputației: like simplu (oricine), dislike/amplificat (putere 1+), admin award (doar admini din profiles.role, nelimitat, post_id nullable). Folosește funcție SECURITY DEFINER (is_admin_from_profiles) pentru verificare admin.';

COMMENT ON FUNCTION is_admin_from_profiles IS 
'Verifică dacă utilizatorul curent este admin din profiles.role. SECURITY DEFINER pentru a funcționa corect în contextul RLS WITH CHECK.';

