-- Apply Safe RLS Migration - Fixed Version
-- Copy and paste this into Supabase SQL Editor

-- First, enable RLS on all tables (in case it was disabled)
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fish_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE fishing_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fish_bait ENABLE ROW LEVEL SECURITY;
ALTER TABLE fish_method ENABLE ROW LEVEL SECURITY;
ALTER TABLE fishing_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE fishing_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gear ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly (ignore errors if they don't exist)
DO $$
BEGIN
    -- Records policies
    DROP POLICY IF EXISTS "Users can view all records" ON records;
    DROP POLICY IF EXISTS "Users can insert their own records" ON records;
    DROP POLICY IF EXISTS "Users can update their own records" ON records;
    DROP POLICY IF EXISTS "Public can view verified records" ON records;
    DROP POLICY IF EXISTS "Authenticated users can view all records" ON records;
    DROP POLICY IF EXISTS "Admins can update any record" ON records;

    -- Profiles policies
    DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
    DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

    -- Read-only tables policies
    DROP POLICY IF EXISTS "Users can view all species" ON fish_species;
    DROP POLICY IF EXISTS "Public can view species" ON fish_species;
    DROP POLICY IF EXISTS "Users can view all locations" ON fishing_locations;
    DROP POLICY IF EXISTS "Public can view locations" ON fishing_locations;
    DROP POLICY IF EXISTS "Users can view all counties" ON counties;
    DROP POLICY IF EXISTS "Public can view counties" ON counties;
    DROP POLICY IF EXISTS "Users can view all cities" ON cities;
    DROP POLICY IF EXISTS "Public can view cities" ON cities;
    DROP POLICY IF EXISTS "Users can view all bait" ON fish_bait;
    DROP POLICY IF EXISTS "Public can view bait" ON fish_bait;
    DROP POLICY IF EXISTS "Users can view all methods" ON fish_method;
    DROP POLICY IF EXISTS "Public can view methods" ON fish_method;
    DROP POLICY IF EXISTS "Users can view all techniques" ON fishing_techniques;
    DROP POLICY IF EXISTS "Public can view techniques" ON fishing_techniques;
    DROP POLICY IF EXISTS "Users can view all shops" ON fishing_shops;
    DROP POLICY IF EXISTS "Public can view shops" ON fishing_shops;
    DROP POLICY IF EXISTS "Users can view all shop reviews" ON shop_reviews;
    DROP POLICY IF EXISTS "Public can view shop reviews" ON shop_reviews;
    DROP POLICY IF EXISTS "Users can insert shop reviews" ON shop_reviews;
    DROP POLICY IF EXISTS "Users can update their own shop reviews" ON shop_reviews;

    -- User gear policies
    DROP POLICY IF EXISTS "Users can manage their own gear" ON user_gear;
    DROP POLICY IF EXISTS "Users can view their own gear" ON user_gear;
    DROP POLICY IF EXISTS "Users can insert their own gear" ON user_gear;
    DROP POLICY IF EXISTS "Users can update their own gear" ON user_gear;
    DROP POLICY IF EXISTS "Users can delete their own gear" ON user_gear;

    -- Analytics policies
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        DROP POLICY IF EXISTS "Allow anonymous analytics tracking" ON analytics_events;
        DROP POLICY IF EXISTS "Allow authenticated analytics read" ON analytics_events;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_sessions') THEN
        DROP POLICY IF EXISTS "Allow anonymous session tracking" ON analytics_sessions;
        DROP POLICY IF EXISTS "Allow authenticated session read" ON analytics_sessions;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_daily_stats') THEN
        DROP POLICY IF EXISTS "Allow public stats read" ON analytics_daily_stats;
    END IF;
END $$;

-- RECORDS POLICIES - Allow public read, authenticated write
CREATE POLICY "Public can view verified records" ON records
    FOR SELECT USING (status = 'verified');

CREATE POLICY "Authenticated users can view all records" ON records
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own records" ON records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own records" ON records
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any record" ON records
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.email = 'cosmin.trica@outlook.com'
        )
    );

-- PROFILES POLICIES - Allow public read, authenticated write
CREATE POLICY "Public can view profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- READ-ONLY TABLES - Allow public read access
CREATE POLICY "Public can view species" ON fish_species
    FOR SELECT USING (true);

CREATE POLICY "Public can view locations" ON fishing_locations
    FOR SELECT USING (true);

CREATE POLICY "Public can view counties" ON counties
    FOR SELECT USING (true);

CREATE POLICY "Public can view cities" ON cities
    FOR SELECT USING (true);

CREATE POLICY "Public can view bait" ON fish_bait
    FOR SELECT USING (true);

CREATE POLICY "Public can view methods" ON fish_method
    FOR SELECT USING (true);

CREATE POLICY "Public can view techniques" ON fishing_techniques
    FOR SELECT USING (true);

CREATE POLICY "Public can view shops" ON fishing_shops
    FOR SELECT USING (true);

CREATE POLICY "Public can view shop reviews" ON shop_reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can insert shop reviews" ON shop_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shop reviews" ON shop_reviews
    FOR UPDATE USING (auth.uid() = user_id);

-- USER GEAR POLICIES
CREATE POLICY "Users can view their own gear" ON user_gear
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gear" ON user_gear
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gear" ON user_gear
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gear" ON user_gear
    FOR DELETE USING (auth.uid() = user_id);

-- ANALYTICS TABLES - Allow anonymous access for tracking
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow anonymous analytics tracking" ON analytics_events
            FOR INSERT WITH CHECK (true);
        CREATE POLICY "Allow authenticated analytics read" ON analytics_events
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_sessions') THEN
        ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow anonymous session tracking" ON analytics_sessions
            FOR INSERT WITH CHECK (true);
        CREATE POLICY "Allow authenticated session read" ON analytics_sessions
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_daily_stats') THEN
        ALTER TABLE analytics_daily_stats ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow public stats read" ON analytics_daily_stats
            FOR SELECT USING (true);
    END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON records TO authenticated;
GRANT INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON user_gear TO authenticated;
GRANT INSERT, UPDATE, DELETE ON shop_reviews TO authenticated;

-- Grant analytics permissions
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        GRANT SELECT, INSERT ON analytics_events TO anon;
        GRANT SELECT, INSERT ON analytics_events TO authenticated;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_sessions') THEN
        GRANT SELECT, INSERT ON analytics_sessions TO anon;
        GRANT SELECT, INSERT ON analytics_sessions TO authenticated;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_daily_stats') THEN
        GRANT SELECT ON analytics_daily_stats TO anon;
        GRANT SELECT ON analytics_daily_stats TO authenticated;
    END IF;
END $$;
