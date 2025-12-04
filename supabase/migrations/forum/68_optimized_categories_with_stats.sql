-- Migration: Optimized function for loading forum categories with all stats in single query
-- This replaces 50+ sequential queries with one optimized query using JOINs and aggregations

-- Function to get all categories with subcategories, stats, and last post info
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
    -- Pre-calculate stats for each subcategory
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
      pr.display_name,
      pr.username
    FROM forum_subcategories sc
    JOIN forum_topics t ON t.subcategory_id = sc.id AND t.is_deleted = false
    JOIN forum_posts p ON p.topic_id = t.id AND p.is_deleted = false
    LEFT JOIN profiles pr ON pr.id = p.user_id
    WHERE sc.is_active = true
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
      'subforums', '[]'::json,  -- Simplified - add subforums support if needed
      'subcategories', COALESCE(sj.subcategories, '[]'::json),
      'totalTopics', COALESCE(sj.total_topics, 0),
      'totalPosts', COALESCE(sj.total_posts, 0),
      'lastPost', NULL  -- Category-level last post can be derived from subcategories
    ) ORDER BY c.sort_order
  ) INTO result
  FROM forum_categories c
  LEFT JOIN subcategories_json sj ON sj.category_id = c.id
  WHERE c.is_active = true;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_categories_with_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_categories_with_stats TO anon;

COMMENT ON FUNCTION get_categories_with_stats IS 'Returns all forum categories with subcategories, topic/post counts, and last post info in a single optimized query. Replaces 50+ sequential queries.';
