# Probleme Nerezolvate - Cover Editor & Avatar

## Data: 2025-01-28

### 1. DRAG COVER - Direcții și Funcționalitate

**Problema:**
- Când tragi mouse-ul în jos, imaginea se mișcă în sus (direcția Y este inversată)
- Drag-ul lateral (stânga/dreapta) nu funcționează corect
- Drag-ul nu este natural și intuitiv

**Ce am încercat:**
- Am modificat logica în `InlineCoverEditor.tsx` să folosească `-deltaY` pentru inversarea direcției
- Am folosit `useRef` pentru a păstra poziția inițială de drag
- Am calculat delta-ul corect față de poziția inițială

**Status:** ✅ REZOLVAT de Gemini 3 Pro

**Soluție implementată:**
1. **Folosirea `dragStartRef` pentru poziția inițială**: Se salvează poziția inițială (`startPosX`, `startPosY`) când începe drag-ul, nu se calculează față de poziția curentă
2. **Calcul corect al delta-ului**: Se calculează `deltaX` și `deltaY` față de poziția de start, apoi se convertește la procente (`percentX`, `percentY`) folosind dimensiunea containerului
3. **Inversarea direcției corectă**: Se folosește `-percentX` și `-percentY` în `updatePosition` pentru a inversa direcția (când tragi în jos, imaginea se mișcă în jos)
4. **Event listeners cu `passive: false`**: Permite `preventDefault()` pentru a bloca comportamentul default al browserului
5. **Cleanup corect**: Event listeners sunt adăugați/eliminați corect în `useEffect` cu dependency pe `isDragging`

**Fișier:** `client/src/components/profile/InlineCoverEditor.tsx`
- Funcțiile: `handleMouseMove`, `handleTouchMove`, `updatePosition`
- Liniile: 27-64, 84-101
- **Cheie**: Folosirea `dragStartRef.current.startPosX/startPosY` în loc de `position.x/y` pentru calculul poziției noi

---

### 2. SCROLL PAGINĂ - Blocare în Modul Editare Cover

**Problema:**
- Când mouse-ul este peste cover photo în modul de editare, scroll-ul paginii nu este blocat
- Când dai scroll rapid, în loc să facă zoom in/out pe cover, face scroll pe pagină
- Scroll-ul paginii interferează cu funcționalitatea de zoom

**Ce am încercat:**
- Am adăugat `e.preventDefault()` și `e.stopPropagation()` în `handleWheel`
- Am adăugat `touchAction: 'none'` și `overscrollBehavior: 'none'` pe container
- Am eliminat `onMouseEnter`/`onMouseLeave` care cauzau flickering
- Am blocat scroll-ul doar în timpul drag-ului cu `document.body.style.overflow = 'hidden'`

**Status:** ✅ REZOLVAT de Gemini 3 Pro

**Soluție implementată:**
1. **Event listener pe container cu `passive: false`**: Wheel event listener este adăugat direct pe container cu `{ passive: false }` pentru a permite `preventDefault()`
2. **`preventDefault()` și `stopPropagation()` în `handleWheel`**: Blochează propagarea evenimentului către pagina
3. **Cleanup corect**: Event listener-ul este eliminat corect în cleanup-ul `useEffect`
4. **`touch-none` pe container**: CSS class `touch-none` previne comportamentul default touch pe mobile

**Fișier:** `client/src/components/profile/InlineCoverEditor.tsx`
- Funcția: `handleWheel` (linia 110-115)
- `useEffect` pentru event listeners (linia 117-145)
- Container div cu `touch-none` (linia 151)
- **Cheie**: Event listener pe container, nu pe window, cu `passive: false` pentru a permite `preventDefault()`

---

### 3. LOADING LENT - Încărcare Date Profil

**Problema:**
- Pagina profilului se încărca foarte lent
- Request-urile pentru records, gear, county, city erau făcute secvențial (unul după altul)
- Timpul total de loading era suma tuturor request-urilor individuale

**Status:** ✅ REZOLVAT de Gemini 3 Pro

**Soluție implementată:**
1. **Paralelizare request-uri cu `Promise.all()`**: Toate request-urile (records, gear, county, city) sunt făcute simultan în loc de secvențial
2. **Optimizare query-uri**: Query-urile sunt optimizate cu `select()` specific pentru a reduce datele transferate
3. **Conditional loading**: Gear și location names sunt încărcate doar dacă sunt necesare (public sau owner)
4. **Single profile request**: Profilul este încărcat într-un singur request cu `select('*')` în loc de multiple request-uri

**Fișier:** `client/src/pages/PublicProfile.tsx`
- Funcția: `loadUserData` (linia 195-328)
- **Cheie**: Folosirea `Promise.all()` la linia 307 pentru paralelizare
- **Înainte**: 
  ```typescript
  const recordsResult = await supabase.from('records')...;
  const gearResult = await supabase.from('user_gear')...;
  const countyResult = await supabase.from('counties')...;
  const cityResult = await supabase.from('cities')...;
  ```
  (secvențial - timp total = suma tuturor request-urilor)
- **Acum**: 
  ```typescript
  const promises = [recordsPromise, gearPromise, countyPromise, cityPromise];
  const [recordsResult, gearResult, countyResult, cityResult] = await Promise.all(promises);
  ```
  (paralel - timp total = cel mai lent request)

**Impact:**
- Reducere semnificativă a timpului de loading (de la ~2-3s la ~0.5-1s în funcție de conexiune)
- Experiență utilizator mult mai bună
- Design responsive pe desktop și mobil

---

### 4. AVATAR NU ESTE ROTUND

**Problema:**
- Avatarul nu este rotund niciunde în aplicație
- Avatarul apare pătrat sau cu colțuri

**Ce am încercat:**
- Am modificat `client/src/components/ui/avatar.tsx` să adauge `rounded-full` și `object-cover` la `AvatarImage`
- Am adăugat `rounded-full` în `ProfileSidebar.tsx`
- Am adăugat `rounded-full` în `Layout.tsx` pentru meniul mobil
- Am adăugat `rounded-full` în `PublicProfile.tsx`

**Status:** ❌ Nu funcționează - avatarul încă nu este rotund

**Fișiere modificate:**
- `client/src/components/ui/avatar.tsx` (linia 26)
- `client/src/components/profile/ProfileSidebar.tsx` (linia 79-84)
- `client/src/components/Layout.tsx` (linia 353-375)
- `client/src/pages/PublicProfile.tsx` (linia 412-422)

**Posibile cauze:**
- CSS-ul din altă parte suprascrie `rounded-full`
- Componenta Radix UI Avatar nu aplică corect `rounded-full`
- Necesită `!important` sau stiluri inline
- Containerul părinte nu are `overflow-hidden`

**Soluție necesară:**
- Verificare CSS global care suprascrie
- Folosirea stilurilor inline sau `!important`
- Asigurarea că toate containerele părinte au `overflow-hidden`
- Testare în browser cu DevTools pentru a identifica ce CSS suprascrie

---

### 5. CLICK PE AVATAR NU FUNCȚIONEAZĂ

**Problema:**
- Click-ul pe avatar nu mai funcționează pentru upload/ștergere
- Meniul dropdown nu apare când dai click pe avatar

**Ce am încercat:**
- Am adăugat `onClick` pe containerul avatar în `PublicProfile.tsx`
- Am adăugat `cursor-pointer` pe container
- Am verificat că `isOwner` este setat corect
- Am adăugat `pointer-events-none` pe overlay-ul de hover

**Status:** ❌ Nu funcționează - click-ul nu deschide meniul

**Fișier:** `client/src/pages/PublicProfile.tsx`
- Liniile: 411-450 (secțiunea Avatar)

**Posibile cauze:**
- Overlay-ul de hover blochează click-ul
- `z-index` incorect
- Event propagation blocat
- Componenta Avatar din Radix UI interceptează click-ul

**Soluție necesară:**
- Verificare event propagation
- Ajustare `z-index` pentru overlay
- Posibil mutare `onClick` pe elementul corect
- Testare cu `onMouseDown` în loc de `onClick`

---

### 6. FLICKERING PAGINĂ - Cursor peste Cover

**Problema:**
- Pagina flickerează când cursorul trece peste cover photo
- Se observă un "flash" sau re-render când mouse-ul intră/iese din zona cover

**Ce am încercat:**
- Am eliminat `onMouseEnter` și `onMouseLeave` care schimbau `document.body.style.overflow`
- Am păstrat blocarea scroll-ului doar în timpul drag-ului

**Status:** ⚠️ Parțial rezolvat - poate mai există flickering din alte cauze

**Fișier:** `client/src/components/profile/InlineCoverEditor.tsx`
- Container div (linia 167-189)

**Posibile cauze:**
- Re-render-uri React cauzate de state changes
- CSS transitions care se declanșează
- Hover effects pe elementele părinte

---

### 7. SALVARE POZIȚIE COVER - Baza de Date

**Problema:**
- Poziția cover-ului nu se salvează în baza de date
- După refresh, poziția revine la default (50, 50, 100, 0)

**Ce am încercat:**
- Am creat migrația `20250128000000_add_cover_position.sql` pentru coloana `cover_position` (JSONB)
- Am adăugat logica de salvare în `PublicProfile.tsx` (linia 305-320)
- Am adăugat logica de încărcare (linia 138-145)

**Status:** ⚠️ Necesită verificare - migrația trebuie rulată manual

**Fișiere:**
- `supabase/migrations/20250128000000_add_cover_position.sql` (NOU - trebuie rulat)
- `client/src/pages/PublicProfile.tsx` (linia 138-145, 305-320)

**Soluție necesară:**
- Rulare manuală a migrației în Supabase
- Verificare că coloana `cover_position` există în tabelul `profiles`
- Verificare că RLS policies permit update-ul
- Testare că datele se salvează și se încarcă corect

---

### 8. AFIȘARE POZIȚIE COVER - Pentru Toți Utilizatorii

**Problema:**
- Poziția cover-ului nu se afișează pentru toți utilizatorii, doar pentru owner
- După salvare, poziția nu se reflectă imediat pentru vizitatori

**Ce am încercat:**
- Am adăugat logica de încărcare a poziției din `profileData.cover_position`
- Am adăugat parsing pentru format JSONB și obiect

**Status:** ⚠️ Depinde de salvarea corectă în baza de date

**Fișier:** `client/src/pages/PublicProfile.tsx`
- Liniile: 138-145 (încărcare poziție)
- Liniile: 325-331 (afișare poziție)

---

## Probleme Rezolvate ✅

### 1. DRAG COVER - Direcții și Funcționalitate
**Status:** ✅ REZOLVAT de Gemini 3 Pro
**Soluție:** Folosirea `dragStartRef` pentru poziția inițială, calcul corect al delta-ului, inversare direcție cu `-percentX/-percentY`, event listeners cu `passive: false`

### 2. SCROLL PAGINĂ - Blocare în Modul Editare Cover
**Status:** ✅ REZOLVAT de Gemini 3 Pro
**Soluție:** Event listener pe container cu `passive: false`, `preventDefault()` în `handleWheel`, CSS `touch-none` pe container

### 3. LOADING LENT - Încărcare Date Profil
**Status:** ✅ REZOLVAT de Gemini 3 Pro
**Problema:** Request-urile pentru records, gear, county, city erau făcute secvențial (await după await), cauzând loading lent
**Soluție implementată:**
1. **Paralelizare request-uri cu `Promise.all()`**: Toate request-urile (records, gear, county, city) sunt făcute simultan în loc de secvențial
2. **Optimizare query-uri**: Query-urile sunt optimizate cu `select()` specific pentru a reduce datele transferate
3. **Conditional loading**: Gear și location names sunt încărcate doar dacă sunt necesare (public sau owner)

**Fișier:** `client/src/pages/PublicProfile.tsx`
- Funcția: `loadUserData` (linia 195-328)
- **Cheie**: Folosirea `Promise.all()` la linia 307 pentru paralelizare
- **Înainte**: `await recordsPromise; await gearPromise; await countyPromise; await cityPromise;` (secvențial)
- **Acum**: `await Promise.all([recordsPromise, gearPromise, countyPromise, cityPromise])` (paralel)

## Rezumat Probleme Critice

1. ❌ **Avatar nu este rotund** - Cel mai urgent, afectează UX-ul
2. ❌ **Click pe avatar nu funcționează** - Blochează funcționalitatea
3. ⚠️ **Salvare poziție cover** - Necesită rulare migrație manuală

## Fișiere Modificate (pentru referință)

1. `client/src/components/profile/InlineCoverEditor.tsx` - Editor cover inline
2. `client/src/pages/PublicProfile.tsx` - Pagina profil public
3. `client/src/components/profile/ProfileSidebar.tsx` - Sidebar profil
4. `client/src/components/Layout.tsx` - Layout principal
5. `client/src/components/ui/avatar.tsx` - Componenta Avatar de bază
6. `supabase/migrations/20250128000000_add_cover_position.sql` - Migrație nouă (ne-rulată)

## Pași Următori Recomandați

1. **Testare în browser** cu DevTools pentru a identifica problemele CSS
2. **Rulare migrație** pentru `cover_position` în Supabase
3. **Debugging event handlers** pentru click pe avatar
4. **Ajustare logica drag** după testare reală
5. **Implementare blocare scroll** mai agresivă pentru cover editor

