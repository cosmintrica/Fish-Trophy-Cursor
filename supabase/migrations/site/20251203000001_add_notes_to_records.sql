-- Migration: Add notes column to records table
-- Created: 2025-12-03
-- Description: Adds notes column to records table for additional information about the catch

-- Add notes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'records' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.records 
        ADD COLUMN notes TEXT;
        
        COMMENT ON COLUMN public.records.notes IS 'Note suplimentare despre captură, tehnica folosită, vremea, etc.';
    END IF;
END $$;

