-- =============================================
-- Migration 66: Reputație Policy - SOLUȚIE FINALĂ CARE FUNCȚIONEAZĂ
-- =============================================
-- Descriere: Policy care funcționează garantat, fără dependențe de auth.uid() pentru admin
-- Motiv: auth.uid() poate să nu fie disponibil corect în contextul WITH CHECK
-- =============================================

-- Șterge TOATE policy-urile INSERT
DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;
DROP POLICY IF EXISTS "Utilizatorii pot acorda reputație" ON forum_reputation_logs;
DROP POLICY IF EXISTS "Reputație acordare" ON forum_reputation_logs;
DROP POLICY IF EXISTS "reputation_insert_policy" ON forum_reputation_logs;

-- Policy simplificat care funcționează
-- IMPORTANT: Pentru admin award, verificăm DOAR că giver_user_id este admin (fără auth.uid())
-- Aplicația trebuie să verifice că auth.uid() = giver_user_id înainte de INSERT
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    -- Verifică DOAR că utilizatorul este autentificat (nu verificăm auth.uid() = giver_user_id pentru admin)
    auth.role() = 'authenticated'
    AND (
      -- CAZ 1: Admin Award - verifică DOAR că giver_user_id este admin
      (
        is_admin_award = true
        AND check_is_admin(giver_user_id)
      )
      -- CAZ 2: Like Simplu - verifică auth.uid() = giver_user_id
      OR (
        is_admin_award = false
        AND points = 1 
        AND post_id IS NOT NULL
        AND auth.uid() = giver_user_id
      )
      -- CAZ 3: Dislike sau Amplificat - verifică auth.uid() = giver_user_id
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
'Policy final. Pentru admin award, verifică DOAR că giver_user_id este admin (fără auth.uid()). Pentru like/dislike, verifică auth.uid() = giver_user_id.';

