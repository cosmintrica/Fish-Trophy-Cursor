-- =============================================
-- Migration 30: Adaugă coloana is_edited la forum_posts
-- =============================================
-- Descriere: Adaugă coloana is_edited pentru a marca postările editate
-- Dependințe: 06_topics_posts.sql, 28_add_delete_edit_reasons.sql
-- =============================================

-- Adăugă coloana is_edited
ALTER TABLE forum_posts 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

-- Setează is_edited = true pentru postările care au edited_at setat
UPDATE forum_posts
SET is_edited = true
WHERE edited_at IS NOT NULL;

-- Index pentru performanță
CREATE INDEX IF NOT EXISTS idx_forum_posts_is_edited ON forum_posts(is_edited) WHERE is_edited = true;

-- Comentariu
COMMENT ON COLUMN forum_posts.is_edited IS 'True dacă postarea a fost editată (edited_at IS NOT NULL)';

