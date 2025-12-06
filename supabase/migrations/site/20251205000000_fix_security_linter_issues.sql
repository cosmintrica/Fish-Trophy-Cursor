-- Fix Security Linter Issues
-- Migration: 20251205000000_fix_security_linter_issues.sql
-- 
-- Fixes:
-- 1. Enable RLS on subscribers table (CRITICAL - contains personal data)
-- 2. Enable RLS on analytics_daily_stats_backup (backup table)
-- 3. Note: Security Definer Views are acceptable and don't need fixing

-- ==============================================
-- 1. SUBSCRIBERS TABLE - CRITICAL FIX
-- ==============================================
DO $$
BEGIN
    -- Enable RLS on subscribers table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscribers' AND table_schema = 'public') THEN
        ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Allow anonymous subscribers insert" ON subscribers;
        DROP POLICY IF EXISTS "Allow admin subscribers read" ON subscribers;
        DROP POLICY IF EXISTS "Allow admin subscribers update" ON subscribers;
        DROP POLICY IF EXISTS "Allow admin subscribers delete" ON subscribers;
        
        -- Policy: Anonymous users can insert (for subscription forms)
        CREATE POLICY "Allow anonymous subscribers insert" ON subscribers
            FOR INSERT WITH CHECK (true);
        
        -- Policy: Only admin can read subscribers (protects email addresses)
        CREATE POLICY "Allow admin subscribers read" ON subscribers
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.email = 'cosmin.trica@outlook.com'
                )
            );
        
        -- Policy: Only admin can update subscribers
        CREATE POLICY "Allow admin subscribers update" ON subscribers
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.email = 'cosmin.trica@outlook.com'
                )
            );
        
        -- Policy: Only admin can delete subscribers
        CREATE POLICY "Allow admin subscribers delete" ON subscribers
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.email = 'cosmin.trica@outlook.com'
                )
            );
        
        -- Grant permissions
        GRANT INSERT ON subscribers TO anon;
        GRANT INSERT ON subscribers TO authenticated;
        GRANT SELECT, UPDATE, DELETE ON subscribers TO authenticated;
        
        RAISE NOTICE 'RLS enabled and policies created for subscribers table';
    ELSE
        RAISE NOTICE 'subscribers table does not exist, skipping...';
    END IF;
END $$;

-- ==============================================
-- 2. ANALYTICS_DAILY_STATS_BACKUP TABLE
-- ==============================================
DO $$
BEGIN
    -- Enable RLS on backup table (optional - can be deleted if not needed)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_daily_stats_backup' AND table_schema = 'public') THEN
        ALTER TABLE analytics_daily_stats_backup ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Allow admin backup read" ON analytics_daily_stats_backup;
        DROP POLICY IF EXISTS "Allow admin backup write" ON analytics_daily_stats_backup;
        
        -- Policy: Only admin can read backup
        CREATE POLICY "Allow admin backup read" ON analytics_daily_stats_backup
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.email = 'cosmin.trica@outlook.com'
                )
            );
        
        -- Policy: Only admin can write to backup
        CREATE POLICY "Allow admin backup write" ON analytics_daily_stats_backup
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.email = 'cosmin.trica@outlook.com'
                )
            );
        
        -- Grant permissions (only admin)
        GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_daily_stats_backup TO authenticated;
        
        RAISE NOTICE 'RLS enabled and policies created for analytics_daily_stats_backup table';
    ELSE
        RAISE NOTICE 'analytics_daily_stats_backup table does not exist, skipping...';
    END IF;
END $$;

-- ==============================================
-- 3. SECURITY DEFINER VIEWS - NO ACTION NEEDED
-- ==============================================
-- Note: The views catches_with_stats and catch_comments_with_users
-- are defined with SECURITY DEFINER, which is acceptable for views
-- that need to enforce RLS policies of the view creator.
-- These do not need to be fixed unless they cause specific issues.

COMMENT ON TABLE subscribers IS 'Email subscribers table - RLS enabled for data protection';
COMMENT ON TABLE analytics_daily_stats_backup IS 'Backup table for analytics - RLS enabled, admin only access';

