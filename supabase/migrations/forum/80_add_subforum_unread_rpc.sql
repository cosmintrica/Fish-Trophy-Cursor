-- Migration 80: Add RPC to check unread topics in a single subforum and batch subforums
-- Mirrors logic from migration 36 and 67 but for subforums

-- Function to check unread status for a single subforum
CREATE OR REPLACE FUNCTION has_unread_topics_in_subforum(p_user_id UUID, p_subforum_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verifică dacă există cel puțin un topic cu mesaje necitite în subforum
    RETURN EXISTS (
        SELECT 1
        FROM forum_topics ft
        LEFT JOIN forum_topic_reads ftr ON ft.id = ftr.topic_id AND ftr.user_id = p_user_id
        WHERE ft.subforum_id = p_subforum_id
          AND ft.is_deleted = false
          -- Unread if: No read record OR Last post is newer than last read
          AND (ftr.last_read_at IS NULL OR ft.last_post_at > ftr.last_read_at)
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION has_unread_topics_in_subforum IS 'Verifică dacă un subforum are cel puțin un topic cu mesaje necitite pentru un user specific';

-- Function to check unread status for multiple subforums at once (Batch)
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION has_unread_topics_in_subforum TO authenticated;
GRANT EXECUTE ON FUNCTION has_unread_topics_in_subforum TO anon;
GRANT EXECUTE ON FUNCTION has_unread_topics_in_subforums_batch TO authenticated;
GRANT EXECUTE ON FUNCTION has_unread_topics_in_subforums_batch TO anon;

COMMENT ON FUNCTION has_unread_topics_in_subforums_batch IS 'Batch check for unread topics in multiple subforums';
