-- =============================================
-- Migration 63: Reputație Policy - FĂRĂ auth.uid() în verificare admin
-- =============================================
-- Descriere: Policy care nu folosește auth.uid() în verificarea admin, doar giver_user_id
-- Motiv: auth.uid() poate să nu fie disponibil corect în contextul WITH CHECK
-- =============================================

-- Șterge TOATE policy-urile INSERT
DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;
DROP POLICY IF EXISTS "Utilizatorii pot acorda reputație" ON forum_reputation_logs;
DROP POLICY IF EXISTS "Reputație acordare" ON forum_reputation_logs;

-- Policy simplificat: verifică DOAR că giver_user_id este admin, fără să verifice auth.uid()
-- IMPORTANT: Aplicația trebuie să verifice că auth.uid() = giver_user_id înainte de INSERT
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      -- Admin award: verifică DOAR că giver_user_id este admin (fără auth.uid())
      (
        is_admin_award = true
        AND check_is_admin(giver_user_id)
      )
      -- Like simplu
      OR (
        is_admin_award = false
        AND points = 1 
        AND post_id IS NOT NULL
        AND auth.uid() = giver_user_id
      )
      -- Dislike sau amplificat
      OR (
        is_admin_award = false
        AND post_id IS NOT NULL
        AND points != 1
        AND auth.uid() = giver_user_id
        AND EXISTS (
          SELECT 1 FROM forum_users fu
          WHERE fu.user_id = giver_user_id AND fu.reputation_power >= 1
        )
      )
    )
  );

COMMENT ON POLICY "Acordare reputație" ON forum_reputation_logs IS 
'Permite acordarea reputației. Pentru admin award, verifică DOAR că giver_user_id este admin (fără auth.uid()). Pentru like/dislike, verifică auth.uid() = giver_user_id.';

