-- Migration: Add Private Messages System (Unified for Site & Forum)
-- Created: 2025-11-28
-- Description: Unified messaging system with inbox/sent/archived folders, separate for site and forum

-- =============================================
-- 1. PRIVATE MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participants
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Content
  subject TEXT NOT NULL CHECK (char_length(subject) > 0 AND char_length(subject) <= 200),
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 5000),
  
  -- Context: 'site' or 'forum'
  context VARCHAR(20) NOT NULL DEFAULT 'site' CHECK (context IN ('site', 'forum')),
  
  -- Threading (for replies)
  parent_message_id UUID REFERENCES public.private_messages(id) ON DELETE SET NULL,
  thread_root_id UUID REFERENCES public.private_messages(id) ON DELETE SET NULL,
  
  -- Status flags
  is_read BOOLEAN DEFAULT false,
  is_archived_by_sender BOOLEAN DEFAULT false,
  is_archived_by_recipient BOOLEAN DEFAULT false,
  is_deleted_by_sender BOOLEAN DEFAULT false,
  is_deleted_by_recipient BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.private_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.private_messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_context ON public.private_messages(context);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.private_messages(thread_root_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.private_messages(recipient_id, is_read) WHERE is_read = false;

-- RLS for private_messages
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages where they are sender or recipient
CREATE POLICY "Users can view own messages"
  ON public.private_messages FOR SELECT
  USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

-- Users can send messages
CREATE POLICY "Users can send messages"
  ON public.private_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update own messages (mark as read, archive, delete)
CREATE POLICY "Users can update own message status"
  ON public.private_messages FOR UPDATE
  USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  )
  WITH CHECK (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

-- Users can delete own messages (soft delete)
CREATE POLICY "Users can delete own messages"
  ON public.private_messages FOR UPDATE
  USING (
    (auth.uid() = sender_id AND NOT is_deleted_by_sender) OR
    (auth.uid() = recipient_id AND NOT is_deleted_by_recipient)
  )
  WITH CHECK (
    (auth.uid() = sender_id AND NOT is_deleted_by_sender) OR
    (auth.uid() = recipient_id AND NOT is_deleted_by_recipient)
  );

-- =============================================
-- 2. MESSAGE ATTACHMENTS (Optional - for future)
-- =============================================
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.private_messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_message ON public.message_attachments(message_id);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments of own messages"
  ON public.message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.private_messages pm
      WHERE pm.id = message_attachments.message_id
      AND (pm.sender_id = auth.uid() OR pm.recipient_id = auth.uid())
    )
  );

-- =============================================
-- 3. HELPER FUNCTIONS
-- =============================================

-- Function to mark message as read
CREATE OR REPLACE FUNCTION public.mark_message_read(message_uuid UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.private_messages
  SET is_read = true,
      read_at = NOW()
  WHERE id = message_uuid
    AND recipient_id = auth.uid()
    AND is_read = false;
END;
$$;

-- Function to get unread count per context
CREATE OR REPLACE FUNCTION public.get_unread_message_count(msg_context VARCHAR)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM public.private_messages
  WHERE recipient_id = auth.uid()
    AND is_read = false
    AND is_deleted_by_recipient = false
    AND context = msg_context;
  
  RETURN COALESCE(unread_count, 0);
END;
$$;

-- Function to set thread_root_id on insert
CREATE OR REPLACE FUNCTION public.set_thread_root()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_message_id IS NOT NULL THEN
    -- Get the root of the thread
    SELECT COALESCE(thread_root_id, id) INTO NEW.thread_root_id
    FROM public.private_messages
    WHERE id = NEW.parent_message_id;
  ELSE
    -- This is a new thread, root is itself
    NEW.thread_root_id := NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_thread_root_trigger
BEFORE INSERT ON public.private_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_thread_root();

-- =============================================
-- 4. VIEWS FOR EASY QUERYING
-- =============================================

-- Inbox view (messages received, not deleted by recipient)
CREATE OR REPLACE VIEW public.messages_inbox AS
SELECT 
  pm.*,
  sender.display_name AS sender_name,
  sender.username AS sender_username,
  sender.photo_url AS sender_avatar,
  recipient.display_name AS recipient_name,
  recipient.username AS recipient_username,
  recipient.photo_url AS recipient_avatar,
  (
    SELECT COUNT(*) 
    FROM public.private_messages replies
    WHERE replies.thread_root_id = pm.thread_root_id
    AND replies.id != pm.id
    AND (replies.sender_id = auth.uid() OR replies.recipient_id = auth.uid())
    AND (
      (replies.sender_id = auth.uid() AND NOT replies.is_deleted_by_sender) OR
      (replies.recipient_id = auth.uid() AND NOT replies.is_deleted_by_recipient)
    )
  ) AS reply_count
FROM public.private_messages pm
JOIN public.profiles sender ON sender.id = pm.sender_id
JOIN public.profiles recipient ON recipient.id = pm.recipient_id
WHERE pm.recipient_id = auth.uid()
  AND pm.is_deleted_by_recipient = false
  AND pm.is_archived_by_recipient = false;

-- Sent view (messages sent, not deleted by sender)
CREATE OR REPLACE VIEW public.messages_sent AS
SELECT 
  pm.*,
  sender.display_name AS sender_name,
  sender.username AS sender_username,
  sender.photo_url AS sender_avatar,
  recipient.display_name AS recipient_name,
  recipient.username AS recipient_username,
  recipient.photo_url AS recipient_avatar,
  (
    SELECT COUNT(*) 
    FROM public.private_messages replies
    WHERE replies.thread_root_id = pm.thread_root_id
    AND replies.id != pm.id
    AND (replies.sender_id = auth.uid() OR replies.recipient_id = auth.uid())
    AND (
      (replies.sender_id = auth.uid() AND NOT replies.is_deleted_by_sender) OR
      (replies.recipient_id = auth.uid() AND NOT replies.is_deleted_by_recipient)
    )
  ) AS reply_count
FROM public.private_messages pm
JOIN public.profiles sender ON sender.id = pm.sender_id
JOIN public.profiles recipient ON recipient.id = pm.recipient_id
WHERE pm.sender_id = auth.uid()
  AND pm.is_deleted_by_sender = false
  AND pm.is_archived_by_sender = false;

-- Archived view (messages archived by current user)
CREATE OR REPLACE VIEW public.messages_archived AS
SELECT 
  pm.*,
  sender.display_name AS sender_name,
  sender.username AS sender_username,
  sender.photo_url AS sender_avatar,
  recipient.display_name AS recipient_name,
  recipient.username AS recipient_username,
  recipient.photo_url AS recipient_avatar
FROM public.private_messages pm
JOIN public.profiles sender ON sender.id = pm.sender_id
JOIN public.profiles recipient ON recipient.id = pm.recipient_id
WHERE (
  (pm.sender_id = auth.uid() AND pm.is_archived_by_sender = true AND pm.is_deleted_by_sender = false) OR
  (pm.recipient_id = auth.uid() AND pm.is_archived_by_recipient = true AND pm.is_deleted_by_recipient = false)
);

