-- Fix RLS policies that reference auth.users (which causes permission denied errors)
-- Migration: 20250128000004_fix_rls_auth_users_reference.sql

-- Drop policies that use auth.users
DROP POLICY IF EXISTS "Admin can view all records" ON records;
DROP POLICY IF EXISTS "Admin can update all records" ON records;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;

-- Recreate admin policies using profiles table instead of auth.users
CREATE POLICY "Admin can view all records" ON records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'cosmin.trica@outlook.com'
    )
  );

CREATE POLICY "Admin can update all records" ON records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'cosmin.trica@outlook.com'
    )
  );

CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.email = 'cosmin.trica@outlook.com'
    )
  );

