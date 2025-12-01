-- =============================================
-- Migration 10: Features Suplimentare
-- =============================================
-- Descriere: PM, subscriptions, attachments, polls, stats, ads
-- Dependințe: 04_users.sql, 06_topics_posts.sql
-- =============================================

-- Mesaje private
CREATE TABLE forum_private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_deleted_by_sender BOOLEAN DEFAULT false,
  is_deleted_by_recipient BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abonamente la topicuri (notificări)
CREATE TABLE forum_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

-- Atașamente (imagini, fișiere)
CREATE TABLE forum_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sondaje (Polls)
CREATE TABLE forum_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID UNIQUE NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- [{"id": 1, "text": "Opt1", "votes": 0}, ...]
  multiple_choice BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE forum_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES forum_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_ids INTEGER[] NOT NULL, -- Array de ID-uri opțiuni votate
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

-- Statistici forum
CREATE TABLE forum_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_name VARCHAR(50) UNIQUE NOT NULL,
  stat_value INTEGER NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reclame (ads management)
CREATE TABLE forum_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'banner', 'video', 'sponsored', 'showcase'
  position VARCHAR(20) NOT NULL, -- 'header', 'sidebar', 'between_posts', 'footer'
  image_url TEXT,
  link_url TEXT,
  start_date DATE,
  end_date DATE,
  impressions_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Indexuri pentru performanță
-- =============================================
CREATE INDEX idx_forum_pm_recipient ON forum_private_messages(recipient_id, is_read, is_deleted_by_recipient);
CREATE INDEX idx_forum_pm_sender ON forum_private_messages(sender_id, is_deleted_by_sender);

CREATE INDEX idx_forum_subscriptions_user ON forum_subscriptions(user_id);
CREATE INDEX idx_forum_subscriptions_topic ON forum_subscriptions(topic_id);

CREATE INDEX idx_forum_attachments_post ON forum_attachments(post_id);

CREATE INDEX idx_forum_polls_topic ON forum_polls(topic_id);
CREATE INDEX idx_forum_poll_votes_poll ON forum_poll_votes(poll_id);

CREATE INDEX idx_forum_ads_active ON forum_ads(is_active, position) WHERE is_active = true;

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON TABLE forum_private_messages IS 'Mesaje private între utilizatori';
COMMENT ON TABLE forum_subscriptions IS 'Abonamente la topicuri pentru notificări';
COMMENT ON TABLE forum_attachments IS 'Atașamente (imagini, fișiere) la postări';
COMMENT ON TABLE forum_polls IS 'Sondaje (polls) cu opțiuni multiple și expirare';
COMMENT ON TABLE forum_stats IS 'Statistici generale forum (total users, topics, posts, etc.)';
COMMENT ON TABLE forum_ads IS 'Management reclame (bannere, video, sponsored content)';
