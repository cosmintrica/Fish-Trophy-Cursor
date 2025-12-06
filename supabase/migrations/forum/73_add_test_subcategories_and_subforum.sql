-- =============================================
-- Migration 73: Add Test Subcategories and Subforum
-- =============================================
-- Descriere: Adaugă subcategorii noi în "Competiții și Concursuri" și un subforum în "Pescuit cu Muscă"
-- =============================================

-- 1. Adaugă subcategorii noi în "Competiții și Concursuri" (idempotent)
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order, slug)
SELECT 
  id, 
  'Calendar Evenimente', 
  'Calendar complet cu toate evenimentele și competițiile de pescuit', 
  '📅', 
  4,
  'calendar-evenimente'
FROM forum_categories 
WHERE name = 'Competiții și Concursuri'
  AND NOT EXISTS (
    SELECT 1 FROM forum_subcategories 
    WHERE slug = 'calendar-evenimente'
  );

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order, slug)
SELECT 
  id, 
  'Regulamente Concursuri', 
  'Regulamente, norme și condiții pentru participare la concursuri', 
  '📋', 
  5,
  'regulamente-concursuri'
FROM forum_categories 
WHERE name = 'Competiții și Concursuri'
  AND NOT EXISTS (
    SELECT 1 FROM forum_subcategories 
    WHERE slug = 'regulamente-concursuri'
  );

-- 2. Adaugă subforum în "Pescuit cu Muscă (Fly Fishing)" (idempotent)
-- IMPORTANT: Subforums aparțin acum subcategoriilor (subcategory_id), nu categoriilor
-- Mai întâi găsim subcategoria "Pescuit cu Muscă"
INSERT INTO forum_subforums (subcategory_id, category_id, name, description, icon, sort_order, slug)
SELECT 
  sc.id,  -- subcategory_id (obligatoriu)
  sc.category_id,  -- category_id (opțional, pentru referință rapidă)
  'Fly Tying', 
  'Discuții despre legarea muștelor artificiale, materiale și tehnici', 
  '🪰', 
  1,
  'fly-tying'
FROM forum_subcategories sc
WHERE sc.name = 'Pescuit cu Muscă (Fly Fishing)'
  AND NOT EXISTS (
    SELECT 1 FROM forum_subforums 
    WHERE slug = 'fly-tying'
  )
LIMIT 1;

