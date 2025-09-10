-- Fix timezone conversion issues
-- Run this in Supabase SQL Editor

-- Check current timezone settings
SELECT 'Current timezone check:' as test_name;
SELECT
    current_setting('timezone') as current_timezone,
    NOW() as utc_time,
    NOW() AT TIME ZONE 'Europe/Bucharest' as romania_time;

-- Test timezone conversion
SELECT 'Timezone conversion test:' as test_name;
SELECT
    '2025-09-10 18:53:00'::timestamp as utc_time,
    '2025-09-10 18:53:00'::timestamp AT TIME ZONE 'Europe/Bucharest' as romania_time,
    TO_CHAR('2025-09-10 18:53:00'::timestamp AT TIME ZONE 'Europe/Bucharest', 'HH24:MI') as romania_time_formatted;

-- Check what time it should be now
SELECT 'Current time check:' as test_name;
SELECT
    NOW() as utc_now,
    NOW() AT TIME ZONE 'Europe/Bucharest' as romania_now,
    TO_CHAR(NOW() AT TIME ZONE 'Europe/Bucharest', 'HH24:MI') as romania_time_formatted;

-- Test the traffic function with correct timezone
SELECT 'Testing traffic function with correct timezone:' as test_name;
SELECT * FROM get_traffic_last_hour() LIMIT 3;
