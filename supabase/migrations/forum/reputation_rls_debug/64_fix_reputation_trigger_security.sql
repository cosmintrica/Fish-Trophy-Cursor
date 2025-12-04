-- =============================================
-- Migration 64: Fix TOTAL Reputație (Trigger + RLS + Functions)
-- =============================================
-- Descriere: 
-- 1. Face trigger-ul update_user_reputation_on_award SECURITY DEFINER (fix pentru 403 la update user)
-- 2. Asigură că funcția check_is_admin există și e corectă
-- 3. Resetează policy-urile pe forum_reputation_logs
-- =============================================

-- =============================================
-- 1. FIX TRIGGER FUNCTION (CRITIC: Asta cauza 403 la admin award)
-- =============================================

-- Funcția trebuie să fie SECURITY DEFINER pentru a putea face UPDATE pe forum_users
-- chiar dacă user-ul curent nu are drepturi de editare pe profilul celuilalt
CREATE OR REPLACE FUNCTION update_user_reputation_on_award()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- IMPORTANT: Bypass RLS
SET search_path = public
AS $$
BEGIN
  -- Actualizează reputația utilizatorului care primește
  UPDATE forum_users
  SET reputation_points = reputation_points + NEW.points
  WHERE user_id = NEW.receiver_user_id;
  
  RETURN NEW;
END;
$$;

-- =============================================
-- 2. FIX HELPER FUNCTION (Pentru verificare admin)
-- =============================================

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
  
  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = user_id;
  
  RETURN COALESCE(v_role, '') = 'admin';
END;
$$;

GRANT EXECUTE ON FUNCTION check_is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_is_admin(UUID) TO anon;

-- =============================================
-- 3. FIX RLS POLICY (Resetare completă)
-- =============================================

-- Șterge toate variantele posibile de policy-uri vechi
DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;
DROP POLICY IF EXISTS "Utilizatorii pot acorda reputație" ON forum_reputation_logs;
DROP POLICY IF EXISTS "Reputație acordare" ON forum_reputation_logs;
DROP POLICY IF EXISTS "reputation_insert_policy" ON forum_reputation_logs;

-- Policy unic și corect
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      -- CAZ 1: Admin Award (Verificăm doar că cel care dă e admin)
      (
        is_admin_award = true
        AND check_is_admin(giver_user_id)
        -- Adminii pot da oricât, post_id poate fi NULL
      )
      -- CAZ 2: Like Simplu (+1)
      OR (
        is_admin_award = false
        AND points = 1 
        AND post_id IS NOT NULL
        AND auth.uid() = giver_user_id -- Trebuie să fii tu cel care dă
      )
      -- CAZ 3: Dislike sau Amplificat (Putere 1+)
      OR (
        is_admin_award = false
        AND post_id IS NOT NULL
        AND points != 1
        AND auth.uid() = giver_user_id -- Trebuie să fii tu cel care dă
        AND EXISTS (
          SELECT 1 FROM forum_users fu
          WHERE fu.user_id = giver_user_id AND fu.reputation_power >= 1
        )
      )
    )
  );

COMMENT ON POLICY "Acordare reputație" ON forum_reputation_logs IS 
'Policy final consolidat. Adminii (profiles.role) pot da orice. Userii pot da like (+1). Userii cu putere 1+ pot da dislike/amplificat.';
