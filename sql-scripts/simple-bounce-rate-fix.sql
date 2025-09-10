-- Simple fix for bounce rate and session time
-- Run this in Supabase SQL Editor

-- First, let's check what data we have
SELECT 'Current analytics data:' as test_name;
SELECT
    COUNT(*) as total_page_views,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT user_id) as unique_users
FROM analytics_events
WHERE event_type = 'page_view'
AND DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE;

-- Calculate bounce rate and session time manually
SELECT 'Manual bounce rate calculation:' as test_name;
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
)
SELECT
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN page_views = 1 THEN 1 END) as single_page_sessions,
    ROUND((COUNT(CASE WHEN page_views = 1 THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2) as bounce_rate_percent,
    ROUND(AVG(session_duration_seconds), 0) as avg_session_time_seconds
FROM session_stats;

-- Create a simple function to get bounce rate and session time
CREATE OR REPLACE FUNCTION get_bounce_rate_and_session_time()
RETURNS TABLE (
    bounce_rate DECIMAL(5,2),
    avg_session_time INTEGER
) AS $$
DECLARE
    total_sessions INTEGER;
    single_page_sessions INTEGER;
    avg_duration DECIMAL;
BEGIN
    -- Get session statistics
    SELECT
        COUNT(*),
        COUNT(CASE WHEN page_views = 1 THEN 1 END),
        AVG(session_duration_seconds)
    INTO total_sessions, single_page_sessions, avg_duration
    FROM (
        SELECT
            session_id,
            COUNT(*) as page_views,
            EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) as session_duration_seconds
        FROM analytics_events
        WHERE event_type = 'page_view'
        AND DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
        GROUP BY session_id
    ) session_stats;

    -- Calculate bounce rate
    IF total_sessions > 0 THEN
        bounce_rate := (single_page_sessions::DECIMAL / total_sessions) * 100;
    ELSE
        bounce_rate := 0;
    END IF;

    -- Set average session time
    avg_session_time := COALESCE(avg_duration::INTEGER, 0);

    RETURN QUERY SELECT bounce_rate, avg_session_time;
END;
$$ LANGUAGE plpgsql;

-- Test the simple function
SELECT 'Testing simple bounce rate function:' as test_name;
SELECT * FROM get_bounce_rate_and_session_time();

-- Update the main analytics function with explicit column references
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

        -- Real bounce rate and session time using the simple function
        (SELECT brst.bounce_rate FROM get_bounce_rate_and_session_time() brst) as bounce_rate,
        (SELECT brst.avg_session_time FROM get_bounce_rate_and_session_time() brst) as avg_session_time;
END;
$$ LANGUAGE plpgsql;

-- Test the updated function
SELECT 'Testing updated main analytics function:' as test_name;
SELECT * FROM get_current_analytics_stats();
