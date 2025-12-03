-- =============================================
-- Migration 28: Adaugă Coloane pentru Motive Ștergere/Editare
-- =============================================
-- Descriere: Adaugă coloane pentru audit și GDPR - motive ștergere/editare
-- Dependințe: 06_topics_posts.sql
-- =============================================

-- Adăugă coloane pentru tracking ștergere (soft delete cu audit)
ALTER TABLE forum_posts 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS delete_reason TEXT,
ADD COLUMN IF NOT EXISTS edit_reason TEXT,
ADD COLUMN IF NOT EXISTS edited_by_admin BOOLEAN DEFAULT FALSE;

-- Comentarii pentru claritate
COMMENT ON COLUMN forum_posts.deleted_at IS 'Data și ora când a fost ștearsă postarea (soft delete)';
COMMENT ON COLUMN forum_posts.deleted_by IS 'Utilizatorul (admin/moderator) care a șters postarea';
COMMENT ON COLUMN forum_posts.delete_reason IS 'Motivul obligatoriu pentru ștergere (pentru audit și GDPR)';
COMMENT ON COLUMN forum_posts.edit_reason IS 'Motivul editării când admin editează o postare';
COMMENT ON COLUMN forum_posts.edited_by_admin IS 'True dacă postarea a fost editată de un administrator';

-- Indexuri pentru performanță
CREATE INDEX IF NOT EXISTS idx_forum_posts_deleted ON forum_posts(deleted_at) WHERE is_deleted = true;
CREATE INDEX IF NOT EXISTS idx_forum_posts_deleted_by ON forum_posts(deleted_by) WHERE is_deleted = true;

-- =============================================
-- FUNCȚIE: Ștergere automată postări după 30 zile
-- =============================================

-- Funcție pentru ștergerea permanentă a postărilor șterse (soft delete) după 30 zile
CREATE OR REPLACE FUNCTION public.permanently_delete_old_posts()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Șterge permanent postările cu is_deleted = true și deleted_at mai vechi de 30 zile
    WITH deleted AS (
        DELETE FROM forum_posts
        WHERE is_deleted = true
        AND deleted_at IS NOT NULL
        AND deleted_at < NOW() - INTERVAL '30 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN QUERY SELECT deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarii
COMMENT ON FUNCTION public.permanently_delete_old_posts() IS 
'Șterge permanent postările marcate ca șterse (soft delete) care au fost șterse acum mai mult de 30 zile. 
Rulează zilnic prin cron job pentru conformitate GDPR.';

-- Grant execute permission (doar pentru sistem/admin)
-- Funcția este SECURITY DEFINER, deci rulează cu privilegiile owner-ului

-- =============================================
-- CONFIGURARE ȘTERGERE AUTOMATĂ
-- =============================================
-- 
-- IMPORTANT: Supabase NU are secțiune "Cron Jobs" în Dashboard!
-- Există doar Edge Functions. Soluția implementată:
-- 
-- ✅ Edge Function creat: supabase/functions/delete-old-posts/
-- ✅ GitHub Actions workflow: .github/workflows/delete-old-posts.yml
-- ✅ Rulează zilnic la 2:00 AM UTC automat
-- 
-- Pentru a activa:
-- 1. Deploy Edge Function: supabase functions deploy delete-old-posts
-- 2. Workflow-ul GitHub Actions rulează automat (dacă repo e pe GitHub)
-- 
-- Sau testează manual în SQL Editor:
--    SELECT public.permanently_delete_old_posts();
-- 
-- Vezi instrucțiuni detaliate în: docs/guides/admin/SCHEDULED_JOBS_SETUP.md
-- =============================================
