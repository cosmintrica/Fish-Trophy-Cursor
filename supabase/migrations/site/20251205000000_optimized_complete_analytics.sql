-- =============================================
-- Migration: Optimized Complete Analytics
-- =============================================
-- Combines 8+ separate analytics queries into 1 efficient RPC
-- Returns all analytics data in a single JSON response
-- =============================================

-- Drop old function if exists with different signature
DROP FUNCTION IF EXISTS get_complete_analytics(TEXT);

CREATE OR REPLACE FUNCTION get_complete_analytics(p_time_period TEXT DEFAULT 'today')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_result JSON;
  v_is_admin BOOLEAN;
BEGIN
  -- Security check: Only admin can access analytics
  -- Since this is SECURITY DEFINER, we need explicit admin check
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'cosmin.trica@outlook.com'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  -- Determine date range based on time period
  CASE p_time_period
    WHEN 'today' THEN
      v_start_date := CURRENT_DATE;
      v_end_date := CURRENT_DATE;
    WHEN 'yesterday' THEN
      v_start_date := CURRENT_DATE - 1;
      v_end_date := CURRENT_DATE - 1;
    WHEN 'last_7_days' THEN
      v_start_date := CURRENT_DATE - 7;
      v_end_date := CURRENT_DATE;
    WHEN 'last_30_days' THEN
      v_start_date := CURRENT_DATE - 30;
      v_end_date := CURRENT_DATE;
    WHEN 'this_month' THEN
      v_start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
      v_end_date := CURRENT_DATE;
    WHEN 'last_month' THEN
      v_start_date := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::DATE;
      v_end_date := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;
    ELSE
      v_start_date := CURRENT_DATE;
      v_end_date := CURRENT_DATE;
  END CASE;

  -- Build complete analytics response in single query
  WITH filtered_events AS (
    -- Pre-filter events once, reuse for all aggregations
    SELECT e.*, s.page_views as session_page_views, s.duration_seconds
    FROM analytics_events e
    LEFT JOIN analytics_sessions s ON e.session_id = s.session_id
    WHERE DATE(e.timestamp) BETWEEN v_start_date AND v_end_date
      AND e.event_type = 'page_view'
  ),
  main_stats AS (
    SELECT
      COUNT(*) as page_views,
      COUNT(DISTINCT user_id) as unique_visitors,
      COUNT(DISTINCT session_id) as unique_sessions,
      COALESCE(
        ROUND((COUNT(CASE WHEN session_page_views = 1 THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2),
        0
      ) as bounce_rate,
      COALESCE(AVG(duration_seconds), 0)::INTEGER as avg_session_duration
    FROM filtered_events
  ),
  device_stats AS (
    SELECT COALESCE(
      json_agg(json_build_object('type', device_type, 'count', cnt) ORDER BY cnt DESC),
      '[]'::json
    ) as data
    FROM (
      SELECT COALESCE(device_type, 'Unknown') as device_type, COUNT(*) as cnt
      FROM filtered_events
      GROUP BY device_type
      ORDER BY cnt DESC
      LIMIT 10
    ) d
  ),
  browser_stats AS (
    SELECT COALESCE(
      json_agg(json_build_object('name', browser, 'count', cnt) ORDER BY cnt DESC),
      '[]'::json
    ) as data
    FROM (
      SELECT COALESCE(browser, 'Unknown') as browser, COUNT(*) as cnt
      FROM filtered_events
      GROUP BY browser
      ORDER BY cnt DESC
      LIMIT 10
    ) b
  ),
  os_stats AS (
    SELECT COALESCE(
      json_agg(json_build_object('name', os, 'count', cnt) ORDER BY cnt DESC),
      '[]'::json
    ) as data
    FROM (
      SELECT COALESCE(os, 'Unknown') as os, COUNT(*) as cnt
      FROM filtered_events
      GROUP BY os
      ORDER BY cnt DESC
      LIMIT 10
    ) o
  ),
  country_stats AS (
    SELECT COALESCE(
      json_agg(json_build_object('name', country, 'count', cnt) ORDER BY cnt DESC),
      '[]'::json
    ) as data
    FROM (
      SELECT COALESCE(country, 'Unknown') as country, COUNT(*) as cnt
      FROM filtered_events
      GROUP BY country
      ORDER BY cnt DESC
      LIMIT 10
    ) c
  ),
  referrer_stats AS (
    SELECT COALESCE(
      json_agg(json_build_object('source', referrer, 'count', cnt) ORDER BY cnt DESC),
      '[]'::json
    ) as data
    FROM (
      SELECT COALESCE(referrer, 'Direct') as referrer, COUNT(*) as cnt
      FROM filtered_events
      GROUP BY referrer
      ORDER BY cnt DESC
      LIMIT 10
    ) r
  ),
  page_stats AS (
    SELECT COALESCE(
      json_agg(json_build_object('path', page_path, 'count', cnt) ORDER BY cnt DESC),
      '[]'::json
    ) as data
    FROM (
      SELECT page_path, COUNT(*) as cnt
      FROM filtered_events
      GROUP BY page_path
      ORDER BY cnt DESC
      LIMIT 20
    ) p
  ),
  hourly_stats AS (
    SELECT COALESCE(
      json_agg(json_build_object('hour', hour, 'count', cnt) ORDER BY hour),
      '[]'::json
    ) as data
    FROM (
      SELECT EXTRACT(HOUR FROM timestamp)::INTEGER as hour, COUNT(*) as cnt
      FROM filtered_events
      GROUP BY EXTRACT(HOUR FROM timestamp)
      ORDER BY hour
    ) h
  )
  SELECT json_build_object(
    'period', p_time_period,
    'date_range', json_build_object(
      'start', v_start_date,
      'end', v_end_date
    ),
    'stats', json_build_object(
      'page_views', ms.page_views,
      'unique_visitors', ms.unique_visitors,
      'unique_sessions', ms.unique_sessions,
      'bounce_rate', ms.bounce_rate,
      'avg_session_duration', ms.avg_session_duration
    ),
    'devices', ds.data,
    'browsers', bs.data,
    'os', os_.data,
    'countries', cs.data,
    'referrers', rs.data,
    'top_pages', ps.data,
    'hourly_traffic', hs.data
  ) INTO v_result
  FROM main_stats ms
  CROSS JOIN device_stats ds
  CROSS JOIN browser_stats bs
  CROSS JOIN os_stats os_
  CROSS JOIN country_stats cs
  CROSS JOIN referrer_stats rs
  CROSS JOIN page_stats ps
  CROSS JOIN hourly_stats hs;

  RETURN COALESCE(v_result, '{}'::json);
END;
$$;

-- Grant execute permissions (admin only via RLS on analytics_events)
GRANT EXECUTE ON FUNCTION get_complete_analytics(TEXT) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_complete_analytics IS 
'Returns complete analytics data in single query. Replaces 8+ separate RPC calls.
Parameters: 
  - p_time_period: today, yesterday, last_7_days, last_30_days, this_month, last_month
Returns JSON with: stats, devices, browsers, os, countries, referrers, top_pages, hourly_traffic';

-- Create index for faster timestamp filtering if not exists
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp_date 
  ON analytics_events(DATE(timestamp));
