-- Fix infinite recursion in profiles RLS policies
-- Migration: 20250128000005_fix_infinite_recursion_profiles.sql
-- Problem: Admin policy for profiles was querying profiles table, causing infinite recursion
-- Solution: Use auth.users directly (no RLS) to check admin status

-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;

-- Recreate admin policy using auth.users (which doesn't have RLS)
-- This avoids infinite recursion because auth.users is accessible in policies
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'cosmin.trica@outlook.com'
    )
  );

-- Also fix admin policies for records to use auth.users
DROP POLICY IF EXISTS "Admin can view all records" ON records;
DROP POLICY IF EXISTS "Admin can update all records" ON records;

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

