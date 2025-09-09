// Export schema completă cu toate datele din baza de date
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cckytfxrigzkpfkrrqbv.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNja3l0ZnhyaWd6a3Bma3JycWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDE4MDgsImV4cCI6MjA3MjQxNzgwOH0.-QGnkH6omx0V1FNZrbKA2LNI90ZMe6RRAa5ct25U65M'
);

async function exportCompleteSchema() {
  console.log('🔄 Export schema completă cu toate datele...\n');
  
  let sqlContent = `-- =============================================
-- SCHEMA COMPLETĂ FISH TROPHY - EXPORT AUTOMAT
-- Generat automat la: ${new Date().toISOString()}
-- =============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================
-- 1. COUNTIES (Județe)
-- =============================================
CREATE TABLE IF NOT EXISTS public.counties (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 2. CITIES (Orașe)
-- =============================================
CREATE TABLE IF NOT EXISTS public.cities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id text NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (county_id, name)
);

-- =============================================
-- 3. PROFILES (Utilizatori)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  display_name text,
  photo_url text,
  phone text,
  bio text DEFAULT 'Pescar pasionat din România!',
  location text,
  county_id text REFERENCES public.counties(id),
  city_id uuid REFERENCES public.cities(id),
  website text,
  role text DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 4. FISH SPECIES (Specii de pești)
-- =============================================
CREATE TABLE IF NOT EXISTS public.fish_species (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  scientific_name text,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 5. FISHING LOCATIONS (Locații de pescuit)
-- =============================================
CREATE TABLE IF NOT EXISTS public.fishing_locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('rivers', 'lakes', 'private_ponds', 'wild_ponds')),
  county text NOT NULL,
  region text NOT NULL,
  latitude double precision,
  longitude double precision,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 6. RECORDS (Recorduri de pescuit)
-- =============================================
CREATE TABLE IF NOT EXISTS public.records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  species_id uuid REFERENCES public.fish_species(id) ON DELETE SET NULL,
  species_name text NOT NULL,
  weight double precision NOT NULL,
  length double precision,
  location_id uuid REFERENCES public.fishing_locations(id) ON DELETE SET NULL,
  location_name text NOT NULL,
  county text NOT NULL,
  region text NOT NULL,
  image_url text,
  description text,
  caught_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 7. ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fish_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fishing_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8. POLICIES
-- =============================================
-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Records policies
DROP POLICY IF EXISTS "Users can view all records" ON public.records;
DROP POLICY IF EXISTS "Users can insert own records" ON public.records;
DROP POLICY IF EXISTS "Users can update own records" ON public.records;
DROP POLICY IF EXISTS "Users can delete own records" ON public.records;

CREATE POLICY "Users can view all records"
  ON public.records FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own records"
  ON public.records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
  ON public.records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records"
  ON public.records FOR DELETE
  USING (auth.uid() = user_id);

-- Public tables policies
DROP POLICY IF EXISTS "Anyone can view fish species" ON public.fish_species;
DROP POLICY IF EXISTS "Anyone can view fishing locations" ON public.fishing_locations;
DROP POLICY IF EXISTS "Anyone can view counties" ON public.counties;
DROP POLICY IF EXISTS "Anyone can view cities" ON public.cities;

CREATE POLICY "Anyone can view fish species"
  ON public.fish_species FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view fishing locations"
  ON public.fishing_locations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view counties"
  ON public.counties FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view cities"
  ON public.cities FOR SELECT
  USING (true);

-- =============================================
-- 9. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_records_user_id ON public.records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_species_id ON public.records(species_id);
CREATE INDEX IF NOT EXISTS idx_records_location_id ON public.records(location_id);
CREATE INDEX IF NOT EXISTS idx_records_caught_at ON public.records(caught_at);
CREATE INDEX IF NOT EXISTS idx_fishing_locations_type ON public.fishing_locations(type);
CREATE INDEX IF NOT EXISTS idx_fishing_locations_county ON public.fishing_locations(county);
CREATE INDEX IF NOT EXISTS idx_cities_county_id ON public.cities(county_id);

-- =============================================
-- 10. TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_records_updated_at ON public.records;
CREATE TRIGGER handle_records_updated_at
  BEFORE UPDATE ON public.records
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- =============================================
-- 11. FUNCTIONS
-- =============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_profile()
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  photo_url text,
  phone text,
  bio text,
  location text,
  county_id text,
  city_id uuid,
  website text,
  role text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 12. DATA - COUNTIES
-- =============================================
INSERT INTO public.counties (id, name) VALUES`;

  try {
    // Export counties
    const { data: counties, error: countiesError } = await supabase
      .from('counties')
      .select('id, name')
      .order('name');
    
    if (countiesError) throw countiesError;
    
    counties.forEach((county, index) => {
      sqlContent += `\n('${county.id}', '${county.name}')`;
      if (index < counties.length - 1) sqlContent += ',';
    });
    
    sqlContent += `\nON CONFLICT (id) DO NOTHING;

-- =============================================
-- 13. DATA - CITIES
-- =============================================
INSERT INTO public.cities (county_id, name) VALUES`;

    // Export cities
    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('name, counties(id)')
      .order('name');
    
    if (citiesError) throw citiesError;
    
    cities.forEach((city, index) => {
      sqlContent += `\n('${city.counties.id}', '${city.name}')`;
      if (index < cities.length - 1) sqlContent += ',';
    });
    
    sqlContent += `\nON CONFLICT (county_id, name) DO NOTHING;

-- =============================================
-- 14. DATA - FISH SPECIES
-- =============================================
INSERT INTO public.fish_species (name, scientific_name, description) VALUES`;

    // Export fish species
    const { data: species, error: speciesError } = await supabase
      .from('fish_species')
      .select('name, scientific_name, description')
      .order('name');
    
    if (speciesError) throw speciesError;
    
    species.forEach((specie, index) => {
      const scientificName = specie.scientific_name ? `'${specie.scientific_name}'` : 'NULL';
      const description = specie.description ? `'${specie.description.replace(/'/g, "''")}'` : 'NULL';
      sqlContent += `\n('${specie.name.replace(/'/g, "''")}', ${scientificName}, ${description})`;
      if (index < species.length - 1) sqlContent += ',';
    });
    
    sqlContent += `\nON CONFLICT (name) DO NOTHING;

-- =============================================
-- 15. DATA - FISHING LOCATIONS
-- =============================================
INSERT INTO public.fishing_locations (name, type, county, region, latitude, longitude, description, image_url) VALUES`;

    // Export fishing locations
    const { data: locations, error: locationsError } = await supabase
      .from('fishing_locations')
      .select('name, type, county, region, latitude, longitude, description, image_url')
      .order('name');
    
    if (locationsError) throw locationsError;
    
    locations.forEach((location, index) => {
      const lat = location.latitude || 'NULL';
      const lng = location.longitude || 'NULL';
      const desc = location.description ? `'${location.description.replace(/'/g, "''")}'` : 'NULL';
      const img = location.image_url ? `'${location.image_url}'` : 'NULL';
      
      sqlContent += `\n('${location.name.replace(/'/g, "''")}', '${location.type}', '${location.county}', '${location.region}', ${lat}, ${lng}, ${desc}, ${img})`;
      if (index < locations.length - 1) sqlContent += ',';
    });
    
    sqlContent += `\nON CONFLICT DO NOTHING;

-- =============================================
-- 16. DATA - RECORDS (if any)
-- =============================================
INSERT INTO public.records (user_id, species_id, species_name, weight, length, location_id, location_name, county, region, image_url, description, caught_at) VALUES`;

    // Export records
    const { data: records, error: recordsError } = await supabase
      .from('records')
      .select('user_id, species_id, species_name, weight, length, location_id, location_name, county, region, image_url, description, caught_at')
      .order('caught_at');
    
    if (recordsError) throw recordsError;
    
    if (records && records.length > 0) {
      records.forEach((record, index) => {
        const speciesId = record.species_id ? `'${record.species_id}'` : 'NULL';
        const locationId = record.location_id ? `'${record.location_id}'` : 'NULL';
        const length = record.length || 'NULL';
        const img = record.image_url ? `'${record.image_url}'` : 'NULL';
        const desc = record.description ? `'${record.description.replace(/'/g, "''")}'` : 'NULL';
        
        sqlContent += `\n('${record.user_id}', ${speciesId}, '${record.species_name.replace(/'/g, "''")}', ${record.weight}, ${length}, ${locationId}, '${record.location_name.replace(/'/g, "''")}', '${record.county}', '${record.region}', ${img}, ${desc}, '${record.caught_at}')`;
        if (index < records.length - 1) sqlContent += ',';
      });
    } else {
      sqlContent += `\n-- No records found`;
    }
    
    sqlContent += `\nON CONFLICT DO NOTHING;

-- =============================================
-- 17. FINAL MESSAGE
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Schema completă exportată cu succes!';
  RAISE NOTICE '📊 Tabele: profiles, counties, cities, fish_species, fishing_locations, records';
  RAISE NOTICE '🔒 RLS: Configurat pentru toate tabelele';
  RAISE NOTICE '📝 Date: Complete cu toate informațiile';
  RAISE NOTICE '🚀 Baza de date este gata de utilizare!';
END $$;`;

    // Write to file
    const fs = await import('fs');
    fs.writeFileSync('../SCHEMA_COMPLETA_CU_DATE.sql', sqlContent);
    
    console.log('✅ Schema completă exportată în SCHEMA_COMPLETA_CU_DATE.sql');
    console.log(`📊 Statistici export:`);
    console.log(`   🏛️ Județe: ${counties.length}`);
    console.log(`   🏙️ Orașe: ${cities.length}`);
    console.log(`   🐟 Specii: ${species.length}`);
    console.log(`   📍 Locații: ${locations.length}`);
    console.log(`   🏆 Recorduri: ${records ? records.length : 0}`);
    
  } catch (error) {
    console.error('❌ Eroare la export:', error.message);
  }
}

exportCompleteSchema();
