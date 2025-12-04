-- =============================================
-- Migration 72: Optimized Topics with Authors
-- =============================================
-- Replaces N+1 query pattern with single optimized query
-- Returns topics with author display_name in one query
-- =============================================

-- Create optimized RPC function
CREATE OR REPLACE FUNCTION get_topics_with_authors(
  p_subcategory_id UUID,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
  v_total INT;
  v_result JSON;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  
  -- Get total count
  SELECT COUNT(*) INTO v_total
  FROM forum_topics
  WHERE subcategory_id = p_subcategory_id AND is_deleted = false;
  
  -- Build result with topics and author info
  SELECT json_build_object(
    'data', COALESCE(
      (
        SELECT json_agg(topic_data)
        FROM (
          SELECT 
            t.id,
            t.subcategory_id,
            t.user_id,
            t.title,
            t.slug,
            t.topic_type,
            t.is_pinned,
            t.is_locked,
            t.is_deleted,
            t.view_count,
            t.reply_count,
            t.last_post_at,
            t.last_post_user_id,
            t.created_at,
            t.updated_at,
            -- Author data from profiles
            COALESCE(pr.display_name, pr.username, SPLIT_PART(pr.email, '@', 1), 'Unknown') AS author_username,
            pr.photo_url AS author_avatar,
            -- Last post author
            COALESCE(pr_last.display_name, pr_last.username, SPLIT_PART(pr_last.email, '@', 1), NULL) AS last_post_author
          FROM forum_topics t
          LEFT JOIN profiles pr ON t.user_id = pr.id
          LEFT JOIN profiles pr_last ON t.last_post_user_id = pr_last.id
          WHERE t.subcategory_id = p_subcategory_id AND t.is_deleted = false
          ORDER BY t.is_pinned DESC, t.last_post_at DESC NULLS LAST
          LIMIT p_page_size
          OFFSET v_offset
        ) AS topic_data
      ),
      '[]'::json
    ),
    'total', v_total,
    'page', p_page,
    'page_size', p_page_size,
    'has_more', (v_offset + p_page_size) < v_total
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_topics_with_authors(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_topics_with_authors(UUID, INT, INT) TO anon;

-- Create index for optimal query performance
CREATE INDEX IF NOT EXISTS idx_forum_topics_subcategory_pinned_lastpost 
  ON forum_topics(subcategory_id, is_pinned DESC, last_post_at DESC NULLS LAST) 
  WHERE is_deleted = false;

-- Comment
COMMENT ON FUNCTION get_topics_with_authors IS 
'Optimized RPC: Returns paginated topics with author data (display_name, avatar) in a single query. Replaces 2 queries pattern with 1 query.';
