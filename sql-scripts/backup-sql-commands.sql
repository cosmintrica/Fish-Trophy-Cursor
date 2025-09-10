-- =============================================
-- BACKUP BAZA DE DATE FISH TROPHY
--
-- Rulează aceste comenzi în Supabase SQL Editor
-- pentru a face backup la toate datele
-- =============================================

-- 1. Verifică numărul total de înregistrări
SELECT
    'TOTAL RECORDS' as info,
    (SELECT COUNT(*) FROM profiles) as profiles,
    (SELECT COUNT(*) FROM fishing_locations) as fishing_locations,
    (SELECT COUNT(*) FROM fish_species) as fish_species,
    (SELECT COUNT(*) FROM records) as records,
    (SELECT COUNT(*) FROM record_images) as record_images,
    (SELECT COUNT(*) FROM record_videos) as record_videos,
    (SELECT COUNT(*) FROM fishing_shops) as fishing_shops,
    (SELECT COUNT(*) FROM parking_spots) as parking_spots,
    (SELECT COUNT(*) FROM educational_content) as educational_content,
    (SELECT COUNT(*) FROM analytics_events) as analytics_events,
    (SELECT COUNT(*) FROM user_sessions) as user_sessions,
    (SELECT COUNT(*) FROM admin_actions) as admin_actions;

-- 2. Backup PROFILES
SELECT
    'PROFILES_BACKUP' as table_name,
    json_agg(row_to_json(profiles)) as data
FROM profiles;

-- 3. Backup FISHING_LOCATIONS
SELECT
    'FISHING_LOCATIONS_BACKUP' as table_name,
    json_agg(row_to_json(fishing_locations)) as data
FROM fishing_locations;

-- 4. Backup FISH_SPECIES
SELECT
    'FISH_SPECIES_BACKUP' as table_name,
    json_agg(row_to_json(fish_species)) as data
FROM fish_species;

-- 5. Backup RECORDS
SELECT
    'RECORDS_BACKUP' as table_name,
    json_agg(row_to_json(records)) as data
FROM records;

-- 6. Backup RECORD_IMAGES
SELECT
    'RECORD_IMAGES_BACKUP' as table_name,
    json_agg(row_to_json(record_images)) as data
FROM record_images;

-- 7. Backup RECORD_VIDEOS
SELECT
    'RECORD_VIDEOS_BACKUP' as table_name,
    json_agg(row_to_json(record_videos)) as data
FROM record_videos;

-- 8. Backup FISHING_SHOPS
SELECT
    'FISHING_SHOPS_BACKUP' as table_name,
    json_agg(row_to_json(fishing_shops)) as data
FROM fishing_shops;

-- 9. Backup PARKING_SPOTS
SELECT
    'PARKING_SPOTS_BACKUP' as table_name,
    json_agg(row_to_json(parking_spots)) as data
FROM parking_spots;

-- 10. Backup EDUCATIONAL_CONTENT
SELECT
    'EDUCATIONAL_CONTENT_BACKUP' as table_name,
    json_agg(row_to_json(educational_content)) as data
FROM educational_content;

-- 11. Backup ANALYTICS_EVENTS
SELECT
    'ANALYTICS_EVENTS_BACKUP' as table_name,
    json_agg(row_to_json(analytics_events)) as data
FROM analytics_events;

-- 12. Backup USER_SESSIONS
SELECT
    'USER_SESSIONS_BACKUP' as table_name,
    json_agg(row_to_json(user_sessions)) as data
FROM user_sessions;

-- 13. Backup ADMIN_ACTIONS
SELECT
    'ADMIN_ACTIONS_BACKUP' as table_name,
    json_agg(row_to_json(admin_actions)) as data
FROM admin_actions;

-- 14. Backup CITIES
SELECT
    'CITIES_BACKUP' as table_name,
    json_agg(row_to_json(cities)) as data
FROM cities;

-- 15. Backup COUNTIES
SELECT
    'COUNTIES_BACKUP' as table_name,
    json_agg(row_to_json(counties)) as data
FROM counties;

