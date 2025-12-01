-- =============================================
-- Migration 11: Triggers și Funcții Automate
-- =============================================
-- Descriere: Trigger-e pentru actualizări automate
-- Dependințe: 04_users.sql, 06_topics_posts.sql, 07_reputation.sql
-- =============================================

-- =============================================
-- 1. TRIGGER: Actualizare updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_forum_categories_updated_at 
  BEFORE UPDATE ON forum_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_subforums_updated_at 
  BEFORE UPDATE ON forum_subforums
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_subcategories_updated_at 
  BEFORE UPDATE ON forum_subcategories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_users_updated_at 
  BEFORE UPDATE ON forum_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_topics_updated_at 
  BEFORE UPDATE ON forum_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_roles_updated_at 
  BEFORE UPDATE ON forum_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 2. TRIGGER: Actualizare contor postări în topic
-- =============================================

CREATE OR REPLACE FUNCTION update_topic_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT NEW.is_deleted THEN
    -- Nou post adăugat
    UPDATE forum_topics 
    SET 
      reply_count = reply_count + 1,
      last_post_at = NEW.created_at,
      last_post_user_id = NEW.user_id
    WHERE id = NEW.topic_id;
    
    -- Actualizează contorul utilizatorului
    UPDATE forum_users 
    SET post_count = post_count + 1 
    WHERE user_id = NEW.user_id;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
    -- Post șters
    UPDATE forum_topics 
    SET reply_count = reply_count - 1 
    WHERE id = NEW.topic_id;
    
    UPDATE forum_users 
    SET post_count = post_count - 1 
    WHERE user_id = NEW.user_id;
    
  ELSIF TG_OP = 'DELETE' AND NOT OLD.is_deleted THEN
    -- Post șters definitiv
    UPDATE forum_topics 
    SET reply_count = reply_count - 1 
    WHERE id = OLD.topic_id;
    
    UPDATE forum_users 
    SET post_count = post_count - 1 
    WHERE user_id = OLD.user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_topic_reply_count
  AFTER INSERT OR UPDATE OR DELETE ON forum_posts
  FOR EACH ROW EXECUTE FUNCTION update_topic_reply_count();

-- =============================================
-- 3. TRIGGER: Calcul automat putere reputație (0-7)
-- =============================================

CREATE OR REPLACE FUNCTION calculate_reputation_power()
RETURNS TRIGGER AS $$
BEGIN
  NEW.reputation_power = CASE
    WHEN NEW.reputation_points < 50 THEN 0
    WHEN NEW.reputation_points < 200 THEN 1
    WHEN NEW.reputation_points < 500 THEN 2
    WHEN NEW.reputation_points < 1000 THEN 3
    WHEN NEW.reputation_points < 2500 THEN 4
    WHEN NEW.reputation_points < 5000 THEN 5
    WHEN NEW.reputation_points < 10000 THEN 6
    ELSE 7
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_reputation_power
  BEFORE INSERT OR UPDATE OF reputation_points ON forum_users
  FOR EACH ROW EXECUTE FUNCTION calculate_reputation_power();

-- =============================================
-- 4. TRIGGER: Calcul automat rang (bazat pe post_count)
-- =============================================

CREATE OR REPLACE FUNCTION calculate_user_rank()
RETURNS TRIGGER AS $$
BEGIN
  NEW.rank = CASE
    WHEN NEW.post_count >= 5001 THEN 'legenda_apelor'
    WHEN NEW.post_count >= 1001 THEN 'maestru_pescar'
    WHEN NEW.post_count >= 501 THEN 'crap_senior'
    WHEN NEW.post_count >= 101 THEN 'crap_junior'
    WHEN NEW.post_count >= 51 THEN 'pui_de_crap'
    WHEN NEW.post_count >= 11 THEN 'puiet'
    ELSE 'ou_de_peste'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_user_rank
  BEFORE INSERT OR UPDATE OF post_count ON forum_users
  FOR EACH ROW EXECUTE FUNCTION calculate_user_rank();

-- =============================================
-- 5. TRIGGER: Full-text search vector update
-- =============================================

CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('romanian', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_search_vector
  BEFORE INSERT OR UPDATE OF content ON forum_posts
  FOR EACH ROW EXECUTE FUNCTION update_post_search_vector();

-- =============================================
-- 6. TRIGGER: Actualizare reputație utilizator la acordare
-- =============================================

CREATE OR REPLACE FUNCTION update_user_reputation_on_award()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizează reputația utilizatorului care primește
  UPDATE forum_users
  SET reputation_points = reputation_points + NEW.points
  WHERE user_id = NEW.receiver_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_reputation_on_award
  AFTER INSERT ON forum_reputation_logs
  FOR EACH ROW EXECUTE FUNCTION update_user_reputation_on_award();

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON FUNCTION update_updated_at_column IS 'Actualizare automată coloană updated_at la modificare';
COMMENT ON FUNCTION update_topic_reply_count IS 'Actualizare automată reply_count în topic și post_count în user';
COMMENT ON FUNCTION calculate_reputation_power IS 'Calcul automat putere reputație (0-7) bazat pe reputation_points';
COMMENT ON FUNCTION calculate_user_rank IS 'Calcul automat rang utilizator bazat pe post_count';
COMMENT ON FUNCTION update_post_search_vector IS 'Actualizare automată search_vector pentru full-text search';
COMMENT ON FUNCTION update_user_reputation_on_award IS 'Actualizare automată reputation_points la acordare like/dislike';
