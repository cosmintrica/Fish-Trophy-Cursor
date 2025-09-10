-- Debug traffic graph functions
-- Run this in Supabase SQL Editor

-- Check what data we have in analytics_events for the last hour
SELECT 'Data in analytics_events for last hour:' as test_name;
SELECT
    TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'HH24:MI') as time_period,
    COUNT(*) as page_views,
    COUNT(DISTINCT user_id) as unique_visitors,
    COUNT(DISTINCT session_id) as sessions
FROM analytics_events
WHERE event_type = 'page_view'
AND timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'HH24:MI')
ORDER BY time_period;

-- Check what the get_traffic_last_hour function returns
SELECT 'get_traffic_last_hour function result:' as test_name;
SELECT * FROM get_traffic_last_hour();

-- Check if the function exists
SELECT 'Checking if traffic functions exist:' as test_name;
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%traffic%'
AND routine_schema = 'public';

-- Let's recreate the traffic functions with better debugging
DROP FUNCTION IF EXISTS get_traffic_last_hour();

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
        TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'HH24:MI')::TEXT as time_period,
        COUNT(*)::INTEGER as page_views,
        COUNT(DISTINCT user_id)::INTEGER as unique_visitors,
        COUNT(DISTINCT session_id)::INTEGER as sessions
    FROM analytics_events
    WHERE event_type = 'page_view'
    AND timestamp >= NOW() - INTERVAL '1 hour'
    GROUP BY TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'HH24:MI')
    ORDER BY time_period;
END;
$$ LANGUAGE plpgsql;

-- Test the recreated function
SELECT 'Testing recreated get_traffic_last_hour:' as test_name;
SELECT * FROM get_traffic_last_hour();

-- Check timezone settings
SELECT 'Current timezone settings:' as test_name;
SELECT
    current_setting('timezone') as current_timezone,
    NOW() as current_time,
    NOW() AT TIME ZONE 'Europe/Bucharest' as romania_time;

-- Check if we have any data at all
SELECT 'Total analytics events count:' as test_name;
SELECT
    COUNT(*) as total_events,
    COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as page_view_events,
    MIN(timestamp) as earliest_event,
    MAX(timestamp) as latest_event
FROM analytics_events;
