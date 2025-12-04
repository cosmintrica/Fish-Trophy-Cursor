-- =============================================
-- Migration 59: Force Reputație Policy Final
-- =============================================
-- Descriere: Forțează policy-ul pentru reputație să folosească is_forum_admin() corect
-- Motiv: Policy-ul vechi poate fi încă activ sau există conflicte
-- Dependințe: 58_fix_subcategories_and_reputation_rls.sql
-- =============================================

-- =============================================
-- 1. Șterge TOATE policy-urile INSERT pentru forum_reputation_logs
-- =============================================

-- Șterge toate policy-urile INSERT (poate există mai multe)
DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;
DROP POLICY IF EXISTS "Utilizatorii pot acorda reputație" ON forum_reputation_logs;
DROP POLICY IF EXISTS "Reputație acordare" ON forum_reputation_logs;

-- =============================================
-- 2. Verifică și actualizează funcția is_forum_admin() dacă e necesar
-- =============================================

-- Asigură-te că funcția există și este corectă
CREATE OR REPLACE FUNCTION is_forum_admin()
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
  -- IMPORTANT: Verifică DOAR profiles.role = 'admin' (sursa de adevăr)
  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = v_user_id;
  
  -- Verifică dacă role este 'admin'
  RETURN COALESCE(v_role, '') = 'admin';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_forum_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_forum_admin() TO anon;

-- =============================================
-- 3. Re-creă policy-ul INSERT cu verificare simplificată
-- =============================================

-- IMPORTANT: Folosim verificare simplificată pentru a evita problemele cu WITH CHECK
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    -- Verificări de bază
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Admin award: verificăm PRIMUL
      -- IMPORTANT: Folosim verificare directă în profiles pentru a evita problemele cu funcții în WITH CHECK
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
'Permite acordarea reputației: like simplu (oricine), dislike/amplificat (putere 1+), admin award (doar admini din profiles.role, nelimitat, post_id nullable). Folosește verificare directă în profiles pentru a evita problemele cu funcții în WITH CHECK.';

