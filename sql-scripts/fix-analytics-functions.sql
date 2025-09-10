-- Fix analytics functions - drop existing functions first
-- Run this in Supabase SQL Editor

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_current_analytics_stats();
DROP FUNCTION IF EXISTS get_device_stats();
DROP FUNCTION IF EXISTS get_browser_stats();
DROP FUNCTION IF EXISTS get_os_stats();
DROP FUNCTION IF EXISTS get_country_stats();
DROP FUNCTION IF EXISTS get_referrer_stats();
DROP FUNCTION IF EXISTS get_page_views_stats();
DROP FUNCTION IF EXISTS get_traffic_stats(TEXT);

-- Now create the functions
CREATE OR REPLACE FUNCTION get_current_analytics_stats()
RETURNS TABLE (
    today_page_views BIGINT,
    today_unique_visitors BIGINT,
    today_unique_sessions BIGINT,
    bounce_rate DECIMAL(5,2),
    avg_session_time INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(COUNT(*), 0) as today_page_views,
        COALESCE(COUNT(DISTINCT user_id), 0) as today_unique_visitors,
        COALESCE(COUNT(DISTINCT session_id), 0) as today_unique_sessions,
        COALESCE(
            (COUNT(CASE WHEN s.page_views = 1 THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
            0
        ) as bounce_rate,
        COALESCE(AVG(s.duration_seconds), 0)::INTEGER as avg_session_time
    FROM analytics_events e
    LEFT JOIN analytics_sessions s ON e.session_id = s.session_id
    WHERE DATE(e.timestamp) = CURRENT_DATE
    AND e.event_type = 'page_view';
END;
$$ LANGUAGE plpgsql;

-- Function to get device stats
CREATE OR REPLACE FUNCTION get_device_stats()
RETURNS TABLE (
    device_type VARCHAR(20),
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(e.device_type, 'Unknown') as device_type,
        COUNT(*) as count
    FROM analytics_events e
    WHERE DATE(e.timestamp) = CURRENT_DATE
    AND e.event_type = 'page_view'
    GROUP BY e.device_type
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get browser stats
CREATE OR REPLACE FUNCTION get_browser_stats()
RETURNS TABLE (
    browser VARCHAR(50),
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(e.browser, 'Unknown') as browser,
        COUNT(*) as count
    FROM analytics_events e
    WHERE DATE(e.timestamp) = CURRENT_DATE
    AND e.event_type = 'page_view'
    GROUP BY e.browser
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get OS stats
CREATE OR REPLACE FUNCTION get_os_stats()
RETURNS TABLE (
    os VARCHAR(50),
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(e.os, 'Unknown') as os,
        COUNT(*) as count
    FROM analytics_events e
    WHERE DATE(e.timestamp) = CURRENT_DATE
    AND e.event_type = 'page_view'
    GROUP BY e.os
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get country stats
CREATE OR REPLACE FUNCTION get_country_stats()
RETURNS TABLE (
    country VARCHAR(100),
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(e.country, 'Unknown') as country,
        COUNT(*) as count
    FROM analytics_events e
    WHERE DATE(e.timestamp) = CURRENT_DATE
    AND e.event_type = 'page_view'
    GROUP BY e.country
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get referrer stats
CREATE OR REPLACE FUNCTION get_referrer_stats()
RETURNS TABLE (
    referrer TEXT,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(e.referrer, 'Direct') as referrer,
        COUNT(*) as count
    FROM analytics_events e
    WHERE DATE(e.timestamp) = CURRENT_DATE
    AND e.event_type = 'page_view'
    GROUP BY e.referrer
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get page views stats
CREATE OR REPLACE FUNCTION get_page_views_stats()
RETURNS TABLE (
    page_url VARCHAR(255),
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.page_path as page_url,
        COUNT(*) as count
    FROM analytics_events e
    WHERE DATE(e.timestamp) = CURRENT_DATE
    AND e.event_type = 'page_view'
    GROUP BY e.page_path
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get traffic stats for a specific time period
CREATE OR REPLACE FUNCTION get_traffic_stats(time_period TEXT DEFAULT 'today')
RETURNS TABLE (
    time_period TEXT,
    page_views BIGINT,
    unique_visitors BIGINT,
    sessions BIGINT
) AS $$
DECLARE
    start_date DATE;
    end_date DATE;
BEGIN
    -- Determine date range based on time_period
    CASE time_period
        WHEN 'today' THEN
            start_date := CURRENT_DATE;
            end_date := CURRENT_DATE;
        WHEN 'yesterday' THEN
            start_date := CURRENT_DATE - INTERVAL '1 day';
            end_date := CURRENT_DATE - INTERVAL '1 day';
        WHEN 'last_7_days' THEN
            start_date := CURRENT_DATE - INTERVAL '7 days';
            end_date := CURRENT_DATE;
        WHEN 'last_30_days' THEN
            start_date := CURRENT_DATE - INTERVAL '30 days';
            end_date := CURRENT_DATE;
        WHEN 'this_month' THEN
            start_date := DATE_TRUNC('month', CURRENT_DATE);
            end_date := CURRENT_DATE;
        WHEN 'last_month' THEN
            start_date := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
            end_date := DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day';
        ELSE
            start_date := CURRENT_DATE;
            end_date := CURRENT_DATE;
    END CASE;

    RETURN QUERY
    SELECT
        time_period as time_period,
        COALESCE(COUNT(*), 0) as page_views,
        COALESCE(COUNT(DISTINCT user_id), 0) as unique_visitors,
        COALESCE(COUNT(DISTINCT session_id), 0) as sessions
    FROM analytics_events e
    WHERE DATE(e.timestamp) BETWEEN start_date AND end_date
    AND e.event_type = 'page_view';
END;
$$ LANGUAGE plpgsql;
