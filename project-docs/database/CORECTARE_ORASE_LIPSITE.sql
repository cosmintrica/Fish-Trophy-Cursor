-- =============================================
-- CORECTARE ORAȘE LIPSITE - FISH TROPHY
--
-- Acest script adaugă orașele lipsă în tabelele cities și counties
-- pentru a ajunge de la 282 la 319 orașe
--
-- ⚠️  IMPORTANT: Rulează backup înainte de execuție!
-- =============================================

-- Verifică orașele existente
SELECT
    c.county_id,
    co.name as county_name,
    COUNT(c.id) as orase_existente
FROM cities c
JOIN counties co ON c.county_id = co.id
GROUP BY c.county_id, co.name
ORDER BY c.county_id;

-- =============================================
-- ORAȘE LIPSITE PENTRU FIECARE JUDEȚ
-- =============================================

-- ALBA - Adaugă orașe lipsă
INSERT INTO cities (id, name, county_id, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'Abrud', 'alba', now(), now()),
    (uuid_generate_v4(), 'Baia de Arieș', 'alba', now(), now()),
    (uuid_generate_v4(), 'Blaj', 'alba', now(), now()),
    (uuid_generate_v4(), 'Câmpeni', 'alba', now(), now()),
    (uuid_generate_v4(), 'Cugir', 'alba', now(), now()),
    (uuid_generate_v4(), 'Ocna Mureș', 'alba', now(), now()),
    (uuid_generate_v4(), 'Sebeș', 'alba', now(), now()),
    (uuid_generate_v4(), 'Teiuș', 'alba', now(), now()),
    (uuid_generate_v4(), 'Zlatna', 'alba', now(), now());

-- ARAD - Adaugă orașe lipsă
INSERT INTO cities (id, name, county_id, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'Chișineu-Criș', 'arad', now(), now()),
    (uuid_generate_v4(), 'Curtici', 'arad', now(), now()),
    (uuid_generate_v4(), 'Ineu', 'arad', now(), now()),
    (uuid_generate_v4(), 'Lipova', 'arad', now(), now()),
    (uuid_generate_v4(), 'Nădlac', 'arad', now(), now()),
    (uuid_generate_v4(), 'Pâncota', 'arad', now(), now()),
    (uuid_generate_v4(), 'Pecica', 'arad', now(), now()),
    (uuid_generate_v4(), 'Sântana', 'arad', now(), now()),
    (uuid_generate_v4(), 'Sebiș', 'arad', now(), now());

-- ARGEȘ - Adaugă orașe lipsă
INSERT INTO cities (id, name, county_id, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'Coștești', 'arges', now(), now()),
    (uuid_generate_v4(), 'Mioveni', 'arges', now(), now()),
    (uuid_generate_v4(), 'Ștefănești', 'arges', now(), now()),
    (uuid_generate_v4(), 'Topoloveni', 'arges', now(), now());

-- BACĂU - Adaugă orașe lipsă
INSERT INTO cities (id, name, county_id, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'Buhuși', 'bacau', now(), now()),
    (uuid_generate_v4(), 'Comănești', 'bacau', now(), now()),
    (uuid_generate_v4(), 'Dărmănești', 'bacau', now(), now()),
    (uuid_generate_v4(), 'Moinesti', 'bacau', now(), now()),
    (uuid_generate_v4(), 'Slănic-Moldova', 'bacau', now(), now()),
    (uuid_generate_v4(), 'Târgu Ocna', 'bacau', now(), now());

-- BIHOR - Adaugă orașe lipsă
INSERT INTO cities (id, name, county_id, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'Aleșd', 'bihor', now(), now()),
    (uuid_generate_v4(), 'Beiuș', 'bihor', now(), now()),
    (uuid_generate_v4(), 'Marghita', 'bihor', now(), now()),
    (uuid_generate_v4(), 'Salonta', 'bihor', now(), now()),
    (uuid_generate_v4(), 'Valea lui Mihai', 'bihor', now(), now());

-- BISTRIȚA-NĂSĂUD - Adaugă orașe lipsă
INSERT INTO cities (id, name, county_id, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'Beclean', 'bistrita-nasaud', now(), now()),
    (uuid_generate_v4(), 'Năsăud', 'bistrita-nasaud', now(), now()),
    (uuid_generate_v4(), 'Sângeorz-Băi', 'bistrita-nasaud', now(), now());

-- BOTOȘANI - Adaugă orașe lipsă
INSERT INTO cities (id, name, county_id, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'Bucecea', 'botosani', now(), now()),
    (uuid_generate_v4(), 'Darabani', 'botosani', now(), now()),
    (uuid_generate_v4(), 'Flămânzi', 'botosani', now(), now()),
    (uuid_generate_v4(), 'Săveni', 'botosani', now(), now()),
    (uuid_generate_v4(), 'Ștefănești', 'botosani', now(), now());

-- BRĂILA - Adaugă orașe lipsă
INSERT INTO cities (id, name, county_id, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'Faurei', 'braila', now(), now()),
    (uuid_generate_v4(), 'Ianca', 'braila', now(), now()),
    (uuid_generate_v4(), 'Însurăței', 'braila', now(), now());

-- BRAȘOV - Adaugă orașe lipsă
INSERT INTO cities (id, name, county_id, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'Codlea', 'brasov', now(), now()),
    (uuid_generate_v4(), 'Ghimbav', 'brasov', now(), now()),
    (uuid_generate_v4(), 'Predeal', 'brasov', now(), now()),
    (uuid_generate_v4(), 'Râșnov', 'brasov', now(), now()),
    (uuid_generate_v4(), 'Rupea', 'brasov', now(), now()),
    (uuid_generate_v4(), 'Săcele', 'brasov', now(), now()),
    (uuid_generate_v4(), 'Victoria', 'brasov', now(), now()),
    (uuid_generate_v4(), 'Zărnești', 'brasov', now(), now());

-- BUZĂU - Adaugă orașe lipsă
INSERT INTO cities (id, name, county_id, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'Nehoiu', 'buzau', now(), now()),
    (uuid_generate_v4(), 'Pogoanele', 'buzau', now(), now()),
    (uuid_generate_v4(), 'Râmnicu Sărat', 'buzau', now(), now());

-- CĂLĂRAȘI - Adaugă orașe lipsă
INSERT INTO cities (id, name, county_id, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'Borcea', 'calarasi', now(), now()),
    (uuid_generate_v4(), 'Fundulea', 'calarasi', now(), now()),
    (uuid_generate_v4(), 'Lehliu Gară', 'calarasi', now(), now()),
    (uuid_generate_v4(), 'Oltenița', 'calarasi', now(), now());

-- CARAȘ-SEVERIN - Adaugă orașe lipsă
INSERT INTO cities (id, name, county_id, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'Anina', 'caras-severin', now(), now()),
    (uuid_generate_v4(), 'Băile Herculane', 'caras-severin', now(), now()),
    (uuid_generate_v4(), 'Bocșa', 'caras-severin', now(), now()),
    (uuid_generate_v4(), 'Caransebeș', 'caras-severin', now(), now()),
    (uuid_generate_v4(), 'Moldova Nouă', 'caras-severin', now(), now()),
    (uuid_generate_v4(), 'Oravița', 'caras-severin', now(), now()),
    (uuid_generate_v4(), 'Oțelu Roșu', 'caras-severin', now(), now()),
    (uuid_generate_v4(), 'Reșița', 'caras-severin', now(), now());

-- Verifică numărul total de orașe după adăugare
SELECT
    'TOTAL ORAȘE DUPĂ ADĂUGARE' as status,
    COUNT(*) as numar_orase
FROM cities;

-- Verifică orașele pe județe după adăugare
SELECT
    c.county_id,
    co.name as county_name,
    COUNT(c.id) as orase_total
FROM cities c
JOIN counties co ON c.county_id = co.id
GROUP BY c.county_id, co.name
ORDER BY c.county_id;
