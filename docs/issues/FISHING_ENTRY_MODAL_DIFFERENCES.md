# Diferențe între Records și Catches - FishingEntryModal

## Schema diferențe

### Records (`records` table):
- `date_caught` (date NOT NULL) - data capturii
- `time_caught` (time) - ora capturii
- `length` (integer) - lungimea în cm (integer, nu decimal)
- `image_url` (text) - URL-ul imaginii (singură, nu array)
- `species_name` (text NOT NULL) - numele speciei (obligatoriu)
- `location_name` (text) - numele locației
- `status` (pending/verified/rejected) - statusul recordului

### Catches (`catches` table):
- `captured_at` (timestamptz NOT NULL) - data și ora capturii
- `length_cm` (decimal) - lungimea în cm (decimal)
- `photo_url` (text) - URL-ul foto-ului principal
- `photo_urls` (array) - array de URL-uri pentru multiple poze
- `is_public` (boolean) - vizibilitate publică/privată
- Nu are `species_name` sau `location_name` - opționale
- Nu are `status` - sunt automat publice

## Probleme identificate și rezolvate:

1. ✅ `species_name` - adăugat pentru records (NOT NULL constraint)
2. ✅ `image_url` vs `photo_url` - records folosesc `image_url`, catches folosesc `photo_url`
3. ✅ `length` vs `length_cm` - records folosesc `length` (integer), catches folosesc `length_cm` (decimal)
4. ✅ `date_caught` + `time_caught` vs `captured_at` - records folosesc date/time separate, catches folosesc timestamptz
5. ✅ Formatarea datelor pentru records - combinare/separare corectă
6. ✅ Upload logic - păstrat să se facă doar la submit

## Probleme identificate în codul existent:

### Interfețele TypeScript nu corespund cu schema:

1. **Records interfețe folosesc:**
   - `captured_at` - NU EXISTĂ în DB (ar trebui `date_caught` + `time_caught`)
   - `length_cm` - NU EXISTĂ în DB (ar trebui `length`)
   - `photo_url` - NU EXISTĂ în DB (ar trebui `image_url`)

2. **Query-urile Supabase returnează corect:**
   - `date_caught` (date)
   - `time_caught` (time)
   - `length` (integer)
   - `image_url` (text)

### Verificări necesare:

- [x] ✅ Adăugat `species_name` pentru records (NOT NULL constraint)
- [x] ✅ Adăugat `location_name` pentru records
- [x] ✅ Corectat citirea `date_caught` + `time_caught` pentru records
- [x] ✅ Corectat separarea datetime-local în `date_caught` + `time_caught` la salvare
- [x] ✅ Corectat `image_url` vs `photo_url`
- [x] ✅ Corectat `length` vs `length_cm`
- [ ] ⚠️ **IMPORTANT**: Interfețele TypeScript din alte componente folosesc `captured_at`, `length_cm`, `photo_url` pentru records - acestea NU EXISTĂ în DB!
- [ ] Testează crearea unui record nou
- [ ] Testează editarea unui record existent
- [ ] Testează crearea unei capturi noi
- [ ] Testează editarea unei capturi existente

### Note importante:

- Interfețele TypeScript existente (`FishRecord`, `FishingRecord`) folosesc câmpuri care nu există în DB pentru records
- Probabil există transformări/aliase undeva în cod care mapează `date_caught`+`time_caught` → `captured_at`
- Trebuie verificat dacă există view-uri sau funcții SQL care fac această transformare

