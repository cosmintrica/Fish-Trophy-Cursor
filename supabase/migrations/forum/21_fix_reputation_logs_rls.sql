-- =============================================
-- Migration 21: Fix RLS Infinite Recursion in forum_reputation_logs
-- =============================================
-- Descriere: Corectează politica RLS pentru forum_reputation_logs
-- folosind funcția is_forum_admin() pentru a evita recursivitatea infinită
-- =============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Log-uri reputație vizibile limitat" ON forum_reputation_logs;

-- Re-create policy using is_forum_admin() function (SECURITY DEFINER)
CREATE POLICY "Log-uri reputație vizibile limitat" ON forum_reputation_logs
  FOR SELECT USING (
    -- Adminii văd TOATE log-urile (folosind funcția SECURITY DEFINER)
    is_forum_admin()
    -- Alții văd doar ultimele 10 log-uri per utilizator
    OR id IN (
      SELECT id FROM forum_reputation_logs rl2
      WHERE rl2.receiver_user_id = forum_reputation_logs.receiver_user_id
      ORDER BY rl2.created_at DESC
      LIMIT 10
    )
  );

COMMENT ON POLICY "Log-uri reputație vizibile limitat" ON forum_reputation_logs IS 
'Public: ultimele 10 log-uri pe profil utilizator. Admin: toate log-urile în admin panel. Folosește is_forum_admin() pentru a evita recursivitatea infinită.';

