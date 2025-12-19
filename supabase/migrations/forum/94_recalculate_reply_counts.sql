-- =============================================
-- Migration 94: Bulletproof reply_count Sync
-- =============================================
-- Descriere: 
--   1. Recalculează reply_count pentru toate topicurile (fix retroactiv)
--   2. Actualizează trigger-ul să gestioneze și "undelete" (is_deleted: true → false)
-- =============================================

-- =============================================
-- 1. TRIGGER BULLETPROOF: Toate cazurile posibile
-- =============================================

CREATE OR REPLACE FUNCTION update_topic_reply_count()
RETURNS TRIGGER AS $$
DECLARE
  v_last_post_at TIMESTAMP;
  v_last_post_user_id UUID;
BEGIN
  -- CASE 1: INSERT - Post nou adăugat (și nu e șters)
  IF TG_OP = 'INSERT' AND NOT NEW.is_deleted THEN
    UPDATE forum_topics 
    SET 
      reply_count = reply_count + 1,
      last_post_at = NEW.created_at,
      last_post_user_id = NEW.user_id
    WHERE id = NEW.topic_id;
    
    UPDATE forum_users 
    SET post_count = post_count + 1 
    WHERE user_id = NEW.user_id;
    
  -- CASE 2: SOFT DELETE - Post marcat ca șters (is_deleted: false → true)
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
    -- Recalculează ultima postare activă
    SELECT created_at, user_id
    INTO v_last_post_at, v_last_post_user_id
    FROM forum_posts
    WHERE topic_id = NEW.topic_id AND is_deleted = false
    ORDER BY created_at DESC
    LIMIT 1;
    
    UPDATE forum_topics 
    SET 
      reply_count = GREATEST(0, reply_count - 1),  -- Prevent negative
      last_post_at = v_last_post_at,
      last_post_user_id = v_last_post_user_id
    WHERE id = NEW.topic_id;
    
    UPDATE forum_users 
    SET post_count = GREATEST(0, post_count - 1)  -- Prevent negative
    WHERE user_id = NEW.user_id;
    
  -- CASE 3: UNDELETE - Post restaurat (is_deleted: true → false) ✨ NEW!
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = true AND NEW.is_deleted = false THEN
    UPDATE forum_topics 
    SET 
      reply_count = reply_count + 1,
      -- Actualizează last_post_at doar dacă acest post e mai nou
      last_post_at = GREATEST(COALESCE(last_post_at, NEW.created_at), NEW.created_at),
      last_post_user_id = CASE 
        WHEN NEW.created_at >= COALESCE(last_post_at, '1970-01-01') THEN NEW.user_id 
        ELSE last_post_user_id 
      END
    WHERE id = NEW.topic_id;
    
    UPDATE forum_users 
    SET post_count = post_count + 1 
    WHERE user_id = NEW.user_id;
    
  -- CASE 4: HARD DELETE - Post șters permanent din DB
  ELSIF TG_OP = 'DELETE' AND NOT OLD.is_deleted THEN
    -- Recalculează ultima postare activă
    SELECT created_at, user_id
    INTO v_last_post_at, v_last_post_user_id
    FROM forum_posts
    WHERE topic_id = OLD.topic_id AND is_deleted = false
    ORDER BY created_at DESC
    LIMIT 1;
    
    UPDATE forum_topics 
    SET 
      reply_count = GREATEST(0, reply_count - 1),  -- Prevent negative
      last_post_at = v_last_post_at,
      last_post_user_id = v_last_post_user_id
    WHERE id = OLD.topic_id;
    
    UPDATE forum_users 
    SET post_count = GREATEST(0, post_count - 1)  -- Prevent negative
    WHERE user_id = OLD.user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. RECALCULARE COMPLETĂ: Fix retroactiv
-- =============================================

-- Recalculează reply_count pentru TOATE topicurile
-- Nota: reply_count = total_posts - 1 (primul post nu e răspuns)
UPDATE forum_topics t
SET reply_count = GREATEST(0, (
    SELECT COUNT(*) - 1
    FROM forum_posts p
    WHERE p.topic_id = t.id 
      AND p.is_deleted = false
))
WHERE t.is_deleted = false;

-- Fix last_post_at și last_post_user_id
UPDATE forum_topics ft
SET 
  last_post_at = (
    SELECT MAX(created_at)
    FROM forum_posts fp
    WHERE fp.topic_id = ft.id AND fp.is_deleted = false
  ),
  last_post_user_id = (
    SELECT user_id
    FROM forum_posts fp
    WHERE fp.topic_id = ft.id AND fp.is_deleted = false
    ORDER BY created_at DESC
    LIMIT 1
  )
WHERE ft.is_deleted = false;

-- =============================================
-- 3. DOCUMENTAȚIE
-- =============================================

COMMENT ON FUNCTION update_topic_reply_count IS 
'Trigger bulletproof pentru sincronizare reply_count, last_post_at și last_post_user_id.
Gestionează toate cazurile:
- INSERT: post nou
- UPDATE is_deleted false→true: soft delete
- UPDATE is_deleted true→false: undelete/restore ✨
- DELETE: hard delete
Folosește GREATEST(0, ...) pentru a preveni valori negative.';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 94: Bulletproof trigger applied + reply_count recalculated';
END $$;

