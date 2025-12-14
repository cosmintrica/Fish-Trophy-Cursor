-- =============================================
-- Migration 84: Add is_important to forum_topics
-- =============================================
-- Descriere: Adăugare câmp is_important pentru topicuri importante
-- Dependințe: 06_topics_posts.sql
-- Notă: is_pinned există deja în migrația 06_topics_posts.sql
-- =============================================

-- Adăugare câmp is_important
ALTER TABLE forum_topics 
ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false;

-- Index pentru performanță
CREATE INDEX IF NOT EXISTS idx_forum_topics_important ON forum_topics(is_important, last_post_at DESC) WHERE is_deleted = false;

-- Comentarii
COMMENT ON COLUMN forum_topics.is_important IS 'Topic important - afișat cu tag distinctiv și design special';

