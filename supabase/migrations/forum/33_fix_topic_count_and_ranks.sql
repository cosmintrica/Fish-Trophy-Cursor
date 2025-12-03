-- =============================================
-- Migration 33: Fix Topic Count Tracking și Ranguri Invalide
-- =============================================
-- Descriere: Adaugă trigger pentru actualizare topic_count și curăță ranguri invalide
-- Problema 1: topic_count nu se actualizează automat (lipsește trigger)
-- Problema 2: Rangul "founder" nu este oficial și trebuie înlocuit
-- Dependințe: 11_triggers.sql
-- =============================================

-- =============================================
-- 1. TRIGGER: Actualizare topic_count utilizator
-- =============================================

CREATE OR REPLACE FUNCTION update_user_topic_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT NEW.is_deleted THEN
    -- Topic nou creat
    UPDATE forum_users 
    SET topic_count = topic_count + 1 
    WHERE user_id = NEW.user_id;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
    -- Topic șters (soft delete)
    UPDATE forum_users 
    SET topic_count = topic_count - 1 
    WHERE user_id = NEW.user_id;
    
  ELSIF TG_OP = 'DELETE' AND NOT OLD.is_deleted THEN
    -- Topic șters definitiv
    UPDATE forum_users 
    SET topic_count = topic_count - 1 
    WHERE user_id = OLD.user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_topic_count
  AFTER INSERT OR UPDATE OR DELETE ON forum_topics
  FOR EACH ROW EXECUTE FUNCTION update_user_topic_count();

-- =============================================
-- 2. FIX: Recalculează topic_count pentru toți utilizatorii
-- =============================================

-- Actualizează topic_count bazat pe topicurile reale (non-șterse)
UPDATE forum_users fu
SET topic_count = (
    SELECT COUNT(*)
    FROM forum_topics ft
    WHERE ft.user_id = fu.user_id
      AND ft.is_deleted = false
);

-- =============================================
-- 3. FIX: Recalculează post_count pentru toți utilizatorii
-- =============================================

-- Actualizează post_count bazat pe postările reale (non-șterse)
UPDATE forum_users fu
SET post_count = (
    SELECT COUNT(*)
    FROM forum_posts fp
    WHERE fp.user_id = fu.user_id
      AND fp.is_deleted = false
);

-- =============================================
-- 4. FIX: Curăță ranguri invalide (ex: "founder")
-- =============================================

-- Resetează toate rangurile la valoarea corectă bazată pe post_count
-- Trigger-ul calculate_user_rank() va fi apelat automat la UPDATE
UPDATE forum_users
SET rank = CASE
    WHEN post_count >= 5001 THEN 'legenda_apelor'
    WHEN post_count >= 1001 THEN 'maestru_pescar'
    WHEN post_count >= 501 THEN 'crap_senior'
    WHEN post_count >= 101 THEN 'crap_junior'
    WHEN post_count >= 51 THEN 'pui_de_crap'
    WHEN post_count >= 11 THEN 'puiet'
    ELSE 'ou_de_peste'
END
WHERE rank NOT IN ('ou_de_peste', 'puiet', 'pui_de_crap', 'crap_junior', 'crap_senior', 'maestru_pescar', 'legenda_apelor');

-- =============================================
-- 5. VERIFICARE: Afișează statistici utilizatori
-- =============================================

-- Query pentru verificare (comentat - poate fi rulat manual)
-- SELECT 
--     user_id,
--     username,
--     post_count,
--     topic_count,
--     rank,
--     reputation_points
-- FROM forum_users
-- ORDER BY post_count DESC
-- LIMIT 10;

-- =============================================
-- Comentarii
-- =============================================

COMMENT ON FUNCTION update_user_topic_count IS 
'Actualizare automată topic_count în forum_users când se creează/șterge un topic';

COMMENT ON TRIGGER trigger_update_user_topic_count ON forum_topics IS 
'Trigger pentru actualizare automată a contoarelor de topicuri în profilul utilizatorului';
