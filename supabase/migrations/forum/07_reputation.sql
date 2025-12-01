-- =============================================
-- Migration 07: Sistem Reputație Complet
-- =============================================
-- Descriere: Log-uri reputație cu putere și comentarii - OBLIGATORIU PUBLIC
-- Dependințe: 04_users.sql, 06_topics_posts.sql
-- =============================================

-- Log-uri complete pentru like/dislike cu comentarii
CREATE TABLE forum_reputation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  points INTEGER NOT NULL, -- Pozitiv (like) sau negativ (dislike)
  comment TEXT, -- Comentariu (min 3 caractere pentru amplificare)
  giver_power INTEGER DEFAULT 0, -- Puterea celui care dă (salvată pentru istoric)
  is_admin_award BOOLEAN DEFAULT false, -- True dacă e acordat manual de admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Indexuri pentru performanță
-- =============================================
CREATE INDEX idx_forum_reputation_logs_receiver ON forum_reputation_logs(receiver_user_id, created_at DESC);
CREATE INDEX idx_forum_reputation_logs_giver ON forum_reputation_logs(giver_user_id, created_at DESC);
CREATE INDEX idx_forum_reputation_logs_post ON forum_reputation_logs(post_id);

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON TABLE forum_reputation_logs IS 'Istoric acordări reputație - Profil public: ultimele 10 | Admin panel: toate';
COMMENT ON COLUMN forum_reputation_logs.points IS 'Puncte acordate: +1 (like simplu), -1 (dislike simplu), sau mai mult cu comentariu (±2 până la ±8 funcție de putere)';
COMMENT ON COLUMN forum_reputation_logs.comment IS 'Comentariu obligatoriu pentru amplificare (min 3 caractere)';
COMMENT ON COLUMN forum_reputation_logs.giver_power IS 'Puterea celui care acordă (0-7) salvată pentru istoric';
COMMENT ON COLUMN forum_reputation_logs.is_admin_award IS 'True dacă e Admin Award (nelimitat, poate fi orice valoare)';
