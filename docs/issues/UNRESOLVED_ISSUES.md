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

**Status:** ⚠️ Parțial rezolvat - necesită testare și posibil ajustări

**Fișier:** `client/src/components/profile/InlineCoverEditor.tsx`
- Funcțiile: `handleMouseMove`, `handleTouchMove`
- Liniile: 37-58, 79-101

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

**Status:** ❌ Nu funcționează corect - scroll-ul paginii încă interferează

**Fișier:** `client/src/components/profile/InlineCoverEditor.tsx`
- Funcția: `handleWheel` (linia 107-118)
- Container div (linia 167-189)

**Soluție necesară:**
- Blocarea completă a scroll-ului paginii când mouse-ul este peste cover în modul de editare
- Folosirea unui event listener global pentru wheel events
- Posibil folosirea unui overlay transparent care să intercepteze toate evenimentele

---

### 3. AVATAR NU ESTE ROTUND

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

### 4. CLICK PE AVATAR NU FUNCȚIONEAZĂ

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

### 5. FLICKERING PAGINĂ - Cursor peste Cover

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

### 6. SALVARE POZIȚIE COVER - Baza de Date

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

### 7. AFIȘARE POZIȚIE COVER - Pentru Toți Utilizatorii

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

## Rezumat Probleme Critice

1. ❌ **Avatar nu este rotund** - Cel mai urgent, afectează UX-ul
2. ❌ **Click pe avatar nu funcționează** - Blochează funcționalitatea
3. ❌ **Scroll pagină interferează cu zoom cover** - UX proastă
4. ⚠️ **Drag cover direcții** - Necesită testare și ajustări
5. ⚠️ **Salvare poziție cover** - Necesită rulare migrație manuală

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

