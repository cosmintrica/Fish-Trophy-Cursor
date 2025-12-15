-- =============================================
-- Script pentru recalcularea reputației
-- =============================================
-- Rulează acest script în Supabase SQL Editor
-- după ce ai aplicat migrația 92_fix_reputation_on_delete.sql
-- =============================================

-- Opțiunea 1: Recalculează toate valorile bazat pe log-urile rămase
-- (Dacă ai șters toate log-urile, toate valorile vor fi 0)
UPDATE forum_users
SET reputation_points = COALESCE((
  SELECT SUM(points)
  FROM forum_reputation_logs
  WHERE receiver_user_id = forum_users.user_id
), 0);

-- Opțiunea 2: Sau setează toate valorile la 0 dacă ai șters toate log-urile
-- DECOMMENTEAZĂ linia de mai jos dacă vrei să setezi toate valorile la 0:
-- UPDATE forum_users SET reputation_points = 0;

-- Verifică rezultatul
SELECT 
  user_id,
  username,
  reputation_points,
  reputation_power
FROM forum_users
ORDER BY reputation_points DESC
LIMIT 10;
