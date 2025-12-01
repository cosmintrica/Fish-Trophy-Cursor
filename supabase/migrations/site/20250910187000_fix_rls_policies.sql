-- Fix RLS policies for records visibility
-- Migration: 20250910187000_fix_rls_policies.sql

-- Drop ALL existing policies that might conflict
DROP POLICY IF EXISTS "Users can view own records" ON records;
DROP POLICY IF EXISTS "Public can view verified records" ON records;
DROP POLICY IF EXISTS "Admin can view all records" ON records;
DROP POLICY IF EXISTS "Users can insert own records" ON records;
DROP POLICY IF EXISTS "Users can update own records" ON records;
DROP POLICY IF EXISTS "Users can update own pending records" ON records;
DROP POLICY IF EXISTS "Admin can update all records" ON records;

-- Create new policies for records
-- 1. Everyone can view verified records (public access)
CREATE POLICY "Public can view verified records" ON records
  FOR SELECT USING (status = 'verified');

-- 2. Users can view their own records (all statuses)
CREATE POLICY "Users can view own records" ON records
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Users can insert their own records
CREATE POLICY "Users can insert own records" ON records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Users can update their own records (only if pending)
CREATE POLICY "Users can update own pending records" ON records
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- 5. Admin can view all records
CREATE POLICY "Admin can view all records" ON records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'cosmin.trica@outlook.com'
    )
  );

-- 6. Admin can update all records
CREATE POLICY "Admin can update all records" ON records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'cosmin.trica@outlook.com'
    )
  );

-- Fix profiles policies
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all users" ON profiles;

-- Create new profiles policies
-- 1. Everyone can view profiles (for public display of record owners)
CREATE POLICY "Public can view profiles" ON profiles
  FOR SELECT USING (true);

-- 2. Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 3. Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 4. Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Admin can view all profiles
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'cosmin.trica@outlook.com'
    )
  );

-- Fix fish_species policies (should be public read)
DROP POLICY IF EXISTS "Public can view fish species" ON fish_species;
CREATE POLICY "Public can view fish species" ON fish_species
  FOR SELECT USING (true);

-- Fix fishing_locations policies (should be public read)
DROP POLICY IF EXISTS "Public can view fishing locations" ON fishing_locations;
CREATE POLICY "Public can view fishing locations" ON fishing_locations
  FOR SELECT USING (true);

-- Fix counties policies (should be public read)
DROP POLICY IF EXISTS "Public can view counties" ON counties;
CREATE POLICY "Public can view counties" ON counties
  FOR SELECT USING (true);

-- Fix cities policies (should be public read)
DROP POLICY IF EXISTS "Public can view cities" ON cities;
CREATE POLICY "Public can view cities" ON cities
  FOR SELECT USING (true);

-- Fix fish_bait policies (should be public read)
DROP POLICY IF EXISTS "Public can view fish bait" ON fish_bait;
CREATE POLICY "Public can view fish bait" ON fish_bait
  FOR SELECT USING (true);

-- Fix fish_method policies (should be public read)
DROP POLICY IF EXISTS "Public can view fish method" ON fish_method;
CREATE POLICY "Public can view fish method" ON fish_method
  FOR SELECT USING (true);

-- Fix fishing_techniques policies (should be public read)
DROP POLICY IF EXISTS "Public can view fishing techniques" ON fishing_techniques;
CREATE POLICY "Public can view fishing techniques" ON fishing_techniques
  FOR SELECT USING (true);

-- Fix fishing_shops policies (should be public read)
DROP POLICY IF EXISTS "Public can view fishing shops" ON fishing_shops;
CREATE POLICY "Public can view fishing shops" ON fishing_shops
  FOR SELECT USING (true);

-- Fix shop_reviews policies
DROP POLICY IF EXISTS "Public can view shop reviews" ON shop_reviews;
CREATE POLICY "Public can view shop reviews" ON shop_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own shop reviews" ON shop_reviews;
CREATE POLICY "Users can insert own shop reviews" ON shop_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own shop reviews" ON shop_reviews;
CREATE POLICY "Users can update own shop reviews" ON shop_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Fix user_gear policies
DROP POLICY IF EXISTS "Users can view own gear" ON user_gear;
CREATE POLICY "Users can view own gear" ON user_gear
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own gear" ON user_gear;
CREATE POLICY "Users can insert own gear" ON user_gear
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own gear" ON user_gear;
CREATE POLICY "Users can update own gear" ON user_gear
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own gear" ON user_gear;
CREATE POLICY "Users can delete own gear" ON user_gear
  FOR DELETE USING (auth.uid() = user_id);

-- Analytics policies (if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        -- Users can insert their own analytics events
        DROP POLICY IF EXISTS "Users can insert own analytics" ON analytics_events;
        CREATE POLICY "Users can insert own analytics" ON analytics_events
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        -- Admin can view all analytics
        DROP POLICY IF EXISTS "Admin can view all analytics" ON analytics_events;
        CREATE POLICY "Admin can view all analytics" ON analytics_events
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM auth.users
              WHERE auth.users.id = auth.uid()
              AND auth.users.email = 'cosmin.trica@outlook.com'
            )
          );
    END IF;
END $$;

-- Enable RLS on all tables
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

-- Enable RLS on analytics tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_sessions') THEN
        ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_daily_stats') THEN
        ALTER TABLE analytics_daily_stats ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;
