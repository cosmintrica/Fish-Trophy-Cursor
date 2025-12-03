-- =============================================
-- Migration 35: Fix Topic reply_count și last_post_at după ștergeri
-- =============================================
-- Descriere: Recalculează contorii topicurilor după ștergerea postărilor
-- Problema: reply_count ajunge -1 și last_post_at arată data greșită
-- Soluția: Trigger îmbunătățit + recalculare completă
-- Dependințe: 11_triggers.sql
-- =============================================

-- =============================================
-- 1. FIX TRIGGER: Actualizare last_post_at la ștergere
-- =============================================

CREATE OR REPLACE FUNCTION update_topic_reply_count()
RETURNS TRIGGER AS $$
DECLARE
  v_last_post_at TIMESTAMP;
  v_last_post_user_id UUID;
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
    -- Post șters - recalculează ultima postare activă
    SELECT 
      created_at,
      user_id
    INTO v_last_post_at, v_last_post_user_id
    FROM forum_posts
    WHERE topic_id = NEW.topic_id
      AND is_deleted = false
    ORDER BY created_at DESC
    LIMIT 1;
    
    UPDATE forum_topics 
    SET 
      reply_count = reply_count - 1,
      last_post_at = v_last_post_at,
      last_post_user_id = v_last_post_user_id
    WHERE id = NEW.topic_id;
    
    UPDATE forum_users 
    SET post_count = post_count - 1 
    WHERE user_id = NEW.user_id;
    
  ELSIF TG_OP = 'DELETE' AND NOT OLD.is_deleted THEN
    -- Post șters definitiv - recalculează ultima postare activă
    SELECT 
      created_at,
      user_id
    INTO v_last_post_at, v_last_post_user_id
    FROM forum_posts
    WHERE topic_id = OLD.topic_id
      AND is_deleted = false
    ORDER BY created_at DESC
    LIMIT 1;
    
    UPDATE forum_topics 
    SET 
      reply_count = reply_count - 1,
      last_post_at = v_last_post_at,
      last_post_user_id = v_last_post_user_id
    WHERE id = OLD.topic_id;
    
    UPDATE forum_users 
    SET post_count = post_count - 1 
    WHERE user_id = OLD.user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. RECALCULARE COMPLETĂ: Corectează toate topicurile
-- =============================================

-- Recalculează reply_count și last_post_at pentru toate topicurile
UPDATE forum_topics ft
SET 
  reply_count = (
    SELECT COUNT(*)
    FROM forum_posts fp
    WHERE fp.topic_id = ft.id
      AND fp.is_deleted = false
  ),
  last_post_at = (
    SELECT MAX(created_at)
    FROM forum_posts fp
    WHERE fp.topic_id = ft.id
      AND fp.is_deleted = false
  ),
  last_post_user_id = (
    SELECT user_id
    FROM forum_posts fp
    WHERE fp.topic_id = ft.id
      AND fp.is_deleted = false
    ORDER BY created_at DESC
    LIMIT 1
  );

-- =============================================
-- Comentarii
-- =============================================

COMMENT ON FUNCTION update_topic_reply_count IS 
'Actualizare automată reply_count, last_post_at și last_post_user_id în topic. 
Recalculează ultima postare activă când se șterge o postare.';

-- =============================================
-- VERIFICARE: Query pentru debugging
-- =============================================

-- Query pentru verificare (comentat - poate fi rulat manual)
-- SELECT 
--     ft.id,
--     ft.title,
--     ft.reply_count as stored_count,
--     (SELECT COUNT(*) FROM forum_posts WHERE topic_id = ft.id AND is_deleted = false) as actual_count,
--     ft.last_post_at as stored_last_post,
--     (SELECT MAX(created_at) FROM forum_posts WHERE topic_id = ft.id AND is_deleted = false) as actual_last_post
-- FROM forum_topics ft
-- ORDER BY ft.created_at DESC
-- LIMIT 10;
