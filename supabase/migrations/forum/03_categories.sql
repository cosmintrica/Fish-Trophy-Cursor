-- =============================================
-- Migration 03: Ierarhie Categorii (Categorii, Sub-forumuri, Subcategorii)
-- =============================================
-- Descriere: Structura completă ierarhie forum cu sub-forumuri opționale
-- Dependințe: 01_extensions.sql
-- =============================================

-- Categorii principale (nivel 1)
CREATE TABLE forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sub-forumuri (nivel 2, opțional pentru organizare)
CREATE TABLE forum_subforums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subcategorii (nivel 3, pot aparține categoriei sau sub-forumului)
CREATE TABLE forum_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES forum_categories(id) ON DELETE CASCADE,
  subforum_id UUID REFERENCES forum_subforums(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  moderator_only BOOLEAN DEFAULT false, -- Subcategorie accesibilă doar moderatorilor
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_parent CHECK (category_id IS NOT NULL OR subforum_id IS NOT NULL)
);

-- =============================================
-- Indexuri pentru performanță
-- =============================================
CREATE INDEX idx_forum_categories_sort ON forum_categories(sort_order, is_active);
CREATE INDEX idx_forum_subforums_category ON forum_subforums(category_id, sort_order);
CREATE INDEX idx_forum_subcategories_category ON forum_subcategories(category_id, sort_order);
CREATE INDEX idx_forum_subcategories_subforum ON forum_subcategories(subforum_id, sort_order);

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON TABLE forum_categories IS 'Categorii principale (ex: Tehnici de Pescuit, Echipamente, Locații)';
COMMENT ON TABLE forum_subforums IS 'Sub-forumuri opționale pentru organizare în partea de sus a categoriilor';
COMMENT ON TABLE forum_subcategories IS 'Subcategorii (ex: Pescuit La Fund, Spinning, etc.) - aparțin unei categorii SAU unui sub-forum';
COMMENT ON CONSTRAINT check_parent ON forum_subcategories IS 'O subcategorie trebuie să aparțină unei categorii SAU unui sub-forum';
