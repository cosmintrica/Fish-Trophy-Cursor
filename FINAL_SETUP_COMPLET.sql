-- =============================================
-- SETUP FINAL COMPLET - FISH TROPHY
-- Rulează acest script în Supabase SQL Editor
-- =============================================

-- 1. Verifică dacă există utilizatori (dacă nu, creează unul mock)
DO $$
DECLARE
  user_count INTEGER;
  mock_user_id UUID;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  IF user_count = 0 THEN
    -- Creează un utilizator mock
    mock_user_id := gen_random_uuid();
    
    -- Inserează în profiles
    INSERT INTO public.profiles (id, email, display_name, bio, role, county_id, city_id)
    VALUES (
      mock_user_id,
      'pescar@example.com',
      'Pescar Pasionat',
      'Pescar din România cu experiență de 10 ani!',
      'user',
      'B', -- București
      (SELECT id FROM public.cities WHERE county_id = 'B' AND name = 'București' LIMIT 1)
    );
    
    RAISE NOTICE '✅ Utilizator mock creat: pescar@example.com';
  ELSE
    RAISE NOTICE '✅ Utilizator există deja';
  END IF;
END $$;

-- 2. Șterge recordurile existente (dacă există)
DELETE FROM public.records;

-- 3. Adaugă recorduri mock cu detalii complete
INSERT INTO public.records (
  user_id,
  species_id,
  species_name,
  weight,
  length,
  location_id,
  location_name,
  county,
  region,
  image_url,
  description,
  caught_at
) VALUES
-- Recorduri de Crap
(
  (SELECT id FROM public.profiles LIMIT 1),
  (SELECT id FROM public.fish_species WHERE name = 'Crap' LIMIT 1),
  'Crap',
  8.5,
  65,
  (SELECT id FROM public.fishing_locations WHERE name LIKE '%Lacul%' AND type = 'lakes' LIMIT 1),
  'Lacul Băneasa',
  'B',
  'muntenia',
  'https://example.com/crap-8kg.jpg',
  'Crap frumos prins cu porumb la 5 metri adâncime. Vremea era perfectă, apă liniștită.',
  '2024-08-15 06:30:00+00'
),
-- Recorduri de Somn
(
  (SELECT id FROM public.profiles LIMIT 1),
  (SELECT id FROM public.fish_species WHERE name = 'Somn' LIMIT 1),
  'Somn',
  15.2,
  120,
  (SELECT id FROM public.fishing_locations WHERE name LIKE '%Dunăre%' AND type = 'rivers' LIMIT 1),
  'Dunărea la Călărași',
  'CL',
  'muntenia',
  'https://example.com/somn-15kg.jpg',
  'Somn uriaș prins noaptea cu viermi vii. Lupta a durat 45 de minute!',
  '2024-07-22 23:15:00+00'
),
-- Recorduri de Știucă
(
  (SELECT id FROM public.profiles LIMIT 1),
  (SELECT id FROM public.fish_species WHERE name = 'Știucă' LIMIT 1),
  'Știucă',
  6.8,
  85,
  (SELECT id FROM public.fishing_locations WHERE name LIKE '%Lacul%' AND type = 'lakes' LIMIT 1),
  'Lacul Snagov',
  'IF',
  'muntenia',
  'https://example.com/stiuca-6kg.jpg',
  'Știucă prinsă cu wobler la răsărit. Atacul a fost fulgerător!',
  '2024-09-03 05:45:00+00'
),
-- Recorduri de Biban
(
  (SELECT id FROM public.profiles LIMIT 1),
  (SELECT id FROM public.fish_species WHERE name = 'Biban' LIMIT 1),
  'Biban',
  2.1,
  35,
  (SELECT id FROM public.fishing_locations WHERE name LIKE '%Lacul%' AND type = 'lakes' LIMIT 1),
  'Lacul Herăstrău',
  'B',
  'muntenia',
  'https://example.com/biban-2kg.jpg',
  'Biban frumos prins cu viermi la 3 metri adâncime. Perfect pentru prânz!',
  '2024-08-28 12:20:00+00'
),
-- Recorduri de Platca
(
  (SELECT id FROM public.profiles LIMIT 1),
  (SELECT id FROM public.fish_species WHERE name = 'Platca' LIMIT 1),
  'Platca',
  1.8,
  28,
  (SELECT id FROM public.fishing_locations WHERE name LIKE '%Lacul%' AND type = 'lakes' LIMIT 1),
  'Lacul Cernica',
  'IF',
  'muntenia',
  'https://example.com/platca-1kg.jpg',
  'Platca prinsă cu porumb la suprafață. Vremea era caldă și liniștită.',
  '2024-09-01 14:30:00+00'
),
-- Recorduri de Caras
(
  (SELECT id FROM public.profiles LIMIT 1),
  (SELECT id FROM public.fish_species WHERE name = 'Caras' LIMIT 1),
  'Caras',
  1.2,
  22,
  (SELECT id FROM public.fishing_locations WHERE name LIKE '%Lacul%' AND type = 'lakes' LIMIT 1),
  'Lacul Morii',
  'B',
  'muntenia',
  'https://example.com/caras-1kg.jpg',
  'Caras prins cu pâine la 2 metri adâncime. Foarte activ în această perioadă.',
  '2024-08-25 16:45:00+00'
),
-- Recorduri de Lin
(
  (SELECT id FROM public.profiles LIMIT 1),
  (SELECT id FROM public.fish_species WHERE name = 'Lin' LIMIT 1),
  'Lin',
  3.5,
  45,
  (SELECT id FROM public.fishing_locations WHERE name LIKE '%Lacul%' AND type = 'lakes' LIMIT 1),
  'Lacul Tei',
  'B',
  'muntenia',
  'https://example.com/lin-3kg.jpg',
  'Lin frumos prins cu viermi la 4 metri adâncime. Ape liniștite și clare.',
  '2024-08-20 07:15:00+00'
),
-- Recorduri de Avat
(
  (SELECT id FROM public.profiles LIMIT 1),
  (SELECT id FROM public.fish_species WHERE name = 'Avat' LIMIT 1),
  'Avat',
  2.8,
  38,
  (SELECT id FROM public.fishing_locations WHERE name LIKE '%Lacul%' AND type = 'lakes' LIMIT 1),
  'Lacul Floreasca',
  'B',
  'muntenia',
  'https://example.com/avat-2kg.jpg',
  'Avat prins cu porumb la 3 metri adâncime. Foarte frumos colorat!',
  '2024-08-18 11:30:00+00'
),
-- Recorduri de Clean
(
  (SELECT id FROM public.profiles LIMIT 1),
  (SELECT id FROM public.fish_species WHERE name = 'Clean' LIMIT 1),
  'Clean',
  1.5,
  25,
  (SELECT id FROM public.fishing_locations WHERE name LIKE '%Lacul%' AND type = 'lakes' LIMIT 1),
  'Lacul Colentina',
  'B',
  'muntenia',
  'https://example.com/clean-1kg.jpg',
  'Clean prins cu viermi la suprafață. Foarte activ și agresiv!',
  '2024-08-30 09:20:00+00'
),
-- Recorduri de Mreană
(
  (SELECT id FROM public.profiles LIMIT 1),
  (SELECT id FROM public.fish_species WHERE name = 'Mreană' LIMIT 1),
  'Mreană',
  4.2,
  55,
  (SELECT id FROM public.fishing_locations WHERE name LIKE '%Dunăre%' AND type = 'rivers' LIMIT 1),
  'Dunărea la Giurgiu',
  'GR',
  'muntenia',
  'https://example.com/mreana-4kg.jpg',
  'Mreană frumoasă prinsă cu viermi la 6 metri adâncime. Lupta a fost intensă!',
  '2024-07-30 18:45:00+00'
),
-- Recorduri de Zander
(
  (SELECT id FROM public.profiles LIMIT 1),
  (SELECT id FROM public.fish_species WHERE name = 'Zander' LIMIT 1),
  'Zander',
  5.8,
  70,
  (SELECT id FROM public.fishing_locations WHERE name LIKE '%Lacul%' AND type = 'lakes' LIMIT 1),
  'Lacul Băneasa',
  'B',
  'muntenia',
  'https://example.com/zander-5kg.jpg',
  'Zander prins cu wobler la 8 metri adâncime. Atacul a fost fulgerător!',
  '2024-08-10 20:30:00+00'
),
-- Recorduri de Biban mare
(
  (SELECT id FROM public.profiles LIMIT 1),
  (SELECT id FROM public.fish_species WHERE name = 'Biban mare' LIMIT 1),
  'Biban mare',
  3.2,
  42,
  (SELECT id FROM public.fishing_locations WHERE name LIKE '%Lacul%' AND type = 'lakes' LIMIT 1),
  'Lacul Snagov',
  'IF',
  'muntenia',
  'https://example.com/biban-mare-3kg.jpg',
  'Biban mare prins cu viermi la 5 metri adâncime. Foarte puternic!',
  '2024-08-05 13:15:00+00'
),
-- Recorduri de Crap argintiu
(
  (SELECT id FROM public.profiles LIMIT 1),
  (SELECT id FROM public.fish_species WHERE name = 'Crap argintiu' LIMIT 1),
  'Crap argintiu',
  12.5,
  80,
  (SELECT id FROM public.fishing_locations WHERE name LIKE '%Lacul%' AND type = 'lakes' LIMIT 1),
  'Lacul Herăstrău',
  'B',
  'muntenia',
  'https://example.com/crap-argintiu-12kg.jpg',
  'Crap argintiu uriaș prins cu porumb la 7 metri adâncime. Lupta a durat o oră!',
  '2024-07-15 06:00:00+00'
),
-- Recorduri de Crap auriu
(
  (SELECT id FROM public.profiles LIMIT 1),
  (SELECT id FROM public.fish_species WHERE name = 'Crap auriu' LIMIT 1),
  'Crap auriu',
  2.8,
  35,
  (SELECT id FROM public.fishing_locations WHERE name LIKE '%Lacul%' AND type = 'lakes' LIMIT 1),
  'Lacul Cernica',
  'IF',
  'muntenia',
  'https://example.com/crap-auriu-2kg.jpg',
  'Crap auriu frumos prins cu porumb la 3 metri adâncime. Foarte colorat!',
  '2024-08-12 15:30:00+00'
),
-- Recorduri de Somn alb
(
  (SELECT id FROM public.profiles LIMIT 1),
  (SELECT id FROM public.fish_species WHERE name = 'Somn alb' LIMIT 1),
  'Somn alb',
  18.7,
  140,
  (SELECT id FROM public.fishing_locations WHERE name LIKE '%Dunăre%' AND type = 'rivers' LIMIT 1),
  'Dunărea la Călărași',
  'CL',
  'muntenia',
  'https://example.com/somn-alb-18kg.jpg',
  'Somn alb uriaș prins noaptea cu viermi vii. Lupta a durat 2 ore!',
  '2024-06-28 01:30:00+00'
);

-- 4. Mesaj de confirmare final
DO $$
DECLARE
  record_count INTEGER;
  user_count INTEGER;
  species_count INTEGER;
  location_count INTEGER;
  county_count INTEGER;
  city_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO record_count FROM public.records;
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  SELECT COUNT(*) INTO species_count FROM public.fish_species;
  SELECT COUNT(*) INTO location_count FROM public.fishing_locations;
  SELECT COUNT(*) INTO county_count FROM public.counties;
  SELECT COUNT(*) INTO city_count FROM public.cities;
  
  RAISE NOTICE '🎉 SETUP FINAL COMPLET!';
  RAISE NOTICE '📊 Statistici finale:';
  RAISE NOTICE '   👥 Utilizatori: %', user_count;
  RAISE NOTICE '   🐟 Specii de pești: %', species_count;
  RAISE NOTICE '   📍 Locații de pescuit: %', location_count;
  RAISE NOTICE '   🏛️ Județe: %', county_count;
  RAISE NOTICE '   🏙️ Orașe: %', city_count;
  RAISE NOTICE '   🏆 Recorduri: %', record_count;
  RAISE NOTICE '🚀 Baza de date este completă și gata de utilizare!';
END $$;
