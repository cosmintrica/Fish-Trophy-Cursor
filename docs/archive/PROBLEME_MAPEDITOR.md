# Probleme identificate în MapEditor.tsx și Home.tsx

## 1. DRAG & DROP NU FUNCȚIONEAZĂ

### Problema:
- Markerii nu se pot trage pe hartă
- Harta se pannează în loc să tragă markerul
- Drag & drop nu funcționează pentru niciun tip de locație (fishing_location, shop, ajvps_office, accommodation)

### Cauze identificate:

#### A. Conflict între event handlers
- Există două seturi de event handlers pentru drag & drop:
  1. **Global handlers** (liniile 328-449) - în `map.on('load')` - pentru GeoJSON layers
  2. **Layer-specific handlers** (liniile 1171-1192) - în `addLayerForType` - pentru fiecare layer

- Problema: Layer-specific handler setează `isDraggingRef.current = true` și dezactivează `dragPan`, dar global handler verifică `isDraggingRef.current` și încearcă să actualizeze coordonatele. Însă există un conflict de timing.

#### B. Source IDs incorecte
- În global handler (linia 335): `['admin-fishing-locations', 'admin-shops', 'admin-ajvps', 'admin-accommodations']`
- În `addLayerForType` (linia 793): source IDs sunt `'admin-shops'`, `'admin-ajvps'`, `'admin-accommodations'`
- Pentru fishing locations, source ID este `'admin-fishing-locations'` (linia 1090)
- **INCONSISTENȚĂ**: Source IDs nu se potrivesc între locuri!

#### C. Drag handlers nu sunt atașați corect
- `handleMouseMove` global (linia 328) este atașat la `map.on('mousemove')` (linia 366)
- Dar layer-specific `mousedown` handler (linia 1171) setează `isDraggingRef.current = true`
- Problema: Global `mousemove` handler verifică `isDraggingRef.current`, dar layer-specific handler nu declanșează corect drag-ul

#### D. Map panning nu este dezactivat corect
- În layer-specific `mousedown` (linia 1175): `map.dragPan.disable()`
- În global `mousemove` (linia 331): `map.dragPan.disable()` - dar doar dacă `isDraggingRef.current` este true
- Problema: Dacă `isDraggingRef.current` nu este setat corect, panning-ul rămâne activ

### Soluție necesară:
1. Unificare source IDs - folosește aceleași ID-uri peste tot
2. Eliminare duplicare event handlers - fie global, fie layer-specific, nu ambele
3. Verificare corectă a `isDraggingRef.current` înainte de a dezactiva panning
4. Testare că `mousedown` pe layer setează corect `isDraggingRef.current` și `draggedFeatureIdRef.current`

---

## 2. MARKERELE DISPAR CÂND SE SCHIMBĂ STILUL HĂRȚII (SATELIT/HIBRID)

### Problema:
- Când schimbi stilul hărții la satelit sau hibrid, markerele dispar
- Când revii la OSM, markerele nu mai apar
- Apare eroare "refresh page" când miști harta rapid sau dai zoom

### Cauze identificate:

#### A. `addAllMarkersToMap` nu este apelat corect după schimbarea stilului
- În `changeMapStyle` (linia 1244): se folosește `map.once('style.load')` (linia 1318)
- Problema: `once` înseamnă că se execută o singură dată, dar dacă schimbi stilul de mai multe ori, poate să nu se execute
- Timeout-ul de 200ms (linia 1320) poate să nu fie suficient pentru stilurile satelit/hibrid care se încarcă mai greu

#### B. Layer-urile sunt șterse când se schimbă stilul
- Când apelezi `map.setStyle()`, toate layer-urile existente sunt șterse
- `addAllMarkersToMap` trebuie să fie apelat DUPĂ ce stilul este complet încărcat
- Problema: `style.load` se declanșează când stilul începe să se încarce, nu când este complet gata

#### C. Verificare insuficientă că stilul este gata
- Nu există verificare cu `map.isStyleLoaded()` înainte de a adăuga markerele
- Timeout-ul fix de 200ms nu este suficient pentru toate cazurile

#### D. Home.tsx are aceeași problemă
- În `Home.tsx` (linia 1772): `changeMapStyle` folosește `map.once('style.load')` (linia 1861)
- Timeout de 100ms (linia 1863) - chiar mai mic decât în MapEditor
- Nu verifică `map.isStyleLoaded()`

### Soluție necesară:
1. Folosește `map.isStyleLoaded()` pentru a verifica că stilul este complet încărcat
2. Implementează o funcție `checkAndAddMarkers` care verifică periodic dacă stilul este gata
3. Mărește timeout-ul sau folosește o abordare mai robustă (retry logic)
4. Aplică aceeași soluție și în `Home.tsx`

---

## 3. FILTRELE NU FUNCȚIONEAZĂ CORECT

### Problema:
- Când selectezi "Locații" și apoi "Lacuri", filtrul se închide
- Filtrele nu filtrează corect markerele - nu apar markerele corecte
- Când selectezi un sub-filtru (ex: "Lacuri"), filtrul principal se închide

### Cauze identificate:

#### A. Logică de filtrare incorectă în `addAllMarkersToMap`
- Linia 1048-1068: Filtrarea pentru fishing locations verifică `activeLocationType`
- Problema: Când `activeLocationType` este `'lake'`, filtrul ar trebui să arate doar lacurile, dar logica de vizibilitate (linia 1070) verifică dacă `fishingData.length > 0` SAU dacă `activeLocationType` este unul dintre tipurile de fishing location
- Linia 1229-1240: Când `activeLocationType` este un sub-tip de fishing location, se ascund toate celelalte tipuri (shop, ajvps, accommodation), dar nu se verifică dacă fishing locations ar trebui să fie vizibile

#### B. UI pentru filtre - butoanele se comportă incorect
- Linia 1917: Sub-filtrele pentru fishing locations apar doar când `activeLocationType === 'fishing_location'` SAU când este un sub-tip
- Problema: Când selectezi un sub-tip (ex: `'lake'`), `activeLocationType` devine `'lake'`, deci condiția de la linia 1917 este adevărată, dar filtrul principal nu ar trebui să se închidă
- Linia 1904: Când dai click pe un buton de filtru principal, se setează `activeLocationType` direct, fără să se păstreze starea sub-filtrelor

#### C. Filtrarea nu actualizează corect markerele
- `addAllMarkersToMap` este apelat în `useEffect` (linia 1367) când se schimbă `activeLocationType`
- Dar filtrarea în `addAllMarkersToMap` (linia 1050-1064) verifică `activeLocationType` și filtrează `fishingMarkers`
- Problema: Dacă `fishingMarkers` conține toate locațiile, filtrarea funcționează, dar dacă `fishingMarkers` este deja filtrat, filtrarea nu funcționează corect

### Soluție necesară:
1. Separă logica de filtrare - păstrează `activeLocationType` pentru tipul principal și adaugă `activeFishingSubtype` pentru sub-tipuri
2. Modifică UI-ul pentru a nu închide sub-filtrele când selectezi un sub-tip
3. Asigură-te că `addAllMarkersToMap` filtrează corect bazat pe ambele: `activeLocationType` și `activeFishingSubtype`

---

## 4. CLICK & HOLD SE ACTIVEAZĂ CÂND DAI CLICK PE MARKERE ÎN EDIT MODE

### Problema:
- Când dai click pe un marker în edit mode, se activează click & hold în loc să deschidă dialogul de editare
- Click & hold ar trebui să funcționeze doar pe hartă goală, nu pe markere

### Cauze identificate:

#### A. Verificare insuficientă în `handleMouseDown`
- Linia 488-513: Se verifică dacă există features la punctul de click folosind `map.queryRenderedFeatures`
- Problema: Verificarea se face DOAR dacă există layer-uri în `existingLayers`
- Dacă layer-urile nu sunt încă încărcate sau nu există, verificarea nu se face și click & hold se activează

#### B. Event propagation nu este oprit corect
- Layer-specific click handler (linia 863 pentru shops, linia 1132 pentru fishing locations) ar trebui să oprească propagarea evenimentului
- Dar global `handleMouseDown` (linia 480) se execută înainte de layer-specific handlers
- Problema: Ordinea de execuție - global handler se execută primul și pornește click & hold

#### C. `queryRenderedFeatures` nu funcționează corect
- Linia 501: `map.queryRenderedFeatures(e.point, { layers: existingLayers })`
- Problema: Dacă layer-urile nu sunt încă renderizate sau sunt ascunse, `queryRenderedFeatures` nu găsește features
- Timeout-ul sau timing-ul poate fi problema - layer-urile pot să nu fie renderizate încă când se face query

### Soluție necesară:
1. Îmbunătățește verificarea în `handleMouseDown` - verifică toate layer-urile posibile, nu doar cele existente
2. Oprește propagarea evenimentului în layer-specific click handlers folosind `e.originalEvent.stopPropagation()` și `e.originalEvent.stopImmediatePropagation()`
3. Adaugă o verificare suplimentară - dacă `isEditMode` este true și există un feature la click, nu pornește click & hold

---

## 5. SATELIT/HIBRID NU FUNCȚIONEAZĂ PE HOMEPAGE

### Problema:
- Pe homepage, când schimbi la satelit sau hibrid, markerele nu apar
- Apare eroare "refresh page" când miști harta rapid sau dai zoom
- Markerele dispar complet și nu mai apar nici când revii la OSM

### Cauze identificate:

#### A. Aceeași problemă ca la #2 - markerele dispar la schimbarea stilului
- `Home.tsx` folosește `map.once('style.load')` (linia 1861)
- Timeout de 100ms (linia 1863) - prea mic
- Nu verifică `map.isStyleLoaded()`

#### B. `addAllLocationTypesToMap` poate să nu fie apelat corect
- Linia 1865: `addAllLocationTypesToMap(map, activeFilter)` este apelat în callback-ul `style.load`
- Problema: Dacă `activeFilter` se schimbă între timp, markerele nu sunt filtrate corect
- Funcția `addAllLocationTypesToMap` trebuie să fie verificată că există și funcționează corect

#### C. Eroarea "refresh page" indică o problemă de performanță
- Când miști harta rapid sau dai zoom, se încearcă să se încarce multe tile-uri deodată
- Stilurile satelit/hibrid folosesc tile-uri externe care pot să fie mai lente
- Problema: MapLibre poate să arunce erori când tile-urile nu se încarcă suficient de rapid

### Soluție necesară:
1. Aplică aceeași soluție ca la #2 - verificare robustă că stilul este încărcat
2. Adaugă error handling pentru tile loading errors
3. Implementează retry logic pentru tile-uri care eșuează să se încarce
4. Verifică că `addAllLocationTypesToMap` funcționează corect și este apelat cu parametrii corecți

---

## 6. PROBLEME MINORE IDENTIFICATE

### A. SelectItem cu value gol
- **REZOLVAT**: Am schimbat `value=""` cu `value="none"` și am actualizat logica

### B. Eroare "The layer does not exist"
- **REZOLVAT**: Am adăugat verificare că layer-urile există înainte de a le interoga

### C. Source IDs inconsistente
- **NEREZOLVAT**: Trebuie unificate source IDs între toate locurile unde sunt folosite

### D. Duplicare event handlers
- **NEREZOLVAT**: Există atât global handlers cât și layer-specific handlers pentru același lucru

---

## REZUMAT - CE TREBUIE FĂCUT:

1. **Drag & Drop**: Unificare source IDs, eliminare duplicare handlers, fixare logică de drag
2. **Markere dispar la schimbare stil**: Implementare verificare robustă cu `isStyleLoaded()` și retry logic
3. **Filtre**: Separare logică pentru tipuri principale și sub-tipuri, fixare UI
4. **Click & Hold pe markere**: Îmbunătățire verificare și oprire propagare evenimente
5. **Homepage satelit/hibrid**: Aplicare aceeași soluție ca pentru MapEditor
6. **Source IDs**: Unificare peste tot
7. **Event handlers**: Eliminare duplicare, păstrare doar un set de handlers

