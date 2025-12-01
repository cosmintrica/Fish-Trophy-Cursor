-- =============================================
-- Migration 12: Funcții Helper și Statistici
-- =============================================
-- Descriere: Funcții pentru statistici, căutare și utilities
-- Dependințe: 04_users.sql, 06_topics_posts.sql
-- =============================================

-- =============================================
-- 1. FUNCȚIE: Statistici generale forum
-- =============================================

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
    ),
    'total_reputation_given', (SELECT COALESCE(SUM(ABS(points)), 0) FROM forum_reputation_logs)
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. FUNCȚIE: Căutare avansată în postări (full-text)
-- =============================================

CREATE OR REPLACE FUNCTION search_posts(
  search_query TEXT, 
  result_limit INTEGER DEFAULT 20
)
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
    ts_rank(
      p.search_vector, 
      plainto_tsquery('romanian', search_query)
    ) as rank
  FROM forum_posts p
  JOIN forum_topics t ON p.topic_id = t.id
  JOIN forum_users fu ON p.user_id = fu.user_id
  WHERE 
    p.is_deleted = false 
    AND t.is_deleted = false
    AND (
      p.search_vector @@ plainto_tsquery('romanian', search_query)
      OR to_tsvector('romanian', t.title) @@ plainto_tsquery('romanian', search_query)
    )
  ORDER BY rank DESC, p.created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. FUNCȚIE: Verificare restricție activă utilizator
-- =============================================

CREATE OR REPLACE FUNCTION has_active_restriction(
  p_user_id UUID,
  p_restriction_type VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  has_restriction BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM forum_user_restrictions
    WHERE user_id = p_user_id
      AND restriction_type = p_restriction_type
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO has_restriction;
  
  RETURN has_restriction;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. FUNCȚIE: Verificare eligibilitate vânzare
-- =============================================

CREATE OR REPLACE FUNCTION check_sales_eligibility(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_eligible BOOLEAN;
  account_days INTEGER;
  rep_points INTEGER;
  posts INTEGER;
  email_ver BOOLEAN;
BEGIN
  -- Get user data
  SELECT 
    EXTRACT(DAY FROM (NOW() - fu.created_at))::INTEGER,
    fu.reputation_points,
    fu.post_count
  INTO account_days, rep_points, posts
  FROM forum_users fu
  WHERE fu.user_id = p_user_id;
  
  -- Check email verification
  SELECT email_confirmed_at IS NOT NULL
  INTO email_ver
  FROM auth.users
  WHERE id = p_user_id;
  
  -- Eligibility: 15+ zile, 10+ reputație, 25+ postări, email verificat
  is_eligible := (
    account_days >= 15 
    AND rep_points >= 10 
    AND posts >= 25 
    AND email_ver = true
  );
  
  RETURN is_eligible;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. FUNCȚIE: Calcul rating vânzător (average)
-- =============================================

CREATE OR REPLACE FUNCTION get_seller_rating(p_seller_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  avg_rating NUMERIC;
BEGIN
  SELECT ROUND(AVG(rating)::NUMERIC, 2)
  INTO avg_rating
  FROM forum_marketplace_feedback
  WHERE seller_id = p_seller_id;
  
  RETURN COALESCE(avg_rating, 0);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. FUNCȚIE: Top utilizatori după reputație
-- =============================================

CREATE OR REPLACE FUNCTION get_top_users_by_reputation(result_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  username VARCHAR(50),
  reputation_points INTEGER,
  reputation_power INTEGER,
  rank VARCHAR(50),
  post_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fu.user_id,
    fu.username,
    fu.reputation_points,
    fu.reputation_power,
    fu.rank,
    fu.post_count
  FROM forum_users fu
  ORDER BY fu.reputation_points DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON FUNCTION get_forum_stats IS 'Statistici generale forum (total users, topics, posts, online, newest user)';
COMMENT ON FUNCTION search_posts IS 'Căutare full-text în postări cu ranking și highlighting';
COMMENT ON FUNCTION has_active_restriction IS 'Verifică dacă utilizatorul are o restricție activă (mute, ban, etc.)';
COMMENT ON FUNCTION check_sales_eligibility IS 'Verifică eligibilitate vânzare: 15+ zile, 10+ rep, 25+ posts, email verificat';
COMMENT ON FUNCTION get_seller_rating IS 'Calcul rating mediu vânzător (1-5 stele)';
COMMENT ON FUNCTION get_top_users_by_reputation IS 'Top utilizatori după reputație';
