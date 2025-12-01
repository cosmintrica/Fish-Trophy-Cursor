-- =============================================
-- Migration 24: Add Slugs to Forum Entities
-- =============================================
-- Descriere: Adaugă câmp slug pentru subcategorii, sub-forumuri și topicuri
-- pentru link-uri frumoase: /forum/pescuit-nocturn, /forum/topic/montaj-hair-rig
-- =============================================

-- 1. SUB-FORUMURI: Adaugă slug
ALTER TABLE forum_subforums 
ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- 2. SUBCATEGORII: Adaugă slug
ALTER TABLE forum_subcategories 
ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- 3. CATEGORII PRINCIPALE: Adaugă slug
ALTER TABLE forum_categories 
ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- 4. TOPICURI: Adaugă slug
ALTER TABLE forum_topics 
ADD COLUMN IF NOT EXISTS slug VARCHAR(200);

-- 5. POSTĂRI: Adaugă cod numeric unic pentru quote-uri (ex: #12345)
ALTER TABLE forum_posts 
ADD COLUMN IF NOT EXISTS post_number INTEGER;

-- 6. ANUNȚURI: Adaugă slug
ALTER TABLE forum_ads 
ADD COLUMN IF NOT EXISTS slug VARCHAR(200);

-- 7. RAPORTĂRI: Adaugă cod numeric (ex: #R12345)
ALTER TABLE forum_reports 
ADD COLUMN IF NOT EXISTS report_number INTEGER;

-- 8. RAPORTĂRI BRACONAJ: Adaugă cod numeric (ex: #B12345)
ALTER TABLE forum_braconaj_reports 
ADD COLUMN IF NOT EXISTS report_number INTEGER;

-- 9. MESAJE PRIVATE: Adaugă cod numeric (ex: #M12345)
ALTER TABLE forum_private_messages 
ADD COLUMN IF NOT EXISTS message_number INTEGER;

-- 10. FEEDBACK MARKETPLACE: Adaugă cod numeric (ex: #F12345)
ALTER TABLE forum_marketplace_feedback 
ADD COLUMN IF NOT EXISTS feedback_number INTEGER;

-- Funcție pentru generare slug din nume
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Convertim la lowercase și înlocuim diacriticele
  result := LOWER(input_text);
  result := REPLACE(result, 'ă', 'a');
  result := REPLACE(result, 'â', 'a');
  result := REPLACE(result, 'î', 'i');
  result := REPLACE(result, 'ș', 's');
  result := REPLACE(result, 'ț', 't');
  result := REPLACE(result, 'Ă', 'a');
  result := REPLACE(result, 'Â', 'a');
  result := REPLACE(result, 'Î', 'i');
  result := REPLACE(result, 'Ș', 's');
  result := REPLACE(result, 'Ț', 't');
  
  -- Înlocuim caracterele speciale cu spații, apoi spațiile cu -
  result := REGEXP_REPLACE(result, '[^a-z0-9]+', '-', 'g');
  
  -- Eliminăm - de la început și sfârșit
  result := TRIM(BOTH '-' FROM result);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Generează slug-uri pentru categoriile existente
UPDATE forum_categories
SET slug = generate_slug(name)
WHERE slug IS NULL;

-- Generează slug-uri pentru sub-forumurile existente
UPDATE forum_subforums
SET slug = generate_slug(name)
WHERE slug IS NULL;

-- Generează slug-uri pentru subcategoriile existente
UPDATE forum_subcategories
SET slug = generate_slug(name)
WHERE slug IS NULL;

-- Generează slug-uri pentru topicurile existente
UPDATE forum_topics
SET slug = generate_slug(title)
WHERE slug IS NULL;

-- Generează slug-uri pentru anunțurile existente
UPDATE forum_ads
SET slug = generate_slug(name)
WHERE slug IS NULL;

-- Generează coduri numerice pentru postările existente (pentru quote-uri)
-- Folosim ROW_NUMBER() pentru a genera numere unice per topic
UPDATE forum_posts
SET post_number = subquery.row_num
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY topic_id ORDER BY created_at ASC) as row_num
  FROM forum_posts
  WHERE post_number IS NULL
) AS subquery
WHERE forum_posts.id = subquery.id;

-- Generează coduri numerice pentru raportările existente (#R12345)
UPDATE forum_reports
SET report_number = subquery.row_num
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM forum_reports
  WHERE report_number IS NULL
) AS subquery
WHERE forum_reports.id = subquery.id;

-- Generează coduri numerice pentru raportările braconaj existente (#B12345)
UPDATE forum_braconaj_reports
SET report_number = subquery.row_num
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM forum_braconaj_reports
  WHERE report_number IS NULL
) AS subquery
WHERE forum_braconaj_reports.id = subquery.id;

-- Generează coduri numerice pentru mesajele private existente (#M12345)
-- Numere unice per conversație (sender_id + recipient_id)
UPDATE forum_private_messages
SET message_number = subquery.row_num
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id)
      ORDER BY created_at ASC
    ) as row_num
  FROM forum_private_messages
  WHERE message_number IS NULL
) AS subquery
WHERE forum_private_messages.id = subquery.id;

-- Generează coduri numerice pentru feedback-urile marketplace existente (#F12345)
UPDATE forum_marketplace_feedback
SET feedback_number = subquery.row_num
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM forum_marketplace_feedback
  WHERE feedback_number IS NULL
) AS subquery
WHERE forum_marketplace_feedback.id = subquery.id;

-- Indexuri pentru performanță
CREATE INDEX IF NOT EXISTS idx_forum_categories_slug ON forum_categories(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_subforums_slug ON forum_subforums(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_subcategories_slug ON forum_subcategories(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_topics_slug ON forum_topics(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_ads_slug ON forum_ads(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_posts_number ON forum_posts(topic_id, post_number) WHERE post_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_reports_number ON forum_reports(report_number) WHERE report_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_braconaj_reports_number ON forum_braconaj_reports(report_number) WHERE report_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_private_messages_number ON forum_private_messages(message_number) WHERE message_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_marketplace_feedback_number ON forum_marketplace_feedback(feedback_number) WHERE feedback_number IS NOT NULL;

-- Constraint-uri: slug trebuie să fie unic și not null (doar pentru înregistrările noi)
-- Nu aplicăm NOT NULL direct pentru că ar eșua pentru datele existente
-- Vom folosi trigger-e pentru a genera automat slug-urile la inserare

-- Constraint: post_number trebuie să fie unic per topic (doar pentru înregistrările noi)
-- Trigger-ul va genera automat post_number, deci nu avem nevoie de constraint NOT NULL

-- Unique constraint pentru slug-uri (per nivel)
CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_categories_slug_unique ON forum_categories(slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_subforums_slug_unique ON forum_subforums(slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_subcategories_slug_unique ON forum_subcategories(slug) WHERE slug IS NOT NULL;
-- Pentru topicuri, slug-ul poate fi duplicat (dar combinat cu subcategory_id ar trebui să fie unic)
CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_topics_slug_subcategory_unique ON forum_topics(subcategory_id, slug) WHERE slug IS NOT NULL;
-- Pentru anunțuri, slug-ul trebuie să fie unic
CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_ads_slug_unique ON forum_ads(slug) WHERE slug IS NOT NULL;

-- Trigger pentru generare automată post_number la inserare
CREATE OR REPLACE FUNCTION generate_post_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Obține următorul număr pentru acest topic
  SELECT COALESCE(MAX(post_number), 0) + 1 INTO next_number
  FROM forum_posts
  WHERE topic_id = NEW.topic_id;
  
  NEW.post_number := next_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_post_number
  BEFORE INSERT ON forum_posts
  FOR EACH ROW
  WHEN (NEW.post_number IS NULL)
  EXECUTE FUNCTION generate_post_number();

-- Trigger-e pentru generare automată slug-uri la inserare
CREATE OR REPLACE FUNCTION generate_slug_for_subforum()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_subforum_slug
  BEFORE INSERT OR UPDATE ON forum_subforums
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE FUNCTION generate_slug_for_subforum();

CREATE OR REPLACE FUNCTION generate_slug_for_subcategory()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_subcategory_slug
  BEFORE INSERT OR UPDATE ON forum_subcategories
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE FUNCTION generate_slug_for_subcategory();

CREATE OR REPLACE FUNCTION generate_slug_for_topic()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_topic_slug
  BEFORE INSERT OR UPDATE ON forum_topics
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE FUNCTION generate_slug_for_topic();

-- Trigger pentru generare automată slug categorii
CREATE OR REPLACE FUNCTION generate_slug_for_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_category_slug
  BEFORE INSERT OR UPDATE ON forum_categories
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE FUNCTION generate_slug_for_category();

-- Trigger pentru generare automată slug anunțuri
CREATE OR REPLACE FUNCTION generate_slug_for_ad()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_ad_slug
  BEFORE INSERT OR UPDATE ON forum_ads
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE FUNCTION generate_slug_for_ad();

-- Trigger pentru generare automată report_number pentru raportări
CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(report_number), 0) + 1 INTO next_number
  FROM forum_reports;
  
  NEW.report_number := next_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_report_number
  BEFORE INSERT ON forum_reports
  FOR EACH ROW
  WHEN (NEW.report_number IS NULL)
  EXECUTE FUNCTION generate_report_number();

-- Trigger pentru generare automată report_number pentru raportări braconaj
CREATE OR REPLACE FUNCTION generate_braconaj_report_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(report_number), 0) + 1 INTO next_number
  FROM forum_braconaj_reports;
  
  NEW.report_number := next_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_braconaj_report_number
  BEFORE INSERT ON forum_braconaj_reports
  FOR EACH ROW
  WHEN (NEW.report_number IS NULL)
  EXECUTE FUNCTION generate_braconaj_report_number();

-- Trigger pentru generare automată message_number pentru mesaje private
CREATE OR REPLACE FUNCTION generate_message_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  conversation_key TEXT;
BEGIN
  -- Generează cheie conversație (sortăm ID-urile pentru consistență)
  conversation_key := LEAST(NEW.sender_id::TEXT, NEW.recipient_id::TEXT) || '_' || GREATEST(NEW.sender_id::TEXT, NEW.recipient_id::TEXT);
  
  -- Obține următorul număr pentru această conversație
  SELECT COALESCE(MAX(message_number), 0) + 1 INTO next_number
  FROM forum_private_messages
  WHERE (LEAST(sender_id::TEXT, recipient_id::TEXT) || '_' || GREATEST(sender_id::TEXT, recipient_id::TEXT)) = conversation_key;
  
  NEW.message_number := next_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_message_number
  BEFORE INSERT ON forum_private_messages
  FOR EACH ROW
  WHEN (NEW.message_number IS NULL)
  EXECUTE FUNCTION generate_message_number();

-- Trigger pentru generare automată feedback_number pentru marketplace
CREATE OR REPLACE FUNCTION generate_feedback_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(feedback_number), 0) + 1 INTO next_number
  FROM forum_marketplace_feedback;
  
  NEW.feedback_number := next_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_feedback_number
  BEFORE INSERT ON forum_marketplace_feedback
  FOR EACH ROW
  WHEN (NEW.feedback_number IS NULL)
  EXECUTE FUNCTION generate_feedback_number();

-- Comentarii
COMMENT ON COLUMN forum_categories.slug IS 'Slug unic pentru URL-uri frumoase (ex: tehnici-de-pescuit pentru link /forum/categorie/tehnici-de-pescuit)';
COMMENT ON COLUMN forum_subforums.slug IS 'Slug unic pentru URL-uri frumoase (ex: tehnici-avansate)';
COMMENT ON COLUMN forum_subcategories.slug IS 'Slug unic pentru URL-uri frumoase (ex: pescuit-nocturn pentru link /forum/pescuit-nocturn)';
COMMENT ON COLUMN forum_topics.slug IS 'Slug pentru URL-uri frumoase (ex: montaj-hair-rig pentru link /forum/topic/montaj-hair-rig). Unic per subcategorie.';
COMMENT ON COLUMN forum_ads.slug IS 'Slug unic pentru URL-uri frumoase (ex: promotie-speciala pentru link /forum/anunt/promotie-speciala)';
COMMENT ON COLUMN forum_posts.post_number IS 'Cod numeric unic per topic pentru quote-uri (ex: #12345). Generat automat la inserare.';
COMMENT ON COLUMN forum_reports.report_number IS 'Cod numeric unic pentru raportări (ex: #R12345). Generat automat la inserare.';
COMMENT ON COLUMN forum_braconaj_reports.report_number IS 'Cod numeric unic pentru raportări braconaj (ex: #B12345). Generat automat la inserare.';
COMMENT ON COLUMN forum_private_messages.message_number IS 'Cod numeric unic per conversație pentru referințe (ex: #M12345). Generat automat la inserare.';
COMMENT ON COLUMN forum_marketplace_feedback.feedback_number IS 'Cod numeric unic pentru feedback marketplace (ex: #F12345). Generat automat la inserare.';
COMMENT ON FUNCTION generate_slug IS 'Generează slug din text: convertește diacritice, lowercase, înlocuiește spații cu -';
COMMENT ON FUNCTION generate_post_number IS 'Generează automat cod numeric unic pentru postări (pentru quote-uri)';
COMMENT ON FUNCTION generate_report_number IS 'Generează automat cod numeric unic pentru raportări (#R12345)';
COMMENT ON FUNCTION generate_braconaj_report_number IS 'Generează automat cod numeric unic pentru raportări braconaj (#B12345)';
COMMENT ON FUNCTION generate_message_number IS 'Generează automat cod numeric unic per conversație pentru mesaje private (#M12345)';
COMMENT ON FUNCTION generate_feedback_number IS 'Generează automat cod numeric unic pentru feedback marketplace (#F12345)';

