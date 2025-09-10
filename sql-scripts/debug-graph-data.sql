-- Debug graph data to see what the admin panel should receive
-- Run this in Supabase SQL Editor

-- Check current time
SELECT 'Current time check:' as test_name;
SELECT 
    NOW() as utc_time,
    NOW() AT TIME ZONE 'Europe/Bucharest' as romania_time,
    EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Europe/Bucharest') as romania_hour,
    EXTRACT(MINUTE FROM NOW() AT TIME ZONE 'Europe/Bucharest') as romania_minute;

-- Test the get_traffic_last_hour function
SELECT 'get_traffic_last_hour function result:' as test_name;
SELECT * FROM get_traffic_last_hour();

-- Check if we have data in the last hour
SELECT 'Data in last hour:' as test_name;
SELECT 
    COUNT(*) as total_events,
    MIN(timestamp) as earliest,
    MAX(timestamp) as latest
FROM analytics_events 
WHERE event_type = 'page_view'
AND timestamp >= NOW() - INTERVAL '1 hour';

-- If no data in last hour, check last 2 hours
SELECT 'Data in last 2 hours:' as test_name;
SELECT 
    COUNT(*) as total_events,
    MIN(timestamp) as earliest,
    MAX(timestamp) as latest
FROM analytics_events 
WHERE event_type = 'page_view'
AND timestamp >= NOW() - INTERVAL '2 hours';

-- Check what data we have for today
SELECT 'Data for today:' as test_name;
SELECT 
    TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'HH24:MI') as time_period,
    COUNT(*) as page_views,
    COUNT(DISTINCT user_id) as unique_visitors,
    COUNT(DISTINCT session_id) as sessions
FROM analytics_events 
WHERE event_type = 'page_view'
AND DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
GROUP BY TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'HH24:MI')
ORDER BY time_period DESC
LIMIT 10;

-- Test with a wider time range to see if we have any data
SELECT 'Data for last 3 hours (wider range):' as test_name;
SELECT 
    TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'HH24:MI') as time_period,
    COUNT(*) as page_views,
    COUNT(DISTINCT user_id) as unique_visitors,
    COUNT(DISTINCT session_id) as sessions
FROM analytics_events 
WHERE event_type = 'page_view'
AND timestamp >= NOW() - INTERVAL '3 hours'
GROUP BY TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'HH24:MI')
ORDER BY time_period DESC
LIMIT 10;
