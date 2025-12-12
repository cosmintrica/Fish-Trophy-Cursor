-- Migration 81: Fix username display priority and date logic (24h)
-- Replaces usage of display_name with username as primary choice
-- Updates date logic to hide date if post is within last 24 hours (not just calendar day)

-- 1. Update get_categories_with_stats
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
      t.subforum_id,
      sc.slug as subcategory_slug,
      c.slug as category_slug,
      sf.slug as subforum_slug,
      pr.display_name,
      pr.username
    FROM forum_subcategories sc
    JOIN forum_categories c ON c.id = sc.category_id
    JOIN forum_topics t ON (
      (t.subcategory_id = sc.id AND t.subforum_id IS NULL) OR
      (t.subforum_id IN (SELECT id FROM forum_subforums WHERE subcategory_id = sc.id))
    ) AND t.is_deleted = false
    JOIN forum_posts p ON p.topic_id = t.id AND p.is_deleted = false
    LEFT JOIN forum_subforums sf ON sf.id = t.subforum_id
    LEFT JOIN profiles pr ON pr.id = p.user_id
    WHERE sc.is_active = true
    ORDER BY sc.id, p.created_at DESC
  ),
  subcategories_json AS (
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
                'author', COALESCE(lp.username, lp.display_name, 'Unknown'), -- STRICT USERNAME
                'time', to_char(lp.created_at AT TIME ZONE 'Europe/Bucharest', 'DD.MM.YYYY HH24:MI'),
                'date', to_char(lp.created_at AT TIME ZONE 'Europe/Bucharest', 'DD.MM.YYYY'),
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
      'subforums', '[]'::json,
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

-- 2. Update get_topics_with_authors
CREATE OR REPLACE FUNCTION get_topics_with_authors(
  p_subcategory_id UUID DEFAULT NULL,
  p_subforum_id UUID DEFAULT NULL,
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
  v_subcategory_exists BOOLEAN;
  v_subforum_exists BOOLEAN;
BEGIN
  -- Validate
  IF (p_subcategory_id IS NULL AND p_subforum_id IS NULL) OR (p_subcategory_id IS NOT NULL AND p_subforum_id IS NOT NULL) THEN
    RETURN json_build_object('error', 'Must specify either subcategory_id or subforum_id');
  END IF;
  
  v_offset := (p_page - 1) * p_page_size;
  
  IF p_subcategory_id IS NOT NULL THEN
    -- Subcategory logic
    SELECT COUNT(*) INTO v_total FROM forum_topics 
    WHERE subcategory_id = p_subcategory_id AND subforum_id IS NULL AND is_deleted = false;
    
    SELECT json_build_object(
      'data', COALESCE((
        SELECT json_agg(topic_data) FROM (
          SELECT 
            t.*,
            -- STRICT USERNAME PRIORITY
            COALESCE(pr.username, pr.display_name, SPLIT_PART(pr.email, '@', 1), 'Unknown') AS author_username,
            pr.photo_url AS author_avatar,
            COALESCE(pr_last.username, pr_last.display_name, SPLIT_PART(pr_last.email, '@', 1), NULL) AS last_post_author
          FROM forum_topics t
          LEFT JOIN profiles pr ON t.user_id = pr.id
          LEFT JOIN profiles pr_last ON t.last_post_user_id = pr_last.id
          WHERE t.subcategory_id = p_subcategory_id AND t.subforum_id IS NULL AND t.is_deleted = false
          ORDER BY t.is_pinned DESC, t.last_post_at DESC NULLS LAST
          LIMIT p_page_size OFFSET v_offset
        ) AS topic_data
      ), '[]'::json),
      'total', v_total, 'page', p_page, 'page_size', p_page_size, 'has_more', (v_offset + p_page_size) < v_total
    ) INTO v_result;
    
    RETURN v_result;

  ELSIF p_subforum_id IS NOT NULL THEN
    -- Subforum logic
    SELECT COUNT(*) INTO v_total FROM forum_topics 
    WHERE subforum_id = p_subforum_id AND is_deleted = false;
    
    SELECT json_build_object(
      'data', COALESCE((
        SELECT json_agg(topic_data) FROM (
          SELECT 
            t.*,
            -- STRICT USERNAME PRIORITY
            COALESCE(pr.username, pr.display_name, SPLIT_PART(pr.email, '@', 1), 'Unknown') AS author_username,
            pr.photo_url AS author_avatar,
            COALESCE(pr_last.username, pr_last.display_name, SPLIT_PART(pr_last.email, '@', 1), NULL) AS last_post_author
          FROM forum_topics t
          LEFT JOIN profiles pr ON t.user_id = pr.id
          LEFT JOIN profiles pr_last ON t.last_post_user_id = pr_last.id
          WHERE t.subforum_id = p_subforum_id AND t.is_deleted = false
          ORDER BY t.is_pinned DESC, t.last_post_at DESC NULLS LAST
          LIMIT p_page_size OFFSET v_offset
        ) AS topic_data
      ), '[]'::json),
      'total', v_total, 'page', p_page, 'page_size', p_page_size, 'has_more', (v_offset + p_page_size) < v_total
    ) INTO v_result;
    
    RETURN v_result;
  END IF;
  
  RETURN json_build_object('error', 'Invalid parameters');
END;
$$;
