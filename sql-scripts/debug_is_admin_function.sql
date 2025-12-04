-- =============================================
-- Debug Funcție is_admin_from_profiles() - Pas cu Pas
-- =============================================
-- Rulează acest query ca utilizator autentificat (admin) pentru a debug funcția
-- =============================================

-- 1. Verifică dacă utilizatorul este autentificat
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role;

-- 2. Verifică dacă utilizatorul există în profiles
SELECT 
    id,
    role,
    email,
    CASE 
        WHEN role = 'admin' THEN true 
        ELSE false 
    END as is_admin_manual
FROM profiles 
WHERE id = auth.uid();

-- 3. Testează query-ul direct din funcție (fără RLS)
SELECT 
    (SELECT role FROM profiles WHERE id = auth.uid()) as role_direct,
    COALESCE((SELECT role FROM profiles WHERE id = auth.uid()), '') as role_coalesce,
    COALESCE((SELECT role FROM profiles WHERE id = auth.uid()), '') = 'admin' as is_admin_direct;

-- 4. Testează funcția is_admin_from_profiles()
SELECT 
    is_admin_from_profiles() as function_result;

-- 5. Verifică dacă există RLS pe profiles care blochează
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- 6. Verifică policy-urile pe profiles
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual::text as using_clause,
    with_check::text as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'profiles';

