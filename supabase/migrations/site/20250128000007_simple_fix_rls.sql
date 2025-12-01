-- Fix simplu pentru RLS - fără complicații cu auth.users
-- Migration: 20250128000007_simple_fix_rls.sql
-- Soluție: Folosim funcție SECURITY DEFINER pentru verificare admin

-- 1. Creează funcție pentru verificare admin (rulează cu privilegii ridicate)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER  -- Rulează cu privilegii ridicate, poate accesa auth.users
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'cosmin.trica@outlook.com'
  );
$$;

-- 2. Șterge toate policy-urile vechi care cauzează probleme
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can view all records" ON records;
DROP POLICY IF EXISTS "Admin can update all records" ON records;
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Public can view verified records" ON records;
DROP POLICY IF EXISTS "Users can view own records" ON records;

-- 3. Creează policy-uri simple și clare pentru PROFILES
-- Oricine poate vedea profilele (pentru profil public)
CREATE POLICY "Public can view profiles" ON profiles
  FOR SELECT USING (true);

-- Utilizatorii pot vedea propriul profil (redundant, dar clar)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Admin poate vedea toate profilele (folosește funcția, nu acces direct)
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin_user());

-- Utilizatorii pot actualiza propriul profil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Utilizatorii pot crea propriul profil
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Creează policy-uri simple și clare pentru RECORDS
-- Oricine poate vedea recordurile verificate (publice)
CREATE POLICY "Public can view verified records" ON records
  FOR SELECT USING (status = 'verified');

-- Utilizatorii pot vedea propriile recorduri (toate statusurile)
CREATE POLICY "Users can view own records" ON records
  FOR SELECT USING (auth.uid() = user_id);

-- Admin poate vedea toate recordurile (folosește funcția)
CREATE POLICY "Admin can view all records" ON records
  FOR SELECT USING (public.is_admin_user());

-- Utilizatorii pot crea propriile recorduri
CREATE POLICY "Users can insert own records" ON records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Utilizatorii pot actualiza propriile recorduri
CREATE POLICY "Users can update own records" ON records
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin poate actualiza orice record (folosește funcția)
CREATE POLICY "Admin can update all records" ON records
  FOR UPDATE USING (public.is_admin_user());

