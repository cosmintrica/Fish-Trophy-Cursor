-- Script pentru popularea judetelor si oraselor din romania-locations.ts
-- Ruleaza acest script in Supabase SQL Editor

-- Insereaza judetele
INSERT INTO public.counties (id, name) VALUES
('alba', 'Alba'),
('arad', 'Arad'),
('arges', 'Argeș'),
('bacau', 'Bacău'),
('bihor', 'Bihor'),
('bistrita-nasaud', 'Bistrița-Năsăud'),
('botosani', 'Botoșani'),
('brasov', 'Brașov'),
('braila', 'Brăila'),
('buzau', 'Buzău'),
('bucuresti', 'București'),
('calarasi', 'Călărași'),
('caras-severin', 'Caraș-Severin'),
('cluj', 'Cluj'),
('constanta', 'Constanța'),
('covasna', 'Covasna'),
('dambovita', 'Dâmbovița'),
('dolj', 'Dolj'),
('galati', 'Galați'),
('giurgiu', 'Giurgiu'),
('gorj', 'Gorj'),
('harghita', 'Harghita'),
('hunedoara', 'Hunedoara'),
('ialomita', 'Ialomița'),
('iasi', 'Iași'),
('ilfov', 'Ilfov'),
('maramures', 'Maramureș'),
('mehedinti', 'Mehedinți'),
('mures', 'Mureș'),
('neamt', 'Neamț'),
('olt', 'Olt'),
('prahova', 'Prahova'),
('salaj', 'Sălaj'),
('satu-mare', 'Satu Mare'),
('sibiu', 'Sibiu'),
('suceava', 'Suceava'),
('teleorman', 'Teleorman'),
('timis', 'Timiș'),
('tulcea', 'Tulcea'),
('vaslui', 'Vaslui'),
('valcea', 'Vâlcea'),
('vrancea', 'Vrancea')
ON CONFLICT (id) DO NOTHING;

-- Insereaza orasele pentru Alba
INSERT INTO public.cities (county_id, name) VALUES
('alba', 'Abrud'),
('alba', 'Aiud'),
('alba', 'Alba Iulia'),
('alba', 'Baia de Arieș'),
('alba', 'Blaj'),
('alba', 'Câmpeni'),
('alba', 'Cugir'),
('alba', 'Ocna Mureș'),
('alba', 'Sebeș'),
('alba', 'Teiuș'),
('alba', 'Zlatna');

-- Insereaza orasele pentru Arad
INSERT INTO public.cities (county_id, name) VALUES
('arad', 'Arad'),
('arad', 'Chișineu-Criș'),
('arad', 'Curtici'),
('arad', 'Ineu'),
('arad', 'Lipova'),
('arad', 'Nădlac'),
('arad', 'Pecica'),
('arad', 'Sântana'),
('arad', 'Sebiș');

-- Insereaza orasele pentru Argeș
INSERT INTO public.cities (county_id, name) VALUES
('arges', 'Câmpulung'),
('arges', 'Coștești'),
('arges', 'Curtea de Argeș'),
('arges', 'Mioveni'),
('arges', 'Pitești'),
('arges', 'Ștefănești'),
('arges', 'Topoloveni');

-- Insereaza orasele pentru Bacău
INSERT INTO public.cities (county_id, name) VALUES
('bacau', 'Bacău'),
('bacau', 'Buhuși'),
('bacau', 'Comănești'),
('bacau', 'Dărmănești'),
('bacau', 'Moinești'),
('bacau', 'Onești'),
('bacau', 'Slănic-Moldova'),
('bacau', 'Târgu Ocna');

-- Insereaza orasele pentru Bihor
INSERT INTO public.cities (county_id, name) VALUES
('bihor', 'Aleșd'),
('bihor', 'Beiuș'),
('bihor', 'Marghita'),
('bihor', 'Nucet'),
('bihor', 'Oradea'),
('bihor', 'Salonta'),
('bihor', 'Săcueni'),
('bihor', 'Valea lui Mihai'),
('bihor', 'Vașcău');

-- Insereaza orasele pentru Bistrița-Năsăud
INSERT INTO public.cities (county_id, name) VALUES
('bistrita-nasaud', 'Beclean'),
('bistrita-nasaud', 'Bistrița'),
('bistrita-nasaud', 'Năsăud'),
('bistrita-nasaud', 'Sângeorz-Băi');

-- Insereaza orasele pentru Botoșani
INSERT INTO public.cities (county_id, name) VALUES
('botosani', 'Botoșani'),
('botosani', 'Bucecea'),
('botosani', 'Darabani'),
('botosani', 'Dorohoi'),
('botosani', 'Flămânzi'),
('botosani', 'Săveni'),
('botosani', 'Ștefănești');

-- Insereaza orasele pentru Brașov
INSERT INTO public.cities (county_id, name) VALUES
('brasov', 'Brașov'),
('brasov', 'Codlea'),
('brasov', 'Făgăraș'),
('brasov', 'Ghimbav'),
('brasov', 'Predeal'),
('brasov', 'Râșnov'),
('brasov', 'Rupea'),
('brasov', 'Săcele'),
('brasov', 'Victoria'),
('brasov', 'Zărnești');

-- Insereaza orasele pentru Brăila
INSERT INTO public.cities (county_id, name) VALUES
('braila', 'Brăila'),
('braila', 'Faurei'),
('braila', 'Ianca'),
('braila', 'Însurăței');

-- Insereaza orasele pentru Buzău
INSERT INTO public.cities (county_id, name) VALUES
('buzau', 'Buzău'),
('buzau', 'Nehoiu'),
('buzau', 'Pătârlagele'),
('buzau', 'Pogoanele'),
('buzau', 'Râmnicu Sărat');

-- Insereaza orasele pentru București
INSERT INTO public.cities (county_id, name) VALUES
('bucuresti', 'Sector 1'),
('bucuresti', 'Sector 2'),
('bucuresti', 'Sector 3'),
('bucuresti', 'Sector 4'),
('bucuresti', 'Sector 5'),
('bucuresti', 'Sector 6');

-- Insereaza orasele pentru Călărași
INSERT INTO public.cities (county_id, name) VALUES
('calarasi', 'Budești'),
('calarasi', 'Călărași'),
('calarasi', 'Fundulea'),
('calarasi', 'Lehliu Gară'),
('calarasi', 'Oltenița');

-- Insereaza orasele pentru Caraș-Severin
INSERT INTO public.cities (county_id, name) VALUES
('caras-severin', 'Anina'),
('caras-severin', 'Băile Herculane'),
('caras-severin', 'Bocșa'),
('caras-severin', 'Caransebeș'),
('caras-severin', 'Moldova Nouă'),
('caras-severin', 'Oravița'),
('caras-severin', 'Oțelu Roșu'),
('caras-severin', 'Reșița');

-- Insereaza orasele pentru Cluj
INSERT INTO public.cities (county_id, name) VALUES
('cluj', 'Câmpia Turzii'),
('cluj', 'Cluj-Napoca'),
('cluj', 'Dej'),
('cluj', 'Gherla'),
('cluj', 'Huedin'),
('cluj', 'Turda');

-- Insereaza orasele pentru Constanța
INSERT INTO public.cities (county_id, name) VALUES
('constanta', 'Băneasa'),
('constanta', 'Cernavodă'),
('constanta', 'Constanța'),
('constanta', 'Eforie'),
('constanta', 'Hârșova'),
('constanta', 'Mangalia'),
('constanta', 'Medgidia'),
('constanta', 'Murfatlar'),
('constanta', 'Năvodari'),
('constanta', 'Ovidiu'),
('constanta', 'Techirghiol');

-- Insereaza orasele pentru Covasna
INSERT INTO public.cities (county_id, name) VALUES
('covasna', 'Baraolt'),
('covasna', 'Covasna'),
('covasna', 'Întorsura Buzăului'),
('covasna', 'Sfântu Gheorghe'),
('covasna', 'Târgu Secuiesc');

-- Insereaza orasele pentru Dâmbovița
INSERT INTO public.cities (county_id, name) VALUES
('dambovita', 'Fieni'),
('dambovita', 'Găești'),
('dambovita', 'Moreni'),
('dambovita', 'Pucioasa'),
('dambovita', 'Răcari'),
('dambovita', 'Târgoviște'),
('dambovita', 'Titu'),
('dambovita', 'Târgoviște');

-- Insereaza orasele pentru Dolj
INSERT INTO public.cities (county_id, name) VALUES
('dolj', 'Băilești'),
('dolj', 'Bechet'),
('dolj', 'Calafat'),
('dolj', 'Craiova'),
('dolj', 'Dăbuleni'),
('dolj', 'Filiași'),
('dolj', 'Segarcea'),
('dolj', 'Băilești');

-- Insereaza orasele pentru Galați
INSERT INTO public.cities (county_id, name) VALUES
('galati', 'Berești'),
('galati', 'Galați'),
('galati', 'Târgu Bujor'),
('galati', 'Tecuci');

-- Insereaza orasele pentru Giurgiu
INSERT INTO public.cities (county_id, name) VALUES
('giurgiu', 'Bolintin-Vale'),
('giurgiu', 'Giurgiu'),
('giurgiu', 'Mihăilești');

-- Insereaza orasele pentru Gorj
INSERT INTO public.cities (county_id, name) VALUES
('gorj', 'Bumbești-Jiu'),
('gorj', 'Motru'),
('gorj', 'Novaci'),
('gorj', 'Rovinari'),
('gorj', 'Târgu Cărbunești'),
('gorj', 'Târgu Jiu'),
('gorj', 'Turceni');

-- Insereaza orasele pentru Harghita
INSERT INTO public.cities (county_id, name) VALUES
('harghita', 'Băile Tușnad'),
('harghita', 'Bălan'),
('harghita', 'Borsec'),
('harghita', 'Cristuru Secuiesc'),
('harghita', 'Gheorgheni'),
('harghita', 'Miercurea Ciuc'),
('harghita', 'Odorheiu Secuiesc'),
('harghita', 'Toplița'),
('harghita', 'Vlăhița');

-- Insereaza orasele pentru Hunedoara
INSERT INTO public.cities (county_id, name) VALUES
('hunedoara', 'Aninoasa'),
('hunedoara', 'Brad'),
('hunedoara', 'Călan'),
('hunedoara', 'Deva'),
('hunedoara', 'Geoagiu'),
('hunedoara', 'Hațeg'),
('hunedoara', 'Hunedoara'),
('hunedoara', 'Lupeni'),
('hunedoara', 'Orăștie'),
('hunedoara', 'Petrila'),
('hunedoara', 'Petroșani'),
('hunedoara', 'Simeria'),
('hunedoara', 'Uricani'),
('hunedoara', 'Vulcan');

-- Insereaza orasele pentru Ialomița
INSERT INTO public.cities (county_id, name) VALUES
('ialomita', 'Amara'),
('ialomita', 'Căzănești'),
('ialomita', 'Fetești'),
('ialomita', 'Fierbinți-Târg'),
('ialomita', 'Slobozia'),
('ialomita', 'Târgu Bujor'),
('ialomita', 'Urziceni');

-- Insereaza orasele pentru Iași
INSERT INTO public.cities (county_id, name) VALUES
('iasi', 'Hârlău'),
('iasi', 'Iași'),
('iasi', 'Pașcani'),
('iasi', 'Podu Iloaiei'),
('iasi', 'Târgu Frumos');

-- Insereaza orasele pentru Ilfov
INSERT INTO public.cities (county_id, name) VALUES
('ilfov', 'Bragadiru'),
('ilfov', 'Buftea'),
('ilfov', 'Chitila'),
('ilfov', 'Măgurele'),
('ilfov', 'Otopeni'),
('ilfov', 'Pantelimon'),
('ilfov', 'Popești-Leordeni'),
('ilfov', 'Voluntari');

-- Insereaza orasele pentru Maramureș
INSERT INTO public.cities (county_id, name) VALUES
('maramures', 'Baia Mare'),
('maramures', 'Baia Sprie'),
('maramures', 'Borșa'),
('maramures', 'Cavnic'),
('maramures', 'Dragomirești'),
('maramures', 'Săliștea de Sus'),
('maramures', 'Seini'),
('maramures', 'Sighetu Marmației'),
('maramures', 'Somcuta Mare'),
('maramures', 'Târgu Lăpuș'),
('maramures', 'Tăuții-Măgherăuș'),
('maramures', 'Ulmeni'),
('maramures', 'Vișeu de Sus');

-- Insereaza orasele pentru Mehedinți
INSERT INTO public.cities (county_id, name) VALUES
('mehedinti', 'Baia de Aramă'),
('mehedinti', 'Drobeta-Turnu Severin'),
('mehedinti', 'Orșova'),
('mehedinti', 'Strehaia'),
('mehedinti', 'Vânju Mare');

-- Insereaza orasele pentru Mureș
INSERT INTO public.cities (county_id, name) VALUES
('mures', 'Iernut'),
('mures', 'Luduș'),
('mures', 'Miercurea Nirajului'),
('mures', 'Reghin'),
('mures', 'Sângeorgiu de Pădure'),
('mures', 'Sighișoara'),
('mures', 'Sovata'),
('mures', 'Târgu Mureș'),
('mures', 'Târnăveni'),
('mures', 'Ungheni');

-- Insereaza orasele pentru Neamț
INSERT INTO public.cities (county_id, name) VALUES
('neamt', 'Bicaz'),
('neamt', 'Piatra Neamț'),
('neamt', 'Roman'),
('neamt', 'Roznov'),
('neamt', 'Târgu Neamț');

-- Insereaza orasele pentru Olt
INSERT INTO public.cities (county_id, name) VALUES
('olt', 'Balș'),
('olt', 'Caracal'),
('olt', 'Corabia'),
('olt', 'Drăgănești-Olt'),
('olt', 'Piatra-Olt'),
('olt', 'Slatina'),
('olt', 'Scornicești');

-- Insereaza orasele pentru Prahova
INSERT INTO public.cities (county_id, name) VALUES
('prahova', 'Azuga'),
('prahova', 'Băicoi'),
('prahova', 'Boldești-Scăeni'),
('prahova', 'Breaza'),
('prahova', 'Bușteni'),
('prahova', 'Câmpina'),
('prahova', 'Comarnic'),
('prahova', 'Mizil'),
('prahova', 'Ploiești'),
('prahova', 'Sinaia'),
('prahova', 'Slănic'),
('prahova', 'Urlați'),
('prahova', 'Vălenii de Munte');

-- Insereaza orasele pentru Sălaj
INSERT INTO public.cities (county_id, name) VALUES
('salaj', 'Cehu Silvaniei'),
('salaj', 'Jibou'),
('salaj', 'Șimleu Silvaniei'),
('salaj', 'Zalău');

-- Insereaza orasele pentru Satu Mare
INSERT INTO public.cities (county_id, name) VALUES
('satu-mare', 'Ardud'),
('satu-mare', 'Carei'),
('satu-mare', 'Livada'),
('satu-mare', 'Negrești-Oaș'),
('satu-mare', 'Satu Mare'),
('satu-mare', 'Tăuții-Măgherăuș');

-- Insereaza orasele pentru Sibiu
INSERT INTO public.cities (county_id, name) VALUES
('sibiu', 'Agnita'),
('sibiu', 'Avrig'),
('sibiu', 'Cisnădie'),
('sibiu', 'Copșa Mică'),
('sibiu', 'Dumbrăveni'),
('sibiu', 'Mediaș'),
('sibiu', 'Miercurea Sibiului'),
('sibiu', 'Ocna Sibiului'),
('sibiu', 'Săliște'),
('sibiu', 'Sibiu'),
('sibiu', 'Tălmaciu');

-- Insereaza orasele pentru Suceava
INSERT INTO public.cities (county_id, name) VALUES
('suceava', 'Broșteni'),
('suceava', 'Cajvana'),
('suceava', 'Câmpulung Moldovenesc'),
('suceava', 'Dolhasca'),
('suceava', 'Fălticeni'),
('suceava', 'Gura Humorului'),
('suceava', 'Liteni'),
('suceava', 'Milișăuți'),
('suceava', 'Rădăuți'),
('suceava', 'Salcea'),
('suceava', 'Siret'),
('suceava', 'Solca'),
('suceava', 'Suceava'),
('suceava', 'Vicovu de Sus'),
('suceava', 'Vatra Dornei');

-- Insereaza orasele pentru Teleorman
INSERT INTO public.cities (county_id, name) VALUES
('teleorman', 'Alexandria'),
('teleorman', 'Roșiorii de Vede'),
('teleorman', 'Turnu Măgurele'),
('teleorman', 'Videle'),
('teleorman', 'Zimnicea');

-- Insereaza orasele pentru Timiș
INSERT INTO public.cities (county_id, name) VALUES
('timis', 'Buziaș'),
('timis', 'Ciacova'),
('timis', 'Deta'),
('timis', 'Făget'),
('timis', 'Gătaia'),
('timis', 'Jimbolia'),
('timis', 'Lugoj'),
('timis', 'Recaș'),
('timis', 'Sânnicolau Mare'),
('timis', 'Timișoara');

-- Insereaza orasele pentru Tulcea
INSERT INTO public.cities (county_id, name) VALUES
('tulcea', 'Babadag'),
('tulcea', 'Isaccea'),
('tulcea', 'Măcin'),
('tulcea', 'Sulina'),
('tulcea', 'Tulcea');

-- Insereaza orasele pentru Vaslui
INSERT INTO public.cities (county_id, name) VALUES
('vaslui', 'Bârlad'),
('vaslui', 'Huși'),
('vaslui', 'Murgeni'),
('vaslui', 'Negrești'),
('vaslui', 'Vaslui');

-- Insereaza orasele pentru Vâlcea
INSERT INTO public.cities (county_id, name) VALUES
('valcea', 'Băbeni'),
('valcea', 'Băile Govora'),
('valcea', 'Băile Olănești'),
('valcea', 'Bălcești'),
('valcea', 'Berbești'),
('valcea', 'Brezoi'),
('valcea', 'Călimănești'),
('valcea', 'Drăgășani'),
('valcea', 'Horezu'),
('valcea', 'Ocnele Mari'),
('valcea', 'Râmnicu Vâlcea'),
('valcea', 'Sălătrucel');

-- Insereaza orasele pentru Vrancea
INSERT INTO public.cities (county_id, name) VALUES
('vrancea', 'Adjud'),
('vrancea', 'Focșani'),
('vrancea', 'Mărășești'),
('vrancea', 'Odobești'),
('vrancea', 'Panciu');
