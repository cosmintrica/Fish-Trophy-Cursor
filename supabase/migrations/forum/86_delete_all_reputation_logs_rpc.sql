-- =============================================
-- Migration 86: Funcție RPC pentru ștergerea log-urilor de reputație pentru un user specific
-- =============================================
-- Descriere: Funcție SECURITY DEFINER pentru ștergerea istoricului reputației pentru un user specific
-- Doar founder-ul (cosmin.trica@gmail.com sau cosmin.trica@outlook.com) poate folosi această funcție
-- =============================================

-- Șterge funcția veche dacă există
DROP FUNCTION IF EXISTS delete_all_reputation_logs();

-- Funcție pentru ștergerea log-urilor de reputație pentru un user specific
-- Verifică email-ul utilizatorului curent - doar founder-ul poate folosi
CREATE OR REPLACE FUNCTION delete_user_reputation_logs(receiver_user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
  v_deleted_count INTEGER;
  v_founder_emails TEXT[] := ARRAY['cosmin.trica@gmail.com', 'cosmin.trica@outlook.com'];
BEGIN
  -- Obține email-ul utilizatorului curent
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Verifică dacă utilizatorul este founder
  IF v_user_email IS NULL OR NOT (v_user_email = ANY(v_founder_emails)) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Doar founder-ul poate șterge istoricul'
    );
  END IF;

  -- Verifică dacă user_id este valid
  IF receiver_user_id_param IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'ID utilizator invalid'
    );
  END IF;

  -- Șterge log-urile pentru user-ul specific
  DELETE FROM forum_reputation_logs
  WHERE receiver_user_id = receiver_user_id_param;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'message', 'Istoricul utilizatorului a fost șters cu succes'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Eroare la ștergerea istoricului: ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION delete_user_reputation_logs IS 
'Șterge log-urile de reputație pentru un user specific. Doar founder-ul poate folosi această funcție. SECURITY DEFINER pentru a permite ștergerea.';

