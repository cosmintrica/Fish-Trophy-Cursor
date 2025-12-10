-- =============================================
-- Migration: Improve Complete Analytics with Romanian Cities
-- =============================================
-- Adds Romanian cities support and improves performance
-- =============================================

-- Drop and recreate function with Romanian cities support
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
  -- Romanian cities stats - filter only Romanian cities
  city_stats AS (
    SELECT COALESCE(
      json_agg(json_build_object('name', city_name, 'count', cnt) ORDER BY cnt DESC),
      '[]'::json
    ) as data
    FROM (
      SELECT 
        CASE 
          WHEN LOWER(TRIM(e.city)) IN (
            SELECT LOWER(TRIM(name)) FROM cities WHERE name IS NOT NULL
          ) OR LOWER(TRIM(e.city)) IN (
            'bucharest', 'bucharesti', 'bucuresti', 'cluj', 'cluj-napoca', 'timisoara', 
            'timis', 'iasi', 'constanta', 'craiova', 'galati', 'ploiesti', 'brasov', 
            'braila', 'pitesti', 'arad', 'sibiu', 'bacau', 'targu mures', 'targu-mures',
            'baia mare', 'baia-mare', 'buzau', 'satu mare', 'satu-mare', 'botosani',
            'piatra neamt', 'piatra-neamt', 'ramnicu valcea', 'ramnicu-valcea', 'suceava',
            'drobeta turnu severin', 'drobeta-turnu-severin', 'tulcea', 'targoviste',
            'focsani', 'bistrita', 'resita', 'calarasi', 'giurgiu', 'deva', 'slobozia',
            'alba iulia', 'alba-iulia', 'hunedoara', 'zalau', 'sfantu gheorghe',
            'sfantu-gheorghe', 'targu jiu', 'targu-jiu', 'vaslui', 'ramnicu sarat',
            'ramnicu-sarat', 'barlad', 'turnu magurele', 'turnu-magurele', 'caracal',
            'fagaras', 'sighetu marmatiei', 'sighetu-marmatiei', 'mangalia', 'campina',
            'petrosani', 'lugoj', 'medgidia', 'tecuci', 'slatina', 'onesti', 'oradea',
            'sighisoara', 'curtea de arges', 'curtea-de-arges', 'dorohoi', 'campulung',
            'caransebes', 'targu secuiesc', 'targu-secuiesc'
          ) THEN
            -- Translate common English names to Romanian
            CASE LOWER(TRIM(e.city))
              WHEN 'bucharest' THEN 'București'
              WHEN 'bucharesti' THEN 'București'
              WHEN 'bucuresti' THEN 'București'
              WHEN 'cluj' THEN 'Cluj-Napoca'
              WHEN 'cluj-napoca' THEN 'Cluj-Napoca'
              WHEN 'timisoara' THEN 'Timișoara'
              WHEN 'timis' THEN 'Timișoara'
              WHEN 'iasi' THEN 'Iași'
              WHEN 'constanta' THEN 'Constanța'
              WHEN 'galati' THEN 'Galați'
              WHEN 'ploiesti' THEN 'Ploiești'
              WHEN 'brasov' THEN 'Brașov'
              WHEN 'braila' THEN 'Brăila'
              WHEN 'pitesti' THEN 'Pitești'
              WHEN 'sibiu' THEN 'Sibiu'
              WHEN 'bacau' THEN 'Bacău'
              WHEN 'targu mures' THEN 'Târgu Mureș'
              WHEN 'targu-mures' THEN 'Târgu Mureș'
              WHEN 'baia mare' THEN 'Baia Mare'
              WHEN 'baia-mare' THEN 'Baia Mare'
              WHEN 'buzau' THEN 'Buzău'
              WHEN 'satu mare' THEN 'Satu Mare'
              WHEN 'satu-mare' THEN 'Satu Mare'
              WHEN 'botosani' THEN 'Botoșani'
              WHEN 'piatra neamt' THEN 'Piatra Neamț'
              WHEN 'piatra-neamt' THEN 'Piatra Neamț'
              WHEN 'ramnicu valcea' THEN 'Râmnicu Vâlcea'
              WHEN 'ramnicu-valcea' THEN 'Râmnicu Vâlcea'
              WHEN 'drobeta turnu severin' THEN 'Drobeta-Turnu Severin'
              WHEN 'drobeta-turnu-severin' THEN 'Drobeta-Turnu Severin'
              WHEN 'targoviste' THEN 'Târgoviște'
              WHEN 'focsani' THEN 'Focșani'
              WHEN 'bistrita' THEN 'Bistrița'
              WHEN 'calarasi' THEN 'Călărași'
              WHEN 'alba iulia' THEN 'Alba Iulia'
              WHEN 'alba-iulia' THEN 'Alba Iulia'
              WHEN 'sfantu gheorghe' THEN 'Sfântu Gheorghe'
              WHEN 'sfantu-gheorghe' THEN 'Sfântu Gheorghe'
              WHEN 'targu jiu' THEN 'Târgu Jiu'
              WHEN 'targu-jiu' THEN 'Târgu Jiu'
              WHEN 'ramnicu sarat' THEN 'Râmnicu Sărat'
              WHEN 'ramnicu-sarat' THEN 'Râmnicu Sărat'
              WHEN 'barlad' THEN 'Bârlad'
              WHEN 'turnu magurele' THEN 'Turnu Măgurele'
              WHEN 'turnu-magurele' THEN 'Turnu Măgurele'
              WHEN 'fagaras' THEN 'Făgăraș'
              WHEN 'sighetu marmatiei' THEN 'Sighetu Marmației'
              WHEN 'sighetu-marmatiei' THEN 'Sighetu Marmației'
              WHEN 'campina' THEN 'Câmpina'
              WHEN 'petrosani' THEN 'Petroșani'
              WHEN 'onesti' THEN 'Onești'
              WHEN 'curtea de arges' THEN 'Curtea de Argeș'
              WHEN 'curtea-de-arges' THEN 'Curtea de Argeș'
              WHEN 'campulung' THEN 'Câmpulung'
              WHEN 'caransebes' THEN 'Caransebeș'
              WHEN 'targu secuiesc' THEN 'Târgu Secuiesc'
              WHEN 'targu-secuiesc' THEN 'Târgu Secuiesc'
              ELSE INITCAP(TRIM(e.city))
            END
          ELSE NULL
        END as city_name,
        COUNT(*) as cnt
      FROM filtered_events e
      WHERE e.city IS NOT NULL AND TRIM(e.city) != ''
      GROUP BY 
        CASE 
          WHEN LOWER(TRIM(e.city)) IN (
            SELECT LOWER(TRIM(name)) FROM cities WHERE name IS NOT NULL
          ) OR LOWER(TRIM(e.city)) IN (
            'bucharest', 'bucharesti', 'bucuresti', 'cluj', 'cluj-napoca', 'timisoara', 
            'timis', 'iasi', 'constanta', 'craiova', 'galati', 'ploiesti', 'brasov', 
            'braila', 'pitesti', 'arad', 'sibiu', 'bacau', 'targu mures', 'targu-mures',
            'baia mare', 'baia-mare', 'buzau', 'satu mare', 'satu-mare', 'botosani',
            'piatra neamt', 'piatra-neamt', 'ramnicu valcea', 'ramnicu-valcea', 'suceava',
            'drobeta turnu severin', 'drobeta-turnu-severin', 'tulcea', 'targoviste',
            'focsani', 'bistrita', 'resita', 'calarasi', 'giurgiu', 'deva', 'slobozia',
            'alba iulia', 'alba-iulia', 'hunedoara', 'zalau', 'sfantu gheorghe',
            'sfantu-gheorghe', 'targu jiu', 'targu-jiu', 'vaslui', 'ramnicu sarat',
            'ramnicu-sarat', 'barlad', 'turnu magurele', 'turnu-magurele', 'caracal',
            'fagaras', 'sighetu marmatiei', 'sighetu-marmatiei', 'mangalia', 'campina',
            'petrosani', 'lugoj', 'medgidia', 'tecuci', 'slatina', 'onesti', 'oradea',
            'sighisoara', 'curtea de arges', 'curtea-de-arges', 'dorohoi', 'campulung',
            'caransebes', 'targu secuiesc', 'targu-secuiesc'
          ) THEN
            CASE LOWER(TRIM(e.city))
              WHEN 'bucharest' THEN 'București'
              WHEN 'bucharesti' THEN 'București'
              WHEN 'bucuresti' THEN 'București'
              WHEN 'cluj' THEN 'Cluj-Napoca'
              WHEN 'cluj-napoca' THEN 'Cluj-Napoca'
              WHEN 'timisoara' THEN 'Timișoara'
              WHEN 'timis' THEN 'Timișoara'
              WHEN 'iasi' THEN 'Iași'
              WHEN 'constanta' THEN 'Constanța'
              WHEN 'galati' THEN 'Galați'
              WHEN 'ploiesti' THEN 'Ploiești'
              WHEN 'brasov' THEN 'Brașov'
              WHEN 'braila' THEN 'Brăila'
              WHEN 'pitesti' THEN 'Pitești'
              WHEN 'sibiu' THEN 'Sibiu'
              WHEN 'bacau' THEN 'Bacău'
              WHEN 'targu mures' THEN 'Târgu Mureș'
              WHEN 'targu-mures' THEN 'Târgu Mureș'
              WHEN 'baia mare' THEN 'Baia Mare'
              WHEN 'baia-mare' THEN 'Baia Mare'
              WHEN 'buzau' THEN 'Buzău'
              WHEN 'satu mare' THEN 'Satu Mare'
              WHEN 'satu-mare' THEN 'Satu Mare'
              WHEN 'botosani' THEN 'Botoșani'
              WHEN 'piatra neamt' THEN 'Piatra Neamț'
              WHEN 'piatra-neamt' THEN 'Piatra Neamț'
              WHEN 'ramnicu valcea' THEN 'Râmnicu Vâlcea'
              WHEN 'ramnicu-valcea' THEN 'Râmnicu Vâlcea'
              WHEN 'drobeta turnu severin' THEN 'Drobeta-Turnu Severin'
              WHEN 'drobeta-turnu-severin' THEN 'Drobeta-Turnu Severin'
              WHEN 'targoviste' THEN 'Târgoviște'
              WHEN 'focsani' THEN 'Focșani'
              WHEN 'bistrita' THEN 'Bistrița'
              WHEN 'calarasi' THEN 'Călărași'
              WHEN 'alba iulia' THEN 'Alba Iulia'
              WHEN 'alba-iulia' THEN 'Alba Iulia'
              WHEN 'sfantu gheorghe' THEN 'Sfântu Gheorghe'
              WHEN 'sfantu-gheorghe' THEN 'Sfântu Gheorghe'
              WHEN 'targu jiu' THEN 'Târgu Jiu'
              WHEN 'targu-jiu' THEN 'Târgu Jiu'
              WHEN 'ramnicu sarat' THEN 'Râmnicu Sărat'
              WHEN 'ramnicu-sarat' THEN 'Râmnicu Sărat'
              WHEN 'barlad' THEN 'Bârlad'
              WHEN 'turnu magurele' THEN 'Turnu Măgurele'
              WHEN 'turnu-magurele' THEN 'Turnu Măgurele'
              WHEN 'fagaras' THEN 'Făgăraș'
              WHEN 'sighetu marmatiei' THEN 'Sighetu Marmației'
              WHEN 'sighetu-marmatiei' THEN 'Sighetu Marmației'
              WHEN 'campina' THEN 'Câmpina'
              WHEN 'petrosani' THEN 'Petroșani'
              WHEN 'onesti' THEN 'Onești'
              WHEN 'curtea de arges' THEN 'Curtea de Argeș'
              WHEN 'curtea-de-arges' THEN 'Curtea de Argeș'
              WHEN 'campulung' THEN 'Câmpulung'
              WHEN 'caransebes' THEN 'Caransebeș'
              WHEN 'targu secuiesc' THEN 'Târgu Secuiesc'
              WHEN 'targu-secuiesc' THEN 'Târgu Secuiesc'
              ELSE INITCAP(TRIM(e.city))
            END
          ELSE NULL
        END
      HAVING 
        CASE 
          WHEN LOWER(TRIM(e.city)) IN (
            SELECT LOWER(TRIM(name)) FROM cities WHERE name IS NOT NULL
          ) OR LOWER(TRIM(e.city)) IN (
            'bucharest', 'bucharesti', 'bucuresti', 'cluj', 'cluj-napoca', 'timisoara', 
            'timis', 'iasi', 'constanta', 'craiova', 'galati', 'ploiesti', 'brasov', 
            'braila', 'pitesti', 'arad', 'sibiu', 'bacau', 'targu mures', 'targu-mures',
            'baia mare', 'baia-mare', 'buzau', 'satu mare', 'satu-mare', 'botosani',
            'piatra neamt', 'piatra-neamt', 'ramnicu valcea', 'ramnicu-valcea', 'suceava',
            'drobeta turnu severin', 'drobeta-turnu-severin', 'tulcea', 'targoviste',
            'focsani', 'bistrita', 'resita', 'calarasi', 'giurgiu', 'deva', 'slobozia',
            'alba iulia', 'alba-iulia', 'hunedoara', 'zalau', 'sfantu gheorghe',
            'sfantu-gheorghe', 'targu jiu', 'targu-jiu', 'vaslui', 'ramnicu sarat',
            'ramnicu-sarat', 'barlad', 'turnu magurele', 'turnu-magurele', 'caracal',
            'fagaras', 'sighetu marmatiei', 'sighetu-marmatiei', 'mangalia', 'campina',
            'petrosani', 'lugoj', 'medgidia', 'tecuci', 'slatina', 'onesti', 'oradea',
            'sighisoara', 'curtea de arges', 'curtea-de-arges', 'dorohoi', 'campulung',
            'caransebes', 'targu secuiesc', 'targu-secuiesc'
          ) THEN
            CASE LOWER(TRIM(e.city))
              WHEN 'bucharest' THEN 'București'
              WHEN 'bucharesti' THEN 'București'
              WHEN 'bucuresti' THEN 'București'
              WHEN 'cluj' THEN 'Cluj-Napoca'
              WHEN 'cluj-napoca' THEN 'Cluj-Napoca'
              WHEN 'timisoara' THEN 'Timișoara'
              WHEN 'timis' THEN 'Timișoara'
              WHEN 'iasi' THEN 'Iași'
              WHEN 'constanta' THEN 'Constanța'
              WHEN 'galati' THEN 'Galați'
              WHEN 'ploiesti' THEN 'Ploiești'
              WHEN 'brasov' THEN 'Brașov'
              WHEN 'braila' THEN 'Brăila'
              WHEN 'pitesti' THEN 'Pitești'
              WHEN 'sibiu' THEN 'Sibiu'
              WHEN 'bacau' THEN 'Bacău'
              WHEN 'targu mures' THEN 'Târgu Mureș'
              WHEN 'targu-mures' THEN 'Târgu Mureș'
              WHEN 'baia mare' THEN 'Baia Mare'
              WHEN 'baia-mare' THEN 'Baia Mare'
              WHEN 'buzau' THEN 'Buzău'
              WHEN 'satu mare' THEN 'Satu Mare'
              WHEN 'satu-mare' THEN 'Satu Mare'
              WHEN 'botosani' THEN 'Botoșani'
              WHEN 'piatra neamt' THEN 'Piatra Neamț'
              WHEN 'piatra-neamt' THEN 'Piatra Neamț'
              WHEN 'ramnicu valcea' THEN 'Râmnicu Vâlcea'
              WHEN 'ramnicu-valcea' THEN 'Râmnicu Vâlcea'
              WHEN 'drobeta turnu severin' THEN 'Drobeta-Turnu Severin'
              WHEN 'drobeta-turnu-severin' THEN 'Drobeta-Turnu Severin'
              WHEN 'targoviste' THEN 'Târgoviște'
              WHEN 'focsani' THEN 'Focșani'
              WHEN 'bistrita' THEN 'Bistrița'
              WHEN 'calarasi' THEN 'Călărași'
              WHEN 'alba iulia' THEN 'Alba Iulia'
              WHEN 'alba-iulia' THEN 'Alba Iulia'
              WHEN 'sfantu gheorghe' THEN 'Sfântu Gheorghe'
              WHEN 'sfantu-gheorghe' THEN 'Sfântu Gheorghe'
              WHEN 'targu jiu' THEN 'Târgu Jiu'
              WHEN 'targu-jiu' THEN 'Târgu Jiu'
              WHEN 'ramnicu sarat' THEN 'Râmnicu Sărat'
              WHEN 'ramnicu-sarat' THEN 'Râmnicu Sărat'
              WHEN 'barlad' THEN 'Bârlad'
              WHEN 'turnu magurele' THEN 'Turnu Măgurele'
              WHEN 'turnu-magurele' THEN 'Turnu Măgurele'
              WHEN 'fagaras' THEN 'Făgăraș'
              WHEN 'sighetu marmatiei' THEN 'Sighetu Marmației'
              WHEN 'sighetu-marmatiei' THEN 'Sighetu Marmației'
              WHEN 'campina' THEN 'Câmpina'
              WHEN 'petrosani' THEN 'Petroșani'
              WHEN 'onesti' THEN 'Onești'
              WHEN 'curtea de arges' THEN 'Curtea de Argeș'
              WHEN 'curtea-de-arges' THEN 'Curtea de Argeș'
              WHEN 'campulung' THEN 'Câmpulung'
              WHEN 'caransebes' THEN 'Caransebeș'
              WHEN 'targu secuiesc' THEN 'Târgu Secuiesc'
              WHEN 'targu-secuiesc' THEN 'Târgu Secuiesc'
              ELSE INITCAP(TRIM(e.city))
            END
          ELSE NULL
        END IS NOT NULL
      ORDER BY cnt DESC
      LIMIT 20
    ) city
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
    'cities', city_stats.data,
    'referrers', rs.data,
    'top_pages', ps.data,
    'hourly_traffic', hs.data
  ) INTO v_result
  FROM main_stats ms
  CROSS JOIN device_stats ds
  CROSS JOIN browser_stats bs
  CROSS JOIN os_stats os_
  CROSS JOIN country_stats cs
  CROSS JOIN city_stats
  CROSS JOIN referrer_stats rs
  CROSS JOIN page_stats ps
  CROSS JOIN hourly_stats hs;

  RETURN COALESCE(v_result, '{}'::json);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_complete_analytics(TEXT) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_complete_analytics IS 
'Returns complete analytics data in single query. Replaces 8+ separate RPC calls.
Parameters: 
  - p_time_period: today, yesterday, last_7_days, last_30_days, this_month, last_month
Returns JSON with: stats, devices, browsers, os, countries, cities, referrers, top_pages, hourly_traffic';

-- Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_device_type 
  ON analytics_events(device_type) WHERE device_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_browser 
  ON analytics_events(browser) WHERE browser IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_city 
  ON analytics_events(city) WHERE city IS NOT NULL;

