-- =============================================
-- BACKUP BAZA DE DATE - ÎNAINTE DE FIX RLS
-- Data: 2025-01-28
-- Scop: Backup de siguranță înainte de actualizarea schema-ului
-- =============================================
-- 
-- IMPORTANT: Rulează acest script în Supabase SQL Editor
-- pentru a face backup la toate datele importante
-- =============================================

-- 1. Verifică numărul total de înregistrări (pentru verificare)
SELECT
    'TOTAL RECORDS' as info,
    (SELECT COUNT(*) FROM profiles) as profiles,
    (SELECT COUNT(*) FROM fishing_locations) as fishing_locations,
    (SELECT COUNT(*) FROM fish_species) as fish_species,
    (SELECT COUNT(*) FROM records) as records,
    (SELECT COUNT(*) FROM user_gear) as user_gear,
    (SELECT COUNT(*) FROM catches) as catches,
    (SELECT COUNT(*) FROM private_messages) as private_messages;

-- 2. Export PROFILES (toate coloanele)
COPY (
    SELECT * FROM profiles
) TO STDOUT WITH CSV HEADER;

-- 3. Export RECORDS (toate coloanele)
COPY (
    SELECT * FROM records
) TO STDOUT WITH CSV HEADER;

-- 4. Export FISHING_LOCATIONS (toate coloanele)
COPY (
    SELECT * FROM fishing_locations
) TO STDOUT WITH CSV HEADER;

-- 5. Export FISH_SPECIES (toate coloanele)
COPY (
    SELECT * FROM fish_species
) TO STDOUT WITH CSV HEADER;

-- 6. Export USER_GEAR (toate coloanele)
COPY (
    SELECT * FROM user_gear
) TO STDOUT WITH CSV HEADER;

-- 7. Export CATCHES (toate coloanele)
COPY (
    SELECT * FROM catches
) TO STDOUT WITH CSV HEADER;

-- 8. Export PRIVATE_MESSAGES (toate coloanele)
COPY (
    SELECT * FROM private_messages
) TO STDOUT WITH CSV HEADER;

-- NOTĂ: Pentru export complet, folosește comanda:
-- supabase db dump --linked > backup_complet_20250128.sql
-- în terminal

