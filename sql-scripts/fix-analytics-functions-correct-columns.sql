-- Fix Analytics Functions to Use Correct Column Names
-- The functions were looking in metadata JSON but data is in separate columns

-- 1. Drop existing functions
DROP FUNCTION IF EXISTS get_device_stats();
DROP FUNCTION IF EXISTS get_browser_stats();
DROP FUNCTION IF EXISTS get_os_stats();
DROP FUNCTION IF EXISTS get_country_stats();
DROP FUNCTION IF EXISTS get_referrer_stats();
DROP FUNCTION IF EXISTS get_page_views_stats();

-- 2. Create corrected functions using actual column names
CREATE OR REPLACE FUNCTION get_device_stats()
RETURNS TABLE (
    device_type TEXT,
    count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ae.device_type, 'Unknown') as device_type,
        COUNT(*)::INTEGER as count
    FROM analytics_events ae
    WHERE ae.device_type IS NOT NULL
    GROUP BY ae.device_type
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
        COALESCE(ae.browser, 'Unknown') as browser,
        COUNT(*)::INTEGER as count
    FROM analytics_events ae
    WHERE ae.browser IS NOT NULL
    GROUP BY ae.browser
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
        COALESCE(ae.os, 'Unknown') as os,
        COUNT(*)::INTEGER as count
    FROM analytics_events ae
    WHERE ae.os IS NOT NULL
    GROUP BY ae.os
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
        COALESCE(ae.country, 'Unknown') as country,
        COUNT(*)::INTEGER as count
    FROM analytics_events ae
    WHERE ae.country IS NOT NULL
    GROUP BY ae.country
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
        COALESCE(ae.referrer, 'Direct') as referrer,
        COUNT(*)::INTEGER as count
    FROM analytics_events ae
    WHERE ae.referrer IS NOT NULL
    GROUP BY ae.referrer
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
        COALESCE(ae.page_url, 'Unknown') as page_url,
        COUNT(*)::INTEGER as count
    FROM analytics_events ae
    WHERE ae.page_url IS NOT NULL
    GROUP BY ae.page_url
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
