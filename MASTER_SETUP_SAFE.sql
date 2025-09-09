-- =============================================
-- MASTER SETUP SAFE - FISH TROPHY
-- Rulează acest script în Supabase SQL Editor
-- Nu șterge bucket-urile de storage
-- =============================================

-- ====== PASUL 1: RESET COMPLET (FĂRĂ STORAGE) ======
-- Șterge toate tabelele în ordinea corectă (din cauza foreign keys)
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

-- Șterge funcțiile
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_email() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.set_verification_fields() CASCADE;
DROP FUNCTION IF EXISTS public.update_shop_rating() CASCADE;
DROP FUNCTION IF EXISTS public.get_public_profiles() CASCADE;

-- Șterge trigger-urile de pe auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Șterge politicile de storage (dar nu bucket-urile)
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view thumbnails" ON storage.objects;

SELECT '✅ Reset complet finalizat (fără storage)!' as status;

-- ====== PASUL 2: APLICĂ SCHEMA FINALĂ ======
-- Extensions (UUIDs, fuzzy search)
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- =============================================
-- 1. PROFILES (utilizatori)
-- =============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  photo_url text,
  phone text,
  bio text default 'Pescar pasionat din România!',
  location text,
  website text,
  role text default 'user' check (role in ('user','admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Policies (drop-if-exists ca să fie idempotent)
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- updated_at auto
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- =============================================
-- 0.1. Helper: funcție pentru rol admin (acum că profiles există)
-- =============================================
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin');
$$;

-- =============================================
-- 2. FISH SPECIES (specii)
-- =============================================
create table if not exists public.fish_species (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  scientific_name text,
  category text not null check (category in ('dulce','sarat','amestec')),
  water_type text not null check (water_type in ('lac','rau','baraj','mare','delta')),
  region text not null check (region in ('muntenia','moldova','oltenia','transilvania','banat','crisana','maramures','dobrogea')),
  min_weight decimal(5,2),
  max_weight decimal(5,2),
  min_length integer,
  max_length integer,
  description text,
  habitat text,
  feeding_habits text,
  spawning_season text,
  image_url text,
  is_native boolean default true,
  is_protected boolean default false,
  needs_review boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.fish_species enable row level security;

-- Public read + Admin CRUD
drop policy if exists "Anyone can view fish species" on public.fish_species;
create policy "Anyone can view fish species"
  on public.fish_species for select using (true);

drop policy if exists "Admin insert fish_species" on public.fish_species;
drop policy if exists "Admin update fish_species" on public.fish_species;
drop policy if exists "Admin delete fish_species" on public.fish_species;
create policy "Admin insert fish_species" on public.fish_species for insert with check (public.is_admin(auth.uid()));
create policy "Admin update fish_species" on public.fish_species for update using (public.is_admin(auth.uid()));
create policy "Admin delete fish_species" on public.fish_species for delete using (public.is_admin(auth.uid()));

drop trigger if exists update_fish_species_updated_at on public.fish_species;
create trigger update_fish_species_updated_at
before update on public.fish_species
for each row execute function public.update_updated_at_column();

-- Căutare rapidă pe nume
create index if not exists idx_species_name_trgm
  on public.fish_species using gin (name gin_trgm_ops);

-- =============================================
-- 3. FISHING LOCATIONS (locații)
-- =============================================
create table if not exists public.fishing_locations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null check (type in ('lac','rau','baraj','piscina','mare','delta')),
  county text not null,
  region text not null check (region in ('muntenia','moldova','oltenia','transilvania','banat','crisana','maramures','dobrogea')),
  latitude decimal(10,8) not null,
  longitude decimal(11,8) not null,
  description text,
  facilities text[], -- ['parcare','wc','restaurant','chirii_barcă','magazin_pecete']
  access_type text check (access_type in ('gratuit','platit','permis_necesar')),
  access_fee decimal(8,2),
  best_season text,
  best_time text,
  parking_available boolean default false,
  parking_fee decimal(8,2),
  boat_rental boolean default false,
  boat_rental_fee decimal(8,2),
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.fishing_locations enable row level security;

-- Public read + Admin CRUD
drop policy if exists "Anyone can view fishing locations" on public.fishing_locations;
create policy "Anyone can view fishing locations"
  on public.fishing_locations for select using (true);

drop policy if exists "Admin insert fishing_locations" on public.fishing_locations;
drop policy if exists "Admin update fishing_locations" on public.fishing_locations;
drop policy if exists "Admin delete fishing_locations" on public.fishing_locations;
create policy "Admin insert fishing_locations" on public.fishing_locations for insert with check (public.is_admin(auth.uid()));
create policy "Admin update fishing_locations" on public.fishing_locations for update using (public.is_admin(auth.uid()));
create policy "Admin delete fishing_locations" on public.fishing_locations for delete using (public.is_admin(auth.uid()));

drop trigger if exists update_fishing_locations_updated_at on public.fishing_locations;
create trigger update_fishing_locations_updated_at
before update on public.fishing_locations
for each row execute function public.update_updated_at_column();

create index if not exists idx_locations_region on public.fishing_locations(region);
create index if not exists idx_locations_name_trgm
  on public.fishing_locations using gin (name gin_trgm_ops);

-- =============================================
-- 4. LOCATION SPECIES (specii pe locații)
-- =============================================
create table if not exists public.location_species (
  id uuid default gen_random_uuid() primary key,
  location_id uuid not null references public.fishing_locations(id) on delete cascade,
  species_id uuid not null references public.fish_species(id) on delete cascade,
  abundance text check (abundance in ('rar','moderat','comun','foarte_comun')),
  best_season text,
  best_time text,
  notes text,
  created_at timestamptz default now(),
  unique (location_id, species_id)
);

alter table public.location_species enable row level security;

drop policy if exists "Anyone can view location species" on public.location_species;
create policy "Anyone can view location species"
  on public.location_species for select using (true);

create index if not exists idx_location_species_loc on public.location_species(location_id);
create index if not exists idx_location_species_sp  on public.location_species(species_id);

-- Admin CRUD pentru location_species
drop policy if exists "Admin insert location_species" on public.location_species;
drop policy if exists "Admin update location_species" on public.location_species;
drop policy if exists "Admin delete location_species" on public.location_species;
create policy "Admin insert location_species" on public.location_species for insert with check (public.is_admin(auth.uid()));
create policy "Admin update location_species" on public.location_species for update using (public.is_admin(auth.uid()));
create policy "Admin delete location_species" on public.location_species for delete using (public.is_admin(auth.uid()));

-- =============================================
-- 5. RECORDS (capturi) - CORECTAT PENTRU SECURITATE
-- =============================================
create table if not exists public.records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  species_id uuid references public.fish_species(id),
  species_name text not null, -- compatibilitate/afisare
  weight decimal(5,2) check (weight is null or weight >= 0),
  length integer check (length is null or length >= 0),
  location_id uuid references public.fishing_locations(id),
  location_name text,
  date_caught date not null check (date_caught <= current_date),
  time_caught time,
  weather_conditions text,
  water_temperature decimal(4,1),
  fishing_method text check (fishing_method in ('pluta','fund','spinning','fly','ice_fishing','net','other')),
  bait_used text,
  image_url text,
  video_url text,
  status text default 'pending' check (status in ('pending','verified','rejected')),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  rejection_reason text,
  is_record boolean default false,
  record_type text check (record_type in ('personal','local','national','world')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.records enable row level security;

-- Select policies corecte - DOAR verified records public
drop policy if exists "Users can view all records" on public.records;
drop policy if exists "Public can view verified records" on public.records;
create policy "Public can view verified records"
  on public.records for select using (status = 'verified');

create policy "Owner can view own records"
  on public.records for select using (auth.uid() = user_id);

create policy "Admins can view all records"
  on public.records for select using (public.is_admin(auth.uid()));

-- Insert/Update
drop policy if exists "Users can insert own records" on public.records;
drop policy if exists "Users can update own records" on public.records;

create policy "Users can insert own records"
  on public.records for insert
  with check (auth.uid() = user_id);

-- Owner poate modifica DOAR când nu sunt verificate
create policy "Owner can update own records (while pending/rejected)"
  on public.records for update
  using (auth.uid() = user_id and status <> 'verified')
  with check (auth.uid() = user_id and status in ('pending','rejected'));

create policy "Admins can update any record"
  on public.records for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Autocomplete câmpuri de verificare
create or replace function public.set_verification_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'verified' and (old.status is distinct from 'verified') then
    new.verified_at := coalesce(new.verified_at, now());
    new.verified_by := coalesce(new.verified_by, auth.uid(), old.verified_by);
  elsif new.status <> 'verified' then
    new.verified_at := null;
    new.verified_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_records_verification on public.records;
create trigger trg_records_verification
before update on public.records
for each row execute function public.set_verification_fields();

drop trigger if exists update_records_updated_at on public.records;
create trigger update_records_updated_at
before update on public.records
for each row execute function public.update_updated_at_column();

-- Indexuri perf (leaderboard + listări)
create index if not exists idx_records_user        on public.records(user_id);
create index if not exists idx_records_species     on public.records(species_id);
create index if not exists idx_records_status      on public.records(status);
create index if not exists idx_records_leaderboard on public.records(status, species_id, weight desc);
create index if not exists idx_records_location    on public.records(location_id);
create index if not exists idx_records_created_at  on public.records(created_at);
create index if not exists idx_records_user_created on public.records(user_id, created_at desc);

-- =============================================
-- 6. FISHING SHOPS (magazine)
-- =============================================
create table if not exists public.fishing_shops (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  address text not null,
  city text not null,
  county text not null,
  region text not null check (region in ('muntenia','moldova','oltenia','transilvania','banat','crisana','maramures','dobrogea')),
  latitude decimal(10,8),
  longitude decimal(11,8),
  phone text,
  email text,
  website text,
  opening_hours text,
  services text[], -- ['vanzare_echipamente','reparatii','cursuri','chirii','ghidaj']
  image_url text,
  rating decimal(3,2) default 0,
  review_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.fishing_shops enable row level security;

drop policy if exists "Anyone can view fishing shops" on public.fishing_shops;
create policy "Anyone can view fishing shops"
  on public.fishing_shops for select using (true);

drop policy if exists "Admin insert fishing_shops" on public.fishing_shops;
drop policy if exists "Admin update fishing_shops" on public.fishing_shops;
drop policy if exists "Admin delete fishing_shops" on public.fishing_shops;
create policy "Admin insert fishing_shops" on public.fishing_shops for insert with check (public.is_admin(auth.uid()));
create policy "Admin update fishing_shops" on public.fishing_shops for update using (public.is_admin(auth.uid()));
create policy "Admin delete fishing_shops" on public.fishing_shops for delete using (public.is_admin(auth.uid()));

drop trigger if exists update_fishing_shops_updated_at on public.fishing_shops;
create trigger update_fishing_shops_updated_at
before update on public.fishing_shops
for each row execute function public.update_updated_at_column();

create index if not exists idx_shops_region_city on public.fishing_shops(region, city);

-- =============================================
-- 7. SHOP REVIEWS (recenzii)
-- =============================================
create table if not exists public.shop_reviews (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid not null references public.fishing_shops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  comment text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (shop_id, user_id)
);

alter table public.shop_reviews enable row level security;

drop policy if exists "Anyone can view shop reviews" on public.shop_reviews;
drop policy if exists "Users can insert own reviews" on public.shop_reviews;
drop policy if exists "Users can update own reviews" on public.shop_reviews;

create policy "Anyone can view shop reviews"
  on public.shop_reviews for select using (true);

create policy "Users can insert own reviews"
  on public.shop_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reviews"
  on public.shop_reviews for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own reviews" on public.shop_reviews;
create policy "Users can delete own reviews" on public.shop_reviews for delete using (auth.uid() = user_id);

drop trigger if exists update_shop_reviews_updated_at on public.shop_reviews;
create trigger update_shop_reviews_updated_at
before update on public.shop_reviews
for each row execute function public.update_updated_at_column();

create index if not exists idx_reviews_shop on public.shop_reviews(shop_id);
create index if not exists idx_reviews_user on public.shop_reviews(user_id);

-- Agregare rating magazin
create or replace function public.update_shop_rating()
returns trigger language plpgsql as $$
begin
  update public.fishing_shops s
     set review_count = (select count(*) from public.shop_reviews r where r.shop_id = s.id),
         rating = coalesce((select round(avg(rating)::numeric, 2) from public.shop_reviews r where r.shop_id = s.id), 0)
   where s.id = coalesce(new.shop_id, old.shop_id);
  return null;
end;
$$;

drop trigger if exists trg_reviews_aggregate on public.shop_reviews;
create trigger trg_reviews_aggregate
after insert or update or delete on public.shop_reviews
for each row execute function public.update_shop_rating();

-- =============================================
-- 8. FISHING TECHNIQUES (tehnici)
-- =============================================
create table if not exists public.fishing_techniques (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  category text not null check (category in ('pluta','fund','spinning','fly','ice_fishing','net','other')),
  difficulty_level text check (difficulty_level in ('incepator','mediu','avansat','expert')),
  equipment_needed text[],
  best_season text,
  best_time text,
  target_species text[],
  image_url text,
  video_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.fishing_techniques enable row level security;

drop policy if exists "Anyone can view fishing techniques" on public.fishing_techniques;
create policy "Anyone can view fishing techniques"
  on public.fishing_techniques for select using (true);

drop policy if exists "Admin insert fishing_techniques" on public.fishing_techniques;
drop policy if exists "Admin update fishing_techniques" on public.fishing_techniques;
drop policy if exists "Admin delete fishing_techniques" on public.fishing_techniques;
create policy "Admin insert fishing_techniques" on public.fishing_techniques for insert with check (public.is_admin(auth.uid()));
create policy "Admin update fishing_techniques" on public.fishing_techniques for update using (public.is_admin(auth.uid()));
create policy "Admin delete fishing_techniques" on public.fishing_techniques for delete using (public.is_admin(auth.uid()));

drop trigger if exists update_fishing_techniques_updated_at on public.fishing_techniques;
create trigger update_fishing_techniques_updated_at
before update on public.fishing_techniques
for each row execute function public.update_updated_at_column();

-- =============================================
-- 9. FISHING REGULATIONS (regulamente)
-- =============================================
create table if not exists public.fishing_regulations (
  id uuid default gen_random_uuid() primary key,
  region text not null check (region in ('muntenia','moldova','oltenia','transilvania','banat','crisana','maramures','dobrogea','national')),
  water_type text not null check (water_type in ('lac','rau','baraj','mare','delta','all')),
  species_id uuid references public.fish_species(id),
  species_name text,
  min_size integer,
  max_quantity integer,
  closed_season_start date,
  closed_season_end date,
  special_restrictions text,
  penalty_amount decimal(8,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.fishing_regulations enable row level security;

drop policy if exists "Anyone can view fishing regulations" on public.fishing_regulations;
create policy "Anyone can view fishing regulations"
  on public.fishing_regulations for select using (true);

drop policy if exists "Admin insert fishing_regulations" on public.fishing_regulations;
drop policy if exists "Admin update fishing_regulations" on public.fishing_regulations;
drop policy if exists "Admin delete fishing_regulations" on public.fishing_regulations;
create policy "Admin insert fishing_regulations" on public.fishing_regulations for insert with check (public.is_admin(auth.uid()));
create policy "Admin update fishing_regulations" on public.fishing_regulations for update using (public.is_admin(auth.uid()));
create policy "Admin delete fishing_regulations" on public.fishing_regulations for delete using (public.is_admin(auth.uid()));

drop trigger if exists update_fishing_regulations_updated_at on public.fishing_regulations;
create trigger update_fishing_regulations_updated_at
before update on public.fishing_regulations
for each row execute function public.update_updated_at_column();

-- =============================================
-- 10. USER GEAR (echipamente utilizatori)
-- =============================================
create table if not exists public.user_gear (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  gear_type text not null check (gear_type in ('undita','mulineta','scaun','rucsac','vesta','cizme','altceva')),
  brand text,
  model text,
  description text,
  quantity integer default 1 check (quantity > 0),
  purchase_date date,
  purchase_price decimal(8,2),
  condition text check (condition in ('excelent','bun','mediu','rau')),
  notes text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_gear enable row level security;

drop policy if exists "Users can view own gear" on public.user_gear;
drop policy if exists "Users can insert own gear" on public.user_gear;
drop policy if exists "Users can update own gear" on public.user_gear;
drop policy if exists "Users can delete own gear" on public.user_gear;

create policy "Users can view own gear"
  on public.user_gear for select using (auth.uid() = user_id);

create policy "Users can insert own gear"
  on public.user_gear for insert with check (auth.uid() = user_id);

create policy "Users can update own gear"
  on public.user_gear for update using (auth.uid() = user_id);

create policy "Users can delete own gear"
  on public.user_gear for delete using (auth.uid() = user_id);

drop trigger if exists update_user_gear_updated_at on public.user_gear;
create trigger update_user_gear_updated_at
before update on public.user_gear
for each row execute function public.update_updated_at_column();

create index if not exists idx_user_gear_user on public.user_gear(user_id);

-- =============================================
-- 11. FUNCTIONS & TRIGGERS pentru auth.users
-- =============================================

-- Creează profil automat la signup (setează admin pe e-mailul tău)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, photo_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name',''),
    coalesce(new.raw_user_meta_data->>'avatar_url',''),
    case when lower(new.email) = 'cosmin.trica@outlook.com' then 'admin' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Sincronizează email-ul dacă se schimbă în Auth
create or replace function public.sync_profile_email()
returns trigger as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
       set email = new.email, updated_at = now()
     where id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update on auth.users
for each row execute function public.sync_profile_email();

-- =============================================
-- 12. STORAGE (avatars & thumbnails) - DOAR DACĂ NU EXISTĂ
-- =============================================
-- Creează bucket-urile doar dacă nu există
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
('avatars','avatars', true, 2097152, array['image/jpeg','image/png','image/webp']),
('thumbnails','thumbnails', true, 1048576, array['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Avatars: upload/update/delete doar pe folderul userului; view public
create policy "Users can upload own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can update own avatar" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can delete own avatar" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Anyone can view avatars" on storage.objects
  for select using (bucket_id = 'avatars');

-- Thumbnails: doar autentificați, pe folderul userului; view public
create policy "Authenticated can upload thumbnails" on storage.objects
  for insert with check (bucket_id = 'thumbnails' and auth.role() = 'authenticated' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Authenticated can update own thumbnails" on storage.objects
  for update using (bucket_id = 'thumbnails' and auth.role() = 'authenticated' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Anyone can view thumbnails" on storage.objects
  for select using (bucket_id = 'thumbnails');

-- =============================================
-- 13. FUNCȚII UTILE PENTRU CLIENT
-- =============================================

-- Leaderboard cu nume/poze fără server key
create or replace function public.get_public_profiles()
returns table(id uuid, display_name text, photo_url text)
language sql
security definer
set search_path = public as $$
  select distinct p.id, p.display_name, p.photo_url
  from public.profiles p
  join public.records r on r.user_id = p.id
  where r.status = 'verified';
$$;
grant execute on function public.get_public_profiles() to anon, authenticated;

SELECT '✅ Schema finală aplicată cu succes (fără ștergerea storage-ului)!' as status;
