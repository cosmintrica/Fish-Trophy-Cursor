-- =============================================
-- Migration 74: Optimized Subforums with Subcategories
-- =============================================
-- Returns subforums with their subcategories, stats, and last post info in a single query
-- Similar to migration 68 but for subforums hierarchy
-- =============================================

-- Function to get subforums with subcategories, stats, and last post info
CREATE OR REPLACE FUNCTION get_subforums_with_subcategories(
  p_category_id UUID DEFAULT NULL,
  p_category_slug TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id UUID;
  result JSON;
BEGIN
  -- Resolve category_id from slug if provided
  IF p_category_slug IS NOT NULL THEN
    SELECT id INTO v_category_id
    FROM forum_categories
    WHERE slug = p_category_slug AND is_active = true
    LIMIT 1;
  ELSIF p_category_id IS NOT NULL THEN
    v_category_id := p_category_id;
  END IF;
  
  -- If no category specified, return all subforums
  -- If category specified, filter by category
  
  WITH subcategory_stats AS (
    -- Pre-calculate stats for each subcategory within subforums
    SELECT 
      sc.id as subcategory_id,
      sc.subforum_id,
      sc.category_id,
      sc.name,
      sc.description,
      sc.icon,
      sc.slug,
      sc.sort_order,
      COUNT(DISTINCT t.id) FILTER (WHERE t.is_deleted = false) as topic_count,
      COUNT(DISTINCT p.id) FILTER (WHERE p.is_deleted = false AND t.is_deleted = false) as post_count
    FROM forum_subcategories sc
    LEFT JOIN forum_topics t ON t.subcategory_id = sc.id
    LEFT JOIN forum_posts p ON p.topic_id = t.id
    WHERE sc.is_active = true
      AND sc.subforum_id IS NOT NULL  -- Only subcategories that belong to subforums
      AND (v_category_id IS NULL OR sc.category_id = v_category_id)
    GROUP BY sc.id, sc.subforum_id, sc.category_id, sc.name, sc.description, sc.icon, sc.slug, sc.sort_order
  ),
  last_posts AS (
    -- Get last post for each subcategory within subforums
    SELECT DISTINCT ON (sc.id)
      sc.id as subcategory_id,
      p.id as post_id,
      p.created_at,
      p.post_number,
      p.user_id,
      t.id as topic_id,
      t.title as topic_title,
      t.slug as topic_slug,
      sc.slug as subcategory_slug,
      c.slug as category_slug,
      sf.slug as subforum_slug,
      pr.display_name,
      pr.username
    FROM forum_subcategories sc
    JOIN forum_subforums sf ON sf.id = sc.subforum_id
    JOIN forum_categories c ON c.id = sc.category_id
    JOIN forum_topics t ON t.subcategory_id = sc.id AND t.is_deleted = false
    JOIN forum_posts p ON p.topic_id = t.id AND p.is_deleted = false
    LEFT JOIN profiles pr ON pr.id = p.user_id
    WHERE sc.is_active = true
      AND sc.subforum_id IS NOT NULL
      AND (v_category_id IS NULL OR sc.category_id = v_category_id)
    ORDER BY sc.id, p.created_at DESC
  ),
  subcategories_json AS (
    -- Build subcategories with stats and last post
    SELECT 
      ss.subforum_id,
      json_agg(
        json_build_object(
          'id', ss.subcategory_id,
          'name', ss.name,
          'description', ss.description,
          'icon', ss.icon,
          'slug', ss.slug,
          'sort_order', ss.sort_order,
          'topicCount', ss.topic_count,
          'postCount', ss.post_count,
          'lastPost', CASE 
            WHEN lp.post_id IS NOT NULL THEN
              json_build_object(
                'topicId', lp.topic_id,
                'topicTitle', lp.topic_title,
                'topicSlug', lp.topic_slug,
                'author', COALESCE(lp.display_name, lp.username, 'Unknown'),
                'time', to_char(lp.created_at AT TIME ZONE 'Europe/Bucharest', 'DD.MM.YYYY HH24:MI'),
                'date', CASE 
                  WHEN DATE(lp.created_at AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE 
                  THEN NULL 
                  ELSE to_char(lp.created_at AT TIME ZONE 'Europe/Bucharest', 'DD.MM.YYYY')
                END,
                'timeOnly', to_char(lp.created_at AT TIME ZONE 'Europe/Bucharest', 'HH24:MI'),
                'postNumber', lp.post_number,
                'categorySlug', lp.category_slug,
                'subcategorySlug', lp.subcategory_slug,
                'subforumSlug', lp.subforum_slug
              )
            ELSE NULL
          END
        ) ORDER BY ss.sort_order
      ) as subcategories,
      SUM(ss.topic_count)::int as total_topics,
      SUM(ss.post_count)::int as total_posts
    FROM subcategory_stats ss
    LEFT JOIN last_posts lp ON lp.subcategory_id = ss.subcategory_id
    GROUP BY ss.subforum_id
  )
  SELECT json_agg(
    json_build_object(
      'id', sf.id,
      'name', sf.name,
      'description', sf.description,
      'icon', sf.icon,
      'slug', sf.slug,
      'sort_order', sf.sort_order,
      'is_active', sf.is_active,
      'category_id', sf.category_id,
      'category_slug', c.slug,
      'category_name', c.name,
      'created_at', sf.created_at,
      'subcategories', COALESCE(sj.subcategories, '[]'::json),
      'totalTopics', COALESCE(sj.total_topics, 0),
      'totalPosts', COALESCE(sj.total_posts, 0)
    ) ORDER BY sf.sort_order
  ) INTO result
  FROM forum_subforums sf
  JOIN forum_categories c ON c.id = sf.category_id
  LEFT JOIN subcategories_json sj ON sj.subforum_id = sf.id
  WHERE sf.is_active = true
    AND (v_category_id IS NULL OR sf.category_id = v_category_id);
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_subforums_with_subcategories(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subforums_with_subcategories(UUID, TEXT) TO anon;

-- Update get_categories_with_stats to include subforums
CREATE OR REPLACE FUNCTION get_categories_with_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  WITH subcategory_stats AS (
    -- Pre-calculate stats for each subcategory (direct subcategories, not in subforums)
    SELECT 
      sc.id as subcategory_id,
      sc.category_id,
      sc.name,
      sc.description,
      sc.icon,
      sc.slug,
      sc.sort_order,
      COUNT(DISTINCT t.id) FILTER (WHERE t.is_deleted = false) as topic_count,
      COUNT(DISTINCT p.id) FILTER (WHERE p.is_deleted = false AND t.is_deleted = false) as post_count
    FROM forum_subcategories sc
    LEFT JOIN forum_topics t ON t.subcategory_id = sc.id
    LEFT JOIN forum_posts p ON p.topic_id = t.id
    WHERE sc.is_active = true
      AND sc.subforum_id IS NULL  -- Only direct subcategories (not in subforums)
    GROUP BY sc.id, sc.category_id, sc.name, sc.description, sc.icon, sc.slug, sc.sort_order
  ),
  last_posts AS (
    -- Get last post for each subcategory
    SELECT DISTINCT ON (sc.id)
      sc.id as subcategory_id,
      p.id as post_id,
      p.created_at,
      p.post_number,
      p.user_id,
      t.id as topic_id,
      t.title as topic_title,
      t.slug as topic_slug,
      sc.slug as subcategory_slug,
      c.slug as category_slug,
      pr.display_name,
      pr.username
    FROM forum_subcategories sc
    JOIN forum_categories c ON c.id = sc.category_id
    JOIN forum_topics t ON t.subcategory_id = sc.id AND t.is_deleted = false
    JOIN forum_posts p ON p.topic_id = t.id AND p.is_deleted = false
    LEFT JOIN profiles pr ON pr.id = p.user_id
    WHERE sc.is_active = true
      AND sc.subforum_id IS NULL  -- Only direct subcategories
    ORDER BY sc.id, p.created_at DESC
  ),
  subcategories_json AS (
    -- Build subcategories with stats and last post
    SELECT 
      ss.category_id,
      json_agg(
        json_build_object(
          'id', ss.subcategory_id,
          'name', ss.name,
          'description', ss.description,
          'icon', ss.icon,
          'slug', ss.slug,
          'sort_order', ss.sort_order,
          'topicCount', ss.topic_count,
          'postCount', ss.post_count,
          'lastPost', CASE 
            WHEN lp.post_id IS NOT NULL THEN
              json_build_object(
                'topicId', lp.topic_id,
                'topicTitle', lp.topic_title,
                'topicSlug', lp.topic_slug,
                'author', COALESCE(lp.display_name, lp.username, 'Unknown'),
                'time', to_char(lp.created_at AT TIME ZONE 'Europe/Bucharest', 'DD.MM.YYYY HH24:MI'),
                'date', CASE 
                  WHEN DATE(lp.created_at AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE 
                  THEN NULL 
                  ELSE to_char(lp.created_at AT TIME ZONE 'Europe/Bucharest', 'DD.MM.YYYY')
                END,
                'timeOnly', to_char(lp.created_at AT TIME ZONE 'Europe/Bucharest', 'HH24:MI'),
                'postNumber', lp.post_number,
                'categorySlug', lp.category_slug,
                'subcategorySlug', lp.subcategory_slug
              )
            ELSE NULL
          END
        ) ORDER BY ss.sort_order
      ) as subcategories,
      SUM(ss.topic_count)::int as total_topics,
      SUM(ss.post_count)::int as total_posts
    FROM subcategory_stats ss
    LEFT JOIN last_posts lp ON lp.subcategory_id = ss.subcategory_id
    GROUP BY ss.category_id
  ),
  subforum_subcategory_stats AS (
    -- Pre-calculate stats for subcategories within subforums
    SELECT 
      sc.id as subcategory_id,
      sc.subforum_id,
      sc.category_id,
      sc.name,
      sc.description,
      sc.icon,
      sc.slug,
      sc.sort_order,
      COUNT(DISTINCT t.id) FILTER (WHERE t.is_deleted = false) as topic_count,
      COUNT(DISTINCT p.id) FILTER (WHERE p.is_deleted = false AND t.is_deleted = false) as post_count
    FROM forum_subcategories sc
    LEFT JOIN forum_topics t ON t.subcategory_id = sc.id
    LEFT JOIN forum_posts p ON p.topic_id = t.id
    WHERE sc.is_active = true AND sc.subforum_id IS NOT NULL
    GROUP BY sc.id, sc.subforum_id, sc.category_id, sc.name, sc.description, sc.icon, sc.slug, sc.sort_order
  ),
  subforum_last_posts AS (
    -- Get last post for each subcategory within subforums
    SELECT DISTINCT ON (sc.id)
      sc.id as subcategory_id,
      sc.subforum_id,
      p.id as post_id,
      p.created_at,
      p.post_number,
      p.user_id,
      t.id as topic_id,
      t.title as topic_title,
      t.slug as topic_slug,
      sc.slug as subcategory_slug,
      c.slug as category_slug,
      sf.slug as subforum_slug,
      pr.display_name,
      pr.username
    FROM forum_subcategories sc
    JOIN forum_subforums sf ON sf.id = sc.subforum_id
    JOIN forum_categories c ON c.id = sc.category_id
    JOIN forum_topics t ON t.subcategory_id = sc.id AND t.is_deleted = false
    JOIN forum_posts p ON p.topic_id = t.id AND p.is_deleted = false
    LEFT JOIN profiles pr ON pr.id = p.user_id
    WHERE sc.is_active = true AND sc.subforum_id IS NOT NULL
    ORDER BY sc.id, p.created_at DESC
  ),
  subforum_subcategories_json AS (
    -- Build subcategories for each subforum
    SELECT 
      sss.subforum_id,
      json_agg(
        json_build_object(
          'id', sss.subcategory_id,
          'name', sss.name,
          'description', sss.description,
          'icon', sss.icon,
          'slug', sss.slug,
          'sort_order', sss.sort_order,
          'topicCount', sss.topic_count,
          'postCount', sss.post_count,
          'lastPost', CASE 
            WHEN lp.post_id IS NOT NULL THEN
              json_build_object(
                'topicId', lp.topic_id,
                'topicTitle', lp.topic_title,
                'topicSlug', lp.topic_slug,
                'author', COALESCE(lp.display_name, lp.username, 'Unknown'),
                'time', to_char(lp.created_at AT TIME ZONE 'Europe/Bucharest', 'DD.MM.YYYY HH24:MI'),
                'date', CASE 
                  WHEN DATE(lp.created_at AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE 
                  THEN NULL 
                  ELSE to_char(lp.created_at AT TIME ZONE 'Europe/Bucharest', 'DD.MM.YYYY')
                END,
                'timeOnly', to_char(lp.created_at AT TIME ZONE 'Europe/Bucharest', 'HH24:MI'),
                'postNumber', lp.post_number,
                'categorySlug', lp.category_slug,
                'subcategorySlug', lp.subcategory_slug,
                'subforumSlug', lp.subforum_slug
              )
            ELSE NULL
          END
        ) ORDER BY sss.sort_order
      ) as subcategories
    FROM subforum_subcategory_stats sss
    LEFT JOIN subforum_last_posts lp ON lp.subcategory_id = sss.subcategory_id
    GROUP BY sss.subforum_id
  ),
  subforums_json AS (
    -- Build subforums with their subcategories
    SELECT 
      sf.category_id,
      json_agg(
        json_build_object(
          'id', sf.id,
          'name', sf.name,
          'description', sf.description,
          'icon', sf.icon,
          'slug', sf.slug,
          'sort_order', sf.sort_order,
          'subcategories', COALESCE(ssj.subcategories, '[]'::json)
        ) ORDER BY sf.sort_order
      ) as subforums
    FROM forum_subforums sf
    LEFT JOIN subforum_subcategories_json ssj ON ssj.subforum_id = sf.id
    WHERE sf.is_active = true
    GROUP BY sf.category_id
  )
  SELECT json_agg(
    json_build_object(
      'id', c.id,
      'name', c.name,
      'description', c.description,
      'icon', c.icon,
      'slug', c.slug,
      'sort_order', c.sort_order,
      'is_active', c.is_active,
      'created_at', c.created_at,
      'subforums', COALESCE(sfj.subforums, '[]'::json),
      'subcategories', COALESCE(sj.subcategories, '[]'::json),
      'totalTopics', COALESCE(sj.total_topics, 0),
      'totalPosts', COALESCE(sj.total_posts, 0),
      'lastPost', NULL
    ) ORDER BY c.sort_order
  ) INTO result
  FROM forum_categories c
  LEFT JOIN subcategories_json sj ON sj.category_id = c.id
  LEFT JOIN subforums_json sfj ON sfj.category_id = c.id
  WHERE c.is_active = true;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_forum_subcategories_subforum_id 
  ON forum_subcategories(subforum_id) 
  WHERE is_active = true AND subforum_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_forum_subforums_category_id 
  ON forum_subforums(category_id) 
  WHERE is_active = true;

-- Comments
COMMENT ON FUNCTION get_subforums_with_subcategories IS 
'Optimized RPC: Returns subforums with their subcategories, stats, and last post info in a single query. Can filter by category_id or category_slug.';

COMMENT ON FUNCTION get_categories_with_stats IS 
'Optimized RPC: Returns all forum categories with subcategories AND subforums, topic/post counts, and last post info in a single query. Updated to include subforums support.';

