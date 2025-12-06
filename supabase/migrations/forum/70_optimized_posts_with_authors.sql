-- =============================================
-- Migration 70: Optimized Posts with Authors (FIXED)
-- =============================================
-- Replaces N+1 query pattern (60+ queries) with single optimized query
-- Returns posts with full author data using JOINs
-- =============================================

-- Create optimized RPC function
CREATE OR REPLACE FUNCTION get_posts_with_authors(
  p_topic_id UUID,
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
  v_topic_exists BOOLEAN;
BEGIN
  -- Security check: Verify topic exists and is not deleted
  SELECT EXISTS (
    SELECT 1 FROM forum_topics
    WHERE id = p_topic_id AND is_deleted = false
  ) INTO v_topic_exists;
  
  IF NOT v_topic_exists THEN
    RETURN json_build_object(
      'data', '[]'::json,
      'total', 0,
      'page', p_page,
      'page_size', p_page_size,
      'has_more', false,
      'error', 'Topic not found or deleted'
    );
  END IF;
  
  v_offset := (p_page - 1) * p_page_size;
  
  SELECT COUNT(*) INTO v_total
  FROM forum_posts
  WHERE topic_id = p_topic_id AND is_deleted = false;
  
  SELECT json_build_object(
    'data', COALESCE(
      (
        SELECT json_agg(post_data ORDER BY post_data.created_at ASC)
        FROM (
          SELECT 
            p.id,
            p.topic_id,
            p.user_id,
            p.content,
            p.is_first_post,
            p.is_edited,
            p.edited_at,
            p.edited_by,
            p.edit_reason,
            p.is_deleted,
            p.deleted_at,
            p.deleted_by,
            p.delete_reason,
            p.post_number,
            p.created_at,
            COALESCE(pr.display_name, pr.username, SPLIT_PART(pr.email, '@', 1), 'Unknown') AS author_username,
            pr.photo_url AS author_avatar,
            COALESCE(fu.reputation_points, 0) AS author_respect,
            COALESCE(fu.rank, 'pescar') AS author_rank,
            CASE 
              WHEN p.edited_by IS NOT NULL AND p.edited_by != p.user_id THEN
                COALESCE(pr_editor.display_name, pr_editor.username, SPLIT_PART(pr_editor.email, '@', 1), 'Unknown')
              ELSE NULL
            END AS edited_by_username
          FROM forum_posts p
          LEFT JOIN profiles pr ON p.user_id = pr.id
          LEFT JOIN forum_users fu ON p.user_id = fu.user_id
          LEFT JOIN profiles pr_editor ON p.edited_by = pr_editor.id
          WHERE p.topic_id = p_topic_id AND p.is_deleted = false
          ORDER BY p.created_at ASC
          LIMIT p_page_size
          OFFSET v_offset
        ) AS post_data
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
GRANT EXECUTE ON FUNCTION get_posts_with_authors(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_posts_with_authors(UUID, INT, INT) TO anon;

-- Create indexes for optimal query performance (if not exist)
CREATE INDEX IF NOT EXISTS idx_forum_posts_topic_id_created 
  ON forum_posts(topic_id, created_at) 
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_forum_users_user_id 
  ON forum_users(user_id);

-- Comment
COMMENT ON FUNCTION get_posts_with_authors IS 
'Optimized RPC: Returns paginated posts with full author data (username, avatar, rank, reputation) in a single query. Replaces N+1 pattern of 60+ queries with 1 query.';
