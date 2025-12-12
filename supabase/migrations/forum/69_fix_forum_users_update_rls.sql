-- Migration 69: Fix forum_users UPDATE RLS policy
-- Problem: Users cannot update their own last_seen_at because RLS is blocking
-- Solution: Recreate UPDATE policy with simpler check

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Utilizatorii își pot edita profilul" ON forum_users;

-- Create simpler UPDATE policy that just checks user_id matches
CREATE POLICY "forum_users_update_own" ON forum_users
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Also ensure admin can update anyone
CREATE POLICY "forum_users_update_admin" ON forum_users
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

COMMENT ON POLICY "forum_users_update_own" ON forum_users IS 'Users can update their own forum_users row (for last_seen_at, etc.)';
COMMENT ON POLICY "forum_users_update_admin" ON forum_users IS 'Admins can update any forum_users row';
