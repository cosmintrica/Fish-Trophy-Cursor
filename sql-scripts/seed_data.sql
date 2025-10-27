-- Date inițiale pentru Forum Pescuit
-- Conform structurii din planul de dezvoltare

-- =============================================
-- RANGURI UTILIZATORI
-- =============================================

INSERT INTO forum_user_ranks (name, min_points, color, icon) VALUES
('incepator', 0, '#10b981', '🌱'),
('pescar', 51, '#3b82f6', '🎣'),
('experimentat', 201, '#f59e0b', '⭐'),
('expert', 501, '#ef4444', '🏆'),
('maestru', 1000, '#eab308', '👑'),
('moderator', 0, '#8b5cf6', '🛡️'),
('vip', 0, '#6366f1', '💎');

-- =============================================
-- CATEGORII PRINCIPALE
-- =============================================

INSERT INTO forum_categories (id, name, description, icon, sort_order) VALUES
(gen_random_uuid(), 'Pescuit în Apă Dulce', 'Discuții despre pescuitul în râuri, lacuri și bălți din România', '🎣', 1),
(gen_random_uuid(), 'Pescuit în Marea Neagră', 'Pescuit de la mal și din barcă pe litoralul românesc', '🌊', 2),
(gen_random_uuid(), 'Echipament și Accesorii', 'Reviews, recomandări și discuții despre echipamentul de pescuit', '🎯', 3),
(gen_random_uuid(), 'Locuri de Pescuit', 'Recomandări de locații și experiențe de pescuit', '📍', 4),
(gen_random_uuid(), 'Magazinele Partenere', 'Oferte, consultanță și produse de la partenerii noștri', '🏪', 5),
(gen_random_uuid(), 'Comunitatea Pescarilor', 'Prezentări, capturi, întâlniri și discuții generale', '👥', 6),
(gen_random_uuid(), 'Învățare și Educație', 'Ghiduri, tehnici și cunoștințe despre pescuit', '📚', 7),
(gen_random_uuid(), 'Piața Pescarilor', 'Vânzări, cumpărări și schimburi de echipament', '💰', 8);

-- =============================================
-- SUBCATEGORII
-- =============================================

-- Pescuit în Apă Dulce
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order) VALUES
((SELECT id FROM forum_categories WHERE name = 'Pescuit în Apă Dulce'), 'Pescuit la Crap', 'Tehnici, momeli și echipament pentru pescuitul la crap', '🐟', 1),
((SELECT id FROM forum_categories WHERE name = 'Pescuit în Apă Dulce'), 'Pescuit la Păstrăv', 'Locații, sezoane și tactici pentru păstrăv', '🐠', 2),
((SELECT id FROM forum_categories WHERE name = 'Pescuit în Apă Dulce'), 'Pescuit la Șalău', 'Spinning, jigging, trolling pentru șalău', '🐡', 3),
((SELECT id FROM forum_categories WHERE name = 'Pescuit în Apă Dulce'), 'Pescuit la Somn', 'Tehnici nocturne și echipament heavy pentru somn', '🐋', 4),
((SELECT id FROM forum_categories WHERE name = 'Pescuit în Apă Dulce'), 'Pescuit la Plătică', 'Feeder, method și tactici fine pentru plătică', '🐟', 5),
((SELECT id FROM forum_categories WHERE name = 'Pescuit în Apă Dulce'), 'Alte Specii Dulcicole', 'Clean, caras, biban și alte specii', '🐠', 6);

-- Pescuit în Marea Neagră
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order) VALUES
((SELECT id FROM forum_categories WHERE name = 'Pescuit în Marea Neagră'), 'Pescuit de la Mal', 'Surf casting și tehnici litorale', '🏖️', 1),
((SELECT id FROM forum_categories WHERE name = 'Pescuit în Marea Neagră'), 'Pescuit din Barcă', 'Deep sea, trolling și jigging', '⛵', 2),
((SELECT id FROM forum_categories WHERE name = 'Pescuit în Marea Neagră'), 'Pescuit la Calcan', 'Locații, momeli și tactici pentru calcan', '🐟', 3),
((SELECT id FROM forum_categories WHERE name = 'Pescuit în Marea Neagră'), 'Pescuit la Stavrid', 'Sezoane, tehnici și echipament pentru stavrid', '🐠', 4),
((SELECT id FROM forum_categories WHERE name = 'Pescuit în Marea Neagră'), 'Alte Specii Marine', 'Guvid, șprot, rapană și alte specii marine', '🦐', 5);

-- Echipament și Accesorii
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order) VALUES
((SELECT id FROM forum_categories WHERE name = 'Echipament și Accesorii'), 'Lansete și Mulinete', 'Reviews, comparații și recomandări', '🎣', 1),
((SELECT id FROM forum_categories WHERE name = 'Echipament și Accesorii'), 'Momeli și Nade', 'Artificiale, naturale și DIY', '🪱', 2),
((SELECT id FROM forum_categories WHERE name = 'Echipament și Accesorii'), 'Electronice', 'Echosounder, GPS, camere subacvatice', '📱', 3),
((SELECT id FROM forum_categories WHERE name = 'Echipament și Accesorii'), 'Îmbrăcăminte', 'Waders, jackets și accesorii', '🧥', 4),
((SELECT id FROM forum_categories WHERE name = 'Echipament și Accesorii'), 'Accesorii Diverse', 'Plase, scaune, umbrele și altele', '🎒', 5),
((SELECT id FROM forum_categories WHERE name = 'Echipament și Accesorii'), 'DIY și Modificări', 'Proiecte personale și reparații', '🔧', 6);

-- Locuri de Pescuit
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order) VALUES
((SELECT id FROM forum_categories WHERE name = 'Locuri de Pescuit'), 'Râuri și Pâraie', 'Recomandări, accesibilitate și regulamente', '🏞️', 1),
((SELECT id FROM forum_categories WHERE name = 'Locuri de Pescuit'), 'Lacuri și Bălți', 'Lacuri naturale și amenajate', '🏞️', 2),
((SELECT id FROM forum_categories WHERE name = 'Locuri de Pescuit'), 'Lacuri Private', 'Reviews, prețuri și facilități', '🏕️', 3),
((SELECT id FROM forum_categories WHERE name = 'Locuri de Pescuit'), 'Litoralul Românesc', 'Puncte de pescuit și accese pe litoral', '🏖️', 4),
((SELECT id FROM forum_categories WHERE name = 'Locuri de Pescuit'), 'Pescuit în Străinătate', 'Experiențe internaționale', '✈️', 5);

-- Magazinele Partenere
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order, moderator_only) VALUES
((SELECT id FROM forum_categories WHERE name = 'Magazinele Partenere'), 'Oferte Speciale', 'Promoții și discounturi exclusive', '🏷️', 1, true),
((SELECT id FROM forum_categories WHERE name = 'Magazinele Partenere'), 'Produse Noi', 'Lansări și preview-uri', '🆕', 2, true),
((SELECT id FROM forum_categories WHERE name = 'Magazinele Partenere'), 'Consultanță Tehnică', 'Sfaturi de la experți', '💡', 3, false),
((SELECT id FROM forum_categories WHERE name = 'Magazinele Partenere'), 'Service și Reparații', 'Întreținere echipament', '🔧', 4, false);

-- Comunitatea Pescarilor
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order) VALUES
((SELECT id FROM forum_categories WHERE name = 'Comunitatea Pescarilor'), 'Prezentări Membri', 'Salut și povestea ta de pescar', '👋', 1),
((SELECT id FROM forum_categories WHERE name = 'Comunitatea Pescarilor'), 'Capturi și Realizări', 'Galerii foto și povești', '📸', 2),
((SELECT id FROM forum_categories WHERE name = 'Comunitatea Pescarilor'), 'Întâlniri și Evenimente', 'Organizare pescuit în grup', '🤝', 3),
((SELECT id FROM forum_categories WHERE name = 'Comunitatea Pescarilor'), 'Concursuri Forum', 'Captura lunii și provocări', '🏆', 4),
((SELECT id FROM forum_categories WHERE name = 'Comunitatea Pescarilor'), 'Discuții Generale', 'Off-topic, povești și experiențe', '💬', 5);

-- Învățare și Educație
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order) VALUES
((SELECT id FROM forum_categories WHERE name = 'Învățare și Educație'), 'Ghiduri pentru Începători', 'Primii pași în pescuit', '📖', 1),
((SELECT id FROM forum_categories WHERE name = 'Învățare și Educație'), 'Tehnici Avansate', 'Masterclass și trucuri profesionale', '🎓', 2),
((SELECT id FROM forum_categories WHERE name = 'Învățare și Educație'), 'Biologia Peștilor', 'Comportament, habitat și hrană', '🔬', 3),
((SELECT id FROM forum_categories WHERE name = 'Învățare și Educație'), 'Legislație și Regulamente', 'Legi, permise și sancțiuni', '⚖️', 4),
((SELECT id FROM forum_categories WHERE name = 'Învățare și Educație'), 'Conservarea Naturii', 'Catch & release și ecologie', '🌱', 5);

-- Piața Pescarilor
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order) VALUES
((SELECT id FROM forum_categories WHERE name = 'Piața Pescarilor'), 'Vânzări Echipament', 'Second-hand și nou', '💸', 1),
((SELECT id FROM forum_categories WHERE name = 'Piața Pescarilor'), 'Cumpărări și Căutări', 'Cereri specifice', '🔍', 2),
((SELECT id FROM forum_categories WHERE name = 'Piața Pescarilor'), 'Schimburi', 'Troc echipament', '🔄', 3),
((SELECT id FROM forum_categories WHERE name = 'Piața Pescarilor'), 'Servicii', 'Ghizi, transport și cazare', '🛎️', 4);

-- =============================================
-- STATISTICI INIȚIALE
-- =============================================

INSERT INTO forum_stats (stat_name, stat_value) VALUES
('total_users', 0),
('total_topics', 0),
('total_posts', 0),
('online_users', 0);

-- =============================================
-- RECLAME DE EXEMPLU
-- =============================================

INSERT INTO forum_ads (name, type, position, image_url, link_url, start_date, end_date, is_active) VALUES
('Banner Header Principal', 'banner', 'header', '/ads/header-banner.jpg', 'https://example-fishing-store.ro', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', true),
('Sidebar Magazin Echipament', 'banner', 'sidebar', '/ads/sidebar-equipment.jpg', 'https://echipament-pescuit.ro', CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days', true),
('Banner între postări', 'banner', 'between_posts', '/ads/between-posts.jpg', 'https://momeli-pescuit.ro', CURRENT_DATE, CURRENT_DATE + INTERVAL '45 days', true);
