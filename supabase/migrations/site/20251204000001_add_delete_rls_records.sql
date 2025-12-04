-- =============================================
-- Migration: Adaugă RLS Policy pentru DELETE pe records
-- =============================================
-- Descriere: Permite utilizatorilor să-și șteargă propriile recorduri
--            și admin-ului să șteargă orice record
-- Dependințe: 20250128000008_FINAL_FIX_RLS.sql (pentru is_admin_user())
-- =============================================

-- Drop existing DELETE policies if they exist
DROP POLICY IF EXISTS "Users can delete own records" ON records;
DROP POLICY IF EXISTS "Admin can delete all records" ON records;

-- Users can delete their own records
CREATE POLICY "Users can delete own records" ON records
  FOR DELETE USING (auth.uid() = user_id);

-- Admin can delete all records (using is_admin_user function from 20250128000008)
CREATE POLICY "Admin can delete all records" ON records
  FOR DELETE USING (public.is_admin_user());

-- Grant DELETE permission to authenticated users (consistent cu alte migrații)
GRANT DELETE ON records TO authenticated;

-- =============================================
-- Migration completă
-- =============================================

