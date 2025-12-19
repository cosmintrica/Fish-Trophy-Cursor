-- Migration 93: Optimized get_forum_context with Path Determinism & Type Hints (Security Invoker)

-- 1. Safeguard Optimization Indices & Constraints
-- Ensure deterministic routing at DB level for Topics
CREATE UNIQUE INDEX IF NOT EXISTS uq_forum_topics_subcategory_slug
ON forum_topics (subcategory_id, slug)
WHERE subcategory_id IS NOT NULL AND is_deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_forum_topics_subforum_slug
ON forum_topics (subforum_id, slug)
WHERE subforum_id IS NOT NULL AND is_deleted = false;

-- Pagination Index for Posts (Critical for performance + stability)
CREATE INDEX IF NOT EXISTS idx_forum_posts_topic_created_at_id
ON forum_posts (topic_id, created_at, id)
WHERE is_deleted = false;

-- Data Integrity: Topic must have EXACTLY one parent (Subcategory OR Subforum)
-- Note: Wrapping in DO block to avoid error if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'topic_exactly_one_parent'
    ) THEN
        ALTER TABLE forum_topics
        ADD CONSTRAINT topic_exactly_one_parent
        CHECK (
            (subcategory_id IS NOT NULL AND subforum_id IS NULL)
            OR
            (subcategory_id IS NULL AND subforum_id IS NOT NULL)
        );
    END IF;
END $$;

-- 2. The RPC Function
CREATE OR REPLACE FUNCTION get_forum_context(
  p_slug TEXT,
  p_parent_slug TEXT DEFAULT NULL,
  p_expected_type TEXT DEFAULT NULL, -- 'category' | 'subcategory' | 'subforum'
  p_parent_type TEXT DEFAULT NULL    -- 'subcategory' | 'subforum'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER -- Use RLS permissions
SET search_path = public
AS $$
DECLARE
    -- v_result removed (cleanup)
    v_entity RECORD;
    v_parent_id UUID;
    v_children JSONB;
    v_breadcrumbs JSONB;
    v_stats JSONB;
    -- Local mutable variable for parent type deduction
    v_parent_type TEXT := p_parent_type;
    -- Standard 404 Response
    v_null_response JSONB := jsonb_build_object(
        'type', null,
        'entity', null,
        'hierarchy', null,
        'breadcrumbs', '[]'::JSONB
    );
BEGIN
    -- 0. Input Validation
    IF p_slug IS NULL OR p_slug = '' THEN
        RETURN v_null_response;
    END IF;

    -- Validate Expected Types if provided
    IF p_expected_type IS NOT NULL AND p_expected_type NOT IN ('category', 'subcategory', 'subforum') THEN
        RETURN v_null_response;
    END IF;

    -- Validate Parent Type if Parent Slug Provided (Strict Mode: Must be subcategory or subforum)
    IF p_parent_slug IS NOT NULL THEN
        IF v_parent_type IS NULL OR v_parent_type NOT IN ('subcategory', 'subforum') THEN
            RETURN v_null_response;
        END IF;
    END IF;

    -- ============================================================================================
    -- 1. TOPIC RESOLUTION (Path Determinism)
    -- If p_parent_slug is provided, we STRICTLY look for a topic in that parent.
    -- ============================================================================================
    IF p_parent_slug IS NOT NULL THEN
        -- A. Resolve Parent ID based on hinted type (MUST BE ACTIVE)
        -- STRICT MODE: No deduction.
        v_parent_id := NULL;
        
        IF v_parent_type = 'subcategory' THEN
             SELECT id INTO v_parent_id FROM forum_subcategories WHERE slug = p_parent_slug AND is_active = true;
        ELSIF v_parent_type = 'subforum' THEN
             SELECT id INTO v_parent_id FROM forum_subforums WHERE slug = p_parent_slug AND is_active = true;
        END IF;

        -- If parent not found, inactive, or type not provided -> 404 (Strict Path)
        IF v_parent_id IS NULL THEN
            RETURN v_null_response;
        END IF;

        -- B. Resolve Topic restricted to this parent (Split queries for Index Optimization)
        IF v_parent_type = 'subcategory' THEN
             SELECT t.*, 
                    s.name as subcategory_name, s.slug as subcategory_slug,
                    sf.name as subforum_name, sf.slug as subforum_slug,
                    c.name as category_name, c.slug as category_slug
             INTO v_entity
             FROM forum_topics t
             LEFT JOIN forum_subforums sf ON t.subforum_id = sf.id
             LEFT JOIN forum_subcategories s ON s.id = COALESCE(t.subcategory_id, sf.subcategory_id)
             LEFT JOIN forum_categories c ON c.id = s.category_id
             WHERE t.slug = p_slug 
               AND t.is_deleted = false
               AND t.subcategory_id = v_parent_id
               -- Consistency Checks
               AND c.is_active = true
               AND s.is_active = true 
               AND (sf.id IS NULL OR sf.is_active = true)
             LIMIT 1;
             
        ELSIF v_parent_type = 'subforum' THEN
             SELECT t.*, 
                    s.name as subcategory_name, s.slug as subcategory_slug,
                    sf.name as subforum_name, sf.slug as subforum_slug,
                    c.name as category_name, c.slug as category_slug
             INTO v_entity
             FROM forum_topics t
             LEFT JOIN forum_subforums sf ON t.subforum_id = sf.id
             LEFT JOIN forum_subcategories s ON s.id = COALESCE(t.subcategory_id, sf.subcategory_id)
             LEFT JOIN forum_categories c ON c.id = s.category_id
             WHERE t.slug = p_slug 
               AND t.is_deleted = false
               AND t.subforum_id = v_parent_id
               -- Consistency Checks
               AND c.is_active = true
               AND s.is_active = true 
               AND (sf.id IS NULL OR sf.is_active = true)
             LIMIT 1;
        END IF;

        -- Safe check using NOT FOUND (best practice for INTO queries)
        IF NOT FOUND THEN 
             RETURN v_null_response;
        END IF;

        -- C. Build Response (Simplified Breadcrumbs for Subforum parents)
        v_breadcrumbs := jsonb_build_array(
            jsonb_build_object('name', 'Forum', 'slug', '', 'type', 'root')
        );

        -- For topics in SUBFORUM: Show Forum > Subforum > Topic (skip Category/Subcategory)
        -- For topics in SUBCATEGORY: Show Forum > Category > Subcategory > Topic
        IF v_entity.subforum_id IS NOT NULL THEN
            -- SIMPLIFIED BREADCRUMBS: Forum > Subforum > Topic
            v_breadcrumbs := v_breadcrumbs || jsonb_build_object('name', v_entity.subforum_name, 'slug', v_entity.subforum_slug, 'type', 'subforum');
        ELSE
            -- FULL BREADCRUMBS: Forum > Category > Subcategory > Topic
            IF v_entity.category_name IS NOT NULL THEN
                v_breadcrumbs := v_breadcrumbs || jsonb_build_object('name', v_entity.category_name, 'slug', v_entity.category_slug, 'type', 'category');
            END IF;

            IF v_entity.subcategory_name IS NOT NULL THEN
                v_breadcrumbs := v_breadcrumbs || jsonb_build_object('name', v_entity.subcategory_name, 'slug', v_entity.subcategory_slug, 'type', 'subcategory');
            END IF;
        END IF;

        v_breadcrumbs := v_breadcrumbs || jsonb_build_object('name', v_entity.title, 'slug', v_entity.slug, 'type', 'topic');

        RETURN jsonb_build_object(
            'type', 'topic',
            'entity', jsonb_build_object(
                'id', v_entity.id,
                'slug', v_entity.slug,
                'name', v_entity.title,
                'title', v_entity.title,
                'is_pinned', v_entity.is_pinned,
                'is_locked', v_entity.is_locked,
                'is_important', v_entity.is_important,
                'author_id', v_entity.user_id,
                'created_at', v_entity.created_at,
                'updated_at', v_entity.updated_at,
                'stats', jsonb_build_object(
                    'view_count', v_entity.view_count,
                    'reply_count', v_entity.reply_count,
                    'last_post_at', v_entity.last_post_at
                )
            ),
            'hierarchy', jsonb_build_object(
                'parent', CASE 
                    WHEN v_entity.subforum_id IS NOT NULL THEN 
                         jsonb_build_object('id', v_entity.subforum_id, 'name', v_entity.subforum_name, 'slug', v_entity.subforum_slug, 'type', 'subforum')
                    ELSE 
                         jsonb_build_object('id', v_entity.subcategory_id, 'name', v_entity.subcategory_name, 'slug', v_entity.subcategory_slug, 'type', 'subcategory')
                END,
                'children', '[]'::JSONB
            ),
            'breadcrumbs', v_breadcrumbs
        );
    END IF;

    -- ============================================================================================
    -- 2. GLOBAL ENTITY RESOLUTION (Router Hinted)
    -- ============================================================================================
    
    -- A. SUBCATEGORY (/forum/s/:slug)
    IF p_expected_type = 'subcategory' THEN
        SELECT sc.*, c.name as category_name, c.slug as category_slug
        INTO v_entity
        FROM forum_subcategories sc
        JOIN forum_categories c ON sc.category_id = c.id
        WHERE sc.slug = p_slug 
          AND sc.is_active = true
          AND c.is_active = true -- Recursive Consistency
        LIMIT 1;

        IF FOUND THEN
             -- Optimized Children (Subforums) with Counts - ORDER BY inside agg
             SELECT jsonb_agg(
                 jsonb_build_object(
                     'id', sf.id,
                     'name', sf.name,
                     'slug', sf.slug,
                     'description', sf.description,
                     'icon', sf.icon,
                     'show_icon', sf.show_icon,
                     'stats', jsonb_build_object(
                         'total_topics', (SELECT count(*) FROM forum_topics WHERE subforum_id = sf.id AND is_deleted = false),
                         'total_posts', (SELECT count(*) 
                                         FROM forum_posts p 
                                         JOIN forum_topics t ON p.topic_id = t.id 
                                         WHERE t.subforum_id = sf.id 
                                           AND p.is_deleted = false 
                                           AND t.is_deleted = false)
                     )
                 ) ORDER BY sf.sort_order
             ) INTO v_children
             FROM forum_subforums sf
             WHERE sf.subcategory_id = v_entity.id AND sf.is_active = true;

             IF v_children IS NULL THEN v_children := '[]'::JSONB; END IF;

             -- Stats (Fixed for Global Counts + Active Filter)
             SELECT jsonb_build_object(
                 'total_topics', (
                    SELECT count(*)
                    FROM forum_topics t
                    LEFT JOIN forum_subforums sf ON sf.id = t.subforum_id
                    WHERE t.is_deleted = false
                      AND COALESCE(t.subcategory_id, sf.subcategory_id) = v_entity.id
                      AND (sf.id IS NULL OR sf.is_active = true) -- Active Structure Only
                 ),
                 'total_posts', (
                    SELECT count(*)
                    FROM forum_posts p
                    JOIN forum_topics t ON t.id = p.topic_id
                    LEFT JOIN forum_subforums sf ON sf.id = t.subforum_id
                    WHERE p.is_deleted = false
                      AND t.is_deleted = false
                      AND COALESCE(t.subcategory_id, sf.subcategory_id) = v_entity.id
                      AND (sf.id IS NULL OR sf.is_active = true) -- Active Structure Only
                 )
             ) INTO v_stats;

             v_breadcrumbs := jsonb_build_array(
                 jsonb_build_object('name', 'Forum', 'slug', '', 'type', 'root'),
                 jsonb_build_object('name', v_entity.category_name, 'slug', v_entity.category_slug, 'type', 'category'),
                 jsonb_build_object('name', v_entity.name, 'slug', v_entity.slug, 'type', 'subcategory')
             );

             RETURN jsonb_build_object(
                 'type', 'subcategory',
                 'entity', jsonb_build_object(
                     'id', v_entity.id,
                     'slug', v_entity.slug,
                     'name', v_entity.name,
                     'description', v_entity.description,
                     'icon', v_entity.icon,
                     'stats', v_stats
                 ),
                 'hierarchy', jsonb_build_object(
                     'parent', jsonb_build_object('id', v_entity.category_id, 'name', v_entity.category_name, 'slug', v_entity.category_slug, 'type', 'category'),
                     'children', v_children
                 ),
                 'breadcrumbs', v_breadcrumbs
             );
        END IF;
    END IF;

    -- B. SUBFORUM (/forum/f/:slug)
    IF p_expected_type = 'subforum' THEN
        SELECT sf.*, sc.id as subcat_id, sc.name as subcat_name, sc.slug as subcat_slug, 
               c.id as cat_id, c.name as cat_name, c.slug as cat_slug
        INTO v_entity
        FROM forum_subforums sf
        JOIN forum_subcategories sc ON sf.subcategory_id = sc.id
        JOIN forum_categories c ON sc.category_id = c.id
        WHERE sf.slug = p_slug 
          AND sf.is_active = true
          AND sc.is_active = true -- Recursive Consistency
          AND c.is_active = true  -- Recursive Consistency
        LIMIT 1;

        IF FOUND THEN
             -- Stats
             SELECT jsonb_build_object(
                 'total_topics', (SELECT count(*) FROM forum_topics WHERE subforum_id = v_entity.id AND is_deleted = false),
                 'total_posts', (SELECT count(*) FROM forum_posts p JOIN forum_topics t ON p.topic_id = t.id WHERE t.subforum_id = v_entity.id AND p.is_deleted = false AND t.is_deleted = false)
             ) INTO v_stats;

             -- SIMPLIFIED BREADCRUMBS: Forum > Subforum (skip Category/Subcategory)
             v_breadcrumbs := jsonb_build_array(
                 jsonb_build_object('name', 'Forum', 'slug', '', 'type', 'root'),
                 jsonb_build_object('name', v_entity.name, 'slug', v_entity.slug, 'type', 'subforum')
             );

             RETURN jsonb_build_object(
                 'type', 'subforum',
                 'entity', jsonb_build_object(
                     'id', v_entity.id,
                     'slug', v_entity.slug,
                     'name', v_entity.name,
                     'description', v_entity.description,
                     'icon', v_entity.icon,
                     'stats', v_stats
                 ),
                 'hierarchy', jsonb_build_object(
                     'parent', jsonb_build_object('id', v_entity.subcat_id, 'name', v_entity.subcat_name, 'slug', v_entity.subcat_slug, 'type', 'subcategory'),
                     'children', '[]'::JSONB
                 ),
                 'breadcrumbs', v_breadcrumbs
             );
        END IF;
    END IF;

    -- C. CATEGORY (/forum/c/:slug)
    IF p_expected_type = 'category' THEN
        SELECT * INTO v_entity
        FROM forum_categories
        WHERE slug = p_slug AND is_active = true
        LIMIT 1;

        IF FOUND THEN
             -- Children (Subcategories) with Stats - ORDER BY inside agg
             SELECT jsonb_agg(
                 jsonb_build_object(
                     'id', sc.id,
                     'name', sc.name,
                     'slug', sc.slug,
                     'description', sc.description,
                     'icon', sc.icon,
                     'sort_order', sc.sort_order,
                     'stats', jsonb_build_object(
                         'total_topics', (
                            SELECT count(*)
                            FROM forum_topics t
                            LEFT JOIN forum_subforums sf ON sf.id = t.subforum_id
                            WHERE t.is_deleted = false
                              AND COALESCE(t.subcategory_id, sf.subcategory_id) = sc.id
                              AND (sf.id IS NULL OR sf.is_active = true) -- Active Structure Only
                         ),
                         'total_posts', (
                            SELECT count(*)
                            FROM forum_posts p
                            JOIN forum_topics t ON p.topic_id = t.id
                            LEFT JOIN forum_subforums sf ON sf.id = t.subforum_id
                            WHERE p.is_deleted = false
                              AND t.is_deleted = false
                              AND COALESCE(t.subcategory_id, sf.subcategory_id) = sc.id
                              AND (sf.id IS NULL OR sf.is_active = true) -- Active Structure Only
                         )
                     )
                 ) ORDER BY sc.sort_order
             ) INTO v_children
             FROM forum_subcategories sc
             WHERE sc.category_id = v_entity.id AND sc.is_active = true;

             IF v_children IS NULL THEN v_children := '[]'::JSONB; END IF;

             v_breadcrumbs := jsonb_build_array(
                 jsonb_build_object('name', 'Forum', 'slug', '', 'type', 'root'),
                 jsonb_build_object('name', v_entity.name, 'slug', v_entity.slug, 'type', 'category')
             );

             RETURN jsonb_build_object(
                 'type', 'category',
                 'entity', jsonb_build_object(
                     'id', v_entity.id,
                     'slug', v_entity.slug,
                     'name', v_entity.name,
                     'description', v_entity.description,
                     'icon', v_entity.icon,
                     'stats', jsonb_build_object()
                 ),
                 'hierarchy', jsonb_build_object(
                     'parent', null,
                     'children', v_children
                 ),
                 'breadcrumbs', v_breadcrumbs
             );
        END IF;
    END IF;

    -- 3. Strict 404 (Default)
    RETURN v_null_response;

END;
$$;
