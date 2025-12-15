-- Migration 91: Add subforums back to get_categories_with_stats (including show_icon)
-- Migration 81 removed subforums from the RPC, this adds them back with show_icon support

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
    -- Pre-calculate stats for each subcategory (direct topics, not in subforums)
    SELECT 
      sc.id as subcategory_id,
      sc.category_id,
      sc.name,
      sc.description,
      sc.icon,
      sc.show_icon,
      sc.slug,
      sc.sort_order,
      COUNT(DISTINCT t.id) FILTER (WHERE t.is_deleted = false AND t.subforum_id IS NULL) as topic_count,
      COUNT(DISTINCT p.id) FILTER (WHERE p.is_deleted = false AND t.is_deleted = false AND t.subforum_id IS NULL) as post_count
    FROM forum_subcategories sc
    LEFT JOIN forum_topics t ON t.subcategory_id = sc.id
    LEFT JOIN forum_posts p ON p.topic_id = t.id
    WHERE sc.is_active = true
      AND sc.subforum_id IS NULL  -- Only direct subcategories
    GROUP BY sc.id, sc.category_id, sc.name, sc.description, sc.icon, sc.show_icon, sc.slug, sc.sort_order
  ),
  last_posts AS (
    -- Get last post for each subcategory (direct topics only)
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
    JOIN forum_topics t ON t.subcategory_id = sc.id AND t.is_deleted = false AND t.subforum_id IS NULL
    JOIN forum_posts p ON p.topic_id = t.id AND p.is_deleted = false
    LEFT JOIN profiles pr ON pr.id = p.user_id
    WHERE sc.is_active = true
      AND sc.subforum_id IS NULL
    ORDER BY sc.id, p.created_at DESC
  ),
  subforum_stats AS (
    -- Pre-calculate stats for subforums under subcategories
    SELECT 
      sf.id as subforum_id,
      sf.subcategory_id,
      sf.name,
      sf.description,
      sf.icon,
      sf.show_icon,
      sf.slug,
      sf.sort_order,
      COUNT(DISTINCT t.id) FILTER (WHERE t.is_deleted = false) as topic_count,
      COUNT(DISTINCT p.id) FILTER (WHERE p.is_deleted = false AND t.is_deleted = false) as post_count
    FROM forum_subforums sf
    LEFT JOIN forum_topics t ON t.subforum_id = sf.id
    LEFT JOIN forum_posts p ON p.topic_id = t.id
    WHERE sf.is_active = true
    GROUP BY sf.id, sf.subcategory_id, sf.name, sf.description, sf.icon, sf.show_icon, sf.slug, sf.sort_order
  ),
  subforum_last_posts AS (
    -- Get last post for each subforum
    SELECT DISTINCT ON (sf.id)
      sf.id as subforum_id,
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
    FROM forum_subforums sf
    JOIN forum_subcategories sc ON sc.id = sf.subcategory_id
    JOIN forum_categories c ON c.id = sc.category_id
    JOIN forum_topics t ON t.subforum_id = sf.id AND t.is_deleted = false
    JOIN forum_posts p ON p.topic_id = t.id AND p.is_deleted = false
    LEFT JOIN profiles pr ON pr.id = p.user_id
    WHERE sf.is_active = true
    ORDER BY sf.id, p.created_at DESC
  ),
  subforums_json AS (
    -- Build subforums grouped by subcategory
    SELECT 
      sc.id as subcategory_id,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', ss2.subforum_id,
              'name', ss2.name,
              'description', ss2.description,
              'icon', ss2.icon,
              'show_icon', ss2.show_icon,
              'slug', ss2.slug,
              'sort_order', ss2.sort_order,
              'topicCount', ss2.topic_count,
              'postCount', ss2.post_count,
              'lastPost', CASE 
                WHEN lp2.post_id IS NOT NULL THEN
                  json_build_object(
                    'topicId', lp2.topic_id,
                    'topicTitle', lp2.topic_title,
                    'topicSlug', lp2.topic_slug,
                    'author', COALESCE(lp2.username, lp2.display_name, 'Unknown'),
                    'time', to_char(lp2.created_at AT TIME ZONE 'Europe/Bucharest', 'DD.MM.YYYY HH24:MI'),
                    'date', to_char(lp2.created_at AT TIME ZONE 'Europe/Bucharest', 'DD.MM.YYYY'),
                    'timeOnly', to_char(lp2.created_at AT TIME ZONE 'Europe/Bucharest', 'HH24:MI'),
                    'postNumber', lp2.post_number,
                    'categorySlug', lp2.category_slug,
                    'subcategorySlug', lp2.subcategory_slug,
                    'subforumSlug', lp2.subforum_slug
                  )
                ELSE NULL
              END
            ) ORDER BY ss2.sort_order
          )
          FROM subforum_stats ss2
          LEFT JOIN subforum_last_posts lp2 ON lp2.subforum_id = ss2.subforum_id
          WHERE ss2.subcategory_id = sc.id
        ),
        '[]'::json
      ) as subforums
    FROM forum_subcategories sc
    WHERE sc.is_active = true AND sc.subforum_id IS NULL
  ),
  subcategories_json AS (
    -- Build subcategories with stats, last post, and subforums
    SELECT 
      ss.category_id,
      json_agg(
        json_build_object(
          'id', ss.subcategory_id,
          'name', ss.name,
          'description', ss.description,
          'icon', ss.icon,
          'show_icon', ss.show_icon,
          'slug', ss.slug,
          'sort_order', ss.sort_order,
          'topicCount', ss.topic_count,
          'postCount', ss.post_count,
          'subforums', COALESCE(sfj.subforums, '[]'::json),
          'lastPost', CASE 
            WHEN lp.post_id IS NOT NULL THEN
              json_build_object(
                'topicId', lp.topic_id,
                'topicTitle', lp.topic_title,
                'topicSlug', lp.topic_slug,
                'author', COALESCE(lp.username, lp.display_name, 'Unknown'),
                'time', to_char(lp.created_at AT TIME ZONE 'Europe/Bucharest', 'DD.MM.YYYY HH24:MI'),
                'date', to_char(lp.created_at AT TIME ZONE 'Europe/Bucharest', 'DD.MM.YYYY'),
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
    LEFT JOIN subforums_json sfj ON sfj.subcategory_id = ss.subcategory_id
    GROUP BY ss.category_id
  )
  SELECT json_agg(
    json_build_object(
      'id', c.id,
      'name', c.name,
      'description', c.description,
      'icon', c.icon,
      'show_icon', c.show_icon,
      'slug', c.slug,
      'sort_order', c.sort_order,
      'is_active', c.is_active,
      'created_at', c.created_at,
      'subcategories', COALESCE(sj.subcategories, '[]'::json),
      'totalTopics', COALESCE(sj.total_topics, 0),
      'totalPosts', COALESCE(sj.total_posts, 0),
      'lastPost', NULL
    ) ORDER BY c.sort_order
  ) INTO result
  FROM forum_categories c
  LEFT JOIN subcategories_json sj ON sj.category_id = c.id
  WHERE c.is_active = true;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

COMMENT ON FUNCTION get_categories_with_stats IS 
'Optimized RPC: Returns all forum categories with subcategories (which contain subforums), topic/post counts, and last post info. Updated to include subforums and show_icon support.';

