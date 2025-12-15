-- =============================================
-- Migration 92: Fix reputație la ștergere log-uri
-- =============================================
-- Descriere: 
-- 1. Adaugă trigger pentru DELETE care actualizează reputation_points
-- 2. Creează funcție pentru recalcularea tuturor valorilor de reputație
-- =============================================

-- =============================================
-- 1. TRIGGER: Actualizare reputație la ștergere log
-- =============================================

CREATE OR REPLACE FUNCTION update_user_reputation_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Scade reputația utilizatorului când se șterge un log
  UPDATE forum_users
  SET reputation_points = reputation_points - OLD.points
  WHERE user_id = OLD.receiver_user_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_user_reputation_on_delete
  AFTER DELETE ON forum_reputation_logs
  FOR EACH ROW EXECUTE FUNCTION update_user_reputation_on_delete();

-- =============================================
-- 2. FUNCȚIE: Recalculează toate valorile de reputație
-- =============================================

CREATE OR REPLACE FUNCTION recalculate_all_reputation()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
  v_founder_emails TEXT[] := ARRAY['cosmin.trica@gmail.com', 'cosmin.trica@outlook.com'];
  v_updated_count INTEGER;
BEGIN
  -- Verifică dacă utilizatorul este founder
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_user_email IS NULL OR NOT (v_user_email = ANY(v_founder_emails)) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Doar founder-ul poate recalcula reputația'
    );
  END IF;

  -- Recalculează reputation_points pentru toți utilizatorii bazat pe log-urile rămase
  UPDATE forum_users
  SET reputation_points = COALESCE((
    SELECT SUM(points)
    FROM forum_reputation_logs
    WHERE receiver_user_id = forum_users.user_id
  ), 0);
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'message', 'Reputația a fost recalculată pentru toți utilizatorii'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Eroare la recalcularea reputației: ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION update_user_reputation_on_delete IS 'Actualizare automată reputation_points la ștergere log reputație';
COMMENT ON FUNCTION recalculate_all_reputation IS 'Recalculează toate valorile de reputație bazat pe log-urile rămase. Doar founder-ul poate folosi această funcție.';
