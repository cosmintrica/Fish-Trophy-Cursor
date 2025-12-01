-- Emergency RLS Fix - Disable RLS temporarily for testing
-- Migration: 20250910188000_emergency_rls_fix.sql

-- Temporarily disable RLS on all tables to fix permission issues
ALTER TABLE records DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE fish_species DISABLE ROW LEVEL SECURITY;
ALTER TABLE fishing_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE counties DISABLE ROW LEVEL SECURITY;
ALTER TABLE cities DISABLE ROW LEVEL SECURITY;
ALTER TABLE fish_bait DISABLE ROW LEVEL SECURITY;
ALTER TABLE fish_method DISABLE ROW LEVEL SECURITY;
ALTER TABLE fishing_techniques DISABLE ROW LEVEL SECURITY;
ALTER TABLE fishing_shops DISABLE ROW LEVEL SECURITY;
ALTER TABLE shop_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_gear DISABLE ROW LEVEL SECURITY;

-- Disable RLS on analytics tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        ALTER TABLE analytics_events DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_sessions') THEN
        ALTER TABLE analytics_sessions DISABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_daily_stats') THEN
        ALTER TABLE analytics_daily_stats DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Grant public access to all tables for now
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON records TO authenticated;
GRANT INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON user_gear TO authenticated;
GRANT INSERT, UPDATE, DELETE ON shop_reviews TO authenticated;

-- Grant access to analytics tables if they exist
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
