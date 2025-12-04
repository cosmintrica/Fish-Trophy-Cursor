-- =============================================
-- Migration 36: Forum Topic Reads Tracking
-- =============================================
-- Descriere: Sistem pentru tracking citire topicuri - detectare mesaje necitite
-- Dependințe: 06_topics_posts.sql, 04_users.sql
-- =============================================

-- Tabelă pentru tracking citire topicuri
CREATE TABLE IF NOT EXISTS forum_topic_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_post_id UUID REFERENCES forum_posts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Un user poate avea doar o înregistrare per topic
    UNIQUE(user_id, topic_id)
);

-- Indexuri pentru performanță
CREATE INDEX IF NOT EXISTS idx_forum_topic_reads_user ON forum_topic_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_topic_reads_topic ON forum_topic_reads(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_topic_reads_user_topic ON forum_topic_reads(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_topic_reads_last_read ON forum_topic_reads(last_read_at DESC);

-- Trigger pentru actualizare automată updated_at
CREATE OR REPLACE FUNCTION update_forum_topic_reads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_forum_topic_reads_updated_at ON forum_topic_reads;
CREATE TRIGGER trigger_update_forum_topic_reads_updated_at
    BEFORE UPDATE ON forum_topic_reads
    FOR EACH ROW
    EXECUTE FUNCTION update_forum_topic_reads_updated_at();

-- Funcție helper pentru a marca un topic ca citit
CREATE OR REPLACE FUNCTION mark_topic_as_read(p_user_id UUID, p_topic_id UUID, p_post_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
    INSERT INTO forum_topic_reads (user_id, topic_id, last_read_at, last_read_post_id)
    VALUES (p_user_id, p_topic_id, NOW(), p_post_id)
    ON CONFLICT (user_id, topic_id)
    DO UPDATE SET
        last_read_at = NOW(),
        last_read_post_id = COALESCE(p_post_id, forum_topic_reads.last_read_post_id),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funcție helper pentru a verifica dacă un topic are mesaje necitite
CREATE OR REPLACE FUNCTION has_unread_posts(p_user_id UUID, p_topic_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_last_read_at TIMESTAMP WITH TIME ZONE;
    v_last_post_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Obține ultima dată când user-ul a citit topicul
    SELECT last_read_at INTO v_last_read_at
    FROM forum_topic_reads
    WHERE user_id = p_user_id AND topic_id = p_topic_id;
    
    -- Obține ultima dată a ultimei postări din topic
    SELECT last_post_at INTO v_last_post_at
    FROM forum_topics
    WHERE id = p_topic_id AND is_deleted = false;
    
    -- Dacă nu a citit niciodată sau ultima postare este mai recentă decât citirea
    RETURN v_last_read_at IS NULL OR (v_last_post_at IS NOT NULL AND v_last_post_at > v_last_read_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE forum_topic_reads ENABLE ROW LEVEL SECURITY;

-- Policy: Utilizatorii pot vedea doar propriile citiri
DROP POLICY IF EXISTS "Users can view own topic reads" ON forum_topic_reads;
CREATE POLICY "Users can view own topic reads"
    ON forum_topic_reads
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Utilizatorii pot crea/actualiza doar propriile citiri
DROP POLICY IF EXISTS "Users can insert own topic reads" ON forum_topic_reads;
CREATE POLICY "Users can insert own topic reads"
    ON forum_topic_reads
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own topic reads" ON forum_topic_reads;
CREATE POLICY "Users can update own topic reads"
    ON forum_topic_reads
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Funcție helper pentru a verifica dacă o subcategorie are topicuri cu mesaje necitite
CREATE OR REPLACE FUNCTION has_unread_topics_in_subcategory(p_user_id UUID, p_subcategory_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verifică dacă există cel puțin un topic cu mesaje necitite în subcategorie
    RETURN EXISTS (
        SELECT 1
        FROM forum_topics ft
        LEFT JOIN forum_topic_reads ftr ON ft.id = ftr.topic_id AND ftr.user_id = p_user_id
        WHERE ft.subcategory_id = p_subcategory_id
          AND ft.is_deleted = false
          AND (ftr.last_read_at IS NULL OR ft.last_post_at > ftr.last_read_at)
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarii
COMMENT ON TABLE forum_topic_reads IS 'Tracking pentru citirea topicurilor - permite detectarea mesajelor necitite';
COMMENT ON COLUMN forum_topic_reads.last_read_at IS 'Ultima dată când user-ul a vizualizat topicul';
COMMENT ON COLUMN forum_topic_reads.last_read_post_id IS 'ID-ul ultimei postări citite';
COMMENT ON FUNCTION has_unread_posts IS 'Verifică dacă un topic are mesaje necitite pentru un user specific';
COMMENT ON FUNCTION has_unread_topics_in_subcategory IS 'Verifică dacă o subcategorie are cel puțin un topic cu mesaje necitite pentru un user specific';

