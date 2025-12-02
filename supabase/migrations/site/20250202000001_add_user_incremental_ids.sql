-- Migration: Add Global Incremental IDs for Records, Catches, and Gear
-- Created: 2025-12-02
-- Description: Adds global_id columns with auto-increment globally (1, 2, 3...)
-- These IDs are used for:
-- - Forum embeds: [catch]232[/catch], [record]45[/record], [gear]12[/gear]
-- - R2 file naming: username/journal/images/catch-232_timestamp_file.jpg
-- 
-- IMPORTANT: These IDs are GLOBALLY UNIQUE and increment sequentially across all users.
-- Each new catch/record/gear gets the next available number in the system.

-- =============================================
-- 1. ADD COLUMNS FOR GLOBAL INCREMENTAL IDs
-- =============================================

-- Add global_id to records table (globally unique, sequential)
ALTER TABLE public.records 
ADD COLUMN IF NOT EXISTS global_id INTEGER UNIQUE;

-- Add global_id to catches table (globally unique, sequential)
ALTER TABLE public.catches 
ADD COLUMN IF NOT EXISTS global_id INTEGER UNIQUE;

-- Add global_id to user_gear table (globally unique, sequential)
ALTER TABLE public.user_gear 
ADD COLUMN IF NOT EXISTS global_id INTEGER UNIQUE;

-- =============================================
-- 2. CREATE FUNCTION TO GENERATE GLOBAL RECORD ID
-- =============================================

CREATE OR REPLACE FUNCTION generate_global_record_id()
RETURNS TRIGGER AS $$
DECLARE
  next_id INTEGER;
BEGIN
  -- Get the next global ID (across all users)
  SELECT COALESCE(MAX(global_id), 0) + 1
  INTO next_id
  FROM public.records;
  
  -- Set the global_id
  NEW.global_id := next_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. CREATE FUNCTION TO GENERATE GLOBAL CATCH ID
-- =============================================

CREATE OR REPLACE FUNCTION generate_global_catch_id()
RETURNS TRIGGER AS $$
DECLARE
  next_id INTEGER;
BEGIN
  -- Get the next global ID (across all users)
  SELECT COALESCE(MAX(global_id), 0) + 1
  INTO next_id
  FROM public.catches;
  
  -- Set the global_id
  NEW.global_id := next_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3b. CREATE FUNCTION TO GENERATE GLOBAL GEAR ID
-- =============================================

CREATE OR REPLACE FUNCTION generate_global_gear_id()
RETURNS TRIGGER AS $$
DECLARE
  next_id INTEGER;
BEGIN
  -- Get the next global ID (across all users)
  SELECT COALESCE(MAX(global_id), 0) + 1
  INTO next_id
  FROM public.user_gear;
  
  -- Set the global_id
  NEW.global_id := next_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. CREATE TRIGGERS
-- =============================================

-- Trigger for records
DROP TRIGGER IF EXISTS trigger_generate_global_record_id ON public.records;
CREATE TRIGGER trigger_generate_global_record_id
  BEFORE INSERT ON public.records
  FOR EACH ROW
  WHEN (NEW.global_id IS NULL)
  EXECUTE FUNCTION generate_global_record_id();

-- Trigger for catches
DROP TRIGGER IF EXISTS trigger_generate_global_catch_id ON public.catches;
CREATE TRIGGER trigger_generate_global_catch_id
  BEFORE INSERT ON public.catches
  FOR EACH ROW
  WHEN (NEW.global_id IS NULL)
  EXECUTE FUNCTION generate_global_catch_id();

-- Trigger for gear
DROP TRIGGER IF EXISTS trigger_generate_global_gear_id ON public.user_gear;
CREATE TRIGGER trigger_generate_global_gear_id
  BEFORE INSERT ON public.user_gear
  FOR EACH ROW
  WHEN (NEW.global_id IS NULL)
  EXECUTE FUNCTION generate_global_gear_id();

-- =============================================
-- 5. POPULATE EXISTING RECORDS
-- =============================================

-- Populate global_id for existing records (globally sequential)
DO $$
BEGIN
  WITH numbered_records AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
    FROM public.records
    WHERE global_id IS NULL
  )
  UPDATE public.records r
  SET global_id = nr.rn
  FROM numbered_records nr
  WHERE r.id = nr.id;
END $$;

-- =============================================
-- 6. POPULATE EXISTING CATCHES
-- =============================================

-- Populate global_id for existing catches (globally sequential)
DO $$
BEGIN
  WITH numbered_catches AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
    FROM public.catches
    WHERE global_id IS NULL
  )
  UPDATE public.catches c
  SET global_id = nc.rn
  FROM numbered_catches nc
  WHERE c.id = nc.id;
END $$;

-- =============================================
-- 6b. POPULATE EXISTING GEAR
-- =============================================

-- Populate global_id for existing gear (globally sequential)
DO $$
BEGIN
  WITH numbered_gear AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
    FROM public.user_gear
    WHERE global_id IS NULL
  )
  UPDATE public.user_gear g
  SET global_id = ng.rn
  FROM numbered_gear ng
  WHERE g.id = ng.id;
END $$;

-- =============================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Indexes for global_id lookups (used in embeds)
CREATE UNIQUE INDEX IF NOT EXISTS idx_records_global_id ON public.records(global_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_catches_global_id ON public.catches(global_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_gear_global_id ON public.user_gear(global_id);

-- =============================================
-- 8. ADD COMMENTS
-- =============================================

COMMENT ON COLUMN public.records.global_id IS 'Global incremental ID (1, 2, 3...) unique across all users. Used for forum embeds [record]232[/record] and R2 file naming.';
COMMENT ON COLUMN public.catches.global_id IS 'Global incremental ID (1, 2, 3...) unique across all users. Used for forum embeds [catch]232[/catch] and R2 file naming.';
COMMENT ON COLUMN public.user_gear.global_id IS 'Global incremental ID (1, 2, 3...) unique across all users. Used for forum embeds [gear]12[/gear] and R2 file naming.';

