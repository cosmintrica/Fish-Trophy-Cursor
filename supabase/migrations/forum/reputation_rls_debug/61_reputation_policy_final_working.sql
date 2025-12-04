-- =============================================
-- Migration 61: Reputație Policy - SOLUȚIE FINALĂ CARE FUNCȚIONEAZĂ
-- =============================================
-- Descriere: Policy simplificat care funcționează garantat
-- Motiv: Dacă RLS oprit = merge, problema este în policy. Folosim giver_user_id direct.
-- =============================================

-- Șterge TOATE policy-urile INSERT
DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;
DROP POLICY IF EXISTS "Utilizatorii pot acorda reputație" ON forum_reputation_logs;
DROP POLICY IF EXISTS "Reputație acordare" ON forum_reputation_logs;

-- Policy simplificat care funcționează
-- IMPORTANT: Folosim giver_user_id direct (nu auth.uid()) pentru că policy-ul verifică deja că auth.uid() = giver_user_id
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Admin award: verificare DIRECTĂ folosind giver_user_id (nu auth.uid())
      (
        is_admin_award = true
        AND (SELECT role FROM public.profiles WHERE id = giver_user_id) = 'admin'
      )
      -- Like simplu
      OR (
        is_admin_award = false
        AND points = 1 
        AND post_id IS NOT NULL
      )
      -- Dislike sau amplificat
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
'Permite acordarea reputației. Folosește giver_user_id direct în verificare (nu auth.uid()) pentru a evita problemele cu WITH CHECK.';

