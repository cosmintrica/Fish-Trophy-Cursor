-- =============================================
-- Migration 88: Forum Settings Table
-- =============================================
-- Descriere: Tabel pentru setări globale ale forumului (ex: vizibilitatea iconurilor subcategoriilor)
-- Motiv: localStorage nu funcționează global pentru toți userii - trebuie setare în database
-- =============================================

-- Creează tabelul pentru setări forum
CREATE TABLE IF NOT EXISTS forum_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pentru căutare rapidă
CREATE INDEX IF NOT EXISTS idx_forum_settings_key ON forum_settings(setting_key);

-- RLS: Toți pot citi, doar adminii pot modifica
ALTER TABLE forum_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Toți pot citi setările
CREATE POLICY "Toți pot citi setările forum" ON forum_settings
  FOR SELECT
  USING (true);

-- Policy: Doar adminii pot modifica setările
CREATE POLICY "Doar adminii pot modifica setările forum" ON forum_settings
  FOR ALL
  USING (is_forum_admin())
  WITH CHECK (is_forum_admin());

-- Inseră setările default pentru iconuri (true = afișează iconuri)
INSERT INTO forum_settings (setting_key, setting_value, description)
VALUES 
  ('show_category_icons', 'true', 'Afișează iconurile categoriilor în listă'),
  ('show_subcategory_icons', 'true', 'Afișează iconurile subcategoriilor în listă'),
  ('show_subforum_icons', 'true', 'Afișează iconurile subforumurilor în listă')
ON CONFLICT (setting_key) DO NOTHING;

-- Trigger pentru updated_at
CREATE OR REPLACE FUNCTION update_forum_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER forum_settings_updated_at
  BEFORE UPDATE ON forum_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_forum_settings_updated_at();

-- Comentarii
COMMENT ON TABLE forum_settings IS 
'Tabel pentru setări globale ale forumului. Setările sunt partajate de toți userii.';

COMMENT ON COLUMN forum_settings.setting_key IS 
'Cheia unică a setării (ex: show_subcategory_icons)';

COMMENT ON COLUMN forum_settings.setting_value IS 
'Valoarea setării (ex: true, false, sau alt string)';

