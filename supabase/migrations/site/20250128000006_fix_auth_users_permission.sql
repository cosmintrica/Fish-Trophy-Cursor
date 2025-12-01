-- Fix permission denied for table users
-- Migration: 20250128000006_fix_auth_users_permission.sql
-- Problem: auth.users is not accessible in RLS policies for normal users
-- Solution: Use auth.jwt() to get email directly from JWT token, no table access needed

-- Drop the problematic admin policies
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can view all records" ON records;
DROP POLICY IF EXISTS "Admin can update all records" ON records;

-- Create a SECURITY DEFINER function to check if user is admin
-- This function runs with elevated privileges and can access auth.users
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'cosmin.trica@outlook.com'
  );
$$;

-- Recreate admin policies using the function (no direct auth.users access)
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admin can view all records" ON records
  FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admin can update all records" ON records
  FOR UPDATE USING (public.is_admin_user());

-- Also ensure public can view profiles (for public profiles)
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
CREATE POLICY "Public can view profiles" ON profiles
  FOR SELECT USING (true);

-- Ensure public can view verified records
DROP POLICY IF EXISTS "Public can view verified records" ON records;
CREATE POLICY "Public can view verified records" ON records
  FOR SELECT USING (status = 'verified');

-- Ensure users can view their own records
DROP POLICY IF EXISTS "Users can view own records" ON records;
CREATE POLICY "Users can view own records" ON records
  FOR SELECT USING (auth.uid() = user_id);

-- Ensure users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

