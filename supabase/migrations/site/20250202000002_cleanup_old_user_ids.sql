-- Migration: Cleanup Old User-Specific ID Columns (if they exist)
-- Created: 2025-12-02
-- Description: Removes any leftover columns, triggers, or functions from the old user-specific ID system
-- This is safe to run even if the old columns don't exist (uses IF EXISTS)

-- =============================================
-- 1. DROP OLD TRIGGERS (if they exist)
-- =============================================

DROP TRIGGER IF EXISTS trigger_generate_user_record_id ON public.records;
DROP TRIGGER IF EXISTS trigger_generate_user_catch_id ON public.catches;
DROP TRIGGER IF EXISTS trigger_generate_user_gear_id ON public.user_gear;

-- =============================================
-- 2. DROP OLD FUNCTIONS (if they exist)
-- =============================================

DROP FUNCTION IF EXISTS generate_user_record_id();
DROP FUNCTION IF EXISTS generate_user_catch_id();
DROP FUNCTION IF EXISTS generate_user_gear_id();

-- =============================================
-- 3. DROP OLD COLUMNS (if they exist)
-- =============================================

-- Note: We check if column exists before dropping to avoid errors
DO $$
BEGIN
  -- Drop user_record_id if exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'records' 
    AND column_name = 'user_record_id'
  ) THEN
    ALTER TABLE public.records DROP COLUMN user_record_id;
    RAISE NOTICE 'Dropped column user_record_id from records';
  END IF;

  -- Drop user_catch_id if exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'catches' 
    AND column_name = 'user_catch_id'
  ) THEN
    ALTER TABLE public.catches DROP COLUMN user_catch_id;
    RAISE NOTICE 'Dropped column user_catch_id from catches';
  END IF;

  -- Drop user_gear_id if exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_gear' 
    AND column_name = 'user_gear_id'
  ) THEN
    ALTER TABLE public.user_gear DROP COLUMN user_gear_id;
    RAISE NOTICE 'Dropped column user_gear_id from user_gear';
  END IF;
END $$;

-- =============================================
-- 4. DROP OLD INDEXES (if they exist)
-- =============================================

DROP INDEX IF EXISTS idx_records_user_record_id;
DROP INDEX IF EXISTS idx_catches_user_catch_id;
DROP INDEX IF EXISTS idx_user_gear_user_gear_id;

-- =============================================
-- 5. VERIFY CLEANUP
-- =============================================

-- This will show a notice if any old columns still exist
DO $$
DECLARE
  old_columns_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_columns_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND (
    (table_name = 'records' AND column_name = 'user_record_id') OR
    (table_name = 'catches' AND column_name = 'user_catch_id') OR
    (table_name = 'user_gear' AND column_name = 'user_gear_id')
  );
  
  IF old_columns_count > 0 THEN
    RAISE WARNING 'Found % old user_*_id columns that could not be dropped', old_columns_count;
  ELSE
    RAISE NOTICE 'Cleanup completed successfully - no old user_*_id columns found';
  END IF;
END $$;

