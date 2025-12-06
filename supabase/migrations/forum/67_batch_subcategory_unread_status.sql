-- Migration 67: Create batch function for checking multiple subcategories unread status
-- This reduces N+1 queries to a single query for homepage loading

-- Function to check unread status for multiple subcategories at once
CREATE OR REPLACE FUNCTION has_unread_topics_in_subcategories_batch(
  p_user_id UUID,
  p_subcategory_ids UUID[]
)
RETURNS TABLE(subcategory_id UUID, has_unread BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: User can only check their own unread status (or admin can check anyone)
  IF p_user_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM forum_users fu
    JOIN forum_roles fr ON fu.role_id = fr.id
    WHERE fu.user_id = auth.uid()
      AND fr.name = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. You can only check your own unread status.';
  END IF;
  
  -- Returns a table with each subcategory and whether it has unread topics
  RETURN QUERY
  SELECT 
    s.id as subcategory_id,
    EXISTS (
      SELECT 1 
      FROM forum_topics t
      WHERE t.subcategory_id = s.id
        AND t.is_deleted = false
        AND (
          -- No read record exists for this topic
          NOT EXISTS (
            SELECT 1 FROM forum_topic_reads tr 
            WHERE tr.user_id = p_user_id AND tr.topic_id = t.id
          )
          OR 
          -- Has posts newer than last read
          EXISTS (
            SELECT 1 FROM forum_posts p
            JOIN forum_topic_reads tr ON tr.user_id = p_user_id AND tr.topic_id = t.id
            WHERE p.topic_id = t.id 
              AND p.is_deleted = false
              AND p.created_at > tr.last_read_at
          )
        )
    ) as has_unread
  FROM unnest(p_subcategory_ids) AS s(id);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION has_unread_topics_in_subcategories_batch TO authenticated;
GRANT EXECUTE ON FUNCTION has_unread_topics_in_subcategories_batch TO anon;

COMMENT ON FUNCTION has_unread_topics_in_subcategories_batch IS 'Batch check for unread topics in multiple subcategories - optimized for homepage loading';
