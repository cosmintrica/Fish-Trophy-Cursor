-- =============================================
-- Migration 89: Add show_icon columns to categories, subcategories, and subforums
-- =============================================
-- Descriere: Adaugă coloana show_icon pentru a permite control per item asupra afișării iconurilor
-- =============================================

-- Adaugă coloana show_icon la forum_categories
ALTER TABLE forum_categories 
ADD COLUMN IF NOT EXISTS show_icon BOOLEAN DEFAULT true;

-- Adaugă coloana show_icon la forum_subcategories
ALTER TABLE forum_subcategories 
ADD COLUMN IF NOT EXISTS show_icon BOOLEAN DEFAULT true;

-- Adaugă coloana show_icon la forum_subforums
ALTER TABLE forum_subforums 
ADD COLUMN IF NOT EXISTS show_icon BOOLEAN DEFAULT true;

-- Comentarii
COMMENT ON COLUMN forum_categories.show_icon IS 
'Dacă true, iconul categoriei va fi afișat (dacă toggle-ul global este activat)';

COMMENT ON COLUMN forum_subcategories.show_icon IS 
'Dacă true, iconul subcategoriei va fi afișat (dacă toggle-ul global este activat)';

COMMENT ON COLUMN forum_subforums.show_icon IS 
'Dacă true, iconul subforumului va fi afișat (dacă toggle-ul global este activat)';







