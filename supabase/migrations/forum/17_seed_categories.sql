-- =============================================
-- Migration 17: Seed Categories (Categorii Reale)
-- =============================================
-- Descriere: Populează categoriile, subforumurile și subcategoriile complete
-- conform planului Fish Trophy Forum
-- Dependințe: 03_categories.sql
-- =============================================

-- =============================================
-- 1. CATEGORII PRINCIPALE
-- =============================================

INSERT INTO forum_categories (name, description, icon, sort_order) VALUES
('Tehnici de Pescuit', 'Toate tehnicile de pescuit: la fund, spinning, muscă, plută', '🎣', 1),
('Echipamente și Accesorii', 'Lansete, mulinete, momeli, gear și accesorii', '🎒', 2),
('Locații de Pescuit', 'Lacuri, râuri, bălți private și locații pescuit', '🗺️', 3),
('Capturi și Recorduri', 'Împărtășiți capturile și recordurile voastre', '🏆', 4),
('Competițiiși Concursuri', 'Evenimente,

 concursuri și competiții', '🥇', 5),
('Piața Pescarului', 'Vânzări gear, momeli și echipamente între pescar', '🛒', 6),
('Zona Comercială', 'Magazine și firme verificate (doar cu contract)', '🏪', 7),
('Știri și Evenimente', 'Noutăți din lumea pescuitului', '📰', 8),
('Comunitate', 'Discuții generale, povești, tutoriale', '💬', 9),
('Conservare și Mediu', 'Proiecte comunitare și conștientizare', '🌱', 10),
('Raportare Braconaj', 'Sesizări braconaj (reguli stricte)', '🚨', 11),
('Feedback și Suport', 'Sugestii, bugs și feedback pentru forum', '💡', 12);

-- =============================================
-- 2. SUBCATEGORII (organizare directă sub categorii)
-- =============================================

-- Tehnici de Pescuit (categoria 1)
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order) 
SELECT id, 'Pescuit Staționar / La Fund', 'Tehnici pescuit la fund: feeder, method, crap, somn', '⚓', 1 FROM forum_categories WHERE name = 'Tehnici de Pescuit';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Spinning & Pescuit Activ', 'Spinning, jigging, topwater pentru știucă, șalău, păstrăv', '🎣', 2 FROM forum_categories WHERE name = 'Tehnici de Pescuit';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Pescuit cu Muscă (Fly Fishing)', 'Fly fishing: ninfe, muște uscate, tying', '🪰', 3 FROM forum_categories WHERE name = 'Tehnici de Pescuit';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Pescuit la Plută și Match', 'Pescuit la plută, boloneză, match fishing', '🎈', 4 FROM forum_categories WHERE name = 'Tehnici de Pescuit';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Pescuit Nocturn', 'Tehnici pescuit nocturn: somn, crap, răpitori', '🌙', 5 FROM forum_categories WHERE name = 'Tehnici de Pescuit';

-- Echipamente și Accesorii (categoria 2)
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Lansete', 'Recenzii și discuții despre lansete: crap, spinning, muscă, feeder', '🎣', 1 FROM forum_categories WHERE name = 'Echipamente și Accesorii';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Mulinete și Multiplicatoare', 'Mulinete spinning, crap, multiplicatoare casting', '🎡', 2 FROM forum_categories WHERE name = 'Echipamente și Accesorii';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Fire și Braid', 'Monofilament, fluorocarbon, braid, leadcore', '🧵', 3 FROM forum_categories WHERE name = 'Echipamente și Accesorii';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Momeli Artificiale', 'Wobblere, shad, spinnerbait, topwater, jiguri', '🐟', 4 FROM forum_categories WHERE name = 'Echipamente și Accesorii';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Momeli Naturale și Boilies', 'Boilies, pop-up, viermi, porumb, pelete', '🌽', 5 FROM forum_categories WHERE name = 'Echipamente și Accesorii';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Accesorii și DIY', 'Rod pod, swingere, senzori, echosondă, DIY gear', '🔧', 6 FROM forum_categories WHERE name = 'Echipamente și Accesorii';

-- Locații de Pescuit (categoria 3)
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Lacuri Libere', 'Lacuri de acumulare publice: Snagov, Vidraru, Bicaz, etc.', '🏞️', 1 FROM forum_categories WHERE name = 'Locații de Pescuit';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Bălți Private', 'Bălți cu plată (administratori pot crea topicuri proprii)', '🏕️', 2 FROM forum_categories WHERE name = 'Locații de Pescuit';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Râuri și Pâraie', 'Pescuit în râuri: Dunăre, Olt, Mureș, Someș, pâraie munte', '🌊', 3 FROM forum_categories WHERE name = 'Locații de Pescuit';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Pescuit în Delta Dunării', 'Locații și tehnici specifice Delta', '🦆', 4 FROM forum_categories WHERE name = 'Locații de Pescuit';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Pescuit în Străinătate', 'Experiențe pescuit internațional: Norvegia, Spania, etc.', '✈️', 5 FROM forum_categories WHERE name = 'Locații de Pescuit';

-- Capturi și Recorduri (categoria 4)
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Capturi Crap', 'Împărtășiți capturile de crap', '🐟', 1 FROM forum_categories WHERE name = 'Capturi și Recorduri';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Capturi Somn', 'Capturi de somn', '🐋', 2 FROM forum_categories WHERE name = 'Capturi și Recorduri';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Capturi Știucă și Șalău', 'Răpitori: știucă, șalău', '🦈', 3 FROM forum_categories WHERE name = 'Capturi și Recorduri';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Capturi Păstrăv', 'Capturi păstrăv: indigen, curcubeu, fario', '🌈', 4 FROM forum_categories WHERE name = 'Capturi și Recorduri';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Capturi Exotice', 'Black bass, clean, amur, etc.', '🐠', 5 FROM forum_categories WHERE name = 'Capturi și Recorduri';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Recorduri Verificate', 'Recorduri oficiale verificate de Fish Trophy', '🏆', 6 FROM forum_categories WHERE name = 'Capturi și Recorduri';

-- Competiții și Concursuri (categoria 5)
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Anunțuri Concursuri', 'Anunțuri evenimente și competiții viitoare', '📢', 1 FROM forum_categories WHERE name = 'Competiții și Concursuri';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Rezultate și Clasamente', 'Rezultate concursuri, clasamente, performanțe', '🥇', 2 FROM forum_categories WHERE name = 'Competiții și Concursuri';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Concursuri Fish Trophy', 'Concursuri organizate de comunitatea Fish Trophy', '🎯', 3 FROM forum_categories WHERE name = 'Competiții și Concursuri';

-- Piața Pescarului (categoria 6)
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Vânzări Gear', 'Vânzări lansete, mulinete, accesorii (reguli: 15 zile cont, 10 rep, 25 posts)', '💰', 1 FROM forum_categories WHERE name = 'Piața Pescarului';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Vânzări Momeli', 'Vânzări momeli artificiale și naturale', '🎁', 2 FROM forum_categories WHERE name = 'Piața Pescarului';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Cereri de Cumpărare', 'Caută echipamente specifice', '🔍', 3 FROM forum_categories WHERE name = 'Piața Pescarului';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Feedback Tranzacții', 'Evaluări vânzători și cumpărători', '⭐', 4 FROM forum_categories WHERE name = 'Piața Pescarului';

-- Zona Comercială (categoria 7)
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Magazine și Oferte', 'Doar firme verificate cu contract (CUI, documente)', '🏪', 1 FROM forum_categories WHERE name = 'Zona Comercială';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Recenzii Magazine', 'Experiențe cu magazine de pescuit', '📝', 2 FROM forum_categories WHERE name = 'Zona Comercială';

-- Știri și Evenimente (categoria 8)
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Știri Pescuit România', 'Noutăți legislative, știri locale', '📰', 1 FROM forum_categories WHERE name = 'Știri și Evenimente';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Evenimente și Târguri', 'Târguri pescuit, expoziții, demo-uri', '🎪', 2 FROM forum_categories WHERE name = 'Știri și Evenimente';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Legislație și Permise', 'Ghid permise pescuit, acte necesare, prețuri', '📜', 3 FROM forum_categories WHERE name = 'Știri și Evenimente';

-- Comunitate (categoria 9)
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Povești de Pescuit', 'Experiențe și întâmplări memorabile', '📖', 1 FROM forum_categories WHERE name = 'Comunitate';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Tutoriale și Ghiduri', 'Tutoriale pas cu pas: montaje, tehnici, DIY', '📚', 2 FROM forum_categories WHERE name = 'Comunitate';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Debutanți - Întrebări', 'Secțiune pentru începători', '🌱', 3 FROM forum_categories WHERE name = 'Comunitate';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Off-Topic', 'Discuții generale non-pescuit', '💬', 4 FROM forum_categories WHERE name = 'Comunitate';

-- Conservare și Mediu (categoria 10)
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Proiecte Comunitare', 'Curățare ape, populare, însămânțări puiet', '🌍', 1 FROM forum_categories WHERE name = 'Conservare și Mediu';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Catch & Release', 'Tehnici și discuții despre pescuitul conservaționist', '🔄', 2 FROM forum_categories WHERE name = 'Conservare și Mediu';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Educație și Conștientizare', 'Articole educaționale despre conservare', '📖', 3 FROM forum_categories WHERE name = 'Conservare și Mediu';

-- Raportare Braconaj (categoria 11)
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Sesizări Braconaj', 'Raportare ilegale - DOVEZI OBLIGATORII (ban pentru fake)', '🚨', 1 FROM forum_categories WHERE name = 'Raportare Braconaj';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Regulament Raportare', 'Ghid: cum să raportezi corect, ce dovezi sunt necesare', '📋', 2 FROM forum_categories WHERE name = 'Raportare Braconaj';

-- Feedback și Suport (categoria 12)
INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Feedback Pozitiv', 'Aprecieri și mulțumiri', '👍', 1 FROM forum_categories WHERE name = 'Feedback și Suport';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Feedback Negativ', 'Critici constructive', '👎', 2 FROM forum_categories WHERE name = 'Feedback și Suport';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Sugestii Noi', 'Idei pentru îmbunătățirea forumului', '💡', 3 FROM forum_categories WHERE name = 'Feedback și Suport';

INSERT INTO forum_subcategories (category_id, name, description, icon, sort_order)
SELECT id, 'Raportare Bugs', 'Probleme tehnice și erori', '🐛', 4 FROM forum_categories WHERE name = 'Feedback și Suport';

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON TABLE forum_categories IS 'Seeded cu 12 categorii principale conform planului Fish Trophy';
COMMENT ON TABLE forum_subcategories IS 'Seeded cu 50+ subcategorii organizate tematic';
