-- Simple test for traffic functions
-- Run this in Supabase SQL Editor

-- Test get_traffic_last_hour function
SELECT 'Testing get_traffic_last_hour:' as test_name;
SELECT * FROM get_traffic_last_hour() LIMIT 5;

-- Check if we have any data at all
SELECT 'Total events count:' as test_name;
SELECT COUNT(*) as total_events FROM analytics_events WHERE event_type = 'page_view';

-- Check recent events
SELECT 'Recent events:' as test_name;
SELECT
    timestamp,
    event_type,
    page_path
FROM analytics_events
WHERE event_type = 'page_view'
ORDER BY timestamp DESC
LIMIT 5;
