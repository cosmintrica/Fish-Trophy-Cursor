

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


CREATE OR REPLACE FUNCTION "public"."check_username_change_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD.username IS DISTINCT FROM NEW.username THEN
    -- Check if last change was less than 6 months ago (182 days)
    IF OLD.username_last_changed_at IS NOT NULL 
       AND OLD.username_last_changed_at > NOW() - INTERVAL '182 days' THEN
      RAISE EXCEPTION 'Username can only be changed twice per year. Last change was on %', OLD.username_last_changed_at;
    END IF;
    
    -- Update the timestamp
    NEW.username_last_changed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_username_change_limit"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."get_unread_message_count"("msg_context" character varying) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM public.private_messages
  WHERE recipient_id = auth.uid()
    AND is_read = false
    AND is_deleted_by_recipient = false
    AND context = msg_context;
  
  RETURN COALESCE(unread_count, 0);
END;
$$;


ALTER FUNCTION "public"."get_unread_message_count"("msg_context" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_display_name TEXT;
BEGIN
  -- Try to get display_name from metadata, prioritizing Google's full_name or name
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NULL
  );
  
  -- If still null, use email prefix (before @) as last resort, but never full email
  IF user_display_name IS NULL OR user_display_name = '' THEN
    user_display_name := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  
  INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    user_display_name,
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


CREATE OR REPLACE FUNCTION "public"."is_admin_user"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_comment_edited"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.is_edited := true;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."mark_comment_edited"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_message_read"("message_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.private_messages
  SET is_read = true,
      read_at = NOW()
  WHERE id = message_uuid
    AND recipient_id = auth.uid()
    AND is_read = false;
END;
$$;


ALTER FUNCTION "public"."mark_message_read"("message_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_thread_root"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.parent_message_id IS NOT NULL THEN
    -- Get the root of the thread
    SELECT COALESCE(thread_root_id, id) INTO NEW.thread_root_id
    FROM public.private_messages
    WHERE id = NEW.parent_message_id;
  ELSE
    -- This is a new thread, root is itself
    NEW.thread_root_id := NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_thread_root"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."update_subscribers_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_subscribers_updated_at"() OWNER TO "postgres";


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
    "user_id" "uuid" DEFAULT "auth"."uid"(),
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
    "user_id" "uuid" DEFAULT "auth"."uid"(),
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


CREATE TABLE IF NOT EXISTS "public"."catch_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "catch_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "parent_comment_id" "uuid",
    "content" "text" NOT NULL,
    "is_edited" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "catch_comments_content_check" CHECK ((("char_length"("content") > 0) AND ("char_length"("content") <= 2000)))
);


ALTER TABLE "public"."catch_comments" OWNER TO "postgres";


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
    "username" "text" NOT NULL,
    "username_last_changed_at" timestamp with time zone,
    "youtube_channel" "text",
    "cover_photo_url" "text",
    "show_gear_publicly" boolean DEFAULT false,
    "cover_position" "jsonb" DEFAULT '{"x": 50, "y": 50, "scale": 100, "rotation": 0}'::"jsonb",
    "show_county_publicly" boolean DEFAULT false,
    "show_city_publicly" boolean DEFAULT false,
    "show_website_publicly" boolean DEFAULT false,
    "show_youtube_publicly" boolean DEFAULT false,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text"]))),
    CONSTRAINT "username_format" CHECK (("username" ~ '^[a-zA-Z0-9_-]{3,30}$'::"text"))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."photo_url" IS 'Profile photo URL (avatar)';



COMMENT ON COLUMN "public"."profiles"."username" IS 'Unique username for the user, can be changed max 2 times per year';



COMMENT ON COLUMN "public"."profiles"."username_last_changed_at" IS 'Timestamp of last username change';



COMMENT ON COLUMN "public"."profiles"."youtube_channel" IS 'YouTube channel URL';



COMMENT ON COLUMN "public"."profiles"."cover_photo_url" IS 'Cover photo URL for profile page';



COMMENT ON COLUMN "public"."profiles"."show_gear_publicly" IS 'Whether to show fishing gear on public profile (default: false)';



COMMENT ON COLUMN "public"."profiles"."cover_position" IS 'Cover photo position settings: x (0-100), y (0-100), scale (50-200), rotation (0-360)';



COMMENT ON COLUMN "public"."profiles"."show_county_publicly" IS 'Whether to show county on public profile';



COMMENT ON COLUMN "public"."profiles"."show_city_publicly" IS 'Whether to show city on public profile';



COMMENT ON COLUMN "public"."profiles"."show_website_publicly" IS 'Whether to show website on public profile';



COMMENT ON COLUMN "public"."profiles"."show_youtube_publicly" IS 'Whether to show YouTube channel on public profile';



CREATE OR REPLACE VIEW "public"."catch_comments_with_users" AS
 SELECT "cc"."id",
    "cc"."catch_id",
    "cc"."user_id",
    "cc"."parent_comment_id",
    "cc"."content",
    "cc"."is_edited",
    "cc"."created_at",
    "cc"."updated_at",
    "p"."display_name" AS "user_display_name",
    "p"."username" AS "user_username",
    "p"."photo_url" AS "user_avatar_url",
    ( SELECT "count"(*) AS "count"
           FROM "public"."catch_comments" "replies"
          WHERE ("replies"."parent_comment_id" = "cc"."id")) AS "reply_count"
   FROM ("public"."catch_comments" "cc"
     JOIN "public"."profiles" "p" ON (("p"."id" = "cc"."user_id")));


ALTER VIEW "public"."catch_comments_with_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catch_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "catch_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."catch_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "species_id" "uuid",
    "location_id" "uuid",
    "weight" numeric(5,2),
    "length_cm" numeric(5,2),
    "captured_at" timestamp with time zone NOT NULL,
    "notes" "text",
    "photo_url" "text",
    "video_url" "text",
    "is_public" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "catches_length_cm_check" CHECK ((("length_cm" IS NULL) OR ("length_cm" >= (0)::numeric))),
    CONSTRAINT "catches_weight_check" CHECK ((("weight" IS NULL) OR ("weight" >= (0)::numeric)))
);


ALTER TABLE "public"."catches" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."catches_with_stats" AS
 SELECT "c"."id",
    "c"."user_id",
    "c"."species_id",
    "c"."location_id",
    "c"."weight",
    "c"."length_cm",
    "c"."captured_at",
    "c"."notes",
    "c"."photo_url",
    "c"."video_url",
    "c"."is_public",
    "c"."created_at",
    "c"."updated_at",
    COALESCE("like_counts"."like_count", (0)::bigint) AS "like_count",
    COALESCE("comment_counts"."comment_count", (0)::bigint) AS "comment_count",
    (EXISTS ( SELECT 1
           FROM "public"."catch_likes" "cl"
          WHERE (("cl"."catch_id" = "c"."id") AND ("cl"."user_id" = "auth"."uid"())))) AS "is_liked_by_current_user"
   FROM (("public"."catches" "c"
     LEFT JOIN ( SELECT "catch_likes"."catch_id",
            "count"(*) AS "like_count"
           FROM "public"."catch_likes"
          GROUP BY "catch_likes"."catch_id") "like_counts" ON (("like_counts"."catch_id" = "c"."id")))
     LEFT JOIN ( SELECT "catch_comments"."catch_id",
            "count"(*) AS "comment_count"
           FROM "public"."catch_comments"
          WHERE ("catch_comments"."parent_comment_id" IS NULL)
          GROUP BY "catch_comments"."catch_id") "comment_counts" ON (("comment_counts"."catch_id" = "c"."id")));


ALTER VIEW "public"."catches_with_stats" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."message_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" character varying(50),
    "file_size" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."private_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "content" "text" NOT NULL,
    "context" character varying(20) DEFAULT 'site'::character varying NOT NULL,
    "parent_message_id" "uuid",
    "thread_root_id" "uuid",
    "is_read" boolean DEFAULT false,
    "is_archived_by_sender" boolean DEFAULT false,
    "is_archived_by_recipient" boolean DEFAULT false,
    "is_deleted_by_sender" boolean DEFAULT false,
    "is_deleted_by_recipient" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "read_at" timestamp with time zone,
    CONSTRAINT "private_messages_content_check" CHECK ((("char_length"("content") > 0) AND ("char_length"("content") <= 5000))),
    CONSTRAINT "private_messages_context_check" CHECK ((("context")::"text" = ANY ((ARRAY['site'::character varying, 'forum'::character varying])::"text"[]))),
    CONSTRAINT "private_messages_subject_check" CHECK ((("char_length"("subject") > 0) AND ("char_length"("subject") <= 200)))
);


ALTER TABLE "public"."private_messages" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."messages_archived" AS
 SELECT "pm"."id",
    "pm"."sender_id",
    "pm"."recipient_id",
    "pm"."subject",
    "pm"."content",
    "pm"."context",
    "pm"."parent_message_id",
    "pm"."thread_root_id",
    "pm"."is_read",
    "pm"."is_archived_by_sender",
    "pm"."is_archived_by_recipient",
    "pm"."is_deleted_by_sender",
    "pm"."is_deleted_by_recipient",
    "pm"."created_at",
    "pm"."read_at",
    "sender"."display_name" AS "sender_name",
    "sender"."username" AS "sender_username",
    "sender"."photo_url" AS "sender_avatar",
    "recipient"."display_name" AS "recipient_name",
    "recipient"."username" AS "recipient_username",
    "recipient"."photo_url" AS "recipient_avatar"
   FROM (("public"."private_messages" "pm"
     JOIN "public"."profiles" "sender" ON (("sender"."id" = "pm"."sender_id")))
     JOIN "public"."profiles" "recipient" ON (("recipient"."id" = "pm"."recipient_id")))
  WHERE ((("pm"."sender_id" = "auth"."uid"()) AND ("pm"."is_archived_by_sender" = true) AND ("pm"."is_deleted_by_sender" = false)) OR (("pm"."recipient_id" = "auth"."uid"()) AND ("pm"."is_archived_by_recipient" = true) AND ("pm"."is_deleted_by_recipient" = false)));


ALTER VIEW "public"."messages_archived" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."messages_inbox" AS
 SELECT "pm"."id",
    "pm"."sender_id",
    "pm"."recipient_id",
    "pm"."subject",
    "pm"."content",
    "pm"."context",
    "pm"."parent_message_id",
    "pm"."thread_root_id",
    "pm"."is_read",
    "pm"."is_archived_by_sender",
    "pm"."is_archived_by_recipient",
    "pm"."is_deleted_by_sender",
    "pm"."is_deleted_by_recipient",
    "pm"."created_at",
    "pm"."read_at",
    "sender"."display_name" AS "sender_name",
    "sender"."username" AS "sender_username",
    "sender"."photo_url" AS "sender_avatar",
    "recipient"."display_name" AS "recipient_name",
    "recipient"."username" AS "recipient_username",
    "recipient"."photo_url" AS "recipient_avatar",
    ( SELECT "count"(*) AS "count"
           FROM "public"."private_messages" "replies"
          WHERE (("replies"."thread_root_id" = "pm"."thread_root_id") AND ("replies"."id" <> "pm"."id") AND (("replies"."sender_id" = "auth"."uid"()) OR ("replies"."recipient_id" = "auth"."uid"())) AND ((("replies"."sender_id" = "auth"."uid"()) AND (NOT "replies"."is_deleted_by_sender")) OR (("replies"."recipient_id" = "auth"."uid"()) AND (NOT "replies"."is_deleted_by_recipient"))))) AS "reply_count"
   FROM (("public"."private_messages" "pm"
     JOIN "public"."profiles" "sender" ON (("sender"."id" = "pm"."sender_id")))
     JOIN "public"."profiles" "recipient" ON (("recipient"."id" = "pm"."recipient_id")))
  WHERE (("pm"."recipient_id" = "auth"."uid"()) AND ("pm"."is_deleted_by_recipient" = false) AND ("pm"."is_archived_by_recipient" = false));


ALTER VIEW "public"."messages_inbox" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."messages_sent" AS
 SELECT "pm"."id",
    "pm"."sender_id",
    "pm"."recipient_id",
    "pm"."subject",
    "pm"."content",
    "pm"."context",
    "pm"."parent_message_id",
    "pm"."thread_root_id",
    "pm"."is_read",
    "pm"."is_archived_by_sender",
    "pm"."is_archived_by_recipient",
    "pm"."is_deleted_by_sender",
    "pm"."is_deleted_by_recipient",
    "pm"."created_at",
    "pm"."read_at",
    "sender"."display_name" AS "sender_name",
    "sender"."username" AS "sender_username",
    "sender"."photo_url" AS "sender_avatar",
    "recipient"."display_name" AS "recipient_name",
    "recipient"."username" AS "recipient_username",
    "recipient"."photo_url" AS "recipient_avatar",
    ( SELECT "count"(*) AS "count"
           FROM "public"."private_messages" "replies"
          WHERE (("replies"."thread_root_id" = "pm"."thread_root_id") AND ("replies"."id" <> "pm"."id") AND (("replies"."sender_id" = "auth"."uid"()) OR ("replies"."recipient_id" = "auth"."uid"())) AND ((("replies"."sender_id" = "auth"."uid"()) AND (NOT "replies"."is_deleted_by_sender")) OR (("replies"."recipient_id" = "auth"."uid"()) AND (NOT "replies"."is_deleted_by_recipient"))))) AS "reply_count"
   FROM (("public"."private_messages" "pm"
     JOIN "public"."profiles" "sender" ON (("sender"."id" = "pm"."sender_id")))
     JOIN "public"."profiles" "recipient" ON (("recipient"."id" = "pm"."recipient_id")))
  WHERE (("pm"."sender_id" = "auth"."uid"()) AND ("pm"."is_deleted_by_sender" = false) AND ("pm"."is_archived_by_sender" = false));


ALTER VIEW "public"."messages_sent" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."subscribers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "subscribed_at" timestamp with time zone DEFAULT "now"(),
    "status" character varying(20) DEFAULT 'active'::character varying,
    "source" character varying(50) DEFAULT 'construction_page'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subscribers_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'unsubscribed'::character varying, 'bounced'::character varying])::"text"[])))
);


ALTER TABLE "public"."subscribers" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscribers" IS 'Tabelul pentru colectarea email-urilor de la utilizatorii interesați de site-ul în construcție';



COMMENT ON COLUMN "public"."subscribers"."email" IS 'Adresa de email a utilizatorului';



COMMENT ON COLUMN "public"."subscribers"."subscribed_at" IS 'Data și ora când utilizatorul s-a abonat';



COMMENT ON COLUMN "public"."subscribers"."status" IS 'Statusul abonamentului: active, unsubscribed, bounced';



COMMENT ON COLUMN "public"."subscribers"."source" IS 'Sursa abonamentului: construction_page, newsletter, etc.';



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



ALTER TABLE ONLY "public"."catch_comments"
    ADD CONSTRAINT "catch_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catch_likes"
    ADD CONSTRAINT "catch_likes_catch_id_user_id_key" UNIQUE ("catch_id", "user_id");



ALTER TABLE ONLY "public"."catch_likes"
    ADD CONSTRAINT "catch_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catches"
    ADD CONSTRAINT "catches_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."private_messages"
    ADD CONSTRAINT "private_messages_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "idx_attachments_message" ON "public"."message_attachments" USING "btree" ("message_id");



CREATE INDEX "idx_catch_comments_catch" ON "public"."catch_comments" USING "btree" ("catch_id");



CREATE INDEX "idx_catch_comments_created" ON "public"."catch_comments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_catch_comments_parent" ON "public"."catch_comments" USING "btree" ("parent_comment_id");



CREATE INDEX "idx_catch_comments_user" ON "public"."catch_comments" USING "btree" ("user_id");



CREATE INDEX "idx_catch_likes_catch" ON "public"."catch_likes" USING "btree" ("catch_id");



CREATE INDEX "idx_catch_likes_user" ON "public"."catch_likes" USING "btree" ("user_id");



CREATE INDEX "idx_catches_created" ON "public"."catches" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_catches_location" ON "public"."catches" USING "btree" ("location_id");



CREATE INDEX "idx_catches_public" ON "public"."catches" USING "btree" ("is_public") WHERE ("is_public" = true);



CREATE INDEX "idx_catches_species" ON "public"."catches" USING "btree" ("species_id");



CREATE INDEX "idx_catches_user" ON "public"."catches" USING "btree" ("user_id");



CREATE INDEX "idx_catches_user_created" ON "public"."catches" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_cities_county_id" ON "public"."cities" USING "btree" ("county_id");



CREATE INDEX "idx_cities_name" ON "public"."cities" USING "btree" ("name");



CREATE INDEX "idx_location_species_loc" ON "public"."location_species" USING "btree" ("location_id");



CREATE INDEX "idx_location_species_sp" ON "public"."location_species" USING "btree" ("species_id");



CREATE INDEX "idx_locations_name_trgm" ON "public"."fishing_locations" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_locations_region" ON "public"."fishing_locations" USING "btree" ("region");



CREATE INDEX "idx_messages_context" ON "public"."private_messages" USING "btree" ("context");



CREATE INDEX "idx_messages_recipient" ON "public"."private_messages" USING "btree" ("recipient_id", "created_at" DESC);



CREATE INDEX "idx_messages_sender" ON "public"."private_messages" USING "btree" ("sender_id", "created_at" DESC);



CREATE INDEX "idx_messages_thread" ON "public"."private_messages" USING "btree" ("thread_root_id");



CREATE INDEX "idx_messages_unread" ON "public"."private_messages" USING "btree" ("recipient_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_profiles_city_id" ON "public"."profiles" USING "btree" ("city_id");



CREATE INDEX "idx_profiles_county_id" ON "public"."profiles" USING "btree" ("county_id");



CREATE UNIQUE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("lower"("username"));



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



CREATE INDEX "idx_subscribers_email" ON "public"."subscribers" USING "btree" ("email");



CREATE INDEX "idx_subscribers_status" ON "public"."subscribers" USING "btree" ("status");



CREATE INDEX "idx_subscribers_subscribed_at" ON "public"."subscribers" USING "btree" ("subscribed_at");



CREATE INDEX "idx_user_gear_user" ON "public"."user_gear" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "mark_catch_comment_edited" BEFORE UPDATE ON "public"."catch_comments" FOR EACH ROW EXECUTE FUNCTION "public"."mark_comment_edited"();



CREATE OR REPLACE TRIGGER "set_thread_root_trigger" BEFORE INSERT ON "public"."private_messages" FOR EACH ROW EXECUTE FUNCTION "public"."set_thread_root"();



CREATE OR REPLACE TRIGGER "trg_records_verification" BEFORE UPDATE ON "public"."records" FOR EACH ROW EXECUTE FUNCTION "public"."set_verification_fields"();



CREATE OR REPLACE TRIGGER "trg_reviews_aggregate" AFTER INSERT OR DELETE OR UPDATE ON "public"."shop_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_shop_rating"();



CREATE OR REPLACE TRIGGER "trigger_update_subscribers_updated_at" BEFORE UPDATE ON "public"."subscribers" FOR EACH ROW EXECUTE FUNCTION "public"."update_subscribers_updated_at"();



CREATE OR REPLACE TRIGGER "update_catch_comments_updated_at" BEFORE UPDATE ON "public"."catch_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_catches_updated_at" BEFORE UPDATE ON "public"."catches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fish_species_updated_at" BEFORE UPDATE ON "public"."fish_species" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fishing_locations_updated_at" BEFORE UPDATE ON "public"."fishing_locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fishing_regulations_updated_at" BEFORE UPDATE ON "public"."fishing_regulations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fishing_shops_updated_at" BEFORE UPDATE ON "public"."fishing_shops" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fishing_techniques_updated_at" BEFORE UPDATE ON "public"."fishing_techniques" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_records_updated_at" BEFORE UPDATE ON "public"."records" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shop_reviews_updated_at" BEFORE UPDATE ON "public"."shop_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_gear_updated_at" BEFORE UPDATE ON "public"."user_gear" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "username_change_limit_trigger" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."check_username_change_limit"();



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_sessions"
    ADD CONSTRAINT "analytics_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."catch_comments"
    ADD CONSTRAINT "catch_comments_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "public"."catches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catch_comments"
    ADD CONSTRAINT "catch_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."catch_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catch_comments"
    ADD CONSTRAINT "catch_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catch_likes"
    ADD CONSTRAINT "catch_likes_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "public"."catches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catch_likes"
    ADD CONSTRAINT "catch_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catches"
    ADD CONSTRAINT "catches_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."fishing_locations"("id");



ALTER TABLE ONLY "public"."catches"
    ADD CONSTRAINT "catches_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "public"."fish_species"("id");



ALTER TABLE ONLY "public"."catches"
    ADD CONSTRAINT "catches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."private_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."private_messages"
    ADD CONSTRAINT "private_messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "public"."private_messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."private_messages"
    ADD CONSTRAINT "private_messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."private_messages"
    ADD CONSTRAINT "private_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."private_messages"
    ADD CONSTRAINT "private_messages_thread_root_id_fkey" FOREIGN KEY ("thread_root_id") REFERENCES "public"."private_messages"("id") ON DELETE SET NULL;



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



CREATE POLICY "Admin can update all records" ON "public"."records" FOR UPDATE USING ("public"."is_admin_user"());



CREATE POLICY "Admin can view all analytics" ON "public"."analytics_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."email")::"text" = 'cosmin.trica@outlook.com'::"text")))));



CREATE POLICY "Admin can view all profiles" ON "public"."profiles" FOR SELECT USING ("public"."is_admin_user"());



CREATE POLICY "Admin can view all records" ON "public"."records" FOR SELECT USING ("public"."is_admin_user"());



CREATE POLICY "Admin can view all users" ON "public"."profiles" FOR SELECT USING ((EXISTS ( SELECT 1
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



CREATE POLICY "Anyone can view likes" ON "public"."catch_likes" FOR SELECT USING (true);



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



CREATE POLICY "Public can view public catches" ON "public"."catches" FOR SELECT USING ((("is_public" = true) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Public can view shop reviews" ON "public"."shop_reviews" FOR SELECT USING (true);



CREATE POLICY "Public can view shops" ON "public"."fishing_shops" FOR SELECT USING (true);



CREATE POLICY "Public can view species" ON "public"."fish_species" FOR SELECT USING (true);



CREATE POLICY "Public can view techniques" ON "public"."fishing_techniques" FOR SELECT USING (true);



CREATE POLICY "Public can view verified records" ON "public"."records" FOR SELECT USING (("status" = 'verified'::"text"));



CREATE POLICY "Usernames are publicly readable" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can comment on accessible catches" ON "public"."catch_comments" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."catches" "c"
  WHERE (("c"."id" = "catch_comments"."catch_id") AND (("c"."is_public" = true) OR ("c"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can delete own catches" ON "public"."catches" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own comments" ON "public"."catch_comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own gear" ON "public"."user_gear" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own messages" ON "public"."private_messages" FOR UPDATE USING (((("auth"."uid"() = "sender_id") AND (NOT "is_deleted_by_sender")) OR (("auth"."uid"() = "recipient_id") AND (NOT "is_deleted_by_recipient")))) WITH CHECK (((("auth"."uid"() = "sender_id") AND (NOT "is_deleted_by_sender")) OR (("auth"."uid"() = "recipient_id") AND (NOT "is_deleted_by_recipient"))));



CREATE POLICY "Users can delete own reviews" ON "public"."shop_reviews" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own gear" ON "public"."user_gear" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own analytics" ON "public"."analytics_events" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own catches" ON "public"."catches" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own gear" ON "public"."user_gear" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own records" ON "public"."records" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own reviews" ON "public"."shop_reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own shop reviews" ON "public"."shop_reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert shop reviews" ON "public"."shop_reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own analytics events" ON "public"."analytics_events" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert their own gear" ON "public"."user_gear" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own records" ON "public"."records" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can like catches" ON "public"."catch_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can send messages" ON "public"."private_messages" FOR INSERT WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can unlike catches" ON "public"."catch_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own catches" ON "public"."catches" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own comments" ON "public"."catch_comments" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own gear" ON "public"."user_gear" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own message status" ON "public"."private_messages" FOR UPDATE USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "recipient_id"))) WITH CHECK ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "recipient_id")));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own records" ON "public"."records" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own reviews" ON "public"."shop_reviews" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own shop reviews" ON "public"."shop_reviews" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own gear" ON "public"."user_gear" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own records" ON "public"."records" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own shop reviews" ON "public"."shop_reviews" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view attachments of own messages" ON "public"."message_attachments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."private_messages" "pm"
  WHERE (("pm"."id" = "message_attachments"."message_id") AND (("pm"."sender_id" = "auth"."uid"()) OR ("pm"."recipient_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view comments on accessible catches" ON "public"."catch_comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."catches" "c"
  WHERE (("c"."id" = "catch_comments"."catch_id") AND (("c"."is_public" = true) OR ("c"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view own analytics" ON "public"."analytics_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own gear" ON "public"."user_gear" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own messages" ON "public"."private_messages" FOR SELECT USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "recipient_id")));



CREATE POLICY "Users can view own records" ON "public"."records" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own gear" ON "public"."user_gear" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."analytics_daily_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catch_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catch_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catches" ENABLE ROW LEVEL SECURITY;


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


ALTER TABLE "public"."message_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."private_messages" ENABLE ROW LEVEL SECURITY;


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



GRANT ALL ON FUNCTION "public"."check_username_change_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_username_change_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_username_change_limit"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."get_unread_message_count"("msg_context" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_message_count"("msg_context" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_message_count"("msg_context" character varying) TO "service_role";



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



GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_comment_edited"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_comment_edited"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_comment_edited"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_message_read"("message_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_message_read"("message_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_message_read"("message_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_thread_root"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_thread_root"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_thread_root"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."update_subscribers_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_subscribers_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subscribers_updated_at"() TO "service_role";



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



GRANT ALL ON TABLE "public"."catch_comments" TO "anon";
GRANT ALL ON TABLE "public"."catch_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."catch_comments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."catch_comments_with_users" TO "anon";
GRANT ALL ON TABLE "public"."catch_comments_with_users" TO "authenticated";
GRANT ALL ON TABLE "public"."catch_comments_with_users" TO "service_role";



GRANT ALL ON TABLE "public"."catch_likes" TO "anon";
GRANT ALL ON TABLE "public"."catch_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."catch_likes" TO "service_role";



GRANT ALL ON TABLE "public"."catches" TO "anon";
GRANT ALL ON TABLE "public"."catches" TO "authenticated";
GRANT ALL ON TABLE "public"."catches" TO "service_role";



GRANT ALL ON TABLE "public"."catches_with_stats" TO "anon";
GRANT ALL ON TABLE "public"."catches_with_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."catches_with_stats" TO "service_role";



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



GRANT ALL ON TABLE "public"."message_attachments" TO "anon";
GRANT ALL ON TABLE "public"."message_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."message_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."private_messages" TO "anon";
GRANT ALL ON TABLE "public"."private_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."private_messages" TO "service_role";



GRANT ALL ON TABLE "public"."messages_archived" TO "anon";
GRANT ALL ON TABLE "public"."messages_archived" TO "authenticated";
GRANT ALL ON TABLE "public"."messages_archived" TO "service_role";



GRANT ALL ON TABLE "public"."messages_inbox" TO "anon";
GRANT ALL ON TABLE "public"."messages_inbox" TO "authenticated";
GRANT ALL ON TABLE "public"."messages_inbox" TO "service_role";



GRANT ALL ON TABLE "public"."messages_sent" TO "anon";
GRANT ALL ON TABLE "public"."messages_sent" TO "authenticated";
GRANT ALL ON TABLE "public"."messages_sent" TO "service_role";



GRANT ALL ON TABLE "public"."records" TO "anon";
GRANT ALL ON TABLE "public"."records" TO "authenticated";
GRANT ALL ON TABLE "public"."records" TO "service_role";



GRANT ALL ON TABLE "public"."shop_reviews" TO "anon";
GRANT ALL ON TABLE "public"."shop_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."subscribers" TO "anon";
GRANT ALL ON TABLE "public"."subscribers" TO "authenticated";
GRANT ALL ON TABLE "public"."subscribers" TO "service_role";



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






























