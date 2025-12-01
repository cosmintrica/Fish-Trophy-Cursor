-- =============================================
-- Migration 04: Utilizatori Forum
-- =============================================
-- Descriere: Profil extins utilizatori cu reputație și putere
-- Dependințe: 02_roles.sql
-- =============================================

-- Profil extins utilizatori forum
CREATE TABLE forum_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  role_id UUID REFERENCES forum_roles(id), -- Rolul principal al utilizatorului
  avatar_url TEXT,
  signature TEXT,
  post_count INTEGER DEFAULT 0,
  topic_count INTEGER DEFAULT 0,
  reputation_points INTEGER DEFAULT 0,
  reputation_power INTEGER DEFAULT 0, -- Calculat automat: 0-7 (bazat pe reputation_points)
  rank VARCHAR(50) DEFAULT 'ou_de_peste', -- Rang automat bazat pe post_count
  badges TEXT[] DEFAULT '{}', -- Array de badge-uri speciale: ['record_holder', 'eco_warrior', etc.]
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Indexuri pentru performanță
-- =============================================
CREATE INDEX idx_forum_users_user_id ON forum_users(user_id);
CREATE INDEX idx_forum_users_username ON forum_users(username);
CREATE INDEX idx_forum_users_reputation ON forum_users(reputation_points DESC);
CREATE INDEX idx_forum_users_post_count ON forum_users(post_count DESC);
CREATE INDEX idx_forum_users_role ON forum_users(role_id);

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON TABLE forum_users IS 'Profil extins utilizatori forum cu reputație, putere, ranguri și badge-uri';
COMMENT ON COLUMN forum_users.reputation_power IS 'Putere reputație (0-7) calculată automat: 0-49=0, 50-199=1, 200-499=2, 500-999=3, 1000-2499=4, 2500-4999=5, 5000-9999=6, 10000+=7';
COMMENT ON COLUMN forum_users.rank IS 'Rang automat bazat pe post_count: ou_de_peste, puiet, pui_de_crap, crap_junior, crap_senior, maestru_pescar, legenda_apelor';
COMMENT ON COLUMN forum_users.badges IS 'Badge-uri speciale: record_holder, contest_winner, verified_seller, eco_warrior, moderator, admin, etc.';
