-- =============================================
-- Migration 75: Restructure Subforums Under Subcategories
-- =============================================
-- Descriere: Schimbă structura astfel încât subforums să fie în subcategorii (sub-subcategorii)
-- În loc de: Category -> Subforum -> Subcategory -> Topics
-- Acum: Category -> Subcategory -> Subforum -> Topics
-- =============================================

-- 1. Adaugă subcategory_id la forum_subforums
ALTER TABLE forum_subforums 
ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES forum_subcategories(id) ON DELETE CASCADE;

-- 2. Migrează datele existente (dacă există)
-- Dacă un subforum are category_id, îl mutăm la prima subcategorie din acea categorie
-- SAU îl ștergem dacă nu există subcategorii
UPDATE forum_subforums sf
SET subcategory_id = (
  SELECT sc.id 
  FROM forum_subcategories sc 
  WHERE sc.category_id = sf.category_id 
    AND sc.is_active = true 
  ORDER BY sc.sort_order 
  LIMIT 1
)
WHERE sf.subcategory_id IS NULL 
  AND EXISTS (
    SELECT 1 
    FROM forum_subcategories sc 
    WHERE sc.category_id = sf.category_id 
      AND sc.is_active = true
  );

-- Șterge subforums care nu au subcategorii disponibile
DELETE FROM forum_subforums 
WHERE subcategory_id IS NULL 
  AND category_id IS NOT NULL;

-- 3. Modifică constraint-ul: subforums trebuie să aibă subcategory_id (nu category_id)
ALTER TABLE forum_subforums
DROP CONSTRAINT IF EXISTS forum_subforums_category_id_fkey;

-- Facem category_id opțional (nu mai e obligatoriu)
DO $$
BEGIN
  -- Verifică dacă coloana category_id are constraint NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forum_subforums' 
      AND column_name = 'category_id' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE forum_subforums ALTER COLUMN category_id DROP NOT NULL;
  END IF;
END $$;

-- Facem subcategory_id obligatoriu (NOT NULL)
DO $$
BEGIN
  -- Verifică dacă coloana subcategory_id permite NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forum_subforums' 
      AND column_name = 'subcategory_id' 
      AND is_nullable = 'YES'
  ) THEN
    -- Setează subcategory_id pentru toate subforums existente care nu-l au
    UPDATE forum_subforums sf
    SET subcategory_id = (
      SELECT sc.id 
      FROM forum_subcategories sc 
      WHERE sc.category_id = sf.category_id 
        AND sc.is_active = true 
      ORDER BY sc.sort_order 
      LIMIT 1
    )
    WHERE sf.subcategory_id IS NULL;
    
    -- Acum putem face NOT NULL
    ALTER TABLE forum_subforums ALTER COLUMN subcategory_id SET NOT NULL;
  END IF;
END $$;

-- Setează category_id = NULL pentru toate subforums migrate (după ce subcategory_id e NOT NULL)
-- Coloana rămâne pentru compatibilitate/optimizări, dar valoarea nu mai e folosită
UPDATE forum_subforums
SET category_id = NULL
WHERE subcategory_id IS NOT NULL;

-- Păstrăm category_id pentru referință rapidă, dar nu mai e obligatoriu
-- Adăugăm index pentru subcategory_id
CREATE INDEX IF NOT EXISTS idx_forum_subforums_subcategory 
  ON forum_subforums(subcategory_id, sort_order) 
  WHERE is_active = true;

-- 4. Modifică forum_topics să poată aparține fie unei subcategorii, fie unui subforum
-- Adaugă coloana fără foreign key constraint (pentru a evita eroarea de constraint duplicat)
ALTER TABLE forum_topics 
ADD COLUMN IF NOT EXISTS subforum_id UUID;

-- Modifică subcategory_id să permită NULL (când subforum_id este setat)
-- Verifică dacă există constraint NOT NULL pe subcategory_id
DO $$
BEGIN
  -- Verifică dacă coloana subcategory_id are constraint NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forum_topics' 
      AND column_name = 'subcategory_id' 
      AND is_nullable = 'NO'
  ) THEN
    -- Elimină constraint-ul NOT NULL temporar (va fi re-adăugat prin check_topic_parent)
    ALTER TABLE forum_topics ALTER COLUMN subcategory_id DROP NOT NULL;
  END IF;
END $$;

-- Șterge constraint-ul existent pentru subcategory_id (dacă există) pentru a-l re-crea
ALTER TABLE forum_topics
DROP CONSTRAINT IF EXISTS forum_topics_subcategory_id_fkey;

-- Șterge constraint-ul pentru subforum_id dacă există deja (din ADD COLUMN cu REFERENCES)
ALTER TABLE forum_topics
DROP CONSTRAINT IF EXISTS forum_topics_subforum_id_fkey;

-- Adaugă constraint nou: topic trebuie să aibă fie subcategory_id, fie subforum_id
ALTER TABLE forum_topics
DROP CONSTRAINT IF EXISTS check_topic_parent;

ALTER TABLE forum_topics
ADD CONSTRAINT check_topic_parent CHECK (
  (subcategory_id IS NOT NULL AND subforum_id IS NULL) OR
  (subcategory_id IS NULL AND subforum_id IS NOT NULL)
);

-- Re-adăugă foreign key pentru subcategory_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'forum_topics_subcategory_id_fkey'
  ) THEN
    ALTER TABLE forum_topics
    ADD CONSTRAINT forum_topics_subcategory_id_fkey 
      FOREIGN KEY (subcategory_id) 
      REFERENCES forum_subcategories(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Adaugă foreign key pentru subforum_id (doar dacă nu există deja)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'forum_topics_subforum_id_fkey'
  ) THEN
    ALTER TABLE forum_topics
    ADD CONSTRAINT forum_topics_subforum_id_fkey 
      FOREIGN KEY (subforum_id) 
      REFERENCES forum_subforums(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Actualizează indexurile pentru forum_topics
-- Păstrăm indexul existent idx_forum_topics_subcategory dacă există, doar adăugăm WHERE clause dacă nu există
-- Nu ștergem indexul vechi pentru a nu afecta performanța - doar adăugăm unul nou cu WHERE clause
CREATE INDEX IF NOT EXISTS idx_forum_topics_subcategory_filtered 
  ON forum_topics(subcategory_id, is_deleted) 
  WHERE subcategory_id IS NOT NULL AND is_deleted = false;

-- Index pentru subforum_id (doar dacă nu există deja)
CREATE INDEX IF NOT EXISTS idx_forum_topics_subforum 
  ON forum_topics(subforum_id, is_deleted) 
  WHERE subforum_id IS NOT NULL AND is_deleted = false;

-- 6. Actualizează forum_subcategories - elimină subforum_id din constraint
-- Păstrăm coloana subforum_id pentru compatibilitate (nu o ștergem), dar nu o mai folosim
-- Subcategoriile aparțin DOAR categoriilor acum (nu mai pot aparține unui subforum)
ALTER TABLE forum_subcategories
DROP CONSTRAINT IF EXISTS check_parent;

-- Nou constraint: subcategoriile trebuie să aibă DOAR category_id (nu subforum_id)
ALTER TABLE forum_subcategories
ADD CONSTRAINT check_parent CHECK (category_id IS NOT NULL);

-- Opțional: Setează subforum_id = NULL pentru toate subcategoriile existente (dacă există)
UPDATE forum_subcategories
SET subforum_id = NULL
WHERE subforum_id IS NOT NULL;

-- 7. Comentarii
COMMENT ON COLUMN forum_subforums.subcategory_id IS 'Subforum-ul aparține unei subcategorii (sub-subcategorie)';
COMMENT ON COLUMN forum_subforums.category_id IS 'Referință rapidă la categoria părinte (derivat din subcategory)';
COMMENT ON COLUMN forum_topics.subforum_id IS 'Topic-ul poate aparține direct unui subforum (în loc de subcategorie)';
COMMENT ON CONSTRAINT check_topic_parent ON forum_topics IS 'Topic-ul trebuie să aibă fie subcategory_id, fie subforum_id (nu ambele)';

