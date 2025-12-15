-- =============================================
-- Migration 85: Update get_posts_with_authors RPC to include user details
-- =============================================
-- Descriere: Adăugare câmpuri suplimentare pentru sidebar (location, post_count, reputation_power)
-- Dependințe: 70_optimized_posts_with_authors.sql
-- =============================================

-- Update RPC function to include additional user details
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
            COALESCE(fu.username, pr.username, SPLIT_PART(pr.email, '@', 1), 'Unknown') AS author_username,
            pr.photo_url AS author_avatar,
            COALESCE(fu.reputation_points, 0) AS author_respect,
            COALESCE(fu.rank, 'pescar') AS author_rank,
            COALESCE(fu.post_count, 0) AS author_post_count,
            COALESCE(fu.reputation_power, 0) AS author_reputation_power,
            pr.location AS author_location,
            CASE 
              WHEN p.edited_by IS NOT NULL THEN
                COALESCE(fu_editor.username, pr_editor.username, SPLIT_PART(pr_editor.email, '@', 1), 'Unknown')
              ELSE NULL
            END AS edited_by_username
          FROM forum_posts p
          LEFT JOIN profiles pr ON p.user_id = pr.id
          LEFT JOIN forum_users fu ON p.user_id = fu.user_id
          LEFT JOIN profiles pr_editor ON p.edited_by = pr_editor.id
          LEFT JOIN forum_users fu_editor ON p.edited_by = fu_editor.user_id
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

-- Comment
COMMENT ON FUNCTION get_posts_with_authors IS 
'Optimized RPC: Returns paginated posts with full author data (username, avatar, rank, reputation, post_count, reputation_power, location) in a single query.';

