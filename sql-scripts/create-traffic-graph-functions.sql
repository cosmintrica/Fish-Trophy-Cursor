-- Create Traffic Graph Functions
-- Functions to get traffic data for different time periods

-- 1. Function to get traffic data for last hour
CREATE OR REPLACE FUNCTION get_traffic_last_hour()
RETURNS TABLE (
    time_period TEXT,
    page_views INTEGER,
    unique_visitors INTEGER,
    sessions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(ae.created_at, 'HH24:MI') as time_period,
        COUNT(*)::INTEGER as page_views,
        COUNT(DISTINCT ae.user_id)::INTEGER as unique_visitors,
        COUNT(DISTINCT ae.session_id)::INTEGER as sessions
    FROM analytics_events ae
    WHERE ae.created_at >= NOW() - INTERVAL '1 hour'
    AND ae.event_type = 'page_view'
    GROUP BY TO_CHAR(ae.created_at, 'HH24:MI')
    ORDER BY time_period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to get traffic data for last 24 hours
CREATE OR REPLACE FUNCTION get_traffic_last_24h()
RETURNS TABLE (
    time_period TEXT,
    page_views INTEGER,
    unique_visitors INTEGER,
    sessions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(ae.created_at, 'HH24:00') as time_period,
        COUNT(*)::INTEGER as page_views,
        COUNT(DISTINCT ae.user_id)::INTEGER as unique_visitors,
        COUNT(DISTINCT ae.session_id)::INTEGER as sessions
    FROM analytics_events ae
    WHERE ae.created_at >= NOW() - INTERVAL '24 hours'
    AND ae.event_type = 'page_view'
    GROUP BY TO_CHAR(ae.created_at, 'HH24:00')
    ORDER BY time_period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to get traffic data for last week
CREATE OR REPLACE FUNCTION get_traffic_last_week()
RETURNS TABLE (
    time_period TEXT,
    page_views INTEGER,
    unique_visitors INTEGER,
    sessions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(ae.created_at, 'YYYY-MM-DD') as time_period,
        COUNT(*)::INTEGER as page_views,
        COUNT(DISTINCT ae.user_id)::INTEGER as unique_visitors,
        COUNT(DISTINCT ae.session_id)::INTEGER as sessions
    FROM analytics_events ae
    WHERE ae.created_at >= NOW() - INTERVAL '7 days'
    AND ae.event_type = 'page_view'
    GROUP BY TO_CHAR(ae.created_at, 'YYYY-MM-DD')
    ORDER BY time_period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to get traffic data for last month
CREATE OR REPLACE FUNCTION get_traffic_last_month()
RETURNS TABLE (
    time_period TEXT,
    page_views INTEGER,
    unique_visitors INTEGER,
    sessions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(ae.created_at, 'YYYY-MM-DD') as time_period,
        COUNT(*)::INTEGER as page_views,
        COUNT(DISTINCT ae.user_id)::INTEGER as unique_visitors,
        COUNT(DISTINCT ae.session_id)::INTEGER as sessions
    FROM analytics_events ae
    WHERE ae.created_at >= NOW() - INTERVAL '30 days'
    AND ae.event_type = 'page_view'
    GROUP BY TO_CHAR(ae.created_at, 'YYYY-MM-DD')
    ORDER BY time_period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to get traffic data for last year
CREATE OR REPLACE FUNCTION get_traffic_last_year()
RETURNS TABLE (
    time_period TEXT,
    page_views INTEGER,
    unique_visitors INTEGER,
    sessions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(ae.created_at, 'YYYY-MM') as time_period,
        COUNT(*)::INTEGER as page_views,
        COUNT(DISTINCT ae.user_id)::INTEGER as unique_visitors,
        COUNT(DISTINCT ae.session_id)::INTEGER as sessions
    FROM analytics_events ae
    WHERE ae.created_at >= NOW() - INTERVAL '1 year'
    AND ae.event_type = 'page_view'
    GROUP BY TO_CHAR(ae.created_at, 'YYYY-MM')
    ORDER BY time_period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to get traffic data for custom period
CREATE OR REPLACE FUNCTION get_traffic_custom_period(start_date TIMESTAMP, end_date TIMESTAMP)
RETURNS TABLE (
    time_period TEXT,
    page_views INTEGER,
    unique_visitors INTEGER,
    sessions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(ae.created_at, 'YYYY-MM-DD') as time_period,
        COUNT(*)::INTEGER as page_views,
        COUNT(DISTINCT ae.user_id)::INTEGER as unique_visitors,
        COUNT(DISTINCT ae.session_id)::INTEGER as sessions
    FROM analytics_events ae
    WHERE ae.created_at >= start_date
    AND ae.created_at <= end_date
    AND ae.event_type = 'page_view'
    GROUP BY TO_CHAR(ae.created_at, 'YYYY-MM-DD')
    ORDER BY time_period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION get_traffic_last_hour() TO authenticated;
GRANT EXECUTE ON FUNCTION get_traffic_last_hour() TO anon;
GRANT EXECUTE ON FUNCTION get_traffic_last_24h() TO authenticated;
GRANT EXECUTE ON FUNCTION get_traffic_last_24h() TO anon;
GRANT EXECUTE ON FUNCTION get_traffic_last_week() TO authenticated;
GRANT EXECUTE ON FUNCTION get_traffic_last_week() TO anon;
GRANT EXECUTE ON FUNCTION get_traffic_last_month() TO authenticated;
GRANT EXECUTE ON FUNCTION get_traffic_last_month() TO anon;
GRANT EXECUTE ON FUNCTION get_traffic_last_year() TO authenticated;
GRANT EXECUTE ON FUNCTION get_traffic_last_year() TO anon;
GRANT EXECUTE ON FUNCTION get_traffic_custom_period(TIMESTAMP, TIMESTAMP) TO authenticated;
GRANT EXECUTE ON FUNCTION get_traffic_custom_period(TIMESTAMP, TIMESTAMP) TO anon;

-- 8. Test the functions
SELECT 'Last Hour Traffic:' as test_type;
SELECT * FROM get_traffic_last_hour();

SELECT 'Last 24h Traffic:' as test_type;
SELECT * FROM get_traffic_last_24h();

SELECT 'Last Week Traffic:' as test_type;
SELECT * FROM get_traffic_last_week();

SELECT 'Last Month Traffic:' as test_type;
SELECT * FROM get_traffic_last_month();

SELECT 'Last Year Traffic:' as test_type;
SELECT * FROM get_traffic_last_year();
