-- =============================================
-- Migration 78: Online Users Record Tracking
-- =============================================
-- Descriere: Sistem pentru tracking recordul de utilizatori conectați simultan
-- =============================================

-- Tabel pentru recordul de utilizatori conectați simultan
CREATE TABLE IF NOT EXISTS forum_online_users_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    max_users_count INTEGER NOT NULL DEFAULT 0,
    record_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    record_time TIME NOT NULL DEFAULT CURRENT_TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: doar un singur record (cel mai mare)
    CONSTRAINT unique_record CHECK (id IS NOT NULL)
);

-- Index pentru performanță
CREATE INDEX IF NOT EXISTS idx_forum_online_users_record_date ON forum_online_users_record(record_date DESC);

-- Enable RLS
ALTER TABLE forum_online_users_record ENABLE ROW LEVEL SECURITY;

-- Politici RLS: toți pot citi, doar sistemul poate scrie
DROP POLICY IF EXISTS "Public can view online users record" ON forum_online_users_record;
CREATE POLICY "Public can view online users record" ON forum_online_users_record
    FOR SELECT USING (true);

-- Enable Realtime pentru tabel (pentru actualizări instantanee în frontend)
-- Verifică dacă tabelul nu este deja în publication (evită eroare dacă migrația a fost rulată parțial)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'forum_online_users_record'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE forum_online_users_record;
    END IF;
END $$;

-- Funcție pentru obținerea recordului curent
CREATE OR REPLACE FUNCTION get_online_users_record()
RETURNS TABLE (
    max_users_count INTEGER,
    record_date TIMESTAMP WITH TIME ZONE,
    record_time TIME,
    formatted_date TEXT,
    formatted_time TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.max_users_count,
        r.record_date,
        r.record_time,
        TO_CHAR(r.record_date, 'DD.MM.YYYY') as formatted_date,
        TO_CHAR(r.record_time, 'HH24:MI') as formatted_time
    FROM forum_online_users_record r
    ORDER BY r.max_users_count DESC, r.record_date DESC, r.record_time DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Șterge toate versiunile vechi ale funcției (dacă există) pentru a evita conflicte
DROP FUNCTION IF EXISTS update_online_users_record();
DROP FUNCTION IF EXISTS update_online_users_record(INTEGER);

-- Funcție pentru actualizarea recordului (se apelează când numărul de utilizatori online depășește recordul)
-- OPTIMIZAT: Acceptă numărul de utilizatori online ca parametru (deja calculat în frontend)
-- Asta evită COUNT-uri duplicate și face funcția mult mai eficientă
CREATE OR REPLACE FUNCTION update_online_users_record(p_online_count INTEGER DEFAULT NULL)
RETURNS void AS $$
DECLARE
    current_online_count INTEGER;
    current_record INTEGER;
    authenticated_users INTEGER;
    anonymous_users INTEGER;
BEGIN
    -- Dacă primim numărul ca parametru, folosim-l direct (mai eficient)
    IF p_online_count IS NOT NULL THEN
        current_online_count := p_online_count;
    ELSE
        -- Fallback: calculează dacă nu primim parametru (pentru compatibilitate)
        SELECT COUNT(DISTINCT user_id) INTO authenticated_users
        FROM forum_users
        WHERE last_seen_at >= NOW() - INTERVAL '5 minutes';
        
        SELECT COUNT(DISTINCT session_id) INTO anonymous_users
        FROM forum_active_viewers
        WHERE is_anonymous = true
          AND last_seen_at >= NOW() - INTERVAL '5 minutes';
        
        current_online_count := COALESCE(authenticated_users, 0) + COALESCE(anonymous_users, 0);
    END IF;
    
    -- Obține recordul curent
    SELECT COALESCE(MAX(max_users_count), 0) INTO current_record
    FROM forum_online_users_record;
    
    -- Dacă numărul curent depășește recordul, actualizează
    IF current_online_count > current_record THEN
        -- Șterge vechiul record (păstrăm doar cel mai mare)
        -- IMPORTANT: DELETE necesită WHERE clause în PostgreSQL
        DELETE FROM forum_online_users_record WHERE id IS NOT NULL;
        
        -- Inserează noul record cu data și ora curentă
        -- IMPORTANT: Folosim NOW() pentru ambele pentru a asigura sincronizarea perfectă
        -- record_time trebuie să fie sincronizat cu record_date
        INSERT INTO forum_online_users_record (max_users_count, record_date, record_time)
        VALUES (
            current_online_count, 
            NOW(), 
            (NOW() AT TIME ZONE 'Europe/Bucharest')::TIME  -- Extrage ora din timestamp-ul curent (timezone România)
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pentru actualizare automată updated_at
CREATE OR REPLACE FUNCTION update_forum_online_users_record_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_forum_online_users_record_updated_at ON forum_online_users_record;
CREATE TRIGGER trigger_update_forum_online_users_record_updated_at
    BEFORE UPDATE ON forum_online_users_record
    FOR EACH ROW
    EXECUTE FUNCTION update_forum_online_users_record_updated_at();

-- NOTĂ: Trigger-ul a fost ELIMINAT pentru performanță
-- Problema: Trigger-ul se declanșează la fiecare actualizare a last_seen_at (la fiecare 2 minute per user)
-- Dacă ai 100 utilizatori online = 100 trigger-uri la fiecare 2 minute = 50 trigger-uri/minut
-- Soluție: Job periodic centralizat (la fiecare 1-2 minute) care verifică o singură dată
-- 
-- Job-ul periodic se poate configura prin:
-- 1. Edge Function + GitHub Actions (recomandat - vezi .github/workflows/)
-- 2. Supabase Edge Function + Cron (dacă e disponibil)
-- 3. External cron service (cron-job.org, etc.)
--
-- Funcția update_online_users_record() se apelează periodic, nu la fiecare user update

-- Inițializare: inserează un record inițial dacă nu există și actualizează cu valoarea curentă
-- Folosește funcția optimizată care include și utilizatorii anonimi
-- IMPORTANT: Apelează explicit cu NULL pentru a folosi fallback-ul (calculează automat)
DO $$
BEGIN
    -- Apelează funcția de actualizare pentru inițializare cu NULL (folosește fallback)
    PERFORM update_online_users_record(NULL);
END $$;

-- Comentarii
COMMENT ON TABLE forum_online_users_record IS 'Recordul de utilizatori conectați simultan pe forum';
COMMENT ON COLUMN forum_online_users_record.max_users_count IS 'Numărul maxim de utilizatori conectați simultan';
COMMENT ON COLUMN forum_online_users_record.record_date IS 'Data când s-a atins recordul';
COMMENT ON COLUMN forum_online_users_record.record_time IS 'Ora când s-a atins recordul';
COMMENT ON FUNCTION get_online_users_record IS 'Returnează recordul curent de utilizatori conectați simultan';
COMMENT ON FUNCTION update_online_users_record IS 'Actualizează recordul dacă numărul curent de utilizatori online depășește recordul existent';

