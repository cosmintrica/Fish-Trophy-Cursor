-- =============================================
-- Migration 45: Fix Final RLS pentru Admin Award - Forțează Actualizare
-- =============================================
-- Descriere: Forțează actualizarea policy-ului să folosească is_forum_admin() fără = true
-- Dependințe: 18_fix_rls_recursion_FIXED.sql, 44_verify_admin_and_fix.sql
-- 
-- IMPORTANT: 
-- - Policy-ul activ folosește is_forum_admin() = true (greșit)
-- - Trebuie să folosească is_forum_admin() (fără = true)
-- =============================================

-- 1. Asigură-te că funcția is_forum_admin() există și este corectă
CREATE OR REPLACE FUNCTION is_forum_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Verifică dacă utilizatorul este autentificat
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verifică direct dacă utilizatorul este admin
  -- SECURITY DEFINER permite accesul la tabele fără RLS
  SELECT EXISTS (
    SELECT 1
    FROM forum_users fu
    JOIN forum_roles fr ON fu.role_id = fr.id
    WHERE fu.user_id = v_user_id
      AND fr.name = 'admin'
  ) INTO v_is_admin;
  
  RETURN COALESCE(v_is_admin, false);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_forum_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_forum_admin() TO anon;

-- 2. FORȚEAZĂ drop și recreate policy-ului
-- IMPORTANT: Folosim DROP POLICY IF EXISTS pentru a fi siguri că ștergem vechiul policy
DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;

-- 3. Re-creăm policy-ul cu is_forum_admin() FĂRĂ = true
-- IMPORTANT: Nu folosim = true pentru a evita probleme de evaluare în contextul RLS
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Admin award: doar admini (nelimitat), post_id poate fi NULL
      -- Verificăm PRIMUL pentru a evita conflicte cu condițiile pentru like-uri normale
      -- IMPORTANT: Folosim is_forum_admin() FĂRĂ = true
      (
        is_admin_award = true
        AND is_forum_admin()
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
'Permite acordarea reputației: like simplu (oricine), dislike/amplificat (putere 1+), admin award (doar admini, nelimitat, post_id nullable). Folosește is_forum_admin() (SECURITY DEFINER) FĂRĂ = true pentru verificare admin.';

