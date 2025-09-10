-- Fix bounce rate and average session time calculations
-- Run this in Supabase SQL Editor

-- First, let's check if we have analytics_sessions table
SELECT 'Checking analytics_sessions table:' as test_name;
SELECT COUNT(*) as sessions_count FROM analytics_sessions;

-- Check if we have session data in analytics_events
SELECT 'Checking session data in analytics_events:' as test_name;
SELECT
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(*) as total_events,
    MIN(timestamp) as earliest_event,
    MAX(timestamp) as latest_event
FROM analytics_events
WHERE event_type = 'page_view';

-- Create a function to calculate bounce rate and session time from analytics_events
CREATE OR REPLACE FUNCTION calculate_session_metrics()
RETURNS TABLE (
    bounce_rate DECIMAL(5,2),
    avg_session_time INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH session_stats AS (
        SELECT
            session_id,
            COUNT(*) as page_views,
            MIN(timestamp) as session_start,
            MAX(timestamp) as session_end,
            EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) as session_duration_seconds
        FROM analytics_events
        WHERE event_type = 'page_view'
        AND DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
        GROUP BY session_id
    ),
    bounce_calculation AS (
        SELECT
            COUNT(*) as total_sessions,
            COUNT(CASE WHEN page_views = 1 THEN 1 END) as single_page_sessions,
            AVG(session_duration_seconds) as avg_duration
        FROM session_stats
    )
    SELECT
        CASE
            WHEN total_sessions > 0 THEN (single_page_sessions::DECIMAL / total_sessions) * 100
            ELSE 0
        END as bounce_rate,
        COALESCE(avg_duration::INTEGER, 0) as avg_session_time
    FROM bounce_calculation;
END;
$$ LANGUAGE plpgsql;

-- Test the new function
SELECT 'Testing session metrics calculation:' as test_name;
SELECT * FROM calculate_session_metrics();

-- Update the main analytics function to use real calculations
DROP FUNCTION IF EXISTS get_current_analytics_stats();

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
    bounce_rate DECIMAL(5,2),
    avg_session_time INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH session_metrics AS (
        SELECT * FROM calculate_session_metrics()
    )
    SELECT
        -- Total counts
        (SELECT COUNT(*)::INTEGER FROM profiles) as total_users,
        (SELECT COUNT(*)::INTEGER FROM records WHERE status = 'verified') as total_records,
        (SELECT COUNT(*)::INTEGER FROM analytics_events WHERE event_type = 'page_view') as total_page_views,

        -- Today's counts (using Romania timezone)
        (SELECT COUNT(*)::INTEGER FROM profiles WHERE DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE) as new_users_today,
        (SELECT COUNT(*)::INTEGER FROM records WHERE DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE AND status = 'verified') as new_records_today,
        (SELECT COUNT(*)::INTEGER FROM analytics_events WHERE DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE AND event_type = 'page_view') as page_views_today,

        -- Analytics for today (using Romania timezone)
        (SELECT COUNT(DISTINCT user_id)::INTEGER FROM analytics_events WHERE DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE AND event_type = 'page_view') as today_unique_visitors,
        (SELECT COUNT(DISTINCT session_id)::INTEGER FROM analytics_events WHERE DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE AND event_type = 'page_view') as today_sessions,

        -- Real bounce rate and session time
        (SELECT sm.bounce_rate FROM session_metrics sm) as bounce_rate,
        (SELECT sm.avg_session_time FROM session_metrics sm) as avg_session_time;
END;
$$ LANGUAGE plpgsql;

-- Test the updated function
SELECT 'Testing updated main analytics function:' as test_name;
SELECT * FROM get_current_analytics_stats();

-- Let's also check what data we have for debugging
SELECT 'Debug: Session data breakdown:' as test_name;
SELECT
    session_id,
    COUNT(*) as page_views,
    MIN(timestamp) as session_start,
    MAX(timestamp) as session_end,
    EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) as duration_seconds
FROM analytics_events
WHERE event_type = 'page_view'
AND DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
GROUP BY session_id
ORDER BY session_start DESC
LIMIT 10;
