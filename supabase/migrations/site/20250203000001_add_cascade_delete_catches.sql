-- Migration: Add Cascade Delete for Catches
-- Created: 2025-12-03
-- Description: Ensure that when a catch is deleted, all related data (likes, comments, files) are automatically deleted

-- =============================================
-- 1. VERIFY CASCADE DELETE IS ALREADY SET
-- =============================================
-- catch_likes already has ON DELETE CASCADE (line 69)
-- catch_comments already has ON DELETE CASCADE (line 101)
-- catch_comments parent_comment_id already has ON DELETE CASCADE (line 103)

-- =============================================
-- 2. FUNCTION TO DELETE CATCH FILES FROM R2
-- =============================================
-- Note: This function will be called via Netlify Function or Edge Function
-- We can't directly delete from R2 in PostgreSQL, but we can trigger a webhook
-- For now, we'll create a function that can be called from the application

CREATE OR REPLACE FUNCTION public.delete_catch_files(catch_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  catch_record RECORD;
BEGIN
  -- Get catch data
  SELECT photo_url, video_url INTO catch_record
  FROM public.catches
  WHERE id = catch_uuid;
  
  -- Files will be deleted via application logic (Netlify Function)
  -- This function is a placeholder for future implementation
  -- The actual deletion should happen in the application layer
END;
$$;

-- =============================================
-- 3. TRIGGER TO CLEAN UP WHEN CATCH IS DELETED
-- =============================================
-- Note: Likes and comments are already handled by CASCADE
-- This trigger is for logging or future file cleanup

CREATE OR REPLACE FUNCTION public.on_catch_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log deletion (optional, for analytics)
  -- INSERT INTO deletion_log (table_name, record_id, deleted_at) 
  -- VALUES ('catches', OLD.id, NOW());
  
  -- Note: File deletion should be handled in application layer
  -- Call Netlify Function to delete from R2 storage
  
  RETURN OLD;
END;
$$;

CREATE TRIGGER catch_deletion_trigger
AFTER DELETE ON public.catches
FOR EACH ROW
EXECUTE FUNCTION public.on_catch_delete();

-- =============================================
-- 4. VERIFY FOREIGN KEY CONSTRAINTS
-- =============================================
-- Verify that cascade delete is properly set
DO $$
BEGIN
  -- Check catch_likes foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_name = 'catch_likes' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND rc.delete_rule = 'CASCADE'
  ) THEN
    RAISE EXCEPTION 'Cascade delete not properly configured for catch_likes';
  END IF;
  
  -- Check catch_comments foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_name = 'catch_comments' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND rc.delete_rule = 'CASCADE'
  ) THEN
    RAISE EXCEPTION 'Cascade delete not properly configured for catch_comments';
  END IF;
END $$;

