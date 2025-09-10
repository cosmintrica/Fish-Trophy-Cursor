-- Test current time and timezone
-- Run this in Supabase SQL Editor

SELECT
    'Current time test' as test_name,
    NOW() as utc_now,
    NOW() AT TIME ZONE 'Europe/Bucharest' as romania_now,
    EXTRACT(hour FROM NOW()) as utc_hour,
    EXTRACT(hour FROM NOW() AT TIME ZONE 'Europe/Bucharest') as romania_hour,
    TO_CHAR(NOW() AT TIME ZONE 'Europe/Bucharest', 'HH24:MI') as romania_formatted;

-- Test what timezone offset Romania should have
SELECT
    'Timezone offset test' as test_name,
    EXTRACT(timezone_hour FROM NOW() AT TIME ZONE 'Europe/Bucharest') as timezone_offset_hours;
