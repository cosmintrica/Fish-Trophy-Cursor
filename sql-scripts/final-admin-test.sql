-- Final test for admin panel functionality
-- Run this in Supabase SQL Editor to verify everything works

-- Test main analytics function
SELECT '=== MAIN ANALYTICS FUNCTION ===' as test_section;
SELECT * FROM get_current_analytics_stats();

-- Test traffic evolution functions
SELECT '=== TRAFFIC EVOLUTION FUNCTIONS ===' as test_section;

SELECT 'Last hour (should show data):' as test_name;
SELECT * FROM get_traffic_last_hour() LIMIT 3;

SELECT 'Last 24h (should show data):' as test_name;
SELECT * FROM get_traffic_last_24h() LIMIT 3;

SELECT 'Last week (should show data):' as test_name;
SELECT * FROM get_traffic_last_week() LIMIT 3;

-- Test detailed analytics functions
SELECT '=== DETAILED ANALYTICS FUNCTIONS ===' as test_section;

SELECT 'Device stats:' as test_name;
SELECT * FROM get_device_stats();

SELECT 'Browser stats:' as test_name;
SELECT * FROM get_browser_stats();

SELECT 'OS stats:' as test_name;
SELECT * FROM get_os_stats();

SELECT 'Country stats:' as test_name;
SELECT * FROM get_country_stats();

SELECT 'Referrer stats:' as test_name;
SELECT * FROM get_referrer_stats();

SELECT 'Page views stats:' as test_name;
SELECT * FROM get_page_views_stats();

-- Summary
SELECT '=== SUMMARY ===' as test_section;
SELECT
    'Total analytics events today:' as metric,
    COUNT(*)::TEXT as value
FROM analytics_events
WHERE DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
AND event_type = 'page_view'

UNION ALL

SELECT
    'Unique visitors today:' as metric,
    COUNT(DISTINCT user_id)::TEXT as value
FROM analytics_events
WHERE DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
AND event_type = 'page_view'

UNION ALL

SELECT
    'Sessions today:' as metric,
    COUNT(DISTINCT session_id)::TEXT as value
FROM analytics_events
WHERE DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
AND event_type = 'page_view';
