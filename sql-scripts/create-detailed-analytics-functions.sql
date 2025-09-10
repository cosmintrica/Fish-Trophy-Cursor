-- Create Detailed Analytics Functions
-- This creates functions to get device, browser, OS, country, and referrer stats

-- 1. Function to get device statistics
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
    WHERE metadata->>'device_type' IS NOT NULL
    GROUP BY metadata->>'device_type'
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to get browser statistics
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
    WHERE metadata->>'browser' IS NOT NULL
    GROUP BY metadata->>'browser'
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to get OS statistics
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
    WHERE metadata->>'os' IS NOT NULL
    GROUP BY metadata->>'os'
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to get country statistics
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
    WHERE metadata->>'country' IS NOT NULL
    GROUP BY metadata->>'country'
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to get referrer statistics
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
    WHERE metadata->>'referrer' IS NOT NULL
    GROUP BY metadata->>'referrer'
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to get page views statistics
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

-- 7. Grant permissions on all functions
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

-- 8. Test the functions
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
