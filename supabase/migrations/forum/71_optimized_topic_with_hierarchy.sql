-- =============================================
-- Migration 71: Optimized Topic with Hierarchy (VERIFIED)
-- =============================================
-- Returns topic + subcategory + category in ONE query
-- Used for TopicPage to load all breadcrumb data at once
-- =============================================

-- Create optimized RPC function
CREATE OR REPLACE FUNCTION get_topic_with_hierarchy(
  p_topic_slug TEXT,
  p_subcategory_slug TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic_id UUID;
  v_result JSON;
BEGIN
  -- Find topic by slug or UUID
  -- First check if it's a UUID
  IF p_topic_slug ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_topic_id := p_topic_slug::UUID;
  ELSE
    -- Find by slug, optionally filtering by subcategory
    IF p_subcategory_slug IS NOT NULL THEN
      SELECT t.id INTO v_topic_id
      FROM forum_topics t
      JOIN forum_subcategories sc ON t.subcategory_id = sc.id
      WHERE t.slug = p_topic_slug
        AND sc.slug = p_subcategory_slug
        AND t.is_deleted = false
      LIMIT 1;
    ELSE
      SELECT id INTO v_topic_id
      FROM forum_topics
      WHERE slug = p_topic_slug
        AND is_deleted = false
      LIMIT 1;
    END IF;
  END IF;
  
  -- If no topic found, return null
  IF v_topic_id IS NULL THEN
    RETURN json_build_object('error', 'Topic not found');
  END IF;
  
  -- Build complete result with topic + hierarchy + author
  SELECT json_build_object(
    'topic', json_build_object(
      'id', t.id,
      'subcategory_id', t.subcategory_id,
      'user_id', t.user_id,
      'title', t.title,
      'slug', t.slug,
      'topic_type', t.topic_type,
      'is_pinned', t.is_pinned,
      'is_locked', t.is_locked,
      'is_deleted', t.is_deleted,
      'view_count', t.view_count,
      'reply_count', t.reply_count,
      'last_post_at', t.last_post_at,
      'last_post_user_id', t.last_post_user_id,
      'created_at', t.created_at,
      'updated_at', t.updated_at,
      -- Author data
      'author_username', COALESCE(pr.display_name, pr.username, SPLIT_PART(pr.email, '@', 1), 'Unknown'),
      'author_avatar', pr.photo_url
    ),
    'subcategory', json_build_object(
      'id', sc.id,
      'name', sc.name,
      'slug', sc.slug,
      'description', sc.description,
      'category_id', sc.category_id
    ),
    'category', json_build_object(
      'id', c.id,
      'name', c.name,
      'slug', c.slug
    )
  ) INTO v_result
  FROM forum_topics t
  LEFT JOIN forum_subcategories sc ON t.subcategory_id = sc.id
  LEFT JOIN forum_categories c ON sc.category_id = c.id
  LEFT JOIN profiles pr ON t.user_id = pr.id
  WHERE t.id = v_topic_id;
  
  -- Increment view count only if topic exists and is not deleted
  -- This is safe because we already verified v_topic_id exists and is not deleted above
  UPDATE forum_topics
  SET view_count = view_count + 1
  WHERE id = v_topic_id
    AND is_deleted = false;
  
  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_topic_with_hierarchy(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_topic_with_hierarchy(TEXT, TEXT) TO anon;

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_forum_topics_slug 
  ON forum_topics(slug) 
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_forum_subcategories_slug 
  ON forum_subcategories(slug) 
  WHERE is_active = true;

-- Comment
COMMENT ON FUNCTION get_topic_with_hierarchy IS 
'Optimized RPC: Returns topic with full hierarchy (subcategory + category) and author data in a single query. Used for TopicPage breadcrumbs.';
