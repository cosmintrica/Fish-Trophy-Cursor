-- Create traffic evolution functions for the admin panel
-- Run this in Supabase SQL Editor

-- Function for last hour traffic (by minutes)
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

-- Function for last 24 hours traffic (by hours)
CREATE OR REPLACE FUNCTION get_traffic_last_24h()
RETURNS TABLE (
    time_period TEXT,
    page_views INTEGER,
    unique_visitors INTEGER,
    sessions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'HH24:00')::TEXT as time_period,
        COUNT(*)::INTEGER as page_views,
        COUNT(DISTINCT user_id)::INTEGER as unique_visitors,
        COUNT(DISTINCT session_id)::INTEGER as sessions
    FROM analytics_events
    WHERE event_type = 'page_view'
    AND timestamp >= NOW() - INTERVAL '24 hours'
    GROUP BY TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'HH24:00')
    ORDER BY time_period;
END;
$$ LANGUAGE plpgsql;

-- Function for last week traffic (by days)
CREATE OR REPLACE FUNCTION get_traffic_last_week()
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
    AND timestamp >= NOW() - INTERVAL '7 days'
    GROUP BY TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'YYYY-MM-DD')
    ORDER BY time_period;
END;
$$ LANGUAGE plpgsql;

-- Function for last month traffic (by days)
CREATE OR REPLACE FUNCTION get_traffic_last_month()
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
    AND timestamp >= NOW() - INTERVAL '30 days'
    GROUP BY TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'YYYY-MM-DD')
    ORDER BY time_period;
END;
$$ LANGUAGE plpgsql;

-- Function for last year traffic (by months)
CREATE OR REPLACE FUNCTION get_traffic_last_year()
RETURNS TABLE (
    time_period TEXT,
    page_views INTEGER,
    unique_visitors INTEGER,
    sessions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'YYYY-MM')::TEXT as time_period,
        COUNT(*)::INTEGER as page_views,
        COUNT(DISTINCT user_id)::INTEGER as unique_visitors,
        COUNT(DISTINCT session_id)::INTEGER as sessions
    FROM analytics_events
    WHERE event_type = 'page_view'
    AND timestamp >= NOW() - INTERVAL '1 year'
    GROUP BY TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'YYYY-MM')
    ORDER BY time_period;
END;
$$ LANGUAGE plpgsql;

-- Test the functions
SELECT 'Testing traffic evolution functions:' as test_name;

SELECT 'Last hour traffic:' as test_name;
SELECT * FROM get_traffic_last_hour() LIMIT 5;

SELECT 'Last 24h traffic:' as test_name;
SELECT * FROM get_traffic_last_24h() LIMIT 5;

SELECT 'Last week traffic:' as test_name;
SELECT * FROM get_traffic_last_week() LIMIT 5;
