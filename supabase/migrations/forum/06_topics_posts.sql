-- =============================================
-- Migration 06: Topicuri și Postări
-- =============================================
-- Descriere: Structura de bază pentru conținut forum
-- Dependințe: 03_categories.sql, 04_users.sql
-- =============================================

-- Topics/Thread-uri
CREATE TABLE forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id UUID NOT NULL REFERENCES forum_subcategories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  topic_type VARCHAR(20) DEFAULT 'normal', -- 'normal', 'sticky', 'announcement', 'poll', 'hot'
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  last_post_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_post_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Postări
CREATE TABLE forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  is_first_post BOOLEAN DEFAULT false, -- Postarea principală a topicului
  edited_at TIMESTAMP WITH TIME ZONE,
  edited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coloană pentru full-text search
ALTER TABLE forum_posts ADD COLUMN search_vector tsvector;

-- =============================================
-- Indexuri pentru performanță
-- =============================================
CREATE INDEX idx_forum_topics_subcategory ON forum_topics(subcategory_id, is_deleted);
CREATE INDEX idx_forum_topics_user ON forum_topics(user_id, is_deleted);
CREATE INDEX idx_forum_topics_last_post ON forum_topics(last_post_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_forum_topics_pinned ON forum_topics(is_pinned, last_post_at DESC) WHERE is_deleted = false;

CREATE INDEX idx_forum_posts_topic ON forum_posts(topic_id, created_at);
CREATE INDEX idx_forum_posts_user ON forum_posts(user_id, is_deleted);
CREATE INDEX idx_forum_posts_search ON forum_posts USING GIN(search_vector);

-- Index pentru title search în topics
CREATE INDEX idx_forum_topics_search ON forum_topics USING GIN(to_tsvector('romanian', title));

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON TABLE forum_topics IS 'Topicuri/Subiecte (thread-uri) din forum';
COMMENT ON COLUMN forum_topics.topic_type IS 'Tipuri: normal, sticky (fixat), announcement (anunț), poll (sondaj), hot (popular)';
COMMENT ON TABLE forum_posts IS 'Postări individuale în topicuri';
COMMENT ON COLUMN forum_posts.search_vector IS 'Vector pentru full-text search (actualizat automat prin trigger)';
