-- Script pentru actualizarea profilurilor existente cu county_id și city_id
-- Ruleaza acest script in Supabase SQL Editor

-- 1. Verifică profilurile existente
SELECT id, email, display_name, location, county_id, city_id 
FROM public.profiles 
WHERE location IS NOT NULL;

-- 2. Actualizează profilurile existente cu county_id și city_id bazat pe location
-- Pentru București
UPDATE public.profiles 
SET county_id = 'bucuresti', city_id = (SELECT id FROM public.cities WHERE county_id = 'bucuresti' AND name = 'București' LIMIT 1)
WHERE location ILIKE '%bucurești%' OR location ILIKE '%bucharest%' OR location ILIKE '%bucuresti%'
AND county_id IS NULL;

-- Pentru Cluj-Napoca
UPDATE public.profiles 
SET county_id = 'cluj', city_id = (SELECT id FROM public.cities WHERE county_id = 'cluj' AND name = 'Cluj-Napoca' LIMIT 1)
WHERE location ILIKE '%cluj%' OR location ILIKE '%napoca%'
AND county_id IS NULL;

-- Pentru Timișoara
UPDATE public.profiles 
SET county_id = 'timis', city_id = (SELECT id FROM public.cities WHERE county_id = 'timis' AND name = 'Timișoara' LIMIT 1)
WHERE location ILIKE '%timișoara%' OR location ILIKE '%timisoara%'
AND county_id IS NULL;

-- Pentru Iași
UPDATE public.profiles 
SET county_id = 'iasi', city_id = (SELECT id FROM public.cities WHERE county_id = 'iasi' AND name = 'Iași' LIMIT 1)
WHERE location ILIKE '%iași%' OR location ILIKE '%iasi%'
AND county_id IS NULL;

-- Pentru Constanța
UPDATE public.profiles 
SET county_id = 'constanta', city_id = (SELECT id FROM public.cities WHERE county_id = 'constanta' AND name = 'Constanța' LIMIT 1)
WHERE location ILIKE '%constanța%' OR location ILIKE '%constanta%'
AND county_id IS NULL;

-- Pentru Brașov
UPDATE public.profiles 
SET county_id = 'brasov', city_id = (SELECT id FROM public.cities WHERE county_id = 'brasov' AND name = 'Brașov' LIMIT 1)
WHERE location ILIKE '%brașov%' OR location ILIKE '%brasov%'
AND county_id IS NULL;

-- Pentru Galați
UPDATE public.profiles 
SET county_id = 'galati', city_id = (SELECT id FROM public.cities WHERE county_id = 'galati' AND name = 'Galați' LIMIT 1)
WHERE location ILIKE '%galați%' OR location ILIKE '%galati%'
AND county_id IS NULL;

-- Pentru Ploiești
UPDATE public.profiles 
SET county_id = 'prahova', city_id = (SELECT id FROM public.cities WHERE county_id = 'prahova' AND name = 'Ploiești' LIMIT 1)
WHERE location ILIKE '%ploiești%' OR location ILIKE '%ploiesti%'
AND county_id IS NULL;

-- Pentru Brăila
UPDATE public.profiles 
SET county_id = 'braila', city_id = (SELECT id FROM public.cities WHERE county_id = 'braila' AND name = 'Brăila' LIMIT 1)
WHERE location ILIKE '%brăila%' OR location ILIKE '%braila%'
AND county_id IS NULL;

-- Pentru Pitești
UPDATE public.profiles 
SET county_id = 'arges', city_id = (SELECT id FROM public.cities WHERE county_id = 'arges' AND name = 'Pitești' LIMIT 1)
WHERE location ILIKE '%pitești%' OR location ILIKE '%pitesti%'
AND county_id IS NULL;

-- Pentru Arad
UPDATE public.profiles 
SET county_id = 'arad', city_id = (SELECT id FROM public.cities WHERE county_id = 'arad' AND name = 'Arad' LIMIT 1)
WHERE location ILIKE '%arad%'
AND county_id IS NULL;

-- Pentru Sibiu
UPDATE public.profiles 
SET county_id = 'sibiu', city_id = (SELECT id FROM public.cities WHERE county_id = 'sibiu' AND name = 'Sibiu' LIMIT 1)
WHERE location ILIKE '%sibiu%'
AND county_id IS NULL;

-- Pentru Târgu Mureș
UPDATE public.profiles 
SET county_id = 'mures', city_id = (SELECT id FROM public.cities WHERE county_id = 'mures' AND name = 'Târgu Mureș' LIMIT 1)
WHERE location ILIKE '%târgu mureș%' OR location ILIKE '%targu mures%'
AND county_id IS NULL;

-- Pentru Bacău
UPDATE public.profiles 
SET county_id = 'bacau', city_id = (SELECT id FROM public.cities WHERE county_id = 'bacau' AND name = 'Bacău' LIMIT 1)
WHERE location ILIKE '%bacău%' OR location ILIKE '%bacau%'
AND county_id IS NULL;

-- Pentru Piatra Neamț
UPDATE public.profiles 
SET county_id = 'neamt', city_id = (SELECT id FROM public.cities WHERE county_id = 'neamt' AND name = 'Piatra Neamț' LIMIT 1)
WHERE location ILIKE '%piatra neamț%' OR location ILIKE '%piatra neamt%'
AND county_id IS NULL;

-- Pentru Craiova
UPDATE public.profiles 
SET county_id = 'dolj', city_id = (SELECT id FROM public.cities WHERE county_id = 'dolj' AND name = 'Craiova' LIMIT 1)
WHERE location ILIKE '%craiova%'
AND county_id IS NULL;

-- Pentru Galați
UPDATE public.profiles 
SET county_id = 'galati', city_id = (SELECT id FROM public.cities WHERE county_id = 'galati' AND name = 'Galați' LIMIT 1)
WHERE location ILIKE '%galați%' OR location ILIKE '%galati%'
AND county_id IS NULL;

-- Pentru Buzău
UPDATE public.profiles 
SET county_id = 'buzau', city_id = (SELECT id FROM public.cities WHERE county_id = 'buzau' AND name = 'Buzău' LIMIT 1)
WHERE location ILIKE '%buzău%' OR location ILIKE '%buzau%'
AND county_id IS NULL;

-- Pentru Satu Mare
UPDATE public.profiles 
SET county_id = 'satu-mare', city_id = (SELECT id FROM public.cities WHERE county_id = 'satu-mare' AND name = 'Satu Mare' LIMIT 1)
WHERE location ILIKE '%satu mare%'
AND county_id IS NULL;

-- Pentru Piatra Neamț
UPDATE public.profiles 
SET county_id = 'neamt', city_id = (SELECT id FROM public.cities WHERE county_id = 'neamt' AND name = 'Piatra Neamț' LIMIT 1)
WHERE location ILIKE '%piatra neamț%' OR location ILIKE '%piatra neamt%'
AND county_id IS NULL;

-- Pentru Suceava
UPDATE public.profiles 
SET county_id = 'suceava', city_id = (SELECT id FROM public.cities WHERE county_id = 'suceava' AND name = 'Suceava' LIMIT 1)
WHERE location ILIKE '%suceava%'
AND county_id IS NULL;

-- Pentru Drobeta-Turnu Severin
UPDATE public.profiles 
SET county_id = 'mehedinti', city_id = (SELECT id FROM public.cities WHERE county_id = 'mehedinti' AND name = 'Drobeta-Turnu Severin' LIMIT 1)
WHERE location ILIKE '%drobeta%' OR location ILIKE '%severin%'
AND county_id IS NULL;

-- Pentru Târgu Jiu
UPDATE public.profiles 
SET county_id = 'gorj', city_id = (SELECT id FROM public.cities WHERE county_id = 'gorj' AND name = 'Târgu Jiu' LIMIT 1)
WHERE location ILIKE '%târgu jiu%' OR location ILIKE '%targu jiu%'
AND county_id IS NULL;

-- Pentru Râmnicu Vâlcea
UPDATE public.profiles 
SET county_id = 'valcea', city_id = (SELECT id FROM public.cities WHERE county_id = 'valcea' AND name = 'Râmnicu Vâlcea' LIMIT 1)
WHERE location ILIKE '%râmnicu vâlcea%' OR location ILIKE '%ramnicu valcea%'
AND county_id IS NULL;

-- Pentru Slatina
UPDATE public.profiles 
SET county_id = 'olt', city_id = (SELECT id FROM public.cities WHERE county_id = 'olt' AND name = 'Slatina' LIMIT 1)
WHERE location ILIKE '%slatina%'
AND county_id IS NULL;

-- Pentru Alexandria
UPDATE public.profiles 
SET county_id = 'teleorman', city_id = (SELECT id FROM public.cities WHERE county_id = 'teleorman' AND name = 'Alexandria' LIMIT 1)
WHERE location ILIKE '%alexandria%'
AND county_id IS NULL;

-- Pentru Tulcea
UPDATE public.profiles 
SET county_id = 'tulcea', city_id = (SELECT id FROM public.cities WHERE county_id = 'tulcea' AND name = 'Tulcea' LIMIT 1)
WHERE location ILIKE '%tulcea%'
AND county_id IS NULL;

-- Pentru Vaslui
UPDATE public.profiles 
SET county_id = 'vaslui', city_id = (SELECT id FROM public.cities WHERE county_id = 'vaslui' AND name = 'Vaslui' LIMIT 1)
WHERE location ILIKE '%vaslui%'
AND county_id IS NULL;

-- Pentru Focșani
UPDATE public.profiles 
SET county_id = 'vrancea', city_id = (SELECT id FROM public.cities WHERE county_id = 'vrancea' AND name = 'Focșani' LIMIT 1)
WHERE location ILIKE '%focșani%' OR location ILIKE '%focsani%'
AND county_id IS NULL;

-- 3. Verifică rezultatele
SELECT 
    p.id, 
    p.email, 
    p.display_name, 
    p.location, 
    c.name as county_name,
    ci.name as city_name
FROM public.profiles p
LEFT JOIN public.counties c ON p.county_id = c.id
LEFT JOIN public.cities ci ON p.city_id = ci.id
WHERE p.location IS NOT NULL;

-- 4. Pentru profilurile care nu au fost actualizate, setează county_id pe baza primului cuvânt din location
UPDATE public.profiles 
SET county_id = 'bucuresti'
WHERE location IS NOT NULL 
AND county_id IS NULL 
AND (location ILIKE '%bucurești%' OR location ILIKE '%bucharest%' OR location ILIKE '%bucuresti%');

-- 5. Verifică final
SELECT 
    COUNT(*) as total_profiles,
    COUNT(county_id) as profiles_with_county,
    COUNT(city_id) as profiles_with_city
FROM public.profiles;
