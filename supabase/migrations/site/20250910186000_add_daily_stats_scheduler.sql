-- Add daily stats scheduler and manual update function
-- Migration: 20250910186000_add_daily_stats_scheduler.sql

-- Create function to update daily stats (can be called manually or scheduled)
CREATE OR REPLACE FUNCTION public.update_daily_analytics_stats()
RETURNS void AS $$
BEGIN
  -- Delete existing stats for today
  DELETE FROM analytics_daily_stats
  WHERE date = CURRENT_DATE;

  -- Insert new stats for today
  INSERT INTO analytics_daily_stats (
    date,
    total_page_views,
    unique_visitors,
    total_sessions,
    avg_session_duration,
    total_record_submissions,
    total_map_interactions,
    total_user_registrations,
    total_active_users,
    most_visited_pages,
    top_referrers,
    device_breakdown,
    browser_breakdown,
    country_breakdown
  )
  SELECT
    CURRENT_DATE as date,

    -- Total page views
    (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'page_view' AND DATE(timestamp) = CURRENT_DATE) as total_page_views,

    -- Unique visitors
    (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE event_type = 'page_view' AND DATE(timestamp) = CURRENT_DATE AND user_id IS NOT NULL) as unique_visitors,

    -- Total sessions
    (SELECT COUNT(*) FROM analytics_sessions WHERE DATE(session_start) = CURRENT_DATE) as total_sessions,

    -- Average session duration
    (SELECT AVG(EXTRACT(EPOCH FROM (session_end - session_start))/60) FROM analytics_sessions WHERE DATE(session_start) = CURRENT_DATE AND session_end IS NOT NULL) as avg_session_duration,

    -- Total record submissions
    (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'record_submission' AND DATE(timestamp) = CURRENT_DATE) as total_record_submissions,

    -- Total map interactions
    (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'map_interaction' AND DATE(timestamp) = CURRENT_DATE) as total_map_interactions,

    -- Total user registrations
    (SELECT COUNT(*) FROM profiles WHERE DATE(created_at) = CURRENT_DATE) as total_user_registrations,

    -- Total active users (users who had at least one event today)
    (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE DATE(timestamp) = CURRENT_DATE AND user_id IS NOT NULL) as total_active_users,

    -- Most visited pages (top 5)
    (SELECT json_agg(page_data) FROM (
      SELECT json_build_object('page', page_path, 'views', page_views) as page_data
      FROM (
        SELECT page_path, COUNT(*) as page_views
        FROM analytics_events
        WHERE event_type = 'page_view' AND DATE(timestamp) = CURRENT_DATE
        GROUP BY page_path
        ORDER BY page_views DESC
        LIMIT 5
      ) top_pages
    ) pages_json) as most_visited_pages,

    -- Top referrers (top 5)
    (SELECT json_agg(referrer_data) FROM (
      SELECT json_build_object('referrer', COALESCE(referrer, 'Direct'), 'visits', referrer_visits) as referrer_data
      FROM (
        SELECT referrer, COUNT(*) as referrer_visits
        FROM analytics_events
        WHERE event_type = 'page_view' AND DATE(timestamp) = CURRENT_DATE
        GROUP BY referrer
        ORDER BY referrer_visits DESC
        LIMIT 5
      ) top_referrers
    ) referrers_json) as top_referrers,

    -- Device breakdown
    (SELECT json_object_agg(device_type, device_count) FROM (
      SELECT device_type, COUNT(*) as device_count
      FROM analytics_events
      WHERE event_type = 'page_view' AND DATE(timestamp) = CURRENT_DATE AND device_type IS NOT NULL
      GROUP BY device_type
    ) device_stats) as device_breakdown,

    -- Browser breakdown
    (SELECT json_object_agg(browser, browser_count) FROM (
      SELECT browser, COUNT(*) as browser_count
      FROM analytics_events
      WHERE event_type = 'page_view' AND DATE(timestamp) = CURRENT_DATE AND browser IS NOT NULL
      GROUP BY browser
    ) browser_stats) as browser_breakdown,

    -- Country breakdown
    (SELECT json_object_agg(country, country_count) FROM (
      SELECT country, COUNT(*) as country_count
      FROM analytics_events
      WHERE event_type = 'page_view' AND DATE(timestamp) = CURRENT_DATE AND country IS NOT NULL
      GROUP BY country
    ) country_stats) as country_breakdown;

  RAISE NOTICE 'Daily analytics stats updated for %', CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_daily_analytics_stats() TO authenticated;

-- Create a simple function to get current stats (for admin panel)
CREATE OR REPLACE FUNCTION public.get_current_analytics_stats()
RETURNS TABLE (
  today_page_views BIGINT,
  today_unique_visitors BIGINT,
  today_sessions BIGINT,
  today_record_submissions BIGINT,
  today_map_interactions BIGINT,
  total_users BIGINT,
  total_records BIGINT,
  total_verified_records BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'page_view' AND DATE(timestamp) = CURRENT_DATE) as today_page_views,
    (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE event_type = 'page_view' AND DATE(timestamp) = CURRENT_DATE AND user_id IS NOT NULL) as today_unique_visitors,
    (SELECT COUNT(*) FROM analytics_sessions WHERE DATE(session_start) = CURRENT_DATE) as today_sessions,
    (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'record_submission' AND DATE(timestamp) = CURRENT_DATE) as today_record_submissions,
    (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'map_interaction' AND DATE(timestamp) = CURRENT_DATE) as today_map_interactions,
    (SELECT COUNT(*) FROM profiles) as total_users,
    (SELECT COUNT(*) FROM records) as total_records,
    (SELECT COUNT(*) FROM records WHERE status = 'verified') as total_verified_records;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_analytics_stats() TO authenticated;

-- Create a function to get daily stats for the last 30 days
CREATE OR REPLACE FUNCTION public.get_daily_stats_history(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  total_page_views BIGINT,
  unique_visitors BIGINT,
  total_sessions BIGINT,
  avg_session_duration NUMERIC,
  total_record_submissions BIGINT,
  total_map_interactions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ads.date,
    ads.total_page_views,
    ads.unique_visitors,
    ads.total_sessions,
    ads.avg_session_duration,
    ads.total_record_submissions,
    ads.total_map_interactions
  FROM analytics_daily_stats ads
  WHERE ads.date >= CURRENT_DATE - INTERVAL '1 day' * days_back
  ORDER BY ads.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_daily_stats_history(INTEGER) TO authenticated;
