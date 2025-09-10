-- Fix Analytics Table Structure
-- This fixes the missing columns in analytics_daily_stats

-- 1. First, let's see what columns exist in analytics_daily_stats
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'analytics_daily_stats'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Drop the function temporarily to avoid errors
DROP FUNCTION IF EXISTS update_daily_analytics_stats();

-- 3. Check if the table exists and what it contains
SELECT COUNT(*) as record_count FROM analytics_daily_stats;

-- 4. If the table has wrong structure, let's recreate it properly
-- First, backup any existing data
CREATE TABLE IF NOT EXISTS analytics_daily_stats_backup AS
SELECT * FROM analytics_daily_stats;

-- 5. Drop and recreate the table with correct structure
DROP TABLE IF EXISTS analytics_daily_stats CASCADE;

CREATE TABLE analytics_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,
    total_users INTEGER DEFAULT 0,
    total_records INTEGER DEFAULT 0,
    total_page_views INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    new_records INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable RLS on the new table
ALTER TABLE analytics_daily_stats ENABLE ROW LEVEL SECURITY;

-- 7. Create policies for the new table
CREATE POLICY "Allow public stats read" ON analytics_daily_stats
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated stats insert" ON analytics_daily_stats
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated stats update" ON analytics_daily_stats
    FOR UPDATE WITH CHECK (auth.role() = 'authenticated');

-- 8. Grant permissions
GRANT SELECT ON analytics_daily_stats TO anon;
GRANT SELECT ON analytics_daily_stats TO authenticated;
GRANT INSERT, UPDATE ON analytics_daily_stats TO authenticated;

-- 9. Recreate the function with correct column names
CREATE OR REPLACE FUNCTION update_daily_analytics_stats()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Grant permissions on the function
GRANT EXECUTE ON FUNCTION update_daily_analytics_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_analytics_stats() TO anon;

-- 11. Test the function
SELECT update_daily_analytics_stats();

-- 12. Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'analytics_daily_stats'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 13. Check if data was inserted
SELECT * FROM analytics_daily_stats ORDER BY date DESC LIMIT 5;
