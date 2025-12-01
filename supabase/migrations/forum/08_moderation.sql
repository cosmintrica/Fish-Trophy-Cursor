-- =============================================
-- Migration 08: Sistem Moderare
-- =============================================
-- Descriere: Moderatori, raportări generale și raportări braconaj
-- Dependințe: 03_categories.sql, 04_users.sql, 06_topics_posts.sql
-- =============================================

-- Moderatori per categorie/subcategorie
CREATE TABLE forum_moderators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES forum_categories(id) ON DELETE CASCADE,
  subcategory_id UUID REFERENCES forum_subcategories(id) ON DELETE CASCADE,
  permissions JSONB DEFAULT '{}', -- Permisiuni specifice moderator
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_moderator_scope CHECK (category_id IS NOT NULL OR subcategory_id IS NOT NULL)
);

-- Raportări spam/abuz (generale)
CREATE TABLE forum_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_report_target CHECK (post_id IS NOT NULL OR topic_id IS NOT NULL OR reported_user_id IS NOT NULL)
);

-- Raportări braconaj (SECȚIUNE SPECIALĂ cu regulament strict)
CREATE TABLE forum_braconaj_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id), -- Poate fi NULL dacă nu e membru forum
  incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL, -- Locație (generală sau exactă)
  location_gps POINT, -- Coordonate GPS (opțional)
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}', -- Array de URL-uri către dovezi (foto/video)
  witness_contact TEXT, -- Contact martor (opțional, confidențial)
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_review', 'forwarded_authorities', 'resolved', 'false_report'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  forwarded_to TEXT, -- Autoritatea (ANPA, AJVPS, Jandarmerie)
  notes TEXT, -- Note interne moderare
  is_public BOOLEAN DEFAULT false, -- Dacă raportul e public (după verificare)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Indexuri pentru performanță
-- =============================================
CREATE INDEX idx_forum_moderators_user ON forum_moderators(user_id);
CREATE INDEX idx_forum_moderators_category ON forum_moderators(category_id);
CREATE INDEX idx_forum_moderators_subcategory ON forum_moderators(subcategory_id);

CREATE INDEX idx_forum_reports_status ON forum_reports(status, created_at DESC);
CREATE INDEX idx_forum_reports_reporter ON forum_reports(reporter_id);

CREATE INDEX idx_forum_braconaj_reports_status ON forum_braconaj_reports(status, created_at DESC);
CREATE INDEX idx_forum_braconaj_reports_reporter ON forum_braconaj_reports(reporter_id);
CREATE INDEX idx_forum_braconaj_reports_public ON forum_braconaj_reports(is_public) WHERE is_public = true;

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON TABLE forum_moderators IS 'Moderatori cu permisiuni per categorie sau subcategorie';
COMMENT ON TABLE forum_reports IS 'Raportări generale spam/abuz pentru postări, topicuri sau utilizatori';
COMMENT ON TABLE forum_braconaj_reports IS 'Raportări SPECIALE braconaj cu regulament STRICT - ban permanent pentru raportări false';
COMMENT ON COLUMN forum_braconaj_reports.status IS 'pending→in_review→forwarded_authorities/resolved/false_report';
COMMENT ON COLUMN forum_braconaj_reports.is_public IS 'True după verificare și aprobare pentru vizibilitate publică';
