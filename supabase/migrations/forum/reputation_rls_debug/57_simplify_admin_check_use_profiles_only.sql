-- =============================================
-- Migration 57: Simplificare Verificare Admin - Folosește DOAR profiles.role
-- =============================================
-- Descriere: Simplifică verificarea admin să folosească DOAR profiles.role = 'admin'
-- Motiv: profiles.role este sursa de adevăr pentru site, nu depinde de sincronizare
-- Dependințe: 56_fix_reputation_insert_rls_use_giver_user_id.sql
-- =============================================

-- =============================================
-- 1. Actualizează is_forum_admin() să verifice profiles.role
-- =============================================

-- Șterge funcția veche
DROP FUNCTION IF EXISTS is_forum_admin() CASCADE;

-- Creează funcție simplificată care verifică DOAR profiles.role
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
-- 2. Actualizează is_forum_moderator() să verifice profiles.role
-- =============================================

-- Șterge funcția veche
DROP FUNCTION IF EXISTS is_forum_moderator() CASCADE;

-- Creează funcție simplificată care verifică DOAR profiles.role
CREATE OR REPLACE FUNCTION is_forum_moderator()
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
  -- IMPORTANT: Verifică profiles.role = 'admin' sau 'moderator' (sursa de adevăr)
  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = v_user_id;
  
  -- Verifică dacă role este 'admin' sau 'moderator'
  RETURN COALESCE(v_role, '') IN ('admin', 'moderator');
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_forum_moderator() TO authenticated;
GRANT EXECUTE ON FUNCTION is_forum_moderator() TO anon;

-- =============================================
-- 3. Elimină toate funcțiile redundante/problematic
-- =============================================

-- Elimină is_admin_for_reputation() (redundant, folosim is_forum_admin())
DROP FUNCTION IF EXISTS is_admin_for_reputation(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_admin_for_reputation() CASCADE;

-- Elimină alte funcții care ar putea verifica forum_users.role_id direct
-- (dacă există, vor fi recreate cu verificare profiles.role)
DROP FUNCTION IF EXISTS is_admin_from_profiles() CASCADE;
DROP FUNCTION IF EXISTS is_admin_user() CASCADE; -- Dacă există o variantă pentru forum

-- =============================================
-- 4. Actualizează policy-ul pentru forum_reputation_logs
-- =============================================

DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;

-- Re-creă policy-ul folosind is_forum_admin() simplificat
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Admin award: verificăm PRIMUL pentru a evita conflicte
      -- Folosim is_forum_admin() care verifică profiles.role = 'admin'
      (
        is_admin_award = true
        AND is_forum_admin()
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
'Permite acordarea reputației: like simplu (oricine), dislike/amplificat (putere 1+), admin award (doar admini din profiles.role, nelimitat, post_id nullable). Folosește is_forum_admin() care verifică profiles.role = ''admin'' (sursa de adevăr).';

COMMENT ON FUNCTION is_forum_admin IS 
'Verifică dacă utilizatorul curent este admin din profiles.role = ''admin''. SECURITY DEFINER pentru a bypass complet RLS pe profiles. Aceasta este sursa de adevăr pentru admin pe site.';

