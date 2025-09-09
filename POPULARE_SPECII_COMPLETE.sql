-- =============================================
-- POPULARE SPECII COMPLETE - Compatibil cu schema finală
-- =============================================

BEGIN;

-- ====== 0) Precondiții & normalizări ======
create extension if not exists pgcrypto;

-- default-uri sensibile pe fish_species
alter table public.fish_species
  alter column id set default gen_random_uuid();

-- dacă nu ai default pentru created_at/updated_at, le adaugă:
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='fish_species'
      and column_name='created_at'
  ) then
    alter table public.fish_species add column created_at timestamptz not null default now();
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='fish_species'
      and column_name='updated_at'
  ) then
    alter table public.fish_species add column updated_at timestamptz not null default now();
  end if;
end $$;

-- normalizează tipurile booleene (dacă erau text)
alter table public.fish_species
  alter column is_native    type boolean using (case when is_native::text in ('true','t','1') then true else false end),
  alter column is_protected type boolean using (case when is_protected::text in ('true','t','1') then true else false end);

-- flag de calitate
alter table public.fish_species
  add column if not exists needs_review boolean not null default false;

-- vocabular pentru region (aliniat la locațiile de ape)
alter table public.fish_species drop constraint if exists fish_species_region_check;
alter table public.fish_species
  add constraint fish_species_region_check
  check (region in ('banat','crisana','maramures','transilvania','moldova','dobrogea','muntenia','oltenia'));

-- vocabular pentru water_type
alter table public.fish_species drop constraint if exists fish_species_water_type_check;
alter table public.fish_species
  add constraint fish_species_water_type_check
  check (water_type in ('lac','rau','balti_private','balti_salbatic','fluviu','delta','mare'));

-- index unic (case-insensitive) pe numele comun
create unique index if not exists fish_species_unique_name_ci
  on public.fish_species ((lower(btrim(name))));

-- ====== 1) Tabele pentru metode, momeli, legături ======
create table if not exists public.fish_method (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text
);

create table if not exists public.fish_bait (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  kind text not null check (kind in ('natural','artificial')),
  notes text
);

create table if not exists public.fish_species_method (
  species_id uuid references public.fish_species(id) on delete cascade,
  method_id  uuid references public.fish_method(id)  on delete cascade,
  primary key (species_id, method_id)
);

create table if not exists public.fish_species_bait (
  species_id uuid references public.fish_species(id) on delete cascade,
  bait_id    uuid references public.fish_bait(id)    on delete cascade,
  primary key (species_id, bait_id)
);

-- seed metode
insert into public.fish_method(code,name) values
  ('spinning','Spinning'),
  ('feeder','Feeder'),
  ('pluta','Plută'),
  ('fund','Pescuit la fund'),
  ('trolling','Trolling'),
  ('fly','Mușcărit (fly)'),
  ('jigging','Jigging'),
  ('copca','Pescuit la copcă')
on conflict (code) do nothing;

-- seed momeli
insert into public.fish_bait(name,kind,notes) values
  ('Râme','natural','rame roșii, negre'),
  ('Viermuși','natural','larve'),
  ('Porumb','natural','boabe / conservă'),
  ('Mămăligă','natural',null),
  ('Pâine','natural',null),
  ('Boilies','natural','mixuri carne/plantă'),
  ('Pelete','natural','fishmeal sau sweet'),
  ('Pastă','natural','method / arc'),
  ('Lipitori','natural',null),
  ('Peștișor viu','natural','babușcă, obleț, caras'),
  ('Coropișniță','natural',null),
  ('Vobler','artificial',null),
  ('Linguriță','artificial','oscilantă'),
  ('Rotativă','artificial',null),
  ('Nălucă soft (gumă)','artificial','shad/creatură'),
  ('Jig','artificial','cap plumb'),
  ('Muscă uscată','artificial',null),
  ('Nimfă','artificial',null),
  ('Streamer','artificial',null)
on conflict (name) do nothing;

-- ====== 2) Golește speciile și repopulează ======
truncate table public.fish_species restart identity cascade;

-- set-ul principal (specii comune/confirmate) + câteva ambigue marcate needs_review
with species(name, scientific_name, category, water_type, region,
             min_w, max_w, min_l, max_l, habitat, feeding, spawn, is_native, is_protected, needs_review) as (
values
-- *** STURIONI & MIGRATOARE ***
('Morun','Huso huso','amestec','fluviu','dobrogea', 5,200,100,400,
 'Migrează Marea Neagră ⇄ Dunăre; talveg, gropi adânci.','Prădător (pești, crustacee).','apr–iun', true, true, false),
('Nisetru','Acipenser gueldenstaedtii','amestec','fluviu','dobrogea', 5,50,100,220,
 'Marea Neagră ⇄ Dunăre.','Bentivor/piscivor.','apr–iun', true, true, false),
('Cegă','Acipenser ruthenus','dulce','fluviu','dobrogea', 0.5,8,40,120,
 'Râuri mari, curent moderat.','Bentivor.','apr–iun', true, true, false),
('Păstrugă','Acipenser stellatus','amestec','fluviu','dobrogea', 3,30,80,200,
 'Migrează din mare pe Dunăre.','Piscivor/bentivor.','apr–iun', true, true, false),
('Sturion european','Acipenser sturio','amestec','mare','dobrogea', 5,100,100,300,
 'Specie critic periclitată; apariții rare.','Prădător.','apr–iun', true, true, false),
('Scrumbie de Dunăre','Alosa immaculata','amestec','fluviu','dobrogea', 0.2,1.0,20,40,
 'Migrație de reproducere pe Dunăre primăvara.','Plancton/pui de pește.','mar–mai', true, false, false),
('Hamsie','Engraulis encrasicolus','sarat','mare','dobrogea', 0.01,0.05,8,15,
 'Specie marină costieră.','Plancton.','mai–iul', true, false, false),
('Sprot','Sprattus sprattus','sarat','mare','dobrogea', 0.02,0.08,10,18,
 'Specie marină pelagică.','Plancton.','mai–iun', true, false, false),

-- *** RĂPITORI DULCICOLI ***
('Știucă','Esox lucius','dulce','lac','muntenia', 0.5,20,40,130,
 'Golfuri cu stuf, bălți, lacuri.','Piscivor.','mar–apr', true, false, false),
('Șalău','Sander lucioperca','dulce','lac','muntenia', 0.3,10,25,100,
 'Ape adânci, limpezi; acumulări.','Piscivor.','apr–mai', true, false, false),
('Biban','Perca fluviatilis','dulce','lac','muntenia', 0.2,2,15,50,
 'Lacuri/râuri lente, structură.','Prădător.','mar–apr', true, false, false),
('Avat','Aspius aspius','dulce','fluviu','muntenia', 0.5,6,30,80,
 'Râuri mari, praguri cu curent.','Piscivor pelagic.','apr–iun', true, false, false),
('Somn','Silurus glanis','dulce','lac','muntenia', 1,100,40,250,
 'Râuri mari și lacuri adânci.','Prădător nocturn.','mai–iun', true, false, false),

-- *** CIPRINIDE COMUNE ***
('Crap','Cyprinus carpio','dulce','lac','muntenia', 0.5,25,20,100,
 'Lacuri, bălți, râuri lente.','Omnivor.','apr–iun', true, false, false),
('Caraș','Carassius gibelio','dulce','lac','muntenia', 0.2,4,15,50,
 'Iazuri/bălți cu vegetație.','Omnivor.','mai–iun', false, false, false),
('Caracudă','Carassius carassius','dulce','lac','muntenia', 0.2,3,15,45,
 'Bălți/iazuri cu vegetație.','Omnivor.','mai–iun', true, false, false),
('Plătică','Abramis brama','dulce','lac','muntenia', 0.3,3,20,60,
 'Ape lente, fund mâlos.','Omnivor.','mai–iun', true, false, false),
('Babușcă','Rutilus rutilus','dulce','lac','muntenia', 0.1,1.5,10,45,
 'Lacuri și ape lente.','Omnivor.','apr–iun', true, false, false),
('Roșioară','Scardinius erythrophthalmus','dulce','lac','muntenia', 0.1,1,10,35,
 'Lacuri/iazuri cu vegetație.','Omnivor.','apr–iun', true, false, false),
('Obleț','Alburnus alburnus','dulce','lac','muntenia', 0.05,0.4,8,25,
 'Strat superficial în ape lente.','Plancton/insecte.','mai–iun', true, false, false),
('Clean','Squalius cephalus','dulce','rau','muntenia', 0.3,6,25,80,
 'Râuri colinare/submontane.','Omnivor oportunist.','apr–iun', true, false, false),
('Lin','Tinca tinca','dulce','lac','muntenia', 0.3,5,20,70,
 'Iazuri/lacuri cu nămol și stuf.','Omnivor.','mai–iul', true, false, false),
('Mreană','Barbus barbus','dulce','rau','muntenia', 0.5,6,30,90,
 'Râuri cu curent, pietriș.','Bentivor.','mai–iun', true, false, false),
('Mreană vânătă','Barbus meridionalis','dulce','rau','muntenia', 0.2,2,20,50,
 'Râuri montane/submontane.','Bentivor.','mai–iun', true, false, false),
('Scobar','Chondrostoma nasus','dulce','rau','muntenia', 0.2,3,20,60,
 'Râuri cu curent, substrat tare.','Alge/invertebrate.','apr–mai', true, false, false),
('Sânger','Hypophthalmichthys molitrix','dulce','lac','muntenia', 1,30,30,120,
 'Lacuri mari/acumulări.','Planctonofag.','mai–iun', false, false, false),
('Novac','Hypophthalmichthys nobilis','dulce','lac','muntenia', 1,30,30,120,
 'Lacuri mari/acumulări.','Planctonofag.','mai–iun', false, false, false),
('Cosaș (Amur)','Ctenopharyngodon idella','dulce','lac','muntenia', 1,35,30,130,
 'Lacuri și canale cu vegetație.','Fitofag.','mai–iun', false, false, false),
('Boarță','Rhodeus amarus','dulce','lac','muntenia', 0.02,0.1,5,10,
 'Canale/lacuri; depune în scoici.','Omnivor.','apr–iun', true, true, false),
('Ghindel (ghiodel)','Gasterosteus aculeatus','dulce','lac','dobrogea', 0.01,0.05,4,8,
 'Ape puțin adânci, stuf.','Insectivor.','mai–iun', true, false, false),
('Boiștean','Leucaspius delineatus','dulce','lac','muntenia', 0.01,0.05,5,9,
 'Iazuri, bălți, canale.','Insectivor.','mai–iun', true, false, false),
('Văduviță','Alburnoides bipunctatus','dulce','rau','muntenia', 0.02,0.2,8,15,
 'Râuri cu curent, praguri/pietriș.','Insectivor.','apr–iun', true, true, false),
('Sabiță','Pelecus cultratus','dulce','fluviu','dobrogea', 0.5,5,25,60,
 'Dunăre și lacuri litorale.','Plancton/pui de pești.','apr–iun', true, false, false),

-- *** SALMONIDE ***
('Păstrăv indigen','Salmo trutta fario','dulce','rau','transilvania', 0.2,4,20,70,
 'Râuri reci, oxigenate.','Prădător.','oct–feb', true, true, false),
('Păstrăv curcubeu','Oncorhynchus mykiss','dulce','rau','transilvania', 0.2,5,20,80,
 'Râuri/lacuri montane.','Prădător.','apr–iun', false, false, false),
('Păstrăv fântânel','Salvelinus fontinalis','dulce','rau','transilvania', 0.2,3,20,60,
 'Râuri montane reci.','Prădător.','apr–iun', false, false, false),
('Lipan','Thymallus thymallus','dulce','rau','transilvania', 0.2,2,20,60,
 'Râuri reci, curent.','Insectivor.','apr–iun', true, true, false),
('Lostriță','Hucho hucho','dulce','rau','transilvania', 1,30,60,130,
 'Râuri montane mari.','Prădător.','mar–apr', true, true, false),

-- *** COD & SCULPINI / LOACHES ***
('Zglăvoacă','Cottus gobio','dulce','rau','transilvania', 0.02,0.15,6,12,
 'Râuri montane, pietroase.','Bentivor.','apr–iun', true, true, false),
('Zglăvoacă răsăriteană','Cottus poecilopus','dulce','rau','transilvania', 0.02,0.20,6,14,
 'Ape reci din Carpați.','Bentivor.','apr–iun', true, true, false),
('Sabanejewia balcanica','Sabanejewia balcanica','dulce','rau','muntenia', 0.01,0.05,5,12,
 'Râuri colinare.','Bentivor.','mai–iun', true, true, false),
('Zvârlugă (stone loach)','Barbatula barbatula','dulce','rau','transilvania', 0.01,0.05,6,12,
 'Râuri reci, pietriș.','Bentivor.','apr–iun', true, false, false),

-- *** GOBIIDE (guvizi) – unele marcate pentru revizie ***
('Guvid de Dunăre','Neogobius fluviatilis','dulce','delta','dobrogea', 0.02,0.2,6,15,
 'Dunăre, lacuri deltaice.','Carnivor mic.','apr–iun', true, false, false),
('Guvid negru','Gobius niger','sarat','mare','dobrogea', 0.02,0.3,6,20,
 'Lagune și mare.','Prădător mic.','apr–iun', true, false, false),
('Guvid ratan','Neogobius ratan','sarat','mare','dobrogea', 0.02,0.3,6,20,
 'Mare/lagune.','Prădător mic.','apr–iun', true, false, false),
('Guvid de iarbă','Zosterisessor ophiocephalus','sarat','mare','dobrogea', 0.02,0.3,6,20,
 'Ierburi submerse, lagune.','Prădător.','apr–iun', true, false, false),
('Guvid de nisip','Pomatoschistus minutus','sarat','mare','dobrogea', 0.01,0.08,5,10,
 'Nisip litoral.','Prădător mic.','apr–iun', true, false, false),
('Guvid de mâl (round goby)','Neogobius melanostomus','amestec','delta','dobrogea', 0.02,0.3,6,20,
 'Dunăre/mare; invaziv.','Prădător.','apr–iun', false, false, false),
('Guvid cu cap mare','Ponticola kessleri','amestec','fluviu','dobrogea', 0.02,0.3,6,22,
 'Dunăre și afluenți.','Prădător mic.','apr–iun', true, false, false),
('Guvid străveziu','Aphia minuta','sarat','mare','dobrogea', 0.001,0.01,3,6,
 'Pelagic costier.','Plancton.','apr–iun', true, false, false),
('Guvid mic (revizuire)','', 'amestec','delta','dobrogea', null,null,null,null,
 'Guvid foarte mic (lagune deltaice).','', '', true, false, true),
('Guvid cu coada lungă (revizuire)','', 'sarat','mare','dobrogea', null,null,null,null,
 'Probabil gobiid pelagic.', '', '', true, false, true),
('Guvid de baltă (revizuire)','', 'amestec','delta','dobrogea', null,null,null,null,
 'Gobiid din lacuri interioare.', '', '', true, false, true),
('Guvid de Razelm (revizuire)','', 'amestec','delta','dobrogea', null,null,null,null,
 'Gobiid specific complexului Razim-Sinoe.', '', '', true, false, true),

-- *** ALTELE ***
('Anghilă europeană (țipar)','Anguilla anguilla','amestec','lac','muntenia', 0.2,4,40,120,
 'Râuri/lacuri; se reproduce în Atlantic (Sargasso).','Prădător nocturn.','—', true, true, false),
('Mihalț (burbot)','Lota lota','dulce','rau','transilvania', 0.3,5,30,80,
 'Râuri reci; activ iarna.','Prădător.','dec–feb', true, true, false),

-- *** ENTRIES AMBIGUE (marcate pentru revizie) ***
('Scrumbie de mare (revizuire)','', 'sarat','mare','dobrogea', null,null,null,null,
 'Termen popular pentru specii marine (ex. macrou).','', '', true, false, true),
('Scrumbie albastră (revizuire)','', 'sarat','mare','dobrogea', null,null,null,null,'', '', '', true, false, true),
('Gingirică','Atherina boyeri','sarat','mare','dobrogea', 0.005,0.02,5,12,
 'Lagune/mare; bancuri.','Plancton.','mai–iul', true, false, false),
('Clean dungat (revizuire)','', 'dulce','rau','muntenia', null,null,null,null,'', '', '', true, false, true),
('Tarancă (revizuire)','', 'dulce','lac','muntenia', null,null,null,null,'', '', '', true, false, true),
('Șip (revizuire)','', 'dulce','lac','muntenia', null,null,null,null,'', '', '', true, false, true),
('Răspăr (alias ghiborț, revizuire)','', 'dulce','lac','muntenia', null,null,null,null,'', '', '', true, false, true),
('Umflătură (revizuire)','', 'dulce','lac','muntenia', null,null,null,null,'', '', '', true, false, true),
('Cosaș cu bot turtit (revizuire)','', 'dulce','lac','muntenia', null,null,null,null,'', '', '', true, false, true),
('Zimbraș (prob. Vimba vimba)','Vimba vimba','dulce','fluviu','muntenia', 0.2,1.5,20,50,
 'Râuri mari (Dunăre și afluenți).','Omnivor.','apr–iun', true, false, true),
('Porcușor de nisip','Gobio gobio','dulce','rau','muntenia', 0.02,0.15,6,14,
 'Râuri mici/medii.','Bentivor.','apr–iun', true, false, false),
('Porcușor de vad (revizuire)','', 'dulce','rau','muntenia', null,null,null,null,'', '', '', true, false, true),
('Porcușorul lui Antipa','Romanogobio antipa','dulce','fluviu','dobrogea', 0.02,0.2,6,14,
 'Sectorul inferior al Dunării.','Bentivor.','apr–iun', true, true, false),
('Gambuzie','Gambusia holbrooki','dulce','lac','dobrogea', 0.001,0.01,3,6,
 'Ape mici, invazivă.','Insectivor (larve).','mai–aug', false, false, false),
('Caras auriu','Carassius auratus','dulce','lac','muntenia', 0.1,3,10,45,
 'Bălți/iazuri.','Omnivor.','mai–iun', false, false, false),
('Pește spatulă (paddlefish)','Polyodon spathula','dulce','lac','muntenia', 1,40,50,200,
 'Cresă/amenajări piscicole; introdus.','Planctonofag.','—', false, false, true)
)
insert into public.fish_species
  (name, scientific_name, category, water_type, region,
   min_weight, max_weight, min_length, max_length,
   description, habitat, feeding_habits, spawning_season,
   image_url, is_native, is_protected, needs_review)
select
  name, nullif(scientific_name,''), category, water_type, region,
  min_w, max_w, min_l, max_l,
  null, habitat, feeding, spawn,
  null, is_native, is_protected, coalesce(needs_review,false)
from species;

-- timestamp actualizat
update public.fish_species set updated_at = now();

-- ====== 3a) Legături SPECIE ↔ METODE ======
WITH s AS (
  SELECT lower(name) AS lname, id FROM public.fish_species
),
m AS (
  SELECT code, id FROM public.fish_method
)
INSERT INTO public.fish_species_method (species_id, method_id)
SELECT s.id, m2.id
FROM s
JOIN LATERAL (
  SELECT unnest(
    CASE
      WHEN s.lname = 'somn' THEN ARRAY['spinning','fund','trolling']
      WHEN s.lname = 'știucă' THEN ARRAY['spinning','trolling','copca']
      WHEN s.lname = 'șalău' THEN ARRAY['spinning','jigging','trolling']
      WHEN s.lname = 'biban' THEN ARRAY['spinning','pluta']
      WHEN s.lname = 'avat' THEN ARRAY['spinning']
      WHEN s.lname IN ('păstrăv indigen','păstrăv curcubeu','păstrăv fântânel','lipan','lostriță')
        THEN ARRAY['fly','spinning']
      ELSE ARRAY['feeder','pluta']
    END
  ) AS code
) x ON TRUE
JOIN m m2 ON m2.code = x.code
WHERE s.lname IN (
  'somn','știucă','șalău','biban','avat',
  'crap','lin','plătică','babușcă','roșioară','obleț','oblet',
  'mreană','scobar','păstrăv indigen','păstrăv curcubeu','păstrăv fântânel','lipan','lostriță'
)
ON CONFLICT DO NOTHING;

-- ====== 3b) Legături SPECIE ↔ MOMELI ======
WITH s AS (
  SELECT lower(name) AS lname, id FROM public.fish_species
),
b AS (
  SELECT lower(name) AS lname, id FROM public.fish_bait
)
INSERT INTO public.fish_species_bait (species_id, bait_id)
SELECT s.id, b2.id
FROM s
JOIN LATERAL (
  SELECT unnest(
    CASE
      WHEN s.lname = 'somn' THEN ARRAY['peștișor viu','lipitori','râme','coropișniță','nălucă soft (gumă)','vobler','linguriță','rotativă']
      WHEN s.lname = 'crap' THEN ARRAY['porumb','boilies','pelete','mămăligă','pâine','viermuși']
      WHEN s.lname = 'știucă' THEN ARRAY['peștișor viu','vobler','linguriță','rotativă','nălucă soft (gumă)']
      WHEN s.lname = 'șalău' THEN ARRAY['nălucă soft (gumă)','jig','peștișor viu','vobler']
      WHEN s.lname = 'biban' THEN ARRAY['viermuși','râme','nălucă soft (gumă)','rotativă']
      WHEN s.lname = 'avat' THEN ARRAY['rotativă','vobler','linguriță']
      WHEN s.lname IN ('păstrăv indigen','păstrăv curcubeu','păstrăv fântânel','lipan','lostriță')
        THEN ARRAY['muscă uscată','nimfă','streamer','rotativă']
      ELSE ARRAY['râme','viermuși','porumb','pâine']
    END
  ) AS bait_name
) x ON TRUE
JOIN b b2 ON b2.lname = lower(x.bait_name)
WHERE s.lname IN (
  'somn','crap','știucă','șalău','biban','avat',
  'lin','plătică','babușcă','roșioară','obleț','oblet','mreană','scobar',
  'păstrăv indigen','păstrăv curcubeu','păstrăv fântânel','lipan','lostriță'
)
ON CONFLICT DO NOTHING;

COMMIT;
