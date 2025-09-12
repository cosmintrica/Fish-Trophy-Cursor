-- Creează tabelul subscribers pentru colectarea email-urilor de la utilizatorii interesați
CREATE TABLE IF NOT EXISTS subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
    source VARCHAR(50) DEFAULT 'construction_page',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creează index pentru performanță
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
CREATE INDEX IF NOT EXISTS idx_subscribers_subscribed_at ON subscribers(subscribed_at);

-- Creează trigger pentru actualizarea updated_at
CREATE OR REPLACE FUNCTION update_subscribers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscribers_updated_at
    BEFORE UPDATE ON subscribers
    FOR EACH ROW
    EXECUTE FUNCTION update_subscribers_updated_at();

-- Adaugă comentarii pentru documentație
COMMENT ON TABLE subscribers IS 'Tabelul pentru colectarea email-urilor de la utilizatorii interesați de site-ul în construcție';
COMMENT ON COLUMN subscribers.email IS 'Adresa de email a utilizatorului';
COMMENT ON COLUMN subscribers.subscribed_at IS 'Data și ora când utilizatorul s-a abonat';
COMMENT ON COLUMN subscribers.status IS 'Statusul abonamentului: active, unsubscribed, bounced';
COMMENT ON COLUMN subscribers.source IS 'Sursa abonamentului: construction_page, newsletter, etc.';
