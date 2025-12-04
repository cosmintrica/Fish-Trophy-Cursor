-- =============================================
-- Migration 65: NUCLEAR FIX Reputație (Schema + Dual Role Check + Trigger)
-- =============================================
-- Descriere: 
-- 1. Forțează post_id să fie NULLABLE (pentru admin awards)
-- 2. Verificare Admin ROBUSTĂ: caută atât în profiles cât și în forum_users
-- 3. Trigger SECURITY DEFINER pentru update puncte
-- 4. Policy RLS simplificat și robust
-- =============================================

-- =============================================
-- 1. SCHEMA FIX (CRITIC)
-- =============================================

-- Ne asigurăm că post_id poate fi NULL (pentru admin awards)
ALTER TABLE forum_reputation_logs ALTER COLUMN post_id DROP NOT NULL;

-- =============================================
-- 2. ROBUST ADMIN CHECK (Dual Check)
-- =============================================

-- Verifică admin în ambele locuri: profiles ȘI forum_users
CREATE OR REPLACE FUNCTION check_is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_profile_role TEXT;
  v_forum_role_name TEXT;
BEGIN
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- 1. Verifică în profiles (sursa principală de adevăr pentru auth)
  SELECT role INTO v_profile_role
  FROM public.profiles
  WHERE id = user_id;
  
  IF COALESCE(v_profile_role, '') = 'admin' THEN
    RETURN true;
  END IF;
  
  -- 2. Verifică în forum_users (fallback dacă sync-ul a eșuat)
  SELECT r.name INTO v_forum_role_name
  FROM forum_users fu
  JOIN forum_roles r ON fu.role_id = r.id
  WHERE fu.user_id = user_id;
  
  IF COALESCE(v_forum_role_name, '') = 'admin' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION check_is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_is_admin(UUID) TO anon;

-- =============================================
-- 3. TRIGGER FIX (SECURITY DEFINER)
-- =============================================

-- Trigger-ul trebuie să poată scrie în forum_users indiferent de RLS
CREATE OR REPLACE FUNCTION update_user_reputation_on_award()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
-- 4. RLS POLICY (Reset & Apply)
-- =============================================

-- Curățenie generală
DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;
DROP POLICY IF EXISTS "Utilizatorii pot acorda reputație" ON forum_reputation_logs;
DROP POLICY IF EXISTS "Reputație acordare" ON forum_reputation_logs;
DROP POLICY IF EXISTS "reputation_insert_policy" ON forum_reputation_logs;

-- Policy unic
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      -- CAZ 1: Admin Award (Verificare robustă)
      (
        is_admin_award = true
        AND check_is_admin(giver_user_id)
      )
      -- CAZ 2: Like Simplu (+1)
      OR (
        is_admin_award = false
        AND points = 1 
        AND post_id IS NOT NULL
        AND auth.uid() = giver_user_id
      )
      -- CAZ 3: Dislike sau Amplificat (Putere 1+)
      OR (
        is_admin_award = false
        AND post_id IS NOT NULL
        AND points != 1
        AND auth.uid() = giver_user_id
        AND EXISTS (
          SELECT 1 FROM forum_users fu
          WHERE fu.user_id = giver_user_id AND fu.reputation_power >= 1
        )
      )
    )
  );

COMMENT ON POLICY "Acordare reputație" ON forum_reputation_logs IS 
'Policy NUCLEAR FIX. Admin check robust (profiles + forum_users), post_id nullable enforced, trigger security definer.';
