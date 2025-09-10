-- Fix Users Reference Issue
-- This migration fixes the "permission denied for table users" error

-- 1. First, let's check what's causing the issue
-- Check if there are any foreign key constraints pointing to 'users'
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND (ccu.table_name = 'users' OR tc.table_name = 'users')
ORDER BY tc.table_name, kcu.column_name;

-- 2. Check if there are any triggers that reference 'users'
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND (action_statement LIKE '%users%' OR event_object_table = 'users');

-- 3. Check if there are any views that reference 'users'
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND view_definition LIKE '%users%';

-- 4. Check if there are any functions that reference 'users'
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_definition LIKE '%users%';

-- 5. If we find any references to 'users', we need to fix them
-- For now, let's try to disable RLS temporarily on records to test
ALTER TABLE records DISABLE ROW LEVEL SECURITY;

-- 6. Test if records can be accessed now
-- (This will be tested via the API call)

-- 7. If that works, we know the issue is with RLS policies
-- Let's recreate the policies properly
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on records
DROP POLICY IF EXISTS "Public can view verified records" ON records;
DROP POLICY IF EXISTS "Authenticated users can view all records" ON records;
DROP POLICY IF EXISTS "Users can insert their own records" ON records;
DROP POLICY IF EXISTS "Users can update their own records" ON records;
DROP POLICY IF EXISTS "Admins can update any record" ON records;

-- Recreate policies without any reference to 'users'
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

-- 8. Grant permissions
GRANT SELECT ON records TO anon;
GRANT SELECT ON records TO authenticated;
GRANT INSERT, UPDATE, DELETE ON records TO authenticated;
