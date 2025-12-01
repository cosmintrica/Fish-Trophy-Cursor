-- =============================================
-- Migration 22: Active Viewers System
-- =============================================
-- Descriere: Sistem pentru tracking utilizatori care vizualizează topicuri/categorii în timp real
-- Folosește Supabase Realtime pentru sincronizare instantanee
-- =============================================

CREATE TABLE forum_active_viewers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
    category_id UUID REFERENCES forum_categories(id) ON DELETE CASCADE,
    subcategory_id UUID REFERENCES forum_subcategories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR(255), -- Pentru utilizatori anonimi
    is_anonymous BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: trebuie să fie setat cel puțin unul dintre topic_id, category_id, subcategory_id
    CONSTRAINT check_viewer_target CHECK (
        (topic_id IS NOT NULL) OR 
        (category_id IS NOT NULL) OR 
        (subcategory_id IS NOT NULL)
    ),
    
    -- Constraint: utilizatorii autentificați nu pot fi anonimi
    CONSTRAINT check_anonymous_user CHECK (
        (user_id IS NULL AND is_anonymous = true) OR
        (user_id IS NOT NULL AND is_anonymous = false)
    )
);

-- Indexuri pentru performanță
CREATE INDEX idx_forum_active_viewers_topic ON forum_active_viewers(topic_id) WHERE topic_id IS NOT NULL;
CREATE INDEX idx_forum_active_viewers_category ON forum_active_viewers(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_forum_active_viewers_subcategory ON forum_active_viewers(subcategory_id) WHERE subcategory_id IS NOT NULL;
CREATE INDEX idx_forum_active_viewers_user ON forum_active_viewers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_forum_active_viewers_session ON forum_active_viewers(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_forum_active_viewers_last_seen ON forum_active_viewers(last_seen_at);

-- Enable RLS
ALTER TABLE forum_active_viewers ENABLE ROW LEVEL SECURITY;

-- Politici RLS

-- 1. Citire: toți pot vedea cine vizualizează (pentru afișare în UI)
CREATE POLICY "Vizualizatori activi vizibili pentru toți" ON forum_active_viewers
    FOR SELECT USING (true);

-- 2. Inserare: utilizatorii pot adăuga propriul entry
CREATE POLICY "Utilizatorii pot adăuga propriul entry" ON forum_active_viewers
    FOR INSERT WITH CHECK (
        (user_id IS NULL AND is_anonymous = true) OR
        (user_id = auth.uid())
    );

-- 3. Actualizare: utilizatorii pot actualiza propriul entry (last_seen_at)
CREATE POLICY "Utilizatorii pot actualiza propriul entry" ON forum_active_viewers
    FOR UPDATE USING (
        (user_id IS NULL AND session_id IS NOT NULL) OR
        (user_id = auth.uid())
    );

-- 4. Ștergere: utilizatorii pot șterge propriul entry
CREATE POLICY "Utilizatorii pot șterge propriul entry" ON forum_active_viewers
    FOR DELETE USING (
        (user_id IS NULL AND session_id IS NOT NULL) OR
        (user_id = auth.uid())
    );

-- Funcție pentru cleanup automat al intrărilor expirate (mai vechi de 2 minute)
CREATE OR REPLACE FUNCTION cleanup_expired_viewers()
RETURNS void AS $$
BEGIN
    DELETE FROM forum_active_viewers
    WHERE last_seen_at < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pentru cleanup automat la fiecare query (opțional, dar mai eficient)
-- Cleanup-ul se face automat înainte de fiecare SELECT
CREATE OR REPLACE FUNCTION auto_cleanup_viewers()
RETURNS TRIGGER AS $$
BEGIN
    -- Șterge automat intrările expirate (mai vechi de 2 minute)
    DELETE FROM forum_active_viewers
    WHERE last_seen_at < NOW() - INTERVAL '2 minutes';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger care se declanșează înainte de SELECT (folosind event trigger sau funcție helper)
-- Notă: PostgreSQL nu suportă trigger pe SELECT direct, deci cleanup-ul se face în funcția helper

-- Funcție helper pentru SELECT cu cleanup automat
CREATE OR REPLACE FUNCTION get_active_viewers(p_topic_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    session_id VARCHAR,
    is_anonymous BOOLEAN,
    joined_at TIMESTAMP WITH TIME ZONE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    username VARCHAR,
    rank VARCHAR,
    avatar_url TEXT
) AS $$
BEGIN
    -- Cleanup automat înainte de query
    DELETE FROM forum_active_viewers
    WHERE last_seen_at < NOW() - INTERVAL '2 minutes';
    
    -- Returnează viewer-ii activi
    RETURN QUERY
    SELECT 
        av.id,
        av.user_id,
        av.session_id,
        av.is_anonymous,
        av.joined_at,
        av.last_seen_at,
        fu.username,
        fu.rank,
        fu.avatar_url
    FROM forum_active_viewers av
    LEFT JOIN forum_users fu ON av.user_id = fu.user_id
    WHERE av.topic_id = p_topic_id
        AND av.last_seen_at >= NOW() - INTERVAL '2 minutes'
    ORDER BY av.last_seen_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarii
COMMENT ON TABLE forum_active_viewers IS 'Tracking utilizatori care vizualizează topicuri/categorii în timp real. Folosește Supabase Realtime pentru sincronizare.';
COMMENT ON COLUMN forum_active_viewers.session_id IS 'ID de sesiune pentru utilizatori anonimi (generat în browser).';
COMMENT ON COLUMN forum_active_viewers.last_seen_at IS 'Ultima dată când utilizatorul a fost activ. Intrările mai vechi de 2 minute sunt considerate expirate și șterse automat.';
COMMENT ON FUNCTION get_active_viewers IS 'Returnează viewer-ii activi pentru un topic, cu cleanup automat al intrărilor expirate.';
COMMENT ON COLUMN forum_active_viewers.joined_at IS 'Data când utilizatorul a început să vizualizeze.';
COMMENT ON FUNCTION cleanup_expired_viewers IS 'Șterge automat intrările expirate (mai vechi de 5 minute). Poate fi apelată periodic sau la cerere.';

-- Enable Realtime pentru tabel
ALTER PUBLICATION supabase_realtime ADD TABLE forum_active_viewers;

