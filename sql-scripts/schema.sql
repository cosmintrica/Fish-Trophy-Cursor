-- Schema pentru Forum Pescuit - conform planului de dezvoltare
-- Folosește Supabase (PostgreSQL) cu Row Level Security (RLS)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELE PRINCIPALE FORUM
-- =============================================

-- Categorii principale
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

-- Subcategorii
CREATE TABLE forum_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES forum_categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  moderator_only BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extensie profil utilizatori forum (se conectează cu auth.users din Supabase)
CREATE TABLE forum_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  avatar_url TEXT,
  signature TEXT,
  post_count INTEGER DEFAULT 0,
  topic_count INTEGER DEFAULT 0,
  reputation_points INTEGER DEFAULT 0,
  rank VARCHAR(20) DEFAULT 'incepator',
  badges TEXT[], -- Array de badge-uri
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Topics/Thread-uri
CREATE TABLE forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id UUID REFERENCES forum_subcategories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
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
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  is_first_post BOOLEAN DEFAULT false, -- Pentru a identifica postarea principală a topicului
  edited_at TIMESTAMP WITH TIME ZONE,
  edited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ranguri și reputație
CREATE TABLE forum_user_ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  min_points INTEGER NOT NULL,
  color VARCHAR(20) DEFAULT '#6b7280',
  icon VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Moderatori per categorie
CREATE TABLE forum_moderators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES forum_categories(id) ON DELETE CASCADE,
  subcategory_id UUID REFERENCES forum_subcategories(id) ON DELETE CASCADE,
  permissions TEXT[], -- Array de permisiuni
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mesaje private
CREATE TABLE forum_private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_deleted_by_sender BOOLEAN DEFAULT false,
  is_deleted_by_recipient BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abonamente la topicuri
CREATE TABLE forum_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

-- Raportări spam/abuz
CREATE TABLE forum_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Atașamente (imagini, fișiere)
CREATE TABLE forum_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Managementul reclamelor
CREATE TABLE forum_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL, -- banner, video, sponsored, showcase
  position VARCHAR(20) NOT NULL, -- header, sidebar, between_posts, footer
  image_url TEXT,
  link_url TEXT,
  start_date DATE,
  end_date DATE,
  impressions_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Statistici forum
CREATE TABLE forum_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_name VARCHAR(50) NOT NULL,
  stat_value INTEGER NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXURI PENTRU PERFORMANȚĂ
-- =============================================

CREATE INDEX idx_forum_subcategories_category_id ON forum_subcategories(category_id);
CREATE INDEX idx_forum_topics_subcategory_id ON forum_topics(subcategory_id);
CREATE INDEX idx_forum_topics_user_id ON forum_topics(user_id);
CREATE INDEX idx_forum_topics_last_post_at ON forum_topics(last_post_at DESC);
CREATE INDEX idx_forum_posts_topic_id ON forum_posts(topic_id);
CREATE INDEX idx_forum_posts_user_id ON forum_posts(user_id);
CREATE INDEX idx_forum_posts_created_at ON forum_posts(created_at);
CREATE INDEX idx_forum_users_user_id ON forum_users(user_id);
CREATE INDEX idx_forum_users_username ON forum_users(username);
CREATE INDEX idx_forum_users_reputation ON forum_users(reputation_points DESC);

-- =============================================
-- TRIGGERS PENTRU ACTUALIZĂRI AUTOMATE
-- =============================================

-- Trigger pentru actualizarea contorului de postări în topics
CREATE OR REPLACE FUNCTION update_topic_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT NEW.is_deleted THEN
    UPDATE forum_topics 
    SET 
      reply_count = reply_count + 1,
      last_post_at = NEW.created_at,
      last_post_user_id = NEW.user_id
    WHERE id = NEW.topic_id;
    
    -- Actualizează și contorul utilizatorului
    UPDATE forum_users 
    SET post_count = post_count + 1 
    WHERE user_id = NEW.user_id;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
    UPDATE forum_topics 
    SET reply_count = reply_count - 1 
    WHERE id = NEW.topic_id;
    
    UPDATE forum_users 
    SET post_count = post_count - 1 
    WHERE user_id = NEW.user_id;
    
  ELSIF TG_OP = 'DELETE' AND NOT OLD.is_deleted THEN
    UPDATE forum_topics 
    SET reply_count = reply_count - 1 
    WHERE id = OLD.topic_id;
    
    UPDATE forum_users 
    SET post_count = post_count - 1 
    WHERE user_id = OLD.user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_topic_reply_count
  AFTER INSERT OR UPDATE OR DELETE ON forum_posts
  FOR EACH ROW EXECUTE FUNCTION update_topic_reply_count();

-- Trigger pentru actualizarea timpului de modificare
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_forum_categories_updated_at BEFORE UPDATE ON forum_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_subcategories_updated_at BEFORE UPDATE ON forum_subcategories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_users_updated_at BEFORE UPDATE ON forum_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_topics_updated_at BEFORE UPDATE ON forum_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCȚII PENTRU STATISTICI ȘI CĂUTARE
-- =============================================

-- Funcție pentru obținerea statisticilor generale
CREATE OR REPLACE FUNCTION get_forum_stats()
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM forum_users),
    'total_topics', (SELECT COUNT(*) FROM forum_topics WHERE is_deleted = false),
    'total_posts', (SELECT COUNT(*) FROM forum_posts WHERE is_deleted = false),
    'online_users', (SELECT COUNT(*) FROM forum_users WHERE is_online = true),
    'newest_user', (
      SELECT json_build_object('id', id, 'username', username)
      FROM forum_users 
      ORDER BY created_at DESC 
      LIMIT 1
    )
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Funcție pentru căutare în postări
CREATE OR REPLACE FUNCTION search_posts(search_query TEXT, result_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  post_id UUID,
  topic_id UUID,
  topic_title VARCHAR(200),
  content TEXT,
  user_id UUID,
  username VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.topic_id,
    t.title,
    p.content,
    p.user_id,
    fu.username,
    p.created_at,
    ts_rank(to_tsvector('romanian', p.content || ' ' || t.title), plainto_tsquery('romanian', search_query)) as rank
  FROM forum_posts p
  JOIN forum_topics t ON p.topic_id = t.id
  JOIN forum_users fu ON p.user_id = fu.user_id
  WHERE 
    p.is_deleted = false 
    AND t.is_deleted = false
    AND (
      to_tsvector('romanian', p.content) @@ plainto_tsquery('romanian', search_query)
      OR to_tsvector('romanian', t.title) @@ plainto_tsquery('romanian', search_query)
    )
  ORDER BY rank DESC, p.created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;
