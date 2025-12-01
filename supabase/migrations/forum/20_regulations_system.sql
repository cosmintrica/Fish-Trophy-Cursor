-- =============================================
-- Migration 20: Complex Regulations System
-- =============================================
-- Descriere: Sistem de regulamente modulare (Global + Per Categorie/Subcategorie)
-- cu suport pentru versiuni, link-uri și regulamente temporare
-- Dependințe: 18_fix_rls_recursion.sql (pentru is_forum_admin)
-- =============================================

CREATE TABLE forum_regulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ierarhie: NULL = Global, category_id = Per Categorie, subcategory_id = Per Subcategorie
    category_id UUID REFERENCES forum_categories(id) ON DELETE CASCADE,
    subcategory_id UUID REFERENCES forum_subcategories(id) ON DELETE CASCADE,
    
    -- Conținut
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- Markdown content
    section_key VARCHAR(100), -- Cheie pentru link-uri directe (ex: 'piața-pescarului', 'raportare-braconaj')
    
    -- Organizare
    sort_order INTEGER DEFAULT 0,
    parent_section_id UUID REFERENCES forum_regulations(id) ON DELETE SET NULL, -- Pentru sub-secțiuni
    
    -- Status și versiuni
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1, -- Versiunea regulamentului (pentru istoric)
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL = permanent, NOT NULL = temporar
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id), -- Cine a creat/actualizat
    last_updated_by UUID REFERENCES auth.users(id), -- Ultimul care a actualizat
    
    -- Constraint: category_id și subcategory_id nu pot fi ambele setate
    CONSTRAINT check_category_hierarchy CHECK (
        (category_id IS NULL AND subcategory_id IS NULL) OR -- Global
        (category_id IS NOT NULL AND subcategory_id IS NULL) OR -- Per categorie
        (category_id IS NULL AND subcategory_id IS NOT NULL) -- Per subcategorie (subcategory_id include category_id prin FK)
    )
);

-- Indexuri pentru performanță
CREATE INDEX idx_forum_regulations_category ON forum_regulations(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_forum_regulations_subcategory ON forum_regulations(subcategory_id) WHERE subcategory_id IS NOT NULL;
CREATE INDEX idx_forum_regulations_section_key ON forum_regulations(section_key) WHERE section_key IS NOT NULL;
CREATE INDEX idx_forum_regulations_active ON forum_regulations(is_active, expires_at) WHERE is_active = true;
CREATE INDEX idx_forum_regulations_global ON forum_regulations(sort_order) WHERE category_id IS NULL AND subcategory_id IS NULL AND is_active = true;

-- Enable RLS
ALTER TABLE forum_regulations ENABLE ROW LEVEL SECURITY;

-- Politici RLS

-- 1. Citire publică (doar cele active și neexpirate)
CREATE POLICY "Regulamente active vizibile pentru toți" ON forum_regulations
    FOR SELECT USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > NOW())
);

-- 2. Administrare completă pentru admini
CREATE POLICY "Adminii pot gestiona regulamente" ON forum_regulations
    FOR ALL USING (is_forum_admin());

-- Trigger pentru updated_at
CREATE TRIGGER update_forum_regulations_updated_at
    BEFORE UPDATE ON forum_regulations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pentru version increment
CREATE OR REPLACE FUNCTION increment_regulation_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Incrementăm versiunea doar dacă conținutul sau titlul s-a schimbat
    IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
        NEW.version = OLD.version + 1;
        NEW.last_updated_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER increment_forum_regulations_version
    BEFORE UPDATE ON forum_regulations
    FOR EACH ROW EXECUTE FUNCTION increment_regulation_version();

-- Trigger pentru created_by
CREATE OR REPLACE FUNCTION set_regulation_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    IF NEW.last_updated_by IS NULL THEN
        NEW.last_updated_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_forum_regulations_created_by
    BEFORE INSERT ON forum_regulations
    FOR EACH ROW EXECUTE FUNCTION set_regulation_created_by();

-- Funcție helper pentru obținerea regulamentelor (global + categorie + subcategorie)
CREATE OR REPLACE FUNCTION get_regulations_for_category(
    p_category_id UUID DEFAULT NULL,
    p_subcategory_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    category_id UUID,
    subcategory_id UUID,
    title VARCHAR,
    content TEXT,
    section_key VARCHAR,
    sort_order INTEGER,
    version INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.category_id,
        r.subcategory_id,
        r.title,
        r.content,
        r.section_key,
        r.sort_order,
        r.version
    FROM forum_regulations r
    WHERE r.is_active = true
        AND (r.expires_at IS NULL OR r.expires_at > NOW())
        AND (
            -- Regulamente globale
            (r.category_id IS NULL AND r.subcategory_id IS NULL)
            -- Regulamente pentru categorie
            OR (p_category_id IS NOT NULL AND r.category_id = p_category_id AND r.subcategory_id IS NULL)
            -- Regulamente pentru subcategorie
            OR (p_subcategory_id IS NOT NULL AND r.subcategory_id = p_subcategory_id)
        )
    ORDER BY r.sort_order ASC, r.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarii
COMMENT ON TABLE forum_regulations IS 'Sistem de regulamente modulare. category_id NULL = global, category_id setat = per categorie, subcategory_id setat = per subcategorie.';
COMMENT ON COLUMN forum_regulations.content IS 'Conținutul secțiunii în format Markdown.';
COMMENT ON COLUMN forum_regulations.section_key IS 'Cheie unică pentru link-uri directe (ex: "piata-pescarului", "raportare-braconaj").';
COMMENT ON COLUMN forum_regulations.parent_section_id IS 'Pentru sub-secțiuni (ex: "2.1 Cine Poate Vinde?" sub "SECȚIUNEA 2: REGULI PIAȚĂ").';
COMMENT ON COLUMN forum_regulations.version IS 'Versiunea regulamentului (incrementată automat la modificare conținut).';
COMMENT ON COLUMN forum_regulations.expires_at IS 'NULL = permanent, NOT NULL = regulament temporar care expiră la această dată.';
COMMENT ON FUNCTION get_regulations_for_category IS 'Returnează regulamentele relevante pentru o categorie/subcategorie (include și globale).';
