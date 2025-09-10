-- Test the exact data format that the admin panel expects
-- Run this in Supabase SQL Editor

-- Test get_traffic_last_hour function
SELECT 'get_traffic_last_hour result:' as test_name;
SELECT * FROM get_traffic_last_hour();

-- Check the data structure
SELECT 'Data structure check:' as test_name;
SELECT
    time_period,
    page_views,
    unique_visitors,
    sessions,
    pg_typeof(time_period) as time_period_type,
    pg_typeof(page_views) as page_views_type,
    pg_typeof(unique_visitors) as unique_visitors_type,
    pg_typeof(sessions) as sessions_type
FROM get_traffic_last_hour()
LIMIT 3;

-- Test if the function returns data in the expected format
SELECT 'Function return format test:' as test_name;
SELECT
    r.routine_name,
    p.data_type,
    p.udt_name
FROM information_schema.routines r
JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_name = 'get_traffic_last_hour'
AND p.parameter_mode = 'OUT'
ORDER BY p.ordinal_position;
