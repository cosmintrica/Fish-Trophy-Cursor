-- Create Missing Analytics Function
-- This creates the get_current_analytics_stats function that Admin.tsx is trying to call

-- 1. Drop the function if it exists
DROP FUNCTION IF EXISTS get_current_analytics_stats();

-- 2. Create the function that Admin.tsx expects
CREATE OR REPLACE FUNCTION get_current_analytics_stats()
RETURNS TABLE (
    total_users INTEGER,
    total_records INTEGER,
    total_page_views INTEGER,
    new_users_today INTEGER,
    new_records_today INTEGER,
    page_views_today INTEGER,
    today_unique_visitors INTEGER,
    today_sessions INTEGER,
    bounce_rate NUMERIC,
    avg_session_time NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM profiles) as total_users,
        (SELECT COUNT(*)::INTEGER FROM records) as total_records,
        (SELECT COUNT(*)::INTEGER FROM analytics_events) as total_page_views,
        (SELECT COUNT(*)::INTEGER FROM profiles WHERE DATE(created_at) = CURRENT_DATE) as new_users_today,
        (SELECT COUNT(*)::INTEGER FROM records WHERE DATE(created_at) = CURRENT_DATE) as new_records_today,
        (SELECT COUNT(*)::INTEGER FROM analytics_events WHERE DATE(created_at) = CURRENT_DATE) as page_views_today,
        (SELECT COUNT(DISTINCT user_id)::INTEGER FROM analytics_events WHERE DATE(created_at) = CURRENT_DATE) as today_unique_visitors,
        (SELECT COUNT(DISTINCT session_id)::INTEGER FROM analytics_events WHERE DATE(created_at) = CURRENT_DATE) as today_sessions,
        (SELECT COALESCE(AVG(bounce_rate), 0)::NUMERIC FROM analytics_events WHERE DATE(created_at) = CURRENT_DATE) as bounce_rate,
        (SELECT COALESCE(AVG(session_duration), 0)::NUMERIC FROM analytics_events WHERE DATE(created_at) = CURRENT_DATE) as avg_session_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION get_current_analytics_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_analytics_stats() TO anon;

-- 4. Test the function
SELECT * FROM get_current_analytics_stats();
