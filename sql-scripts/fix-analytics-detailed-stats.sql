-- Fix Analytics Detailed Stats
-- First, let's add some test data to analytics_events and fix the functions

-- 1. Insert some test analytics data
INSERT INTO analytics_events (event_type, user_id, session_id, page_url, metadata) VALUES
('page_view', 'd36efb03-fe89-4935-88bc-7e2b2f337e5c', 'session_1', '/', '{"device_type": "desktop", "browser": "Chrome", "os": "Windows", "country": "Romania", "referrer": "google.com"}'),
('page_view', 'd36efb03-fe89-4935-88bc-7e2b2f337e5c', 'session_1', '/records', '{"device_type": "desktop", "browser": "Chrome", "os": "Windows", "country": "Romania", "referrer": "direct"}'),
('page_view', 'd36efb03-fe89-4935-88bc-7e2b2f337e5c', 'session_2', '/', '{"device_type": "mobile", "browser": "Safari", "os": "iOS", "country": "Romania", "referrer": "facebook.com"}'),
('page_view', 'd36efb03-fe89-4935-88bc-7e2b2f337e5c', 'session_3', '/admin', '{"device_type": "desktop", "browser": "Firefox", "os": "Linux", "country": "Romania", "referrer": "direct"}'),
('page_view', 'd36efb03-fe89-4935-88bc-7e2b2f337e5c', 'session_4', '/profile', '{"device_type": "tablet", "browser": "Chrome", "os": "Android", "country": "Romania", "referrer": "twitter.com"}')
ON CONFLICT DO NOTHING;

-- 2. Create simplified functions that work with existing data structure
CREATE OR REPLACE FUNCTION get_device_stats()
RETURNS TABLE (
    device_type TEXT,
    count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(metadata->>'device_type', 'Unknown') as device_type,
        COUNT(*)::INTEGER as count
    FROM analytics_events
    WHERE metadata IS NOT NULL
    GROUP BY metadata->>'device_type'
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_browser_stats()
RETURNS TABLE (
    browser TEXT,
    count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(metadata->>'browser', 'Unknown') as browser,
        COUNT(*)::INTEGER as count
    FROM analytics_events
    WHERE metadata IS NOT NULL
    GROUP BY metadata->>'browser'
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_os_stats()
RETURNS TABLE (
    os TEXT,
    count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(metadata->>'os', 'Unknown') as os,
        COUNT(*)::INTEGER as count
    FROM analytics_events
    WHERE metadata IS NOT NULL
    GROUP BY metadata->>'os'
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_country_stats()
RETURNS TABLE (
    country TEXT,
    count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(metadata->>'country', 'Unknown') as country,
        COUNT(*)::INTEGER as count
    FROM analytics_events
    WHERE metadata IS NOT NULL
    GROUP BY metadata->>'country'
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_referrer_stats()
RETURNS TABLE (
    referrer TEXT,
    count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(metadata->>'referrer', 'Direct') as referrer,
        COUNT(*)::INTEGER as count
    FROM analytics_events
    WHERE metadata IS NOT NULL
    GROUP BY metadata->>'referrer'
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_page_views_stats()
RETURNS TABLE (
    page_url TEXT,
    count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(page_url, 'Unknown') as page_url,
        COUNT(*)::INTEGER as count
    FROM analytics_events
    WHERE page_url IS NOT NULL
    GROUP BY page_url
    ORDER BY count DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION get_device_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_device_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_browser_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_browser_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_os_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_os_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_country_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_country_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_referrer_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_referrer_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_page_views_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_page_views_stats() TO anon;

-- 4. Test the functions
SELECT 'Device Stats:' as test_type;
SELECT * FROM get_device_stats();

SELECT 'Browser Stats:' as test_type;
SELECT * FROM get_browser_stats();

SELECT 'OS Stats:' as test_type;
SELECT * FROM get_os_stats();

SELECT 'Country Stats:' as test_type;
SELECT * FROM get_country_stats();

SELECT 'Referrer Stats:' as test_type;
SELECT * FROM get_referrer_stats();

SELECT 'Page Views Stats:' as test_type;
SELECT * FROM get_page_views_stats();
