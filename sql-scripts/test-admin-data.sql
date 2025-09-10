-- Test what the admin panel should receive
-- Run this in Supabase SQL Editor

-- Test the main function that admin panel calls
SELECT 'Main Analytics Function (what admin panel gets):' as test_name;
SELECT * FROM get_current_analytics_stats();

-- Let's also test each component manually to see the exact values
SELECT 'Manual calculation of today page views:' as test_name;
SELECT COUNT(*)::INTEGER as page_views_today
FROM analytics_events
WHERE DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
AND event_type = 'page_view';

SELECT 'Manual calculation of unique visitors:' as test_name;
SELECT COUNT(DISTINCT user_id)::INTEGER as today_unique_visitors
FROM analytics_events
WHERE DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
AND event_type = 'page_view';

SELECT 'Manual calculation of sessions:' as test_name;
SELECT COUNT(DISTINCT session_id)::INTEGER as today_sessions
FROM analytics_events
WHERE DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
AND event_type = 'page_view';

-- Check if there are any analytics_sessions records
SELECT 'Analytics sessions count:' as test_name;
SELECT COUNT(*) as sessions_count FROM analytics_sessions;

-- Check bounce rate calculation
SELECT 'Bounce rate calculation:' as test_name;
SELECT
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN page_views = 1 THEN 1 END) as single_page_sessions,
    (COUNT(CASE WHEN page_views = 1 THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100 as bounce_rate_percent
FROM analytics_sessions
WHERE DATE(started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE;
