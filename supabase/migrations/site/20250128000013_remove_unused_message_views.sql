-- Remove unused message views
-- Migration: 20250128000013_remove_unused_message_views.sql
-- Description: Removes messages_inbox, messages_sent, messages_archived views
--              as they don't include encryption fields and are no longer needed

DROP VIEW IF EXISTS public.messages_inbox;
DROP VIEW IF EXISTS public.messages_sent;
DROP VIEW IF EXISTS public.messages_archived;

