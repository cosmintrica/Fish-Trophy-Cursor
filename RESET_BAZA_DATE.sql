-- =============================================
-- RESET COMPLET BAZA DE DATE
-- =============================================

-- 1. Șterge toate tabelele în ordinea corectă (din cauza foreign keys)
DROP TABLE IF EXISTS public.fish_species_bait CASCADE;
DROP TABLE IF EXISTS public.fish_species_method CASCADE;
DROP TABLE IF EXISTS public.fish_method CASCADE;
DROP TABLE IF EXISTS public.fish_bait CASCADE;
DROP TABLE IF EXISTS public.shop_reviews CASCADE;
DROP TABLE IF EXISTS public.fishing_shops CASCADE;
DROP TABLE IF EXISTS public.fishing_regulations CASCADE;
DROP TABLE IF EXISTS public.fishing_techniques CASCADE;
DROP TABLE IF EXISTS public.user_gear CASCADE;
DROP TABLE IF EXISTS public.location_species CASCADE;
DROP TABLE IF EXISTS public.records CASCADE;
DROP TABLE IF EXISTS public.fishing_locations CASCADE;
DROP TABLE IF EXISTS public.fish_species CASCADE;
DROP TABLE IF EXISTS public.cities CASCADE;
DROP TABLE IF EXISTS public.counties CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Șterge funcțiile
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_email() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.set_verification_fields() CASCADE;
DROP FUNCTION IF EXISTS public.update_shop_rating() CASCADE;
DROP FUNCTION IF EXISTS public.get_public_profiles() CASCADE;

-- 3. Șterge trigger-urile de pe auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- 4. Șterge bucket-urile de storage
DELETE FROM storage.buckets WHERE id IN ('avatars', 'thumbnails');

-- 5. Șterge politicile de storage
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view thumbnails" ON storage.objects;

-- 6. Mesaj de confirmare
SELECT 'Baza de date a fost resetată complet!' as status;
