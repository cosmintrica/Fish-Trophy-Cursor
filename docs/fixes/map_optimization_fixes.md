# Fix-uri pentru Optimizarea Hărții - Home.tsx

## Status: 0% - Fișier restaurat, trebuie reaplicat toate fix-urile

## ⚠️ ATENȚIE: Fișierul restaurat NU are optimizarea GeoJSON!
Trebuie să reaplicăm:
- Optimizarea GeoJSON (loadFishingMarkers, getLocationDetails) - FUNCȚIILE EXISTĂ DEJA în fishingLocations.ts
- Toate cele 7 fix-uri de mai jos

## Funcții disponibile în fishingLocations.ts:
- ✅ `loadFishingMarkers()` - EXISTĂ (linia 128)
- ✅ `getLocationDetails(id)` - EXISTĂ (linia 181)
- ✅ `FishingMarker` interface - EXISTĂ (linia 48)

## Ce lipsește în Home.tsx:
1. ❌ Import pentru `loadFishingMarkers`, `getLocationDetails`, `FishingMarker`
2. ❌ State `fishingMarkers` și `mapStyle`
3. ❌ State `showMapStyleDropdown` pentru dropdown
4. ❌ `useEffect` pentru loading `fishingMarkers` la mount
5. ❌ Funcția `addLocationsToMap` folosește încă DOM markers (markersRef) în loc de GeoJSON
6. ❌ Selectorul de stil folosește butoane separate în loc de dropdown
7. ❌ Filtrele nu au debouncing
8. ❌ Prea multe console.log/error
9. ❌ "Vezi recorduri" folosește `location=` în loc de `location_id=`
10. ❌ `selectLocation` nu elimină popup-urile existente

## Cerințe:

### 1. ✅ Animația markerelor să înceapă instant când se deschide pagina
**Problema:** Animația așteaptă după `databaseLocations` în loc să folosească `fishingMarkers`
**Fix necesar:**
- În `map.once('load')`, schimbă `if (databaseLocations.length > 0)` cu `if (fishingMarkers.length > 0)`
- În `useEffect` pentru update markers, folosește `fishingMarkers.length` în loc de `databaseLocations.length`

### 2. ✅ Selector satelit/hibrid - dropdown profesional, fără reîncărcare markere
**Problema:** Butoanele separate reîncarcă markerele la fiecare schimbare de stil
**Fix necesar:**
- Adaugă state `showMapStyleDropdown`
- Creează un buton pătrat mic (10x10) cu iconița stilului curent
- La click, deschide dropdown cu 3 opțiuni: Standard, Satelit, Hibrid
- La schimbare stil, NU reîncărca markerele (elimină `map.once('styledata')` cu `addLocationsToMap`)
- Markerele persistă automat pe GeoJSON layers

### 3. ✅ Filtrele - debouncing pentru click-uri rapide
**Problema:** Click-uri rapide pe filtre cauzează conflicte și încărcări multiple
**Fix necesar:**
- Adaugă `filterDebounceRef = useRef<NodeJS.Timeout | null>(null)`
- În `filterLocations`, verifică `if (isAddingMarkers) return;`
- Clear timeout anterior, apoi debounce cu 150ms
- Actualizează doar dacă `!isAddingMarkers`

### 4. ✅ Eliminare toate logurile console
**Problema:** Prea multe loguri în consolă
**Fix necesar:**
- Elimină toate `console.log()` și `console.error()` din `Home.tsx`
- Păstrează doar erorile critice dacă e necesar (sau elimină complet)

### 5. ✅ Buton "Vezi recorduri" - filtrare automată pe locație
**Problema:** URL-ul folosește `location=` în loc de `location_id=`
**Fix necesar:**
- În popup HTML, schimbă `window.location.href = '/records?location=...'` cu `'/records?location_id=...'`
- În `Records.tsx`, adaugă `useSearchParams` și inițializează `selectedLocation` din URL

### 6. ✅ Header refresh când sunt deja pe homepage
**Problema:** Click pe logo/"Acasă" când sunt deja pe `/` nu face nimic
**Fix necesar:**
- În `Layout.tsx`, la `<Link to="/">`, adaugă `onClick` handler
- Dacă `location.pathname === '/'`, fă `e.preventDefault()` și `window.location.reload()`
- Aplică și pentru link-ul "Acasă" din meniu

### 7. ✅ Reparare chenar blocat la search (zoom initial)
**Problema:** Un popup rămâne blocat în centrul hartii după search
**Fix necesar:**
- În `selectLocation`, la început, elimină toate popup-urile existente: `document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());`
- În `map.once('moveend')`, înainte de a crea popup nou, elimină din nou popup-urile existente
- În `else` branch (map not ready), elimină popup-urile

---

## ⚠️ PROBLEME IDENTIFICATE DUPĂ IMPLEMENTARE (trebuie fixate):

### 8. ❌ Focus pe marker nu e frumos când apăsăm pe el
**Problema:** Când apăsăm pe un marker de locație, harta nu face focus frumos/smooth pe el
**Fix necesar:**
- În click handler pentru GeoJSON circles, folosește `map.flyTo()` sau `map.easeTo()` cu animație smooth
- Ajustează zoom-ul pentru a arăta markerul bine (ex: zoom 14-15)
- Poate adăuga offset pentru a centra markerul mai bine în viewport

### 9. ❌ Cardurile (popup-urile) nu se închid când apăsăm în exteriorul lor
**Problema:** Popup-urile rămân deschise când apăsăm pe hartă în afara lor
**Fix necesar:**
- Adaugă event listener pe `map.on('click')` care elimină toate popup-urile
- Verifică că click-ul nu e pe popup sau pe marker înainte de a închide
- Folosește `document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove())`

### 10. ❌ Butoanele de filtrare nu fac reset la zoom cum trebuie
**Problema:** Când schimbăm filtrul, zoom-ul nu se resetează la nivelul României
**Fix necesar:**
- În `filterLocations`, după setarea filtrului, adaugă `map.flyTo()` cu center României și zoom default
- Folosește același zoom ca la inițializare (isMobile ? 5.5 : 6)
- Aplică reset-ul în debounce-ul de la filtre

## Fișiere de modificat:

1. `client/src/pages/Home.tsx` - Toate fix-urile 1-4, 7
2. `client/src/pages/Records.tsx` - Fix 5 (deja aplicat parțial)
3. `client/src/components/Layout.tsx` - Fix 6 (deja aplicat parțial)

## Ordine de aplicare:

1. Fix 4 (eliminare loguri) - cel mai simplu
2. Fix 1 (animație instant) - modificare mică
3. Fix 3 (debouncing filtre) - adăugare logică
4. Fix 2 (dropdown selector) - modificare UI
5. Fix 7 (popup blocat) - cleanup popups
6. Verificare Fix 5 și 6 (deja aplicate parțial)

## Note importante:

- Markerele GeoJSON persistă automat la schimbarea stilului hartii
- Nu trebuie să reîncărci markerele când schimbi stilul
- Debouncing-ul previne click-uri multiple rapide
- Popup-urile trebuie eliminate înainte de a crea altele noi

## Probleme identificate după implementare:

1. **Focus pe marker** - Trebuie animație smooth cu `flyTo()` sau `easeTo()`
2. **Popup-uri nu se închid** - Trebuie event listener pe click hartă pentru a închide popup-urile
3. **Reset zoom la filtre** - Trebuie `flyTo()` cu center României și zoom default după schimbarea filtrului

