-- Final Fix for Policies - Remove ALL references to auth.users
-- This should completely fix the "permission denied for table users" error

-- 1. First, let's see what policies still exist
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'records'
ORDER BY policyname;

-- 2. Drop ALL policies on records table to start fresh
DROP POLICY IF EXISTS "Admin can update all records" ON records;
DROP POLICY IF EXISTS "Admin can view all records" ON records;
DROP POLICY IF EXISTS "Admins can update any record" ON records;
DROP POLICY IF EXISTS "Admins can view all records" ON records;
DROP POLICY IF EXISTS "Authenticated users can view all records" ON records;
DROP POLICY IF EXISTS "Owner can update own records (while pending/rejected)" ON records;
DROP POLICY IF EXISTS "Owner can view own records" ON records;
DROP POLICY IF EXISTS "Public can view verified records" ON records;
DROP POLICY IF EXISTS "Users can insert own records" ON records;
DROP POLICY IF EXISTS "Users can insert their own records" ON records;
DROP POLICY IF EXISTS "Users can update own pending records" ON records;
DROP POLICY IF EXISTS "Users can update their own records" ON records;
DROP POLICY IF EXISTS "Users can view own records" ON records;

-- 3. Create clean, simple policies without any auth.users references
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

-- 4. Grant permissions
GRANT SELECT ON records TO anon;
GRANT SELECT ON records TO authenticated;
GRANT INSERT, UPDATE, DELETE ON records TO authenticated;

-- 5. Verify no policies reference auth.users
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'records'
AND qual LIKE '%auth.users%';

-- 6. Test a simple query
SELECT COUNT(*) as record_count FROM records WHERE status = 'verified';
