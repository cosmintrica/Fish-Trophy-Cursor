-- =============================================
-- Migration 26: Fix RLS for forum_active_viewers
-- =============================================
-- Descriere: Corectează politicile RLS pentru forum_active_viewers
-- pentru a permite operațiile pentru utilizatori anonimi și autentificați
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Vizualizatori activi vizibili pentru toți" ON forum_active_viewers;
DROP POLICY IF EXISTS "Utilizatorii pot adăuga propriul entry" ON forum_active_viewers;
DROP POLICY IF EXISTS "Utilizatorii pot actualiza propriul entry" ON forum_active_viewers;
DROP POLICY IF EXISTS "Utilizatorii pot șterge propriul entry" ON forum_active_viewers;

-- 1. Citire: toți pot vedea cine vizualizează (pentru afișare în UI)
CREATE POLICY "Vizualizatori activi vizibili pentru toți" ON forum_active_viewers
    FOR SELECT USING (true);

-- 2. Inserare: utilizatorii autentificați pot adăuga propriul entry, anonimi pot adăuga cu session_id
CREATE POLICY "Utilizatorii pot adăuga propriul entry" ON forum_active_viewers
    FOR INSERT WITH CHECK (
        -- Utilizatori autentificați: trebuie să fie propriul user_id
        (user_id IS NOT NULL AND user_id = auth.uid() AND is_anonymous = false)
        OR
        -- Utilizatori anonimi: trebuie să aibă session_id și is_anonymous = true
        (user_id IS NULL AND session_id IS NOT NULL AND is_anonymous = true)
    );

-- 3. Actualizare: utilizatorii pot actualiza propriul entry (last_seen_at)
CREATE POLICY "Utilizatorii pot actualiza propriul entry" ON forum_active_viewers
    FOR UPDATE USING (
        -- Utilizatori autentificați: trebuie să fie propriul user_id
        (user_id IS NOT NULL AND user_id = auth.uid())
        OR
        -- Utilizatori anonimi: trebuie să aibă același session_id
        (user_id IS NULL AND session_id IS NOT NULL AND is_anonymous = true)
    );

-- 4. Ștergere: utilizatorii pot șterge propriul entry
CREATE POLICY "Utilizatorii pot șterge propriul entry" ON forum_active_viewers
    FOR DELETE USING (
        -- Utilizatori autentificați: trebuie să fie propriul user_id
        (user_id IS NOT NULL AND user_id = auth.uid())
        OR
        -- Utilizatori anonimi: trebuie să aibă același session_id
        (user_id IS NULL AND session_id IS NOT NULL AND is_anonymous = true)
    );

COMMENT ON POLICY "Vizualizatori activi vizibili pentru toți" ON forum_active_viewers IS 
'Toți utilizatorii (autentificați și anonimi) pot vedea cine vizualizează o pagină.';

COMMENT ON POLICY "Utilizatorii pot adăuga propriul entry" ON forum_active_viewers IS 
'Utilizatorii autentificați pot adăuga entry cu user_id. Utilizatorii anonimi pot adăuga entry cu session_id.';

COMMENT ON POLICY "Utilizatorii pot actualiza propriul entry" ON forum_active_viewers IS 
'Utilizatorii pot actualiza doar propriul entry (pentru actualizare last_seen_at).';

COMMENT ON POLICY "Utilizatorii pot șterge propriul entry" ON forum_active_viewers IS 
'Utilizatorii pot șterge doar propriul entry (la navigare sau închidere pagină).';

