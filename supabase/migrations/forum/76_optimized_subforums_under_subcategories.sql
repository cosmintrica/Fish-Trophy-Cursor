-- =============================================
-- Migration 76: Optimized Subforums Under Subcategories (CORRECTED)
-- =============================================
-- Returns subcategories with their subforums and topics in a single query
-- NEW STRUCTURE: Category -> Subcategory -> Subforum -> Topics
-- =============================================

-- Function to get subcategories with their subforums, stats, and last post info
CREATE OR REPLACE FUNCTION get_subcategories_with_subforums(
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
  
  WITH subforum_stats AS (
    -- Pre-calculate stats for each subforum (topics and posts)
    SELECT 
      sf.id as subforum_id,
      sf.subcategory_id,
      sf.name,
      sf.description,
      sf.icon,
      sf.slug,
      sf.sort_order,
      COUNT(DISTINCT t.id) FILTER (WHERE t.is_deleted = false) as topic_count,
      COUNT(DISTINCT p.id) FILTER (WHERE p.is_deleted = false AND t.is_deleted = false) as post_count
    FROM forum_subforums sf
    LEFT JOIN forum_topics t ON t.subforum_id = sf.id
    LEFT JOIN forum_posts p ON p.topic_id = t.id
    WHERE sf.is_active = true
      AND (v_category_id IS NULL OR EXISTS (
        SELECT 1 FROM forum_subcategories sc 
        WHERE sc.id = sf.subcategory_id 
          AND sc.category_id = v_category_id
      ))
    GROUP BY sf.id, sf.subcategory_id, sf.name, sf.description, sf.icon, sf.slug, sf.sort_order
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
      AND (v_category_id IS NULL OR sc.category_id = v_category_id)
    ORDER BY sf.id, p.created_at DESC
  ),
  subforums_json AS (
    -- Build subforums with stats and last post
    SELECT 
      ss.subcategory_id,
      json_agg(
        json_build_object(
          'id', ss.subforum_id,
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
      ) as subforums
    FROM subforum_stats ss
    LEFT JOIN subforum_last_posts lp ON lp.subforum_id = ss.subforum_id
    GROUP BY ss.subcategory_id
  )
  SELECT json_agg(
    json_build_object(
      'id', sc.id,
      'name', sc.name,
      'description', sc.description,
      'icon', sc.icon,
      'slug', sc.slug,
      'sort_order', sc.sort_order,
      'category_id', sc.category_id,
      'category_slug', c.slug,
      'category_name', c.name,
      'subforums', COALESCE(sj.subforums, '[]'::json)
    ) ORDER BY sc.sort_order
  ) INTO result
  FROM forum_subcategories sc
  JOIN forum_categories c ON c.id = sc.category_id
  LEFT JOIN subforums_json sj ON sj.subcategory_id = sc.id
  WHERE sc.is_active = true
    AND sc.subforum_id IS NULL  -- Only direct subcategories (not nested in old subforums)
    AND (v_category_id IS NULL OR sc.category_id = v_category_id);
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_subcategories_with_subforums(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subcategories_with_subforums(UUID, TEXT) TO anon;

-- Update get_categories_with_stats to include subforums under subcategories
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
      sc.slug,
      sc.sort_order,
      COUNT(DISTINCT t.id) FILTER (WHERE t.is_deleted = false AND t.subforum_id IS NULL) as topic_count,
      COUNT(DISTINCT p.id) FILTER (WHERE p.is_deleted = false AND t.is_deleted = false AND t.subforum_id IS NULL) as post_count
    FROM forum_subcategories sc
    LEFT JOIN forum_topics t ON t.subcategory_id = sc.id
    LEFT JOIN forum_posts p ON p.topic_id = t.id
    WHERE sc.is_active = true
      AND sc.subforum_id IS NULL  -- Only direct subcategories
    GROUP BY sc.id, sc.category_id, sc.name, sc.description, sc.icon, sc.slug, sc.sort_order
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
      sf.slug,
      sf.sort_order,
      COUNT(DISTINCT t.id) FILTER (WHERE t.is_deleted = false) as topic_count,
      COUNT(DISTINCT p.id) FILTER (WHERE p.is_deleted = false AND t.is_deleted = false) as post_count
    FROM forum_subforums sf
    LEFT JOIN forum_topics t ON t.subforum_id = sf.id
    LEFT JOIN forum_posts p ON p.topic_id = t.id
    WHERE sf.is_active = true
    GROUP BY sf.id, sf.subcategory_id, sf.name, sf.description, sf.icon, sf.slug, sf.sort_order
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
    -- IMPORTANT: Include ALL subcategories, even if they have no subforums (for proper JOIN)
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
                    'author', COALESCE(lp2.display_name, lp2.username, 'Unknown'),
                    'time', to_char(lp2.created_at AT TIME ZONE 'Europe/Bucharest', 'DD.MM.YYYY HH24:MI'),
                    'date', CASE 
                      WHEN DATE(lp2.created_at AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE 
                      THEN NULL 
                      ELSE to_char(lp2.created_at AT TIME ZONE 'Europe/Bucharest', 'DD.MM.YYYY')
                    END,
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
    LEFT JOIN subforums_json sfj ON sfj.subcategory_id = ss.subcategory_id
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

-- Create indexes for optimal query performance
-- NOTA: Aceste indexuri sunt deja create în migrația 75, dar le păstrăm aici cu IF NOT EXISTS pentru siguranță
CREATE INDEX IF NOT EXISTS idx_forum_subforums_subcategory 
  ON forum_subforums(subcategory_id, sort_order) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_forum_topics_subforum 
  ON forum_topics(subforum_id, is_deleted) 
  WHERE subforum_id IS NOT NULL AND is_deleted = false;

-- Actualizează unique constraint pentru topics slug
-- Vechiul constraint folosea doar subcategory_id, acum trebuie să suporte și subforum_id
DROP INDEX IF EXISTS idx_forum_topics_slug_subcategory_unique;

-- Creează constraint nou care suportă fie subcategory_id, fie subforum_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_topics_slug_subcategory_unique 
  ON forum_topics(subcategory_id, slug) 
  WHERE slug IS NOT NULL AND subcategory_id IS NOT NULL AND subforum_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_topics_slug_subforum_unique 
  ON forum_topics(subforum_id, slug) 
  WHERE slug IS NOT NULL AND subforum_id IS NOT NULL AND subcategory_id IS NULL;

-- Comments
COMMENT ON FUNCTION get_subcategories_with_subforums IS 
'Optimized RPC: Returns subcategories with their subforums, stats, and last post info. NEW STRUCTURE: Category -> Subcategory -> Subforum -> Topics';

COMMENT ON FUNCTION get_categories_with_stats IS 
'Optimized RPC: Returns all forum categories with subcategories (which contain subforums), topic/post counts, and last post info. Updated for new structure: Category -> Subcategory -> Subforum -> Topics';

