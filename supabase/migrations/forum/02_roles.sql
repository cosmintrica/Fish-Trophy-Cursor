-- =============================================
-- Migration 02: Sistem de Roluri
-- =============================================
-- Descriere: Tabele pentru roluri flexibile cu permisiuni JSON
-- Dependințe: 01_extensions.sql
-- =============================================

-- Roluri cu permisiuni JSON flexibile
CREATE TABLE forum_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL, -- 'admin', 'moderator', 'firma', 'organizator_concurs', etc.
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#6b7280',
  icon VARCHAR(50),
  permissions JSONB NOT NULL DEFAULT '{}', -- {"can_edit_all": true, "can_delete": true, "can_ban": true, etc.}
  is_system_role BOOLEAN DEFAULT false, -- Roluri sistem (nu pot fi șterse)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ranguri automate (bazate pe post_count)
CREATE TABLE forum_user_ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL, -- 'ou_de_peste', 'puiet', 'pui_de_crap', etc.
  display_name VARCHAR(100) NOT NULL,
  min_posts INTEGER NOT NULL,
  max_posts INTEGER, -- NULL pentru rang maxim
  color VARCHAR(20) DEFAULT '#6b7280',
  icon VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pentru căutare rapidă rang
CREATE INDEX idx_forum_user_ranks_posts ON forum_user_ranks(min_posts, max_posts);

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON TABLE forum_roles IS 'Roluri flexibile cu permisiuni JSON: admin, moderator, firmă, organizator concurs, admin baltă, oficial, ONG, premium, user';
COMMENT ON COLUMN forum_roles.permissions IS 'Permisiuni JSON: {"can_edit_all": true, "can_delete_posts": true, "can_ban_users": true, "can_manage_categories": true, "can_post_in_commercial": true, etc.}';
COMMENT ON TABLE forum_user_ranks IS 'Ranguri automate bazate pe număr postări: Ou de Pește, Puiet, Pui de Crap, Crap Junior, Crap Senior, Maestru Pescar, Legenda Apelor';
