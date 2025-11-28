-- FIX FINAL RLS - Simplu și clar
-- Migration: 20250128000008_FINAL_FIX_RLS.sql
-- Soluție: Verificăm profiles.role = 'admin' direct, fără recursiune

-- 1. Șterge TOATE policy-urile vechi care cauzează probleme
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can view all records" ON records;
DROP POLICY IF EXISTS "Admin can update all records" ON records;
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Public can view verified records" ON records;
DROP POLICY IF EXISTS "Users can view own records" ON records;
DROP POLICY IF EXISTS "Users can update own records" ON records;
DROP POLICY IF EXISTS "Users can insert own records" ON records;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 2. Funcție simplă care verifică dacă utilizatorul curent este admin
-- Verifică direct în profiles.role, fără recursiune
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  );
$$;

-- 3. PROFILES - Policy-uri simple
-- Oricine poate vedea profilele (pentru profil public)
CREATE POLICY "Public can view profiles" ON profiles
  FOR SELECT USING (true);

-- Utilizatorii pot actualiza propriul profil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Utilizatorii pot crea propriul profil
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin poate vedea toate profilele (folosește funcția care verifică role)
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin_user());

-- 4. RECORDS - Policy-uri simple
-- Oricine poate vedea recordurile verificate (publice)
CREATE POLICY "Public can view verified records" ON records
  FOR SELECT USING (status = 'verified');

-- Utilizatorii pot vedea propriile recorduri (toate statusurile)
CREATE POLICY "Users can view own records" ON records
  FOR SELECT USING (auth.uid() = user_id);

-- Utilizatorii pot crea propriile recorduri
CREATE POLICY "Users can insert own records" ON records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Utilizatorii pot actualiza propriile recorduri
CREATE POLICY "Users can update own records" ON records
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin poate vedea toate recordurile
CREATE POLICY "Admin can view all records" ON records
  FOR SELECT USING (public.is_admin_user());

-- Admin poate actualiza orice record
CREATE POLICY "Admin can update all records" ON records
  FOR UPDATE USING (public.is_admin_user());

