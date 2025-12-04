-- =============================================
-- Analiză Completă - Starea Actuală
-- =============================================
-- Rulează acest script pentru a vedea EXACT ce există acum
-- =============================================

-- 1. TOATE policy-urile pe forum_reputation_logs
SELECT 
    p.polname as policy_name,
    CASE p.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        ELSE 'UNKNOWN'
    END as command,
    p.polpermissive as permissive,
    pg_get_expr(p.polqual, p.polrelid) as using_clause,
    pg_get_expr(p.polwithcheck, p.polrelid) as with_check_clause
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'forum_reputation_logs'
ORDER BY p.polcmd, p.polname;

-- 2. RLS activat?
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'forum_reputation_logs';

-- 3. Structura tabelului (coloane importante)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'forum_reputation_logs'
  AND column_name IN ('giver_user_id', 'receiver_user_id', 'post_id', 'points', 'is_admin_award', 'giver_power')
ORDER BY ordinal_position;

-- 4. Funcții care verifică admin
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type,
    pg_get_functiondef(p.oid) as full_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.proname LIKE '%admin%' OR p.proname LIKE '%reputation%')
ORDER BY p.proname, pg_get_function_arguments(p.oid);

-- 5. Test: Ce returnează verificarea admin pentru user-ul curent?
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    (SELECT role FROM profiles WHERE id = auth.uid()) as profile_role,
    (SELECT role_id FROM forum_users WHERE user_id = auth.uid()) as forum_role_id,
    (SELECT name FROM forum_roles fr 
     JOIN forum_users fu ON fr.id = fu.role_id 
     WHERE fu.user_id = auth.uid()) as forum_role_name;

