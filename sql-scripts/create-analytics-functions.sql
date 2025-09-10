-- Create Missing Analytics Functions
-- This fixes the 400 error for get_current_analytics_stats

-- 1. Create the missing get_current_analytics_stats function
CREATE OR REPLACE FUNCTION get_current_analytics_stats()
RETURNS TABLE (
    total_users INTEGER,
    total_records INTEGER,
    total_page_views INTEGER,
    new_users_today INTEGER,
    new_records_today INTEGER,
    page_views_today INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM profiles) as total_users,
        (SELECT COUNT(*)::INTEGER FROM records) as total_records,
        (SELECT COUNT(*)::INTEGER FROM analytics_events) as total_page_views,
        (SELECT COUNT(*)::INTEGER FROM profiles WHERE DATE(created_at) = CURRENT_DATE) as new_users_today,
        (SELECT COUNT(*)::INTEGER FROM records WHERE DATE(created_at) = CURRENT_DATE) as new_records_today,
        (SELECT COUNT(*)::INTEGER FROM analytics_events WHERE DATE(created_at) = CURRENT_DATE) as page_views_today;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant permissions on the function
GRANT EXECUTE ON FUNCTION get_current_analytics_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_analytics_stats() TO anon;

-- 3. Test the function
SELECT * FROM get_current_analytics_stats();
