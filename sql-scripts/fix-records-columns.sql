-- Fix Records Table Columns
-- This fixes the missing 'captured_at' column error

-- 1. Check current structure of records table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'records'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Add missing columns if they don't exist
DO $$
BEGIN
    -- Add captured_at column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'records' AND column_name = 'captured_at' AND table_schema = 'public') THEN
        ALTER TABLE records ADD COLUMN captured_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add length_cm column if it doesn't exist (seems to be used in the form)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'records' AND column_name = 'length_cm' AND table_schema = 'public') THEN
        ALTER TABLE records ADD COLUMN length_cm DECIMAL(10,2);
    END IF;

    -- Add notes column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'records' AND column_name = 'notes' AND table_schema = 'public') THEN
        ALTER TABLE records ADD COLUMN notes TEXT;
    END IF;
END $$;

-- 3. Update existing records to have captured_at = created_at if captured_at is null
UPDATE records
SET captured_at = created_at
WHERE captured_at IS NULL;

-- 4. Set default value for captured_at
ALTER TABLE records ALTER COLUMN captured_at SET DEFAULT NOW();

-- 5. Verify the structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'records'
AND table_schema = 'public'
ORDER BY ordinal_position;
