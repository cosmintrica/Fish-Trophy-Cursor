

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calculate_session_metrics"() RETURNS TABLE("bounce_rate" numeric, "avg_session_time" integer)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."calculate_session_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_bounce_rate_and_session_time"() RETURNS TABLE("bounce_rate" numeric, "avg_session_time" integer)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_bounce_rate_and_session_time"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_browser_stats"() RETURNS TABLE("browser" character varying, "count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(e.browser, 'Unknown') as browser,
        COUNT(*) as count
    FROM analytics_events e
    WHERE DATE(e.timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
    AND e.event_type = 'page_view'
    GROUP BY e.browser
    ORDER BY count DESC;
END;
$$;


ALTER FUNCTION "public"."get_browser_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_country_stats"() RETURNS TABLE("country" character varying, "count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        'România'::VARCHAR(100) as country,
        COUNT(*) as count
    FROM analytics_events e
    WHERE DATE(e.timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
    AND e.event_type = 'page_view';
END;
$$;


ALTER FUNCTION "public"."get_country_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_country_stats_detailed"() RETURNS TABLE("country" character varying, "count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN e.country IS NOT NULL AND e.country != '' THEN e.country
            WHEN e.additional_data->>'country' IS NOT NULL AND e.additional_data->>'country' != '' THEN e.additional_data->>'country'::VARCHAR(100)
            ELSE 'România'::VARCHAR(100)
        END as country,
        COUNT(*) as count
    FROM analytics_events e
    WHERE DATE(e.timestamp) = CURRENT_DATE
    AND e.event_type = 'page_view'
    GROUP BY
        CASE
            WHEN e.country IS NOT NULL AND e.country != '' THEN e.country
            WHEN e.additional_data->>'country' IS NOT NULL AND e.additional_data->>'country' != '' THEN e.additional_data->>'country'::VARCHAR(100)
            ELSE 'România'::VARCHAR(100)
        END
    ORDER BY count DESC;
END;
$$;


ALTER FUNCTION "public"."get_country_stats_detailed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_analytics_stats"() RETURNS TABLE("total_users" integer, "total_records" integer, "total_page_views" integer, "new_users_today" integer, "new_records_today" integer, "page_views_today" integer, "today_unique_visitors" integer, "today_sessions" integer, "bounce_rate" numeric, "avg_session_time" integer)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_current_analytics_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_stats_history"("days_back" integer DEFAULT 30) RETURNS TABLE("date" "date", "total_page_views" bigint, "unique_visitors" bigint, "total_sessions" bigint, "avg_session_duration" numeric, "total_record_submissions" bigint, "total_map_interactions" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_daily_stats_history"("days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_device_stats"() RETURNS TABLE("device_type" character varying, "count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(e.device_type, 'Unknown') as device_type,
        COUNT(*) as count
    FROM analytics_events e
    WHERE DATE(e.timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
    AND e.event_type = 'page_view'
    GROUP BY e.device_type
    ORDER BY count DESC;
END;
$$;


ALTER FUNCTION "public"."get_device_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_os_stats"() RETURNS TABLE("os" character varying, "count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(e.os, 'Unknown') as os,
        COUNT(*) as count
    FROM analytics_events e
    WHERE DATE(e.timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
    AND e.event_type = 'page_view'
    GROUP BY e.os
    ORDER BY count DESC;
END;
$$;


ALTER FUNCTION "public"."get_os_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_page_views_stats"() RETURNS TABLE("page_url" character varying, "count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.page_path as page_url,
        COUNT(*) as count
    FROM analytics_events e
    WHERE DATE(e.timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
    AND e.event_type = 'page_view'
    GROUP BY e.page_path
    ORDER BY count DESC;
END;
$$;


ALTER FUNCTION "public"."get_page_views_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_profiles"() RETURNS TABLE("id" "uuid", "display_name" "text", "photo_url" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select distinct p.id, p.display_name, p.photo_url
  from public.profiles p
  join public.records r on r.user_id = p.id
  where r.status = 'verified';
$$;


ALTER FUNCTION "public"."get_public_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_referrer_stats"() RETURNS TABLE("referrer" "text", "count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN e.referrer IS NOT NULL AND e.referrer != '' AND e.referrer NOT LIKE '%localhost%' THEN e.referrer
            WHEN e.additional_data->>'referrer' IS NOT NULL AND e.additional_data->>'referrer' != '' AND e.additional_data->>'referrer' NOT LIKE '%localhost%' THEN e.additional_data->>'referrer'
            ELSE 'Direct'::TEXT
        END as referrer,
        COUNT(*) as count
    FROM analytics_events e
    WHERE DATE(e.timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
    AND e.event_type = 'page_view'
    GROUP BY
        CASE
            WHEN e.referrer IS NOT NULL AND e.referrer != '' AND e.referrer NOT LIKE '%localhost%' THEN e.referrer
            WHEN e.additional_data->>'referrer' IS NOT NULL AND e.additional_data->>'referrer' != '' AND e.additional_data->>'referrer' NOT LIKE '%localhost%' THEN e.additional_data->>'referrer'
            ELSE 'Direct'::TEXT
        END
    ORDER BY count DESC;
END;
$$;


ALTER FUNCTION "public"."get_referrer_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_romanian_city_stats"() RETURNS TABLE("city" character varying, "count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ae.city, 'Necunoscut') as city,
        COUNT(*) as count
    FROM analytics_events ae
    WHERE ae.country = 'România'
       OR ae.country = 'Romania'
       OR ae.country IS NULL  -- Include null countries as they're likely Romanian
    GROUP BY COALESCE(ae.city, 'Necunoscut')
    ORDER BY count DESC
    LIMIT 20;  -- Top 20 Romanian cities
END;
$$;


ALTER FUNCTION "public"."get_romanian_city_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_traffic_custom_period"("start_date" timestamp without time zone, "end_date" timestamp without time zone) RETURNS TABLE("time_period" "text", "page_views" integer, "unique_visitors" integer, "sessions" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(ae.created_at, 'YYYY-MM-DD') as time_period,
        COUNT(*)::INTEGER as page_views,
        COUNT(DISTINCT ae.user_id)::INTEGER as unique_visitors,
        COUNT(DISTINCT ae.session_id)::INTEGER as sessions
    FROM analytics_events ae
    WHERE ae.created_at >= start_date
    AND ae.created_at <= end_date
    AND ae.event_type = 'page_view'
    GROUP BY TO_CHAR(ae.created_at, 'YYYY-MM-DD')
    ORDER BY time_period;
END;
$$;


ALTER FUNCTION "public"."get_traffic_custom_period"("start_date" timestamp without time zone, "end_date" timestamp without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_traffic_custom_period"("start_date" timestamp with time zone, "end_date" timestamp with time zone) RETURNS TABLE("time_period" "text", "page_views" integer, "unique_visitors" integer, "sessions" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'YYYY-MM-DD')::TEXT as time_period,
        COUNT(*)::INTEGER as page_views,
        COUNT(DISTINCT user_id)::INTEGER as unique_visitors,
        COUNT(DISTINCT session_id)::INTEGER as sessions
    FROM analytics_events
    WHERE event_type = 'page_view'
    AND timestamp >= start_date
    AND timestamp <= end_date
    GROUP BY TO_CHAR(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest', 'YYYY-MM-DD')
    ORDER BY time_period;
END;
$$;


ALTER FUNCTION "public"."get_traffic_custom_period"("start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_traffic_last_24h"() RETURNS TABLE("time_period" "text", "page_views" integer, "unique_visitors" integer, "sessions" integer)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_traffic_last_24h"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_traffic_last_hour"() RETURNS TABLE("time_period" "text", "page_views" integer, "unique_visitors" integer, "sessions" integer)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_traffic_last_hour"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_traffic_last_month"() RETURNS TABLE("time_period" "text", "page_views" integer, "unique_visitors" integer, "sessions" integer)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_traffic_last_month"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_traffic_last_week"() RETURNS TABLE("time_period" "text", "page_views" integer, "unique_visitors" integer, "sessions" integer)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_traffic_last_week"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_traffic_last_year"() RETURNS TABLE("time_period" "text", "page_views" integer, "unique_visitors" integer, "sessions" integer)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_traffic_last_year"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin');
$$;


ALTER FUNCTION "public"."is_admin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_verification_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.status = 'verified' and (old.status is distinct from 'verified') then
    new.verified_at := coalesce(new.verified_at, now());
    new.verified_by := coalesce(new.verified_by, auth.uid(), old.verified_by);
  elsif new.status <> 'verified' then
    new.verified_at := null;
    new.verified_by := null;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_verification_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
begin
  if new.email is distinct from old.email then
    update public.profiles
       set email = new.email, updated_at = now()
     where id = new.id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_profile_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_analytics_data"() RETURNS TABLE("test_name" "text", "value" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 'Today Page Views'::TEXT, COUNT(*)::BIGINT
    FROM analytics_events
    WHERE DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
    AND event_type = 'page_view'

    UNION ALL

    SELECT 'Today Unique Visitors'::TEXT, COUNT(DISTINCT user_id)::BIGINT
    FROM analytics_events
    WHERE DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
    AND event_type = 'page_view'

    UNION ALL

    SELECT 'Today Sessions'::TEXT, COUNT(DISTINCT session_id)::BIGINT
    FROM analytics_events
    WHERE DATE(timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest') = CURRENT_DATE
    AND event_type = 'page_view';
END;
$$;


ALTER FUNCTION "public"."test_analytics_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_daily_analytics_stats"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    today_users INTEGER;
    today_records INTEGER;
    today_page_views INTEGER;
    new_users_today INTEGER;
    new_records_today INTEGER;
BEGIN
    -- Get today's stats
    SELECT COUNT(*) INTO today_users FROM profiles;
    SELECT COUNT(*) INTO today_records FROM records;
    SELECT COUNT(*) INTO today_page_views FROM analytics_events WHERE DATE(created_at) = today_date;

    -- Get new users and records today
    SELECT COUNT(*) INTO new_users_today FROM profiles WHERE DATE(created_at) = today_date;
    SELECT COUNT(*) INTO new_records_today FROM records WHERE DATE(created_at) = today_date;

    -- Insert or update today's stats
    INSERT INTO analytics_daily_stats (date, total_users, total_records, total_page_views, new_users, new_records, updated_at)
    VALUES (today_date, today_users, today_records, today_page_views, new_users_today, new_records_today, NOW())
    ON CONFLICT (date)
    DO UPDATE SET
        total_users = EXCLUDED.total_users,
        total_records = EXCLUDED.total_records,
        total_page_views = EXCLUDED.total_page_views,
        new_users = EXCLUDED.new_users,
        new_records = EXCLUDED.new_records,
        updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."update_daily_analytics_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_shop_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.fishing_shops s
     set review_count = (select count(*) from public.shop_reviews r where r.shop_id = s.id),
         rating = coalesce((select round(avg(rating)::numeric, 2) from public.shop_reviews r where r.shop_id = s.id), 0)
   where s.id = coalesce(new.shop_id, old.shop_id);
  return null;
end;
$$;


ALTER FUNCTION "public"."update_shop_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."analytics_daily_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "total_users" integer DEFAULT 0,
    "total_records" integer DEFAULT 0,
    "total_page_views" integer DEFAULT 0,
    "new_users" integer DEFAULT 0,
    "new_records" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_daily_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_daily_stats_backup" (
    "id" "uuid",
    "date" "date",
    "page_views" integer,
    "unique_visitors" integer,
    "unique_sessions" integer,
    "avg_session_duration" integer,
    "bounce_rate" numeric(5,2),
    "mobile_users" integer,
    "desktop_users" integer,
    "top_pages" "jsonb",
    "top_browsers" "jsonb",
    "top_countries" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."analytics_daily_stats_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" character varying(50) NOT NULL,
    "page_path" character varying(255) NOT NULL,
    "user_id" "uuid",
    "session_id" character varying(100) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_agent" "text",
    "referrer" "text",
    "screen_resolution" character varying(20),
    "viewport_size" character varying(20),
    "device_type" character varying(20),
    "browser" character varying(50),
    "os" character varying(50),
    "country" character varying(100),
    "city" character varying(100),
    "additional_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "page_url" "text",
    "metadata" "jsonb"
);


ALTER TABLE "public"."analytics_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" character varying(100) NOT NULL,
    "user_id" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "page_views" integer DEFAULT 0,
    "duration_seconds" integer,
    "device_type" character varying(20),
    "browser" character varying(50),
    "os" character varying(50),
    "country" character varying(100),
    "city" character varying(100),
    "referrer" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "county_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."counties" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."counties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fish_bait" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "kind" "text" NOT NULL,
    "notes" "text",
    CONSTRAINT "fish_bait_kind_check" CHECK (("kind" = ANY (ARRAY['natural'::"text", 'artificial'::"text"])))
);

ALTER TABLE ONLY "public"."fish_bait" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."fish_bait" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fish_method" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text"
);

ALTER TABLE ONLY "public"."fish_method" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."fish_method" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fish_species" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "scientific_name" "text",
    "category" "text" NOT NULL,
    "water_type" "text" NOT NULL,
    "region" "text" NOT NULL,
    "min_weight" numeric(5,2),
    "max_weight" numeric(5,2),
    "min_length" integer,
    "max_length" integer,
    "description" "text",
    "habitat" "text",
    "feeding_habits" "text",
    "spawning_season" "text",
    "image_url" "text",
    "is_native" boolean DEFAULT true,
    "is_protected" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "needs_review" boolean DEFAULT false NOT NULL,
    CONSTRAINT "fish_species_category_check" CHECK (("category" = ANY (ARRAY['dulce'::"text", 'sarat'::"text", 'amestec'::"text"]))),
    CONSTRAINT "fish_species_region_check" CHECK (("region" = ANY (ARRAY['banat'::"text", 'crisana'::"text", 'maramures'::"text", 'transilvania'::"text", 'moldova'::"text", 'dobrogea'::"text", 'muntenia'::"text", 'oltenia'::"text"]))),
    CONSTRAINT "fish_species_water_type_check" CHECK (("water_type" = ANY (ARRAY['lac'::"text", 'rau'::"text", 'balti_private'::"text", 'balti_salbatic'::"text", 'fluviu'::"text", 'delta'::"text", 'mare'::"text"])))
);

ALTER TABLE ONLY "public"."fish_species" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."fish_species" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fish_species_bait" (
    "species_id" "uuid" NOT NULL,
    "bait_id" "uuid" NOT NULL
);

ALTER TABLE ONLY "public"."fish_species_bait" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."fish_species_bait" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fish_species_method" (
    "species_id" "uuid" NOT NULL,
    "method_id" "uuid" NOT NULL
);

ALTER TABLE ONLY "public"."fish_species_method" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."fish_species_method" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fish_species_region" (
    "species_id" "uuid" NOT NULL,
    "region" "text" NOT NULL,
    CONSTRAINT "fish_species_region_region_check" CHECK (("region" = ANY (ARRAY['banat'::"text", 'crisana'::"text", 'maramures'::"text", 'transilvania'::"text", 'moldova'::"text", 'dobrogea'::"text", 'muntenia'::"text", 'oltenia'::"text"])))
);

ALTER TABLE ONLY "public"."fish_species_region" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."fish_species_region" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fishing_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "county" "text" NOT NULL,
    "region" "text" NOT NULL,
    "latitude" numeric(10,8) NOT NULL,
    "longitude" numeric(11,8) NOT NULL,
    "description" "text",
    "facilities" "text"[],
    "access_type" "text",
    "access_fee" numeric(8,2),
    "best_season" "text",
    "best_time" "text",
    "parking_available" boolean DEFAULT false,
    "parking_fee" numeric(8,2),
    "boat_rental" boolean DEFAULT false,
    "boat_rental_fee" numeric(8,2),
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "subtitle" "text",
    "administrare" "text",
    CONSTRAINT "fishing_locations_access_type_check" CHECK (("access_type" = ANY (ARRAY['gratuit'::"text", 'platit'::"text", 'permis_necesar'::"text"]))),
    CONSTRAINT "fishing_locations_region_check" CHECK (("region" = ANY (ARRAY['muntenia'::"text", 'moldova'::"text", 'oltenia'::"text", 'transilvania'::"text", 'banat'::"text", 'crisana'::"text", 'maramures'::"text", 'dobrogea'::"text"]))),
    CONSTRAINT "type_allowed_values_check" CHECK (("type" = ANY (ARRAY['lac'::"text", 'rau'::"text", 'balti_private'::"text", 'balti_salbatic'::"text", 'fluviu'::"text"])))
);


ALTER TABLE "public"."fishing_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fishing_regulations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "region" "text" NOT NULL,
    "water_type" "text" NOT NULL,
    "species_id" "uuid",
    "species_name" "text",
    "min_size" integer,
    "max_quantity" integer,
    "closed_season_start" "date",
    "closed_season_end" "date",
    "special_restrictions" "text",
    "penalty_amount" numeric(8,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fishing_regulations_region_check" CHECK (("region" = ANY (ARRAY['muntenia'::"text", 'moldova'::"text", 'oltenia'::"text", 'transilvania'::"text", 'banat'::"text", 'crisana'::"text", 'maramures'::"text", 'dobrogea'::"text", 'national'::"text"]))),
    CONSTRAINT "fishing_regulations_water_type_check" CHECK (("water_type" = ANY (ARRAY['lac'::"text", 'rau'::"text", 'baraj'::"text", 'mare'::"text", 'delta'::"text", 'all'::"text"])))
);


ALTER TABLE "public"."fishing_regulations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fishing_shops" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "address" "text" NOT NULL,
    "city" "text" NOT NULL,
    "county" "text" NOT NULL,
    "region" "text" NOT NULL,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "phone" "text",
    "email" "text",
    "website" "text",
    "opening_hours" "text",
    "services" "text"[],
    "image_url" "text",
    "rating" numeric(3,2) DEFAULT 0,
    "review_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fishing_shops_region_check" CHECK (("region" = ANY (ARRAY['muntenia'::"text", 'moldova'::"text", 'oltenia'::"text", 'transilvania'::"text", 'banat'::"text", 'crisana'::"text", 'maramures'::"text", 'dobrogea'::"text"])))
);


ALTER TABLE "public"."fishing_shops" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fishing_techniques" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "difficulty_level" "text",
    "equipment_needed" "text"[],
    "best_season" "text",
    "best_time" "text",
    "target_species" "text"[],
    "image_url" "text",
    "video_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fishing_techniques_category_check" CHECK (("category" = ANY (ARRAY['pluta'::"text", 'fund'::"text", 'spinning'::"text", 'fly'::"text", 'ice_fishing'::"text", 'net'::"text", 'other'::"text"]))),
    CONSTRAINT "fishing_techniques_difficulty_level_check" CHECK (("difficulty_level" = ANY (ARRAY['incepator'::"text", 'mediu'::"text", 'avansat'::"text", 'expert'::"text"])))
);


ALTER TABLE "public"."fishing_techniques" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."location_species" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_id" "uuid" NOT NULL,
    "species_id" "uuid" NOT NULL,
    "abundance" "text",
    "best_season" "text",
    "best_time" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "location_species_abundance_check" CHECK (("abundance" = ANY (ARRAY['rar'::"text", 'moderat'::"text", 'comun'::"text", 'foarte_comun'::"text"])))
);


ALTER TABLE "public"."location_species" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "email" "text" NOT NULL,
    "display_name" "text",
    "photo_url" "text",
    "phone" "text",
    "bio" "text" DEFAULT 'Pescar pasionat din România!'::"text",
    "location" "text",
    "website" "text",
    "role" "text" DEFAULT 'user'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "county_id" "text",
    "city_id" "uuid",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "species_id" "uuid",
    "species_name" "text" NOT NULL,
    "weight" numeric(5,2),
    "length" integer,
    "location_id" "uuid",
    "location_name" "text",
    "date_caught" "date" NOT NULL,
    "time_caught" time without time zone,
    "weather_conditions" "text",
    "water_temperature" numeric(4,1),
    "fishing_method" "text",
    "bait_used" "text",
    "image_url" "text",
    "video_url" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "rejection_reason" "text",
    "is_record" boolean DEFAULT false,
    "record_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "records_date_caught_check" CHECK (("date_caught" <= CURRENT_DATE)),
    CONSTRAINT "records_fishing_method_check" CHECK (("fishing_method" = ANY (ARRAY['pluta'::"text", 'fund'::"text", 'spinning'::"text", 'fly'::"text", 'ice_fishing'::"text", 'net'::"text", 'other'::"text"]))),
    CONSTRAINT "records_length_check" CHECK ((("length" IS NULL) OR ("length" >= 0))),
    CONSTRAINT "records_record_type_check" CHECK (("record_type" = ANY (ARRAY['personal'::"text", 'local'::"text", 'national'::"text", 'world'::"text"]))),
    CONSTRAINT "records_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'rejected'::"text"]))),
    CONSTRAINT "records_weight_check" CHECK ((("weight" IS NULL) OR ("weight" >= (0)::numeric)))
);


ALTER TABLE "public"."records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shop_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "title" "text",
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "shop_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."shop_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_gear" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "gear_type" "text" NOT NULL,
    "brand" "text",
    "model" "text",
    "description" "text",
    "quantity" integer DEFAULT 1,
    "purchase_date" "date",
    "purchase_price" numeric(8,2),
    "condition" "text",
    "notes" "text",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_gear_condition_check" CHECK (("condition" = ANY (ARRAY['excelent'::"text", 'bun'::"text", 'mediu'::"text", 'rau'::"text"]))),
    CONSTRAINT "user_gear_gear_type_check" CHECK (("gear_type" = ANY (ARRAY['undita'::"text", 'mulineta'::"text", 'scaun'::"text", 'rucsac'::"text", 'vesta'::"text", 'cizme'::"text", 'altceva'::"text"]))),
    CONSTRAINT "user_gear_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."user_gear" OWNER TO "postgres";


ALTER TABLE ONLY "public"."analytics_daily_stats"
    ADD CONSTRAINT "analytics_daily_stats_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."analytics_daily_stats"
    ADD CONSTRAINT "analytics_daily_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_sessions"
    ADD CONSTRAINT "analytics_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_sessions"
    ADD CONSTRAINT "analytics_sessions_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_county_id_name_key" UNIQUE ("county_id", "name");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."counties"
    ADD CONSTRAINT "counties_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."counties"
    ADD CONSTRAINT "counties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fish_bait"
    ADD CONSTRAINT "fish_bait_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."fish_bait"
    ADD CONSTRAINT "fish_bait_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fish_method"
    ADD CONSTRAINT "fish_method_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."fish_method"
    ADD CONSTRAINT "fish_method_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fish_species_bait"
    ADD CONSTRAINT "fish_species_bait_pkey" PRIMARY KEY ("species_id", "bait_id");



ALTER TABLE ONLY "public"."fish_species_method"
    ADD CONSTRAINT "fish_species_method_pkey" PRIMARY KEY ("species_id", "method_id");



ALTER TABLE ONLY "public"."fish_species"
    ADD CONSTRAINT "fish_species_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."fish_species"
    ADD CONSTRAINT "fish_species_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fish_species_region"
    ADD CONSTRAINT "fish_species_region_pkey" PRIMARY KEY ("species_id", "region");



ALTER TABLE ONLY "public"."fishing_locations"
    ADD CONSTRAINT "fishing_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fishing_regulations"
    ADD CONSTRAINT "fishing_regulations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fishing_shops"
    ADD CONSTRAINT "fishing_shops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fishing_techniques"
    ADD CONSTRAINT "fishing_techniques_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."fishing_techniques"
    ADD CONSTRAINT "fishing_techniques_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_species"
    ADD CONSTRAINT "location_species_location_id_species_id_key" UNIQUE ("location_id", "species_id");



ALTER TABLE ONLY "public"."location_species"
    ADD CONSTRAINT "location_species_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."records"
    ADD CONSTRAINT "records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_reviews"
    ADD CONSTRAINT "shop_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_reviews"
    ADD CONSTRAINT "shop_reviews_shop_id_user_id_key" UNIQUE ("shop_id", "user_id");



ALTER TABLE ONLY "public"."user_gear"
    ADD CONSTRAINT "user_gear_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "fish_species_unique_name_ci" ON "public"."fish_species" USING "btree" ("lower"("btrim"("name")));



CREATE INDEX "fishing_locations_lat_lon_idx" ON "public"."fishing_locations" USING "btree" ("latitude", "longitude");



CREATE INDEX "fishing_locations_type_idx" ON "public"."fishing_locations" USING "btree" ("type");



CREATE INDEX "idx_analytics_events_event_type" ON "public"."analytics_events" USING "btree" ("event_type");



CREATE INDEX "idx_analytics_events_page_path" ON "public"."analytics_events" USING "btree" ("page_path");



CREATE INDEX "idx_analytics_events_session_id" ON "public"."analytics_events" USING "btree" ("session_id");



CREATE INDEX "idx_analytics_events_timestamp" ON "public"."analytics_events" USING "btree" ("timestamp");



CREATE INDEX "idx_analytics_events_user_id" ON "public"."analytics_events" USING "btree" ("user_id");



CREATE INDEX "idx_analytics_sessions_session_id" ON "public"."analytics_sessions" USING "btree" ("session_id");



CREATE INDEX "idx_analytics_sessions_started_at" ON "public"."analytics_sessions" USING "btree" ("started_at");



CREATE INDEX "idx_analytics_sessions_user_id" ON "public"."analytics_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_cities_county_id" ON "public"."cities" USING "btree" ("county_id");



CREATE INDEX "idx_cities_name" ON "public"."cities" USING "btree" ("name");



CREATE INDEX "idx_location_species_loc" ON "public"."location_species" USING "btree" ("location_id");



CREATE INDEX "idx_location_species_sp" ON "public"."location_species" USING "btree" ("species_id");



CREATE INDEX "idx_locations_name_trgm" ON "public"."fishing_locations" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_locations_region" ON "public"."fishing_locations" USING "btree" ("region");



CREATE INDEX "idx_profiles_city_id" ON "public"."profiles" USING "btree" ("city_id");



CREATE INDEX "idx_profiles_county_id" ON "public"."profiles" USING "btree" ("county_id");



CREATE INDEX "idx_records_created_at" ON "public"."records" USING "btree" ("created_at");



CREATE INDEX "idx_records_leaderboard" ON "public"."records" USING "btree" ("status", "species_id", "weight" DESC);



CREATE INDEX "idx_records_location" ON "public"."records" USING "btree" ("location_id");



CREATE INDEX "idx_records_species" ON "public"."records" USING "btree" ("species_id");



CREATE INDEX "idx_records_status" ON "public"."records" USING "btree" ("status");



CREATE INDEX "idx_records_user" ON "public"."records" USING "btree" ("user_id");



CREATE INDEX "idx_records_user_created" ON "public"."records" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_reviews_shop" ON "public"."shop_reviews" USING "btree" ("shop_id");



CREATE INDEX "idx_reviews_user" ON "public"."shop_reviews" USING "btree" ("user_id");



CREATE INDEX "idx_shops_region_city" ON "public"."fishing_shops" USING "btree" ("region", "city");



CREATE INDEX "idx_species_name_trgm" ON "public"."fish_species" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_user_gear_user" ON "public"."user_gear" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trg_records_verification" BEFORE UPDATE ON "public"."records" FOR EACH ROW EXECUTE FUNCTION "public"."set_verification_fields"();



CREATE OR REPLACE TRIGGER "trg_reviews_aggregate" AFTER INSERT OR DELETE OR UPDATE ON "public"."shop_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_shop_rating"();



CREATE OR REPLACE TRIGGER "update_fish_species_updated_at" BEFORE UPDATE ON "public"."fish_species" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fishing_locations_updated_at" BEFORE UPDATE ON "public"."fishing_locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fishing_regulations_updated_at" BEFORE UPDATE ON "public"."fishing_regulations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fishing_shops_updated_at" BEFORE UPDATE ON "public"."fishing_shops" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fishing_techniques_updated_at" BEFORE UPDATE ON "public"."fishing_techniques" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_records_updated_at" BEFORE UPDATE ON "public"."records" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shop_reviews_updated_at" BEFORE UPDATE ON "public"."shop_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_gear_updated_at" BEFORE UPDATE ON "public"."user_gear" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_sessions"
    ADD CONSTRAINT "analytics_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "public"."counties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fish_species_bait"
    ADD CONSTRAINT "fish_species_bait_bait_id_fkey" FOREIGN KEY ("bait_id") REFERENCES "public"."fish_bait"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fish_species_bait"
    ADD CONSTRAINT "fish_species_bait_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "public"."fish_species"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fish_species_method"
    ADD CONSTRAINT "fish_species_method_method_id_fkey" FOREIGN KEY ("method_id") REFERENCES "public"."fish_method"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fish_species_method"
    ADD CONSTRAINT "fish_species_method_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "public"."fish_species"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fish_species_region"
    ADD CONSTRAINT "fish_species_region_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "public"."fish_species"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fishing_regulations"
    ADD CONSTRAINT "fishing_regulations_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "public"."fish_species"("id");



ALTER TABLE ONLY "public"."location_species"
    ADD CONSTRAINT "location_species_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."fishing_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."location_species"
    ADD CONSTRAINT "location_species_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "public"."fish_species"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "public"."counties"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."records"
    ADD CONSTRAINT "records_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."fishing_locations"("id");



ALTER TABLE ONLY "public"."records"
    ADD CONSTRAINT "records_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "public"."fish_species"("id");



ALTER TABLE ONLY "public"."records"
    ADD CONSTRAINT "records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."records"
    ADD CONSTRAINT "records_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."shop_reviews"
    ADD CONSTRAINT "shop_reviews_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."fishing_shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shop_reviews"
    ADD CONSTRAINT "shop_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_gear"
    ADD CONSTRAINT "user_gear_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can view all analytics" ON "public"."analytics_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."email")::"text" = 'cosmin.trica@outlook.com'::"text")))));



CREATE POLICY "Admin can view all profiles" ON "public"."profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."email")::"text" = 'cosmin.trica@outlook.com'::"text")))));



CREATE POLICY "Admin delete fish_species" ON "public"."fish_species" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin delete fishing_locations" ON "public"."fishing_locations" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin delete fishing_regulations" ON "public"."fishing_regulations" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin delete fishing_shops" ON "public"."fishing_shops" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin delete fishing_techniques" ON "public"."fishing_techniques" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin delete location_species" ON "public"."location_species" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin insert fish_species" ON "public"."fish_species" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin insert fishing_locations" ON "public"."fishing_locations" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin insert fishing_regulations" ON "public"."fishing_regulations" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin insert fishing_shops" ON "public"."fishing_shops" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin insert fishing_techniques" ON "public"."fishing_techniques" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin insert location_species" ON "public"."location_species" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin update fish_species" ON "public"."fish_species" FOR UPDATE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin update fishing_locations" ON "public"."fishing_locations" FOR UPDATE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin update fishing_regulations" ON "public"."fishing_regulations" FOR UPDATE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin update fishing_shops" ON "public"."fishing_shops" FOR UPDATE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin update fishing_techniques" ON "public"."fishing_techniques" FOR UPDATE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admin update location_species" ON "public"."location_species" FOR UPDATE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can update any record" ON "public"."records" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."email" = 'cosmin.trica@outlook.com'::"text")))));



CREATE POLICY "Admins can view all analytics events" ON "public"."analytics_events" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Allow anonymous analytics tracking" ON "public"."analytics_events" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow anonymous session tracking" ON "public"."analytics_sessions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow authenticated analytics read" ON "public"."analytics_events" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated session read" ON "public"."analytics_sessions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated stats insert" ON "public"."analytics_daily_stats" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated stats update" ON "public"."analytics_daily_stats" FOR UPDATE WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow insert for all users" ON "public"."analytics_events" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow insert for all users" ON "public"."analytics_sessions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public stats read" ON "public"."analytics_daily_stats" FOR SELECT USING (true);



CREATE POLICY "Allow read for admin users" ON "public"."analytics_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."email")::"text" = 'cosmin.trica@outlook.com'::"text")))));



CREATE POLICY "Allow read for admin users" ON "public"."analytics_sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."email")::"text" = 'cosmin.trica@outlook.com'::"text")))));



CREATE POLICY "Anyone can view fish species" ON "public"."fish_species" FOR SELECT USING (true);



CREATE POLICY "Anyone can view fishing locations" ON "public"."fishing_locations" FOR SELECT USING (true);



CREATE POLICY "Anyone can view fishing regulations" ON "public"."fishing_regulations" FOR SELECT USING (true);



CREATE POLICY "Anyone can view fishing shops" ON "public"."fishing_shops" FOR SELECT USING (true);



CREATE POLICY "Anyone can view fishing techniques" ON "public"."fishing_techniques" FOR SELECT USING (true);



CREATE POLICY "Anyone can view location species" ON "public"."location_species" FOR SELECT USING (true);



CREATE POLICY "Anyone can view shop reviews" ON "public"."shop_reviews" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can view all records" ON "public"."records" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Cities are viewable by everyone" ON "public"."cities" FOR SELECT USING (true);



CREATE POLICY "Counties are viewable by everyone" ON "public"."counties" FOR SELECT USING (true);



CREATE POLICY "Public can view analytics events" ON "public"."analytics_events" FOR SELECT USING (true);



CREATE POLICY "Public can view bait" ON "public"."fish_bait" FOR SELECT USING (true);



CREATE POLICY "Public can view cities" ON "public"."cities" FOR SELECT USING (true);



CREATE POLICY "Public can view counties" ON "public"."counties" FOR SELECT USING (true);



CREATE POLICY "Public can view fish bait" ON "public"."fish_bait" FOR SELECT USING (true);



CREATE POLICY "Public can view fish method" ON "public"."fish_method" FOR SELECT USING (true);



CREATE POLICY "Public can view fish species" ON "public"."fish_species" FOR SELECT USING (true);



CREATE POLICY "Public can view fishing locations" ON "public"."fishing_locations" FOR SELECT USING (true);



CREATE POLICY "Public can view fishing shops" ON "public"."fishing_shops" FOR SELECT USING (true);



CREATE POLICY "Public can view fishing techniques" ON "public"."fishing_techniques" FOR SELECT USING (true);



CREATE POLICY "Public can view locations" ON "public"."fishing_locations" FOR SELECT USING (true);



CREATE POLICY "Public can view methods" ON "public"."fish_method" FOR SELECT USING (true);



CREATE POLICY "Public can view profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public can view shop reviews" ON "public"."shop_reviews" FOR SELECT USING (true);



CREATE POLICY "Public can view shops" ON "public"."fishing_shops" FOR SELECT USING (true);



CREATE POLICY "Public can view species" ON "public"."fish_species" FOR SELECT USING (true);



CREATE POLICY "Public can view techniques" ON "public"."fishing_techniques" FOR SELECT USING (true);



CREATE POLICY "Public can view verified records" ON "public"."records" FOR SELECT USING (("status" = 'verified'::"text"));



CREATE POLICY "Users can delete own gear" ON "public"."user_gear" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own reviews" ON "public"."shop_reviews" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own gear" ON "public"."user_gear" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own analytics" ON "public"."analytics_events" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own gear" ON "public"."user_gear" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own reviews" ON "public"."shop_reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own shop reviews" ON "public"."shop_reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert shop reviews" ON "public"."shop_reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own analytics events" ON "public"."analytics_events" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert their own gear" ON "public"."user_gear" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own records" ON "public"."records" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own gear" ON "public"."user_gear" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own reviews" ON "public"."shop_reviews" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own shop reviews" ON "public"."shop_reviews" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own gear" ON "public"."user_gear" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own records" ON "public"."records" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own shop reviews" ON "public"."shop_reviews" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own gear" ON "public"."user_gear" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own gear" ON "public"."user_gear" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."analytics_daily_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."counties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fish_bait" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fish_method" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fish_species" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fish_species_bait" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fish_species_method" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fish_species_region" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fishing_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fishing_regulations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fishing_shops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fishing_techniques" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location_species" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_select" ON "public"."fish_bait" FOR SELECT USING (true);



CREATE POLICY "public_select" ON "public"."fish_method" FOR SELECT USING (true);



CREATE POLICY "public_select" ON "public"."fish_species" FOR SELECT USING (true);



CREATE POLICY "public_select" ON "public"."fish_species_bait" FOR SELECT USING (true);



CREATE POLICY "public_select" ON "public"."fish_species_method" FOR SELECT USING (true);



CREATE POLICY "public_select" ON "public"."fish_species_region" FOR SELECT USING (true);



CREATE POLICY "read fish_bait public" ON "public"."fish_bait" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "read fish_method public" ON "public"."fish_method" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "read fish_species public" ON "public"."fish_species" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "read fish_species_bait public" ON "public"."fish_species_bait" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "read fish_species_method public" ON "public"."fish_species_method" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shop_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_gear" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."calculate_session_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_session_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_session_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_bounce_rate_and_session_time"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_bounce_rate_and_session_time"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_bounce_rate_and_session_time"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_browser_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_browser_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_browser_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_country_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_country_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_country_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_country_stats_detailed"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_country_stats_detailed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_country_stats_detailed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_analytics_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_analytics_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_analytics_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_daily_stats_history"("days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_stats_history"("days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_stats_history"("days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_device_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_device_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_device_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_os_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_os_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_os_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_page_views_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_page_views_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_page_views_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_profiles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_referrer_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_referrer_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_referrer_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_romanian_city_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_romanian_city_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_romanian_city_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_traffic_custom_period"("start_date" timestamp without time zone, "end_date" timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_traffic_custom_period"("start_date" timestamp without time zone, "end_date" timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_traffic_custom_period"("start_date" timestamp without time zone, "end_date" timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_traffic_custom_period"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_traffic_custom_period"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_traffic_custom_period"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_traffic_last_24h"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_traffic_last_24h"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_traffic_last_24h"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_traffic_last_hour"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_traffic_last_hour"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_traffic_last_hour"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_traffic_last_month"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_traffic_last_month"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_traffic_last_month"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_traffic_last_week"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_traffic_last_week"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_traffic_last_week"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_traffic_last_year"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_traffic_last_year"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_traffic_last_year"() TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_verification_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_verification_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_verification_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_profile_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_profile_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_analytics_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_analytics_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_analytics_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_daily_analytics_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_daily_analytics_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_daily_analytics_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_shop_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_shop_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_shop_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";
























GRANT ALL ON TABLE "public"."analytics_daily_stats" TO "anon";
GRANT ALL ON TABLE "public"."analytics_daily_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_daily_stats" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_daily_stats_backup" TO "anon";
GRANT ALL ON TABLE "public"."analytics_daily_stats_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_daily_stats_backup" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_events" TO "anon";
GRANT ALL ON TABLE "public"."analytics_events" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_sessions" TO "anon";
GRANT ALL ON TABLE "public"."analytics_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."cities" TO "anon";
GRANT ALL ON TABLE "public"."cities" TO "authenticated";
GRANT ALL ON TABLE "public"."cities" TO "service_role";



GRANT ALL ON TABLE "public"."counties" TO "anon";
GRANT ALL ON TABLE "public"."counties" TO "authenticated";
GRANT ALL ON TABLE "public"."counties" TO "service_role";



GRANT ALL ON TABLE "public"."fish_bait" TO "anon";
GRANT ALL ON TABLE "public"."fish_bait" TO "authenticated";
GRANT ALL ON TABLE "public"."fish_bait" TO "service_role";



GRANT ALL ON TABLE "public"."fish_method" TO "anon";
GRANT ALL ON TABLE "public"."fish_method" TO "authenticated";
GRANT ALL ON TABLE "public"."fish_method" TO "service_role";



GRANT ALL ON TABLE "public"."fish_species" TO "anon";
GRANT ALL ON TABLE "public"."fish_species" TO "authenticated";
GRANT ALL ON TABLE "public"."fish_species" TO "service_role";



GRANT ALL ON TABLE "public"."fish_species_bait" TO "anon";
GRANT ALL ON TABLE "public"."fish_species_bait" TO "authenticated";
GRANT ALL ON TABLE "public"."fish_species_bait" TO "service_role";



GRANT ALL ON TABLE "public"."fish_species_method" TO "anon";
GRANT ALL ON TABLE "public"."fish_species_method" TO "authenticated";
GRANT ALL ON TABLE "public"."fish_species_method" TO "service_role";



GRANT ALL ON TABLE "public"."fish_species_region" TO "anon";
GRANT ALL ON TABLE "public"."fish_species_region" TO "authenticated";
GRANT ALL ON TABLE "public"."fish_species_region" TO "service_role";



GRANT ALL ON TABLE "public"."fishing_locations" TO "anon";
GRANT ALL ON TABLE "public"."fishing_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."fishing_locations" TO "service_role";



GRANT ALL ON TABLE "public"."fishing_regulations" TO "anon";
GRANT ALL ON TABLE "public"."fishing_regulations" TO "authenticated";
GRANT ALL ON TABLE "public"."fishing_regulations" TO "service_role";



GRANT ALL ON TABLE "public"."fishing_shops" TO "anon";
GRANT ALL ON TABLE "public"."fishing_shops" TO "authenticated";
GRANT ALL ON TABLE "public"."fishing_shops" TO "service_role";



GRANT ALL ON TABLE "public"."fishing_techniques" TO "anon";
GRANT ALL ON TABLE "public"."fishing_techniques" TO "authenticated";
GRANT ALL ON TABLE "public"."fishing_techniques" TO "service_role";



GRANT ALL ON TABLE "public"."location_species" TO "anon";
GRANT ALL ON TABLE "public"."location_species" TO "authenticated";
GRANT ALL ON TABLE "public"."location_species" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."records" TO "anon";
GRANT ALL ON TABLE "public"."records" TO "authenticated";
GRANT ALL ON TABLE "public"."records" TO "service_role";



GRANT ALL ON TABLE "public"."shop_reviews" TO "anon";
GRANT ALL ON TABLE "public"."shop_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."user_gear" TO "anon";
GRANT ALL ON TABLE "public"."user_gear" TO "authenticated";
GRANT ALL ON TABLE "public"."user_gear" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
