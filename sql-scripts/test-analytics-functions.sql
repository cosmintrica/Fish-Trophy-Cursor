-- Test analytics functions to see what data they return
-- Run this in Supabase SQL Editor to debug

-- Test the main analytics function
SELECT * FROM get_current_analytics_stats();

-- Test individual functions
SELECT * FROM get_device_stats();
SELECT * FROM get_browser_stats();
SELECT * FROM get_os_stats();
SELECT * FROM get_country_stats();
SELECT * FROM get_referrer_stats();
SELECT * FROM get_page_views_stats();

-- Check raw analytics data
SELECT
    DATE(timestamp) as date,
    event_type,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions
FROM analytics_events
WHERE DATE(timestamp) = CURRENT_DATE
GROUP BY DATE(timestamp), event_type
ORDER BY event_type;

-- Check referrer data specifically
SELECT
    referrer,
    COUNT(*) as count
FROM analytics_events
WHERE DATE(timestamp) = CURRENT_DATE
AND event_type = 'page_view'
GROUP BY referrer
ORDER BY count DESC;

-- Check country data
SELECT
    country,
    COUNT(*) as count
FROM analytics_events
WHERE DATE(timestamp) = CURRENT_DATE
AND event_type = 'page_view'
GROUP BY country
ORDER BY count DESC;
