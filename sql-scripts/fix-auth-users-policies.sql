-- Fix Auth.Users Policies Issue
-- This fixes the "permission denied for table users" error

-- 1. Drop problematic policies that reference auth.users
DROP POLICY IF EXISTS "Admin can update all records" ON records;
DROP POLICY IF EXISTS "Admin can view all records" ON records;

-- 2. Keep only the correct policies that use profiles
-- (The other policies are already correct)

-- 3. Fix analytics_daily_stats table structure
-- Check if the table exists and has the right columns
DO $$
BEGIN
    -- Check if analytics_daily_stats table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_daily_stats' AND table_schema = 'public') THEN

        -- Check if total_page_views column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'analytics_daily_stats' AND column_name = 'total_page_views' AND table_schema = 'public') THEN
            -- Add missing column
            ALTER TABLE analytics_daily_stats ADD COLUMN total_page_views INTEGER DEFAULT 0;
        END IF;

        -- Check if other columns exist and add if missing
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'analytics_daily_stats' AND column_name = 'new_users' AND table_schema = 'public') THEN
            ALTER TABLE analytics_daily_stats ADD COLUMN new_users INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'analytics_daily_stats' AND column_name = 'new_records' AND table_schema = 'public') THEN
            ALTER TABLE analytics_daily_stats ADD COLUMN new_records INTEGER DEFAULT 0;
        END IF;

    ELSE
        -- Create the table if it doesn't exist
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
    END IF;
END $$;

-- 4. Create or replace the update_daily_analytics_stats function
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

-- 5. Grant permissions on the function
GRANT EXECUTE ON FUNCTION update_daily_analytics_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_analytics_stats() TO anon;

-- 6. Test the function
SELECT update_daily_analytics_stats();

-- 7. Verify the policies are clean
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'records'
AND qual LIKE '%auth.users%';
