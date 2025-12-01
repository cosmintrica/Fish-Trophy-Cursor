-- =============================================
-- Migration 23: API Reputație (Like/Dislike)
-- =============================================
-- Descriere: Funcții RPC pentru acordare reputație (like/dislike) cu validare putere
-- Dependințe: 07_reputation.sql, 04_users.sql, 11_triggers.sql
--
-- IMPORTANT: Reputația se acordă STRICT unui POST/MESAJ din forum, dar punctele
--            se aplică utilizatorului care a scris postul (receiver_user_id).
--            Log-ul salvează post_id pentru istoric, dar trigger-ul actualizează
--            reputation_points pentru utilizatorul autor al postului.
-- =============================================

-- =============================================
-- 1. FUNCȚIE: Acordare Like/Dislike cu validare putere
-- =============================================

CREATE OR REPLACE FUNCTION give_reputation(
  p_post_id UUID,
  p_receiver_user_id UUID,
  p_points INTEGER, -- +1 pentru like, -1 pentru dislike
  p_comment TEXT DEFAULT NULL -- Comentariu (min 3 caractere pentru amplificare)
)
RETURNS JSON AS $$
DECLARE
  v_giver_user_id UUID;
  v_giver_power INTEGER;
  v_receiver_power INTEGER;
  v_final_points INTEGER;
  v_comment_valid BOOLEAN;
  v_can_dislike BOOLEAN;
  v_result JSON;
  v_existing_log UUID;
BEGIN
  -- Verifică autentificare
  v_giver_user_id := auth.uid();
  IF v_giver_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Trebuie să fii autentificat pentru a acorda reputație'
    );
  END IF;

  -- Nu poți da reputație propriului post
  IF v_giver_user_id = p_receiver_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Nu poți da reputație propriului post'
    );
  END IF;

  -- Verifică dacă există deja un log pentru acest post de la acest utilizator
  SELECT id INTO v_existing_log
  FROM forum_reputation_logs
  WHERE post_id = p_post_id
    AND giver_user_id = v_giver_user_id
  LIMIT 1;

  IF v_existing_log IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ai dat deja reputație acestui post'
    );
  END IF;

  -- Obține puterea celui care dă
  SELECT COALESCE(reputation_power, 0) INTO v_giver_power
  FROM forum_users
  WHERE user_id = v_giver_user_id;

  -- Obține puterea celui care primește
  SELECT COALESCE(reputation_power, 0) INTO v_receiver_power
  FROM forum_users
  WHERE user_id = p_receiver_user_id;

  -- Validare comentariu
  v_comment_valid := (p_comment IS NOT NULL AND LENGTH(TRIM(p_comment)) >= 3);

  -- Calcul puncte finale
  IF p_points = 1 THEN
    -- LIKE
    IF v_comment_valid THEN
      -- Like cu comentariu: amplificare bazată pe putere (2-8)
      v_final_points := LEAST(1 + v_giver_power, 8);
    ELSE
      -- Like simplu: întotdeauna +1
      v_final_points := 1;
    END IF;
  ELSIF p_points = -1 THEN
    -- DISLIKE
    -- Verifică dacă poate da dislike (putere 1+ = 50+ reputație)
    IF v_giver_power < 1 THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Ai nevoie de minimum 50 puncte reputație pentru a da dislike'
      );
    END IF;

    IF v_comment_valid THEN
      -- Dislike cu comentariu: amplificare bazată pe putere (2-8)
      v_final_points := -LEAST(1 + v_giver_power, 8);
    ELSE
      -- Dislike simplu: întotdeauna -1
      v_final_points := -1;
    END IF;
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Puncte invalide. Folosește +1 pentru like sau -1 pentru dislike'
    );
  END IF;

  -- Inserează log-ul de reputație
  INSERT INTO forum_reputation_logs (
    giver_user_id,
    receiver_user_id,
    post_id,
    points,
    comment,
    giver_power,
    is_admin_award
  ) VALUES (
    v_giver_user_id,
    p_receiver_user_id,
    p_post_id,
    v_final_points,
    CASE WHEN v_comment_valid THEN TRIM(p_comment) ELSE NULL END,
    v_giver_power,
    false
  );

  -- Returnează rezultat
  RETURN json_build_object(
    'success', true,
    'points', v_final_points,
    'giver_power', v_giver_power,
    'has_comment', v_comment_valid,
    'message', CASE 
      WHEN v_comment_valid THEN 
        format('Reputație acordată: %s puncte (cu comentariu)', v_final_points)
      ELSE 
        format('Reputație acordată: %s puncte', v_final_points)
    END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Eroare la acordarea reputației: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. FUNCȚIE: Obține reputația unui post (like/dislike count)
-- =============================================

CREATE OR REPLACE FUNCTION get_post_reputation(p_post_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'post_id', p_post_id,
    'total_points', COALESCE(SUM(points), 0),
    'like_count', COUNT(*) FILTER (WHERE points > 0),
    'dislike_count', COUNT(*) FILTER (WHERE points < 0),
    'has_user_voted', EXISTS (
      SELECT 1 FROM forum_reputation_logs
      WHERE post_id = p_post_id
        AND giver_user_id = auth.uid()
    ),
    'user_vote', (
      SELECT json_build_object(
        'points', points,
        'comment', comment,
        'created_at', created_at
      )
      FROM forum_reputation_logs
      WHERE post_id = p_post_id
        AND giver_user_id = auth.uid()
      LIMIT 1
    )
  ) INTO v_result
  FROM forum_reputation_logs
  WHERE post_id = p_post_id;

  RETURN COALESCE(v_result, json_build_object(
    'post_id', p_post_id,
    'total_points', 0,
    'like_count', 0,
    'dislike_count', 0,
    'has_user_voted', false,
    'user_vote', NULL
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. FUNCȚIE: Șterge reputația acordată (doar dacă e a ta)
-- =============================================

CREATE OR REPLACE FUNCTION remove_reputation(p_post_id UUID)
RETURNS JSON AS $$
DECLARE
  v_giver_user_id UUID;
  v_existing_log forum_reputation_logs%ROWTYPE;
BEGIN
  v_giver_user_id := auth.uid();
  IF v_giver_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Trebuie să fii autentificat'
    );
  END IF;

  -- Găsește log-ul existent
  SELECT * INTO v_existing_log
  FROM forum_reputation_logs
  WHERE post_id = p_post_id
    AND giver_user_id = v_giver_user_id
  LIMIT 1;

  IF v_existing_log IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Nu ai dat reputație acestui post'
    );
  END IF;

  -- Șterge log-ul (trigger-ul va actualiza automat reputation_points)
  DELETE FROM forum_reputation_logs
  WHERE id = v_existing_log.id;

  -- Actualizează manual reputation_points (pentru că trigger-ul e AFTER INSERT)
  UPDATE forum_users
  SET reputation_points = reputation_points - v_existing_log.points
  WHERE user_id = v_existing_log.receiver_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Reputație ștearsă cu succes'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Eroare la ștergerea reputației: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Comentarii
-- =============================================

COMMENT ON FUNCTION give_reputation IS 'Acordare like/dislike cu validare putere și comentariu. Like simplu = +1, Dislike simplu = -1 (doar putere 1+). Cu comentariu (3+ caractere) = amplificare bazată pe putere (2-8).';
COMMENT ON FUNCTION get_post_reputation IS 'Obține statistici reputație pentru un post (total points, like/dislike count, user vote)';
COMMENT ON FUNCTION remove_reputation IS 'Șterge reputația acordată de utilizatorul curent unui post';

