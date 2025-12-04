-- =============================================
-- Migration 62: Reputație Policy - SECURITY DEFINER Final
-- =============================================
-- Descriere: Folosește funcție SECURITY DEFINER care bypass complet RLS pe profiles
-- Motiv: RLS pe profiles poate bloca SELECT-ul în contextul WITH CHECK
-- =============================================

-- 1. Creează funcție SECURITY DEFINER simplă care primește user_id
CREATE OR REPLACE FUNCTION check_is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- SECURITY DEFINER bypass complet RLS pe profiles
  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = user_id;
  
  RETURN COALESCE(v_role, '') = 'admin';
END;
$$;

GRANT EXECUTE ON FUNCTION check_is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_is_admin(UUID) TO anon;

-- 2. Șterge TOATE policy-urile INSERT
DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;
DROP POLICY IF EXISTS "Utilizatorii pot acorda reputație" ON forum_reputation_logs;
DROP POLICY IF EXISTS "Reputație acordare" ON forum_reputation_logs;

-- 3. Policy cu funcție SECURITY DEFINER
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Admin award: folosim funcție SECURITY DEFINER cu giver_user_id
      (
        is_admin_award = true
        AND check_is_admin(giver_user_id)
      )
      -- Like simplu
      OR (
        is_admin_award = false
        AND points = 1 
        AND post_id IS NOT NULL
      )
      -- Dislike sau amplificat
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
'Permite acordarea reputației. Folosește funcție SECURITY DEFINER (check_is_admin) care bypass complet RLS pe profiles.';

COMMENT ON FUNCTION check_is_admin(UUID) IS 
'Verifică dacă user_id este admin din profiles.role. SECURITY DEFINER pentru a bypass complet RLS pe profiles în contextul WITH CHECK.';

