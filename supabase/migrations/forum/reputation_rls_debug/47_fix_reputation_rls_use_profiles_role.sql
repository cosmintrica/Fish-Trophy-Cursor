-- =============================================
-- Migration 47: Fix RLS pentru Reputație - Folosește profiles.role direct
-- =============================================
-- Descriere: Simplifică verificarea admin folosind profiles.role direct
-- Motiv: profiles.role este întotdeauna sincronizat și mai simplu
-- Dependințe: 18_fix_rls_recursion_FIXED.sql, 39_fix_reputation_admin_award_rls.sql
-- =============================================

-- =============================================
-- 1. FIX: Politica INSERT - Folosește profiles.role direct
-- =============================================

-- Șterge politica INSERT veche
DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;

-- Re-creăm politica INSERT folosind profiles.role direct (mai simplu și mai safe)
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Admin award: doar admini (nelimitat), post_id poate fi NULL
      -- Folosim profiles.role direct (mai simplu și mai safe)
      (
        is_admin_award = true
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        -- post_id poate fi NULL pentru admin awards
      )
      -- Like simplu: oricine (putere 0+), post_id obligatoriu, NU admin award
      OR (
        points = 1 
        AND is_admin_award = false 
        AND post_id IS NOT NULL
      )
      -- Dislike sau amplificat: doar putere 1+ (50+ reputație), post_id obligatoriu, NU admin award
      OR (
        is_admin_award = false
        AND post_id IS NOT NULL
        AND points != 1
        AND EXISTS (
          SELECT 1 FROM forum_users fu
          WHERE fu.user_id = auth.uid() AND fu.reputation_power >= 1
        )
      )
    )
  );

COMMENT ON POLICY "Acordare reputație" ON forum_reputation_logs IS 
'Permite acordarea reputației: like simplu (oricine), dislike/amplificat (putere 1+), admin award (doar admini din profiles.role, nelimitat, post_id nullable). Folosește profiles.role direct pentru simplitate și siguranță.';

-- =============================================
-- 2. FIX: Politica SELECT - Folosește funcție SECURITY DEFINER pentru a evita recursiune
-- =============================================

-- IMPORTANT: Nu putem folosi subquery direct în policy pentru că creează recursiune infinită
-- Trebuie să folosim o funcție SECURITY DEFINER care bypass RLS

-- Șterge funcția veche (dacă există)
DROP FUNCTION IF EXISTS get_visible_reputation_log_ids(UUID);

-- Creează funcție SECURITY DEFINER care folosește profiles.role direct
CREATE OR REPLACE FUNCTION get_visible_reputation_log_ids(receiver_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Dacă e admin (din profiles.role), returnează toate ID-urile
  IF (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' THEN
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

-- Șterge politica SELECT veche
DROP POLICY IF EXISTS "Log-uri reputație vizibile limitat" ON forum_reputation_logs;

-- Re-creăm politica SELECT folosind funcția SECURITY DEFINER (evită recursiune)
CREATE POLICY "Log-uri reputație vizibile limitat" ON forum_reputation_logs
  FOR SELECT USING (
    id = ANY(SELECT get_visible_reputation_log_ids(receiver_user_id))
  );

COMMENT ON POLICY "Log-uri reputație vizibile limitat" ON forum_reputation_logs IS 
'Public: ultimele 10 log-uri pe profil utilizator. Admin (din profiles.role): toate log-urile în admin panel. Folosește funcție SECURITY DEFINER (get_visible_reputation_log_ids) pentru a evita recursiunea infinită.';

COMMENT ON FUNCTION get_visible_reputation_log_ids IS 
'Returnează ID-urile log-urilor de reputație vizibile pentru un utilizator. Admin (din profiles.role): toate. Alții: ultimele 10. SECURITY DEFINER pentru a evita recursiune RLS. Folosește profiles.role direct pentru simplitate.';

