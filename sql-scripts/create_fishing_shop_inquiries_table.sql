-- Creează tabelul pentru mesajele de la proprietarii de magazine de pescuit
CREATE TABLE IF NOT EXISTS fishing_shop_inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT NOT NULL,
    city VARCHAR(100),
    county VARCHAR(100),
    google_maps_link TEXT,
    description TEXT,
    images TEXT[], -- Array de URL-uri pentru poze
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'contacted', 'approved', 'rejected')),
    admin_notes TEXT,
    admin_response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    responded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creează indexuri pentru performanță
CREATE INDEX IF NOT EXISTS idx_fishing_shop_inquiries_status ON fishing_shop_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_fishing_shop_inquiries_created_at ON fishing_shop_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fishing_shop_inquiries_email ON fishing_shop_inquiries(email);

-- Creează trigger pentru actualizarea updated_at
CREATE OR REPLACE FUNCTION update_fishing_shop_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fishing_shop_inquiries_updated_at
    BEFORE UPDATE ON fishing_shop_inquiries
    FOR EACH ROW
    EXECUTE FUNCTION update_fishing_shop_inquiries_updated_at();

-- RLS Policies
ALTER TABLE fishing_shop_inquiries ENABLE ROW LEVEL SECURITY;

-- Oricine poate crea un inquiry (pentru formularul public)
CREATE POLICY "Anyone can create fishing shop inquiry"
    ON fishing_shop_inquiries FOR INSERT
    WITH CHECK (true);

-- Doar adminii pot vedea toate inquiry-urile
CREATE POLICY "Admins can view all fishing shop inquiries"
    ON fishing_shop_inquiries FOR SELECT
    USING (public.is_admin(auth.uid()));

-- Doar adminii pot actualiza inquiry-urile
CREATE POLICY "Admins can update fishing shop inquiries"
    ON fishing_shop_inquiries FOR UPDATE
    USING (public.is_admin(auth.uid()));

-- Adaugă comentarii pentru documentație
COMMENT ON TABLE fishing_shop_inquiries IS 'Mesaje și cereri de la proprietarii de magazine de pescuit';
COMMENT ON COLUMN fishing_shop_inquiries.status IS 'Statusul cererii: pending, reviewed, contacted, approved, rejected';
COMMENT ON COLUMN fishing_shop_inquiries.admin_notes IS 'Note interne pentru admin';
COMMENT ON COLUMN fishing_shop_inquiries.admin_response IS 'Răspunsul admin-ului către proprietar';

