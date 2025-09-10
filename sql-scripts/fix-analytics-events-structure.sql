-- Fix Analytics Events Table Structure
-- This script ensures the analytics_events table has the correct structure

-- 1. Check if analytics_events table exists and has correct structure
DO $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        -- Create table if it doesn't exist
        CREATE TABLE analytics_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_type TEXT NOT NULL,
            user_id UUID REFERENCES profiles(id),
            session_id TEXT,
            page_url TEXT,
            metadata JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        RAISE NOTICE 'Created analytics_events table';
    ELSE
        -- Check if page_url column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'analytics_events' AND column_name = 'page_url') THEN
            ALTER TABLE analytics_events ADD COLUMN page_url TEXT;
            RAISE NOTICE 'Added page_url column to analytics_events';
        END IF;

        -- Check if metadata column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'analytics_events' AND column_name = 'metadata') THEN
            ALTER TABLE analytics_events ADD COLUMN metadata JSONB;
            RAISE NOTICE 'Added metadata column to analytics_events';
        END IF;

        RAISE NOTICE 'analytics_events table structure verified';
    END IF;
END $$;

-- 2. Create RLS policies for analytics_events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can insert their own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Admins can view all analytics events" ON analytics_events;

-- Create new policies
CREATE POLICY "Public can view analytics events" ON analytics_events
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own analytics events" ON analytics_events
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all analytics events" ON analytics_events
    FOR SELECT USING (is_admin(auth.uid()));

-- 3. Create functions for detailed analytics (without fake data)
CREATE OR REPLACE FUNCTION get_device_stats()
RETURNS TABLE (
    device_type TEXT,
    count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ae.metadata->>'device_type', 'Unknown') as device_type,
        COUNT(*)::INTEGER as count
    FROM analytics_events ae
    WHERE ae.metadata IS NOT NULL AND ae.metadata->>'device_type' IS NOT NULL
    GROUP BY ae.metadata->>'device_type'
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_browser_stats()
RETURNS TABLE (
    browser TEXT,
    count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ae.metadata->>'browser', 'Unknown') as browser,
        COUNT(*)::INTEGER as count
    FROM analytics_events ae
    WHERE ae.metadata IS NOT NULL AND ae.metadata->>'browser' IS NOT NULL
    GROUP BY ae.metadata->>'browser'
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_os_stats()
RETURNS TABLE (
    os TEXT,
    count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ae.metadata->>'os', 'Unknown') as os,
        COUNT(*)::INTEGER as count
    FROM analytics_events ae
    WHERE ae.metadata IS NOT NULL AND ae.metadata->>'os' IS NOT NULL
    GROUP BY ae.metadata->>'os'
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_country_stats()
RETURNS TABLE (
    country TEXT,
    count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ae.metadata->>'country', 'Unknown') as country,
        COUNT(*)::INTEGER as count
    FROM analytics_events ae
    WHERE ae.metadata IS NOT NULL AND ae.metadata->>'country' IS NOT NULL
    GROUP BY ae.metadata->>'country'
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_referrer_stats()
RETURNS TABLE (
    referrer TEXT,
    count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ae.metadata->>'referrer', 'Direct') as referrer,
        COUNT(*)::INTEGER as count
    FROM analytics_events ae
    WHERE ae.metadata IS NOT NULL AND ae.metadata->>'referrer' IS NOT NULL
    GROUP BY ae.metadata->>'referrer'
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_page_views_stats()
RETURNS TABLE (
    page_url TEXT,
    count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ae.page_url, 'Unknown') as page_url,
        COUNT(*)::INTEGER as count
    FROM analytics_events ae
    WHERE ae.page_url IS NOT NULL
    GROUP BY ae.page_url
    ORDER BY count DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION get_device_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_device_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_browser_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_browser_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_os_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_os_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_country_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_country_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_referrer_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_referrer_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_page_views_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_page_views_stats() TO anon;

-- 5. Test the functions (will return empty results if no data exists)
SELECT 'Device Stats:' as test_type;
SELECT * FROM get_device_stats();

SELECT 'Browser Stats:' as test_type;
SELECT * FROM get_browser_stats();

SELECT 'OS Stats:' as test_type;
SELECT * FROM get_os_stats();

SELECT 'Country Stats:' as test_type;
SELECT * FROM get_country_stats();

SELECT 'Referrer Stats:' as test_type;
SELECT * FROM get_referrer_stats();

SELECT 'Page Views Stats:' as test_type;
SELECT * FROM get_page_views_stats();

-- 6. Show current analytics_events structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'analytics_events'
ORDER BY ordinal_position;
