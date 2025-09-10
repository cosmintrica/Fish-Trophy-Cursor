-- Test traffic functions to see what data they return
-- Run this in Supabase SQL Editor

-- Test the main traffic function for last hour
SELECT 'Testing get_traffic_last_hour function:' as test_name;
SELECT * FROM get_traffic_last_hour();

-- Check what data we have in the last hour
SELECT 'Raw data for last hour:' as test_name;
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

-- Check current time in different timezones
SELECT 'Current time check:' as test_name;
SELECT
    NOW() as utc_time,
    NOW() AT TIME ZONE 'Europe/Bucharest' as romania_time,
    EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Europe/Bucharest') as romania_hour,
    EXTRACT(MINUTE FROM NOW() AT TIME ZONE 'Europe/Bucharest') as romania_minute;

-- Check if we have any data in the last hour
SELECT 'Data count in last hour:' as test_name;
SELECT
    COUNT(*) as total_events,
    MIN(timestamp) as earliest,
    MAX(timestamp) as latest
FROM analytics_events
WHERE event_type = 'page_view'
AND timestamp >= NOW() - INTERVAL '1 hour';

-- Let's try a different approach - get data for the last 2 hours to see if we have data
SELECT 'Data for last 2 hours:' as test_name;
SELECT
    TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'HH24:MI') as time_period,
    COUNT(*) as page_views,
    COUNT(DISTINCT user_id) as unique_visitors,
    COUNT(DISTINCT session_id) as sessions
FROM analytics_events
WHERE event_type = 'page_view'
AND timestamp >= NOW() - INTERVAL '2 hours'
GROUP BY TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'HH24:MI')
ORDER BY time_period;
