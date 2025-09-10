-- Complete Database Backup - Fish Trophy
-- Generated: 2025-09-10
-- Purpose: Understand database structure and fix RLS issues

-- ==============================================
-- TABLE STRUCTURES
-- ==============================================

-- 1. PROFILES TABLE (Main users table)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    county_id TEXT,
    city_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RECORDS TABLE (Fishing records)
CREATE TABLE IF NOT EXISTS records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    species_id UUID REFERENCES fish_species(id),
    location_id UUID REFERENCES fishing_locations(id),
    weight DECIMAL(10,2),
    length DECIMAL(10,2),
    date_caught DATE,
    photo_url TEXT,
    video_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ANALYTICS TABLES
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id),
    session_id TEXT,
    page_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES profiles(id),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    page_views INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS analytics_daily_stats (
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

-- ==============================================
-- RLS POLICIES (Current Working Version)
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_stats ENABLE ROW LEVEL SECURITY;

-- Records Policies
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

-- Profiles Policies
CREATE POLICY "Public can view profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Analytics Policies
CREATE POLICY "Allow anonymous analytics tracking" ON analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated analytics read" ON analytics_events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow anonymous session tracking" ON analytics_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated session read" ON analytics_sessions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow public stats read" ON analytics_daily_stats
    FOR SELECT USING (true);

-- ==============================================
-- PERMISSIONS
-- ==============================================

-- Grant necessary permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON records TO authenticated;
GRANT INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT ON analytics_events TO anon;
GRANT SELECT, INSERT ON analytics_events TO authenticated;
GRANT SELECT, INSERT ON analytics_sessions TO anon;
GRANT SELECT, INSERT ON analytics_sessions TO authenticated;
GRANT SELECT ON analytics_daily_stats TO anon;
GRANT SELECT ON analytics_daily_stats TO authenticated;

-- ==============================================
-- SAMPLE DATA QUERIES
-- ==============================================

-- Check if profiles table has data
SELECT COUNT(*) as profile_count FROM profiles;

-- Check if records table has data
SELECT COUNT(*) as record_count FROM records;

-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'records', 'analytics_events');

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'records', 'analytics_events');
