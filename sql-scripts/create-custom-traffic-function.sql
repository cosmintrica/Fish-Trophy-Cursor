-- Create custom period traffic function
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_traffic_custom_period(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TABLE (
    time_period TEXT,
    page_views INTEGER,
    unique_visitors INTEGER,
    sessions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'YYYY-MM-DD')::TEXT as time_period,
        COUNT(*)::INTEGER as page_views,
        COUNT(DISTINCT user_id)::INTEGER as unique_visitors,
        COUNT(DISTINCT session_id)::INTEGER as sessions
    FROM analytics_events 
    WHERE event_type = 'page_view'
    AND timestamp >= start_date
    AND timestamp <= end_date
    GROUP BY TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'YYYY-MM-DD')
    ORDER BY time_period;
END;
$$ LANGUAGE plpgsql;

-- Test the custom function
SELECT 'Testing custom period function:' as test_name;
SELECT * FROM get_traffic_custom_period(
    NOW() - INTERVAL '7 days',
    NOW()
) LIMIT 5;
