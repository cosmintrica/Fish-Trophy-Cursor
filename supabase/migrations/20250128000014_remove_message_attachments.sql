-- Remove message_attachments table (not needed - no attachments in private messages)
-- Migration: 20250128000014_remove_message_attachments.sql
-- Description: Removes message_attachments table and related policies/indexes
--              as attachments will not be supported in private messages

-- Drop policies first
DROP POLICY IF EXISTS "Users can view attachments of own messages" ON public.message_attachments;
DROP POLICY IF EXISTS "Users can insert attachments to own messages" ON public.message_attachments;
DROP POLICY IF EXISTS "Users can delete own attachments" ON public.message_attachments;

-- Drop index
DROP INDEX IF EXISTS public.idx_attachments_message;

-- Drop table
DROP TABLE IF EXISTS public.message_attachments;

