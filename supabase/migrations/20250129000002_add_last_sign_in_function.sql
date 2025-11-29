-- Funcție pentru a obține last_sign_in_at pentru toți utilizatorii (pentru admin)
-- Această funcție rulează cu privilegii ridicate și poate accesa auth.users

CREATE OR REPLACE FUNCTION public.get_users_with_last_sign_in()
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifică dacă utilizatorul este admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin only.';
  END IF;

  -- Returnează utilizatorii cu last_sign_in_at din auth.users
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.display_name,
    p.created_at,
    au.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  ORDER BY au.last_sign_in_at DESC NULLS LAST;
END;
$$;

-- Comentariu pentru documentație
COMMENT ON FUNCTION public.get_users_with_last_sign_in() IS 
'Returnează utilizatorii cu last_sign_in_at din auth.users. Doar pentru admin.';

