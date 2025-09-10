-- Add auth.uid() as default value for user_id columns
-- Migration: 20250910185000_add_auth_uid_defaults.sql

-- Update profiles table to use auth.uid() as default
ALTER TABLE profiles
ALTER COLUMN id SET DEFAULT auth.uid();

-- Update records table to use auth.uid() as default
ALTER TABLE records
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Update user_gear table to use auth.uid() as default
ALTER TABLE user_gear
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Update analytics_events table to use auth.uid() as default (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        ALTER TABLE analytics_events ALTER COLUMN user_id SET DEFAULT auth.uid();
    END IF;
END $$;

-- Update analytics_sessions table to use auth.uid() as default (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_sessions') THEN
        ALTER TABLE analytics_sessions ALTER COLUMN user_id SET DEFAULT auth.uid();
    END IF;
END $$;

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update RLS policies to use auth.uid() more effectively
-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Records policies
DROP POLICY IF EXISTS "Users can view own records" ON records;
CREATE POLICY "Users can view own records" ON records
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own records" ON records;
CREATE POLICY "Users can insert own records" ON records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own records" ON records;
CREATE POLICY "Users can update own records" ON records
  FOR UPDATE USING (auth.uid() = user_id);

-- User gear policies
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

-- Analytics policies (users can only see their own data) - if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        DROP POLICY IF EXISTS "Users can view own analytics" ON analytics_events;
        CREATE POLICY "Users can view own analytics" ON analytics_events
          FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert own analytics" ON analytics_events;
        CREATE POLICY "Users can insert own analytics" ON analytics_events
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Public read access for verified records
DROP POLICY IF EXISTS "Public can view verified records" ON records;
CREATE POLICY "Public can view verified records" ON records
  FOR SELECT USING (status = 'verified');

-- Public read access for profiles (for public profiles)
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
CREATE POLICY "Public can view profiles" ON profiles
  FOR SELECT USING (true);

-- Admin policies (for cosmin.trica@outlook.com)
CREATE POLICY "Admin can view all records" ON records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'cosmin.trica@outlook.com'
    )
  );

CREATE POLICY "Admin can update all records" ON records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'cosmin.trica@outlook.com'
    )
  );

CREATE POLICY "Admin can view all users" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'cosmin.trica@outlook.com'
    )
  );
