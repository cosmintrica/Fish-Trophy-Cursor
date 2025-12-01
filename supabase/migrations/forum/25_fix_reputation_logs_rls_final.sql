-- =============================================
-- Migration 25: Fix RLS Infinite Recursion in forum_reputation_logs (FINAL)
-- =============================================
-- Descriere: Corectează definitiv politica RLS pentru forum_reputation_logs
-- eliminând subquery-ul care cauzează recursiune infinită
-- =============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Log-uri reputație vizibile limitat" ON forum_reputation_logs;

-- Re-create policy WITHOUT subquery to avoid infinite recursion
-- Adminii văd toate log-urile, alții văd doar ultimele 10 per utilizator
-- Folosim o funcție SECURITY DEFINER pentru a evita recursiunea
CREATE OR REPLACE FUNCTION get_visible_reputation_log_ids(receiver_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Dacă e admin, returnează toate ID-urile (va fi filtrat în policy)
  IF is_forum_admin() THEN
    RETURN QUERY SELECT id FROM forum_reputation_logs WHERE receiver_user_id = receiver_id;
  ELSE
    -- Alții: doar ultimele 10
    RETURN QUERY 
    SELECT id 
    FROM forum_reputation_logs 
    WHERE receiver_user_id = receiver_id
    ORDER BY created_at DESC 
    LIMIT 10;
  END IF;
END;
$$;

-- Policy simplificată care folosește funcția SECURITY DEFINER
CREATE POLICY "Log-uri reputație vizibile limitat" ON forum_reputation_logs
  FOR SELECT USING (
    id = ANY(SELECT get_visible_reputation_log_ids(receiver_user_id))
  );

COMMENT ON POLICY "Log-uri reputație vizibile limitat" ON forum_reputation_logs IS 
'Public: ultimele 10 log-uri pe profil utilizator. Admin: toate log-urile în admin panel. Folosește funcție SECURITY DEFINER pentru a evita recursivitatea infinită.';

COMMENT ON FUNCTION get_visible_reputation_log_ids IS 
'Returnează ID-urile log-urilor de reputație vizibile pentru un utilizator. Admin: toate. Alții: ultimele 10. SECURITY DEFINER pentru a evita recursiune RLS.';

-- Fix get_forum_stats function to use SECURITY DEFINER for forum_reputation_logs access
CREATE OR REPLACE FUNCTION get_forum_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

COMMENT ON FUNCTION get_forum_stats IS 
'Statistici generale forum. SECURITY DEFINER pentru a accesa forum_reputation_logs fără recursiune RLS.';

