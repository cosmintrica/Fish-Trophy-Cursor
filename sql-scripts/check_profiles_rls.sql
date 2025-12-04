-- =============================================
-- Verifică RLS pe profiles
-- =============================================

-- 1. RLS activat pe profiles?
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- 2. TOATE policy-urile pe profiles
SELECT 
    p.polname as policy_name,
    CASE p.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        ELSE 'UNKNOWN'
    END as command,
    pg_get_expr(p.polqual, p.polrelid) as using_clause
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'profiles'
ORDER BY p.polcmd, p.polname;

