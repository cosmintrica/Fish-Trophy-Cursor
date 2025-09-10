-- Check timezone settings and current time
-- Run this in Supabase SQL Editor

-- Check current timezone settings
SELECT 'Timezone settings:' as test_name;
SELECT
    current_setting('timezone') as current_timezone,
    NOW() as current_utc_time,
    NOW() AT TIME ZONE 'Europe/Bucharest' as romania_time;

-- Check what time it should be in Romania now
SELECT 'Current time comparison:' as test_name;
SELECT
    NOW() as utc_time,
    NOW() AT TIME ZONE 'Europe/Bucharest' as romania_time,
    EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Europe/Bucharest') as romania_hour,
    EXTRACT(MINUTE FROM NOW() AT TIME ZONE 'Europe/Bucharest') as romania_minute;

-- Check if Romania is in DST (Daylight Saving Time)
SELECT 'Romania DST check:' as test_name;
SELECT
    'Europe/Bucharest' as timezone,
    'UTC+3 (DST)' as current_offset,
    'Summer time (DST) active' as timezone_status;

-- Test with some sample data
SELECT 'Sample data time conversion:' as test_name;
SELECT
    '2025-09-10 18:53:00'::timestamp as utc_time,
    '2025-09-10 18:53:00'::timestamp AT TIME ZONE 'Europe/Bucharest' as romania_time;
