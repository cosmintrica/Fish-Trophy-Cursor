-- =============================================
-- Migration 39: Fix RLS pentru Admin Award Reputație + post_id nullable
-- =============================================
-- Descriere: 
-- 1. Face post_id nullable pentru admin awards (care nu sunt legate de o postare)
-- 2. Corectează politica RLS pentru INSERT pe forum_reputation_logs
--    pentru a permite adminilor să acorde reputație nelimitată
-- Dependințe: 07_reputation.sql, 15_rls_content.sql, 25_fix_reputation_logs_rls_final.sql
-- =============================================

-- 1. Face post_id nullable pentru admin awards
-- Admin awards nu sunt legate de o postare specifică
-- IMPORTANT: Trebuie să ștergem constraint-ul NOT NULL și să actualizăm foreign key-ul
ALTER TABLE forum_reputation_logs 
  ALTER COLUMN post_id DROP NOT NULL;

-- Actualizează foreign key constraint pentru a permite NULL
-- Foreign key-ul implicit permite NULL, dar trebuie să ne asigurăm că constraint-ul este corect
-- Nu trebuie să ștergem foreign key-ul, doar să permitem NULL

-- 2. Drop existing policy
DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;

-- 3. Re-create policy cu verificare corectă pentru admin award
-- IMPORTANT: Folosim funcția is_forum_admin() (SECURITY DEFINER) pentru verificare admin
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

COMMENT ON COLUMN forum_reputation_logs.post_id IS 
'ID-ul postării asociate. NULL pentru admin awards (acordări manuale de către admin).';

