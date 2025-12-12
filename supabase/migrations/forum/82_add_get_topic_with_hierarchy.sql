-- Migration 82: Add RPC to get topic with full hierarchy (category/subcategory/subforum)
-- Used by usePrefetch and getTopicById for optimized data fetching

-- IMPORTANT: Drop the function first because we might be changing the return type
-- The user reported error 42P13: cannot change return type of existing function
DROP FUNCTION IF EXISTS get_topic_with_hierarchy(TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_topic_with_hierarchy(
    p_topic_slug TEXT,
    p_subcategory_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_topic RECORD;
    v_subcategory RECORD;
    v_subforum RECORD;
    v_category RECORD;
    v_topic_id UUID;
    v_subcategory_slug TEXT;
    v_result JSONB;
BEGIN
    -- 1. Try to find topic by ID (if UUID) or Slug
    IF p_topic_slug ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT * INTO v_topic FROM forum_topics WHERE id = p_topic_slug::UUID AND is_deleted = false;
    ELSE
        SELECT * INTO v_topic FROM forum_topics WHERE slug = p_topic_slug AND is_deleted = false;
    END IF;

    IF v_topic IS NULL THEN
        RETURN jsonb_build_object('error', 'Topic not found');
    END IF;

    v_topic_id := v_topic.id;

    -- 2. Get Subforum (if any)
    IF v_topic.subforum_id IS NOT NULL THEN
        SELECT * INTO v_subforum FROM forum_subforums WHERE id = v_topic.subforum_id;
        v_subcategory_slug := (SELECT slug FROM forum_subcategories WHERE id = v_subforum.subcategory_id);
    END IF;

    -- 3. Get Subcategory
    IF v_topic.subcategory_id IS NOT NULL THEN
        SELECT * INTO v_subcategory FROM forum_subcategories WHERE id = v_topic.subcategory_id;
    ELSIF v_subforum IS NOT NULL THEN
        SELECT * INTO v_subcategory FROM forum_subcategories WHERE id = v_subforum.subcategory_id;
    END IF;

    -- 4. Get Category
    IF v_subcategory IS NOT NULL THEN
        SELECT * INTO v_category FROM forum_categories WHERE id = v_subcategory.category_id;
    END IF;

    -- 5. Construct Result
    v_result := jsonb_build_object(
        'topic', row_to_json(v_topic),
        'subcategory', CASE WHEN v_subcategory IS NOT NULL THEN row_to_json(v_subcategory) ELSE NULL END,
        'subforum', CASE WHEN v_subforum IS NOT NULL THEN row_to_json(v_subforum) ELSE NULL END,
        'category', CASE WHEN v_category IS NOT NULL THEN row_to_json(v_category) ELSE NULL END
    );

    RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_topic_with_hierarchy TO authenticated;
GRANT EXECUTE ON FUNCTION get_topic_with_hierarchy TO anon;

COMMENT ON FUNCTION get_topic_with_hierarchy IS 'Returns topic details along with its hierarchy (subforum, subcategory, category)';
