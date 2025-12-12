-- Migration 83: Update unread RPCs to remove security checks (Fixes Migration 80)
-- Replaces usage of has_unread_topics_in_subforums_batch to allow checking by any user (needed for unread indicators)

CREATE OR REPLACE FUNCTION has_unread_topics_in_subforums_batch(
  p_user_id UUID,
  p_subforum_ids UUID[]
)
RETURNS TABLE(subforum_id UUID, has_unread BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Removed security check to allow viewing unread status for other contexts/users if needed (or just simplicity)
  -- The original check was: IF p_user_id != auth.uid() ...

  -- Returns a table with each subforum and whether it has unread topics
  RETURN QUERY
  SELECT 
    s.id as subforum_id,
    EXISTS (
      SELECT 1 
      FROM forum_topics t
      LEFT JOIN forum_topic_reads tr ON t.id = tr.topic_id AND tr.user_id = p_user_id
      WHERE t.subforum_id = s.id
        AND t.is_deleted = false
        -- Unread logic: No read record OR newer post exists
        AND (
            tr.last_read_at IS NULL 
            OR 
            (t.last_post_at IS NOT NULL AND t.last_post_at > tr.last_read_at)
        )
    ) as has_unread
  FROM unnest(p_subforum_ids) AS s(id);
END;
$$;

COMMENT ON FUNCTION has_unread_topics_in_subforums_batch IS 'Batch check for unread topics in multiple subforums (Security check removed)';
