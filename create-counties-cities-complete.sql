-- Script complet pentru crearea si popularea tabelelor counties si cities
-- Ruleaza acest script in Supabase SQL Editor

-- 1. Creeaza tabela counties
CREATE TABLE IF NOT EXISTS public.counties (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 2. Creeaza tabela cities
CREATE TABLE IF NOT EXISTS public.cities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id text NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (county_id, name)
);

-- 3. Creeaza indexurile
CREATE INDEX IF NOT EXISTS idx_cities_county_id ON public.cities(county_id);
CREATE INDEX IF NOT EXISTS idx_cities_name ON public.cities(name);

-- 4. Activeaza RLS
ALTER TABLE public.counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- 5. Creeaza politicile RLS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'counties' AND policyname = 'Counties are viewable by everyone') THEN
        CREATE POLICY "Counties are viewable by everyone" ON public.counties FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cities' AND policyname = 'Cities are viewable by everyone') THEN
        CREATE POLICY "Cities are viewable by everyone" ON public.cities FOR SELECT USING (true);
    END IF;
END $$;

-- 6. Insereaza judetele
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
('valcea', 'Vâlcea'),
('vaslui', 'Vaslui'),
('vrancea', 'Vrancea')
ON CONFLICT (id) DO NOTHING;

-- 7. Insereaza orasele pentru Alba
INSERT INTO public.cities (county_id, name) VALUES
('alba', 'Abrud'),
('alba', 'Aiud'),
('alba', 'Alba Iulia'),
('alba', 'Blaj'),
('alba', 'Câmpeni'),
('alba', 'Cugir'),
('alba', 'Ocna Mureș'),
('alba', 'Sebeș'),
('alba', 'Teiuș')
ON CONFLICT (county_id, name) DO NOTHING;

-- 8. Insereaza orasele pentru Arad
INSERT INTO public.cities (county_id, name) VALUES
('arad', 'Arad'),
('arad', 'Chișineu-Criș'),
('arad', 'Curtici'),
('arad', 'Ineu'),
('arad', 'Lipova'),
('arad', 'Nădlac'),
('arad', 'Pecica'),
('arad', 'Sântana'),
('arad', 'Șiria')
ON CONFLICT (county_id, name) DO NOTHING;

-- 9. Insereaza orasele pentru Argeș
INSERT INTO public.cities (county_id, name) VALUES
('arges', 'Câmpulung'),
('arges', 'Curtea de Argeș'),
('arges', 'Mioveni'),
('arges', 'Pitești'),
('arges', 'Ștefănești'),
('arges', 'Topoloveni')
ON CONFLICT (county_id, name) DO NOTHING;

-- 10. Insereaza orasele pentru Bacău
INSERT INTO public.cities (county_id, name) VALUES
('bacau', 'Bacău'),
('bacau', 'Comănești'),
('bacau', 'Dărmănești'),
('bacau', 'Onești'),
('bacau', 'Slănic-Moldova'),
('bacau', 'Târgu Ocna')
ON CONFLICT (county_id, name) DO NOTHING;

-- 11. Insereaza orasele pentru Bihor
INSERT INTO public.cities (county_id, name) VALUES
('bihor', 'Aleșd'),
('bihor', 'Beiuș'),
('bihor', 'Marghita'),
('bihor', 'Oradea'),
('bihor', 'Salonta'),
('bihor', 'Valea lui Mihai')
ON CONFLICT (county_id, name) DO NOTHING;

-- 12. Insereaza orasele pentru Bistrița-Năsăud
INSERT INTO public.cities (county_id, name) VALUES
('bistrita-nasaud', 'Beclean'),
('bistrita-nasaud', 'Bistrița'),
('bistrita-nasaud', 'Năsăud'),
('bistrita-nasaud', 'Sângeorz-Băi')
ON CONFLICT (county_id, name) DO NOTHING;

-- 13. Insereaza orasele pentru Botoșani
INSERT INTO public.cities (county_id, name) VALUES
('botosani', 'Botoșani'),
('botosani', 'Bucecea'),
('botosani', 'Darabani'),
('botosani', 'Dorohoi'),
('botosani', 'Flămânzi'),
('botosani', 'Săveni'),
('botosani', 'Ștefănești')
ON CONFLICT (county_id, name) DO NOTHING;

-- 14. Insereaza orasele pentru Brașov
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
('brasov', 'Zărnești')
ON CONFLICT (county_id, name) DO NOTHING;

-- 15. Insereaza orasele pentru Brăila
INSERT INTO public.cities (county_id, name) VALUES
('braila', 'Brăila'),
('braila', 'Faurei'),
('braila', 'Ianca'),
('braila', 'Însurăței')
ON CONFLICT (county_id, name) DO NOTHING;

-- 16. Insereaza orasele pentru Buzău
INSERT INTO public.cities (county_id, name) VALUES
('buzau', 'Buzău'),
('buzau', 'Nehoiu'),
('buzau', 'Pogoanele'),
('buzau', 'Râmnicu Sărat')
ON CONFLICT (county_id, name) DO NOTHING;

-- 17. Insereaza orasele pentru București
INSERT INTO public.cities (county_id, name) VALUES
('bucuresti', 'București')
ON CONFLICT (county_id, name) DO NOTHING;

-- 18. Insereaza orasele pentru Călărași
INSERT INTO public.cities (county_id, name) VALUES
('calarasi', 'Budești'),
('calarasi', 'Călărași'),
('calarasi', 'Fundulea'),
('calarasi', 'Lehliu Gară'),
('calarasi', 'Oltenița')
ON CONFLICT (county_id, name) DO NOTHING;

-- 19. Insereaza orasele pentru Caraș-Severin
INSERT INTO public.cities (county_id, name) VALUES
('caras-severin', 'Anina'),
('caras-severin', 'Băile Herculane'),
('caras-severin', 'Bocșa'),
('caras-severin', 'Caransebeș'),
('caras-severin', 'Moldova Nouă'),
('caras-severin', 'Oravița'),
('caras-severin', 'Oțelu Roșu'),
('caras-severin', 'Reșița')
ON CONFLICT (county_id, name) DO NOTHING;

-- 20. Insereaza orasele pentru Cluj
INSERT INTO public.cities (county_id, name) VALUES
('cluj', 'Câmpia Turzii'),
('cluj', 'Cluj-Napoca'),
('cluj', 'Dej'),
('cluj', 'Gherla'),
('cluj', 'Huedin'),
('cluj', 'Turda')
ON CONFLICT (county_id, name) DO NOTHING;

-- 21. Insereaza orasele pentru Constanța
INSERT INTO public.cities (county_id, name) VALUES
('constanta', 'Cernavodă'),
('constanta', 'Constanța'),
('constanta', 'Eforie'),
('constanta', 'Hârșova'),
('constanta', 'Mangalia'),
('constanta', 'Medgidia'),
('constanta', 'Murfatlar'),
('constanta', 'Năvodari'),
('constanta', 'Ovidiu'),
('constanta', 'Techirghiol')
ON CONFLICT (county_id, name) DO NOTHING;

-- 22. Insereaza orasele pentru Covasna
INSERT INTO public.cities (county_id, name) VALUES
('covasna', 'Baraolt'),
('covasna', 'Covasna'),
('covasna', 'Întorsura Buzăului'),
('covasna', 'Sfântu Gheorghe'),
('covasna', 'Târgu Secuiesc')
ON CONFLICT (county_id, name) DO NOTHING;

-- 23. Insereaza orasele pentru Dâmbovița
INSERT INTO public.cities (county_id, name) VALUES
('dambovita', 'Fieni'),
('dambovita', 'Găești'),
('dambovita', 'Moreni'),
('dambovita', 'Pucioasa'),
('dambovita', 'Târgoviște'),
('dambovita', 'Titu')
ON CONFLICT (county_id, name) DO NOTHING;

-- 24. Insereaza orasele pentru Dolj
INSERT INTO public.cities (county_id, name) VALUES
('dolj', 'Băilești'),
('dolj', 'Bechet'),
('dolj', 'Calafat'),
('dolj', 'Craiova'),
('dolj', 'Dăbuleni'),
('dolj', 'Filiași'),
('dolj', 'Segarcea'),
('dolj', 'Băilești')
ON CONFLICT (county_id, name) DO NOTHING;

-- 25. Insereaza orasele pentru Galați
INSERT INTO public.cities (county_id, name) VALUES
('galati', 'Galați'),
('galati', 'Berești'),
('galati', 'Tecuci')
ON CONFLICT (county_id, name) DO NOTHING;

-- 26. Insereaza orasele pentru Giurgiu
INSERT INTO public.cities (county_id, name) VALUES
('giurgiu', 'Giurgiu'),
('giurgiu', 'Bolintin-Vale'),
('giurgiu', 'Mihăilești')
ON CONFLICT (county_id, name) DO NOTHING;

-- 27. Insereaza orasele pentru Gorj
INSERT INTO public.cities (county_id, name) VALUES
('gorj', 'Târgu Jiu'),
('gorj', 'Bumbești-Jiu'),
('gorj', 'Motru'),
('gorj', 'Novaci'),
('gorj', 'Rovinari'),
('gorj', 'Târgu Cărbunești'),
('gorj', 'Turceni')
ON CONFLICT (county_id, name) DO NOTHING;

-- 28. Insereaza orasele pentru Harghita
INSERT INTO public.cities (county_id, name) VALUES
('harghita', 'Băile Tușnad'),
('harghita', 'Bălan'),
('harghita', 'Borsec'),
('harghita', 'Cristuru Secuiesc'),
('harghita', 'Miercurea Ciuc'),
('harghita', 'Odorheiu Secuiesc'),
('harghita', 'Toplița'),
('harghita', 'Vlăhița')
ON CONFLICT (county_id, name) DO NOTHING;

-- 29. Insereaza orasele pentru Hunedoara
INSERT INTO public.cities (county_id, name) VALUES
('hunedoara', 'Brad'),
('hunedoara', 'Călan'),
('hunedoara', 'Deva'),
('hunedoara', 'Hațeg'),
('hunedoara', 'Hunedoara'),
('hunedoara', 'Lupeni'),
('hunedoara', 'Orăștie'),
('hunedoara', 'Petrila'),
('hunedoara', 'Petroșani'),
('hunedoara', 'Simeria'),
('hunedoara', 'Uricani'),
('hunedoara', 'Vulcan')
ON CONFLICT (county_id, name) DO NOTHING;

-- 30. Insereaza orasele pentru Ialomița
INSERT INTO public.cities (county_id, name) VALUES
('ialomita', 'Amara'),
('ialomita', 'Călărași'),
('ialomita', 'Fetești'),
('ialomita', 'Fierbinți-Târg'),
('ialomita', 'Țăndărei'),
('ialomita', 'Urziceni')
ON CONFLICT (county_id, name) DO NOTHING;

-- 31. Insereaza orasele pentru Iași
INSERT INTO public.cities (county_id, name) VALUES
('iasi', 'Hârlău'),
('iasi', 'Pașcani'),
('iasi', 'Târgu Frumos'),
('iasi', 'Iași')
ON CONFLICT (county_id, name) DO NOTHING;

-- 32. Insereaza orasele pentru Ilfov
INSERT INTO public.cities (county_id, name) VALUES
('ilfov', 'Buftea'),
('ilfov', 'Bragadiru'),
('ilfov', 'Chitila'),
('ilfov', 'Măgurele'),
('ilfov', 'Otopeni'),
('ilfov', 'Pantelimon'),
('ilfov', 'Popești-Leordeni'),
('ilfov', 'Voluntari')
ON CONFLICT (county_id, name) DO NOTHING;

-- 33. Insereaza orasele pentru Maramureș
INSERT INTO public.cities (county_id, name) VALUES
('maramures', 'Baia Mare'),
('maramures', 'Baia Sprie'),
('maramures', 'Borșa'),
('maramures', 'Cavnic'),
('maramures', 'Sighetu Marmației'),
('maramures', 'Somcuta Mare'),
('maramures', 'Târgu Lăpuș'),
('maramures', 'Ulmeni'),
('maramures', 'Vișeu de Sus')
ON CONFLICT (county_id, name) DO NOTHING;

-- 34. Insereaza orasele pentru Mehedinți
INSERT INTO public.cities (county_id, name) VALUES
('mehedinti', 'Drobeta-Turnu Severin'),
('mehedinti', 'Orșova'),
('mehedinti', 'Strehaia'),
('mehedinti', 'Vânju Mare')
ON CONFLICT (county_id, name) DO NOTHING;

-- 35. Insereaza orasele pentru Mureș
INSERT INTO public.cities (county_id, name) VALUES
('mures', 'Iernut'),
('mures', 'Luduș'),
('mures', 'Miercurea Nirajului'),
('mures', 'Reghin'),
('mures', 'Sighișoara'),
('mures', 'Sovata'),
('mures', 'Târgu Mureș'),
('mures', 'Târnăveni'),
('mures', 'Ungheni')
ON CONFLICT (county_id, name) DO NOTHING;

-- 36. Insereaza orasele pentru Neamț
INSERT INTO public.cities (county_id, name) VALUES
('neamt', 'Bicaz'),
('neamt', 'Piatra Neamț'),
('neamt', 'Roznov'),
('neamt', 'Târgu Neamț')
ON CONFLICT (county_id, name) DO NOTHING;

-- 37. Insereaza orasele pentru Olt
INSERT INTO public.cities (county_id, name) VALUES
('olt', 'Balș'),
('olt', 'Caracal'),
('olt', 'Corabia'),
('olt', 'Drăgănești-Olt'),
('olt', 'Piatra-Olt'),
('olt', 'Potcoava'),
('olt', 'Scornicești'),
('olt', 'Slatina')
ON CONFLICT (county_id, name) DO NOTHING;

-- 38. Insereaza orasele pentru Prahova
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
('prahova', 'Plopeni'),
('prahova', 'Sinaia'),
('prahova', 'Slănic'),
('prahova', 'Urlați'),
('prahova', 'Vălenii de Munte')
ON CONFLICT (county_id, name) DO NOTHING;

-- 39. Insereaza orasele pentru Sălaj
INSERT INTO public.cities (county_id, name) VALUES
('salaj', 'Cehu Silvaniei'),
('salaj', 'Jibou'),
('salaj', 'Zalău')
ON CONFLICT (county_id, name) DO NOTHING;

-- 40. Insereaza orasele pentru Satu Mare
INSERT INTO public.cities (county_id, name) VALUES
('satu-mare', 'Carei'),
('satu-mare', 'Livada'),
('satu-mare', 'Negrești-Oaș'),
('satu-mare', 'Satu Mare'),
('satu-mare', 'Tășnad')
ON CONFLICT (county_id, name) DO NOTHING;

-- 41. Insereaza orasele pentru Sibiu
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
('sibiu', 'Tălmaciu')
ON CONFLICT (county_id, name) DO NOTHING;

-- 42. Insereaza orasele pentru Suceava
INSERT INTO public.cities (county_id, name) VALUES
('suceava', 'Broșteni'),
('suceava', 'Câmpulung Moldovenesc'),
('suceava', 'Fălticeni'),
('suceava', 'Gura Humorului'),
('suceava', 'Liteni'),
('suceava', 'Milișăuți'),
('suceava', 'Rădăuți'),
('suceava', 'Salcea'),
('suceava', 'Siret'),
('suceava', 'Suceava'),
('suceava', 'Vicovu de Sus'),
('suceava', 'Vatra Dornei')
ON CONFLICT (county_id, name) DO NOTHING;

-- 43. Insereaza orasele pentru Teleorman
INSERT INTO public.cities (county_id, name) VALUES
('teleorman', 'Alexandria'),
('teleorman', 'Roșiori de Vede'),
('teleorman', 'Turnu Măgurele'),
('teleorman', 'Videle'),
('teleorman', 'Zimnicea')
ON CONFLICT (county_id, name) DO NOTHING;

-- 44. Insereaza orasele pentru Timiș
INSERT INTO public.cities (county_id, name) VALUES
('timis', 'Buziaș'),
('timis', 'Ciacova'),
('timis', 'Deta'),
('timis', 'Făget'),
('timis', 'Jimbolia'),
('timis', 'Lugoj'),
('timis', 'Recaș'),
('timis', 'Sânnicolau Mare'),
('timis', 'Timișoara')
ON CONFLICT (county_id, name) DO NOTHING;

-- 45. Insereaza orasele pentru Tulcea
INSERT INTO public.cities (county_id, name) VALUES
('tulcea', 'Babadag'),
('tulcea', 'Isaccea'),
('tulcea', 'Măcin'),
('tulcea', 'Sulina'),
('tulcea', 'Tulcea')
ON CONFLICT (county_id, name) DO NOTHING;

-- 46. Insereaza orasele pentru Vâlcea
INSERT INTO public.cities (county_id, name) VALUES
('valcea', 'Băbeni'),
('valcea', 'Băile Govora'),
('valcea', 'Băile Olănești'),
('valcea', 'Brezoi'),
('valcea', 'Călimănești'),
('valcea', 'Drăgășani'),
('valcea', 'Horezu'),
('valcea', 'Ocnele Mari'),
('valcea', 'Râmnicu Vâlcea'),
('valcea', 'Sălătrucu')
ON CONFLICT (county_id, name) DO NOTHING;

-- 47. Insereaza orasele pentru Vaslui
INSERT INTO public.cities (county_id, name) VALUES
('vaslui', 'Bârlad'),
('vaslui', 'Huși'),
('vaslui', 'Murgeni'),
('vaslui', 'Negrești'),
('vaslui', 'Vaslui')
ON CONFLICT (county_id, name) DO NOTHING;

-- 48. Insereaza orasele pentru Vrancea
INSERT INTO public.cities (county_id, name) VALUES
('vrancea', 'Adjud'),
('vrancea', 'Focșani'),
('vrancea', 'Mărășești'),
('vrancea', 'Odobești'),
('vrancea', 'Panciu')
ON CONFLICT (county_id, name) DO NOTHING;

-- 49. Actualizeaza tabela profiles sa includa county_id si city_id
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS county_id text REFERENCES public.counties(id),
ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.cities(id);

-- 50. Creeaza indexurile pentru profile
CREATE INDEX IF NOT EXISTS idx_profiles_county_id ON public.profiles(county_id);
CREATE INDEX IF NOT EXISTS idx_profiles_city_id ON public.profiles(city_id);

-- Script completat cu succes!
