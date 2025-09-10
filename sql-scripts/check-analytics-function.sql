-- Check what analytics function exists and fix it
-- This will show us the current function and fix the column issue

-- 1. Check what functions exist
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%analytics%';

-- 2. Check analytics_sessions table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'analytics_sessions'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Drop the problematic function and recreate it
DROP FUNCTION IF EXISTS get_current_analytics_stats();

-- 4. Create the correct function
CREATE OR REPLACE FUNCTION get_current_analytics_stats()
RETURNS TABLE (
    total_users INTEGER,
    total_records INTEGER,
    total_page_views INTEGER,
    new_users_today INTEGER,
    new_records_today INTEGER,
    page_views_today INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM profiles) as total_users,
        (SELECT COUNT(*)::INTEGER FROM records) as total_records,
        (SELECT COUNT(*)::INTEGER FROM analytics_events) as total_page_views,
        (SELECT COUNT(*)::INTEGER FROM profiles WHERE DATE(created_at) = CURRENT_DATE) as new_users_today,
        (SELECT COUNT(*)::INTEGER FROM records WHERE DATE(created_at) = CURRENT_DATE) as new_records_today,
        (SELECT COUNT(*)::INTEGER FROM analytics_events WHERE DATE(created_at) = CURRENT_DATE) as page_views_today;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION get_current_analytics_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_analytics_stats() TO anon;

-- 6. Test the function
SELECT * FROM get_current_analytics_stats();
