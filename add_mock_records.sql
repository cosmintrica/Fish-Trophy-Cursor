-- Script pentru adăugarea recordurilor mock în baza de date
-- Rulează acest script în Supabase SQL Editor

-- Verifică dacă există specii în baza de date
SELECT COUNT(*) as species_count FROM fish_species;

-- Verifică dacă există locații în baza de date  
SELECT COUNT(*) as locations_count FROM fishing_locations;

-- Verifică dacă există utilizatori în baza de date
SELECT COUNT(*) as users_count FROM profiles;

-- Adaugă recorduri mock (înlocuiește ID-urile cu cele reale din baza ta)
INSERT INTO records (
  id,
  user_id,
  species_id,
  species_name,
  weight,
  length,
  location_id,
  location_name,
  date_caught,
  time_caught,
  image_url,
  video_url,
  status,
  created_at
) VALUES 
-- Record 1: Crap de 12.5 kg
(
  gen_random_uuid(),
  (SELECT id FROM profiles LIMIT 1), -- Primul utilizator din baza de date
  (SELECT id FROM fish_species WHERE name ILIKE '%crap%' LIMIT 1), -- Prima specie cu "crap" în nume
  'Crap',
  12.5,
  65,
  (SELECT id FROM fishing_locations WHERE type = 'lac' LIMIT 1), -- Prima locație de tip lac
  'Lacul Băneasa',
  '2024-01-15',
  '10:30:00',
  'https://example.com/fish1.jpg',
  NULL,
  'verified',
  NOW()
),
-- Record 2: Știucă de 8.2 kg
(
  gen_random_uuid(),
  (SELECT id FROM profiles LIMIT 1),
  (SELECT id FROM fish_species WHERE name ILIKE '%știucă%' OR name ILIKE '%stiuca%' LIMIT 1),
  'Știucă',
  8.2,
  55,
  (SELECT id FROM fishing_locations WHERE type = 'rau' LIMIT 1),
  'Dunărea',
  '2024-01-14',
  '09:15:00',
  'https://example.com/fish2.jpg',
  'https://example.com/fish2.mp4',
  'verified',
  NOW()
),
-- Record 3: Biban de 3.1 kg
(
  gen_random_uuid(),
  (SELECT id FROM profiles LIMIT 1),
  (SELECT id FROM fish_species WHERE name ILIKE '%bibăn%' OR name ILIKE '%biban%' LIMIT 1),
  'Bibăn',
  3.1,
  35,
  (SELECT id FROM fishing_locations WHERE type = 'lac' LIMIT 1),
  'Bălțile Dunării',
  '2024-01-13',
  '16:45:00',
  'https://example.com/fish3.jpg',
  NULL,
  'pending',
  NOW()
);

-- Verifică recordurile adăugate
SELECT 
  r.id,
  r.species_name,
  r.weight,
  r.length,
  r.location_name,
  r.date_caught,
  r.status,
  p.display_name as angler_name
FROM records r
LEFT JOIN profiles p ON p.id = r.user_id
ORDER BY r.created_at DESC
LIMIT 5;
