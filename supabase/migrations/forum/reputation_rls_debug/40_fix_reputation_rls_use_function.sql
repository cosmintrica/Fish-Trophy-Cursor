-- =============================================
-- Migration 40: Fix RLS pentru Admin Award - Folosește is_forum_admin()
-- =============================================
-- Descriere: Forțează actualizarea policy-ului să folosească is_forum_admin()
-- în loc de verificare directă, pentru a funcționa corect în contextul RLS
-- Dependințe: 18_fix_rls_recursion_FIXED.sql, 39_fix_reputation_admin_award_rls.sql
-- =============================================

-- IMPORTANT: Verifică dacă funcția is_forum_admin() există și funcționează
-- Dacă nu există, o creăm
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_forum_admin'
  ) THEN
    -- Creează funcția dacă nu există
    CREATE OR REPLACE FUNCTION is_forum_admin()
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    STABLE
    AS $$
    BEGIN
      IF auth.uid() IS NULL THEN
        RETURN false;
      END IF;
      
      RETURN EXISTS (
        SELECT 1
        FROM forum_users fu
        JOIN forum_roles fr ON fu.role_id = fr.id
        WHERE fu.user_id = auth.uid()
          AND fr.name = 'admin'
      );
    END;
    $$;
    
    GRANT EXECUTE ON FUNCTION is_forum_admin() TO authenticated;
    GRANT EXECUTE ON FUNCTION is_forum_admin() TO anon;
  END IF;
END $$;

-- Drop existing policy (dacă există)
DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;

-- Re-create policy cu is_forum_admin() (SECURITY DEFINER)
-- Această funcție bypass RLS și funcționează corect în contextul WITH CHECK
CREATE POLICY "Acordare reputație" ON forum_reputation_logs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = giver_user_id
    AND (
      -- Admin award: doar admini (nelimitat), post_id poate fi NULL
      -- Verificăm PRIMUL pentru a evita conflicte cu condițiile pentru like-uri normale
      -- Folosim is_forum_admin() care este SECURITY DEFINER și funcționează corect în RLS
      (
        is_admin_award = true
        AND is_forum_admin()
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
'Permite acordarea reputației: like simplu (oricine), dislike/amplificat (putere 1+), admin award (doar admini, nelimitat, post_id nullable). Folosește is_forum_admin() (SECURITY DEFINER) pentru verificare admin, care funcționează corect în contextul RLS WITH CHECK.';

