# PROBLEME DETALIATE - MapEditor.tsx - Panoul de Gestionare Locații este COMPLET INUTIL

## INTRODUCERE

Panoul de gestionare locații din admin panel este **COMPLET INUTIL** în starea actuală. Nu poți face absolut nimic cu markerii:
- ❌ Nu poți trage markerii (drag & drop nu funcționează)
- ❌ Nu poți da click pe markeri pentru editare (click nu funcționează)
- ❌ Nu poți vedea markerii când schimbi stilul hărții la satelit/hibrid
- ❌ Filtrele nu funcționează corect
- ❌ Click & hold se activează când dai click pe markeri în loc să deschidă dialogul de editare

Acest document explică în detaliu **TOATE** problemele și de ce nu funcționează nimic.

---

## PROBLEMA #1: DRAG & DROP NU FUNCȚIONEAZĂ DELOC - MARKERII NU SE POT TRAGE

### Descrierea problemei:
Când activezi modul de editare și încerci să tragi un marker pe hartă, **NU SE ÎNTÂMPLĂ NIMIC**. Harta se pannează în loc să tragă markerul. Nu funcționează pentru niciun tip de locație (fishing_location, shop, ajvps_office, accommodation).

### Analiza tehnică detaliată:

#### 1.1. CONFLICT ÎNTRE EVENT HANDLERS - DUPLICARE COMPLETĂ

Există **DOUĂ SETURI COMPLETE** de event handlers pentru drag & drop, care se suprapun și se interferează:

**SETUL 1: Global Handlers (liniile 324-452)**
- Atașați în `map.on('load')` - se execută o singură dată când harta se încarcă
- `handleMouseMove` (linia 328) - atașat la `map.on('mousemove')` (linia 366)
- `handleMouseUp` (linia 368) - atașat la `map.on('mouseup')` (linia 451)
- Acestea sunt **GLOBALE** - se execută pentru orice eveniment pe hartă

**SETUL 2: Layer-Specific Handlers (liniile 1022-1043 pentru shops, 1171-1192 pentru fishing locations)**
- Atașați în `addLayerForType` - se execută pentru fiecare layer când este adăugat
- `map.on('mousedown', layerId, ...)` (linia 1022 pentru shops, linia 1171 pentru fishing locations)
- Acestea sunt **SPECIFICE PENTRU LAYER** - se execută doar când dai click pe un marker din acel layer

**PROBLEMA CRITICĂ:**
- Layer-specific `mousedown` handler (linia 1022/1171) setează `isDraggingRef.current = true` și `draggedFeatureIdRef.current`
- Dar global `mousemove` handler (linia 328) verifică `isDraggingRef.current` și încearcă să actualizeze coordonatele
- **CONFLICT DE TIMING**: Layer-specific handler se execută PRIMUL, dar global handler nu știe că trebuie să proceseze drag-ul pentru că verificarea se face într-un mod care nu funcționează corect

#### 1.2. SOURCE IDs INCONSISTENTE - MARKERII NU SUNT GĂSIȚI

**În global handler (linia 335):**
```typescript
const sourceIds = ['admin-fishing-locations', 'admin-shops', 'admin-ajvps', 'admin-accommodations'];
```

**În `addLayerForType` pentru shops (linia 794):**
```typescript
const addLayerForType = (sourceId: string, ...) => {
  // sourceId este 'admin-shops'
}
```

**În `addAllMarkersToMap` pentru fishing locations (linia 1090):**
```typescript
const sourceId = 'admin-fishing-locations';
```

**PROBLEMA:**
- Global handler caută în `'admin-fishing-locations'`, `'admin-shops'`, `'admin-ajvps'`, `'admin-accommodations'`
- Dar când se adaugă layer-urile, source IDs pot fi diferite sau nu se potrivesc
- Când global handler încearcă să găsească feature-ul cu `draggedFeatureIdRef.current`, **NU ÎL GĂSEȘTE** pentru că caută în source-uri greșite sau source-urile nu există

**EXEMPLU CONCRET:**
1. User dă click pe un marker de shop
2. Layer-specific handler (linia 1022) setează `draggedFeatureIdRef.current = 'shop-123'`
3. User începe să tragă mouse-ul
4. Global `mousemove` handler (linia 328) se execută
5. Verifică `isDraggingRef.current` - este `true` ✓
6. Caută în source-uri: `['admin-fishing-locations', 'admin-shops', 'admin-ajvps', 'admin-accommodations']`
7. Găsește source `'admin-shops'` ✓
8. Încearcă să găsească feature cu `id === 'shop-123'`
9. **PROBLEMĂ**: Feature-ul poate să nu fie găsit pentru că:
   - Source-ul nu există încă
   - Source-ul are date diferite
   - ID-ul nu se potrivește

#### 1.3. MAP PANNING NU ESTE DEZACTIVAT CORECT

**În layer-specific `mousedown` handler (linia 1026):**
```typescript
if (map.dragPan && map.dragPan.isEnabled()) {
  map.dragPan.disable();
}
```

**În global `mousemove` handler (linia 331):**
```typescript
if (isDraggingRef.current && draggedFeatureIdRef.current && isEditMode) {
  if (map.dragPan && map.dragPan.isEnabled()) {
    map.dragPan.disable();
  }
  // ... actualizează coordonatele
}
```

**PROBLEMA:**
- Layer-specific handler dezactivează panning-ul imediat când dai click
- Dar dacă `isDraggingRef.current` nu este setat corect sau dacă există un delay, panning-ul se reactivează
- Global handler verifică `isDraggingRef.current` și dezactivează panning-ul din nou, dar **PREA TÂRZIU** - harta s-a pannat deja

**SCENARIU REAL:**
1. User dă click pe marker
2. Layer-specific handler setează `isDraggingRef.current = true` și dezactivează panning-ul
3. User începe să miște mouse-ul (foarte rapid, în < 10ms)
4. MapLibre procesează evenimentul de panning ÎNAINTE ca global handler să se execute
5. Harta se pannează cu câțiva pixeli
6. Global handler se execută și dezactivează panning-ul, dar **PREA TÂRZIU**

#### 1.4. EVENT PROPAGATION NU ESTE OPRIT CORECT

**În layer-specific `mousedown` handler (linia 1035-1039):**
```typescript
e.preventDefault();
if (e.originalEvent) {
  e.originalEvent.stopPropagation();
  e.originalEvent.stopImmediatePropagation();
}
```

**PROBLEMA:**
- `e.preventDefault()` previne comportamentul default, dar nu oprește propagarea
- `stopPropagation()` și `stopImmediatePropagation()` ar trebui să oprească propagarea, dar **NU FUNCȚIONEAZĂ** pentru că:
  - Global `mousedown` handler (linia 473) este atașat la `map.on('mousedown')` (linia 648)
  - Layer-specific handler este atașat la `map.on('mousedown', layerId, ...)`
  - **ORDINEA DE EXECUȚIE**: MapLibre execută layer-specific handlers ÎNAINTE de global handlers, dar dacă există un delay sau dacă event-ul este procesat diferit, global handler se poate executa primul

**SCENARIU REAL:**
1. User dă click pe marker
2. MapLibre primește evenimentul `mousedown`
3. **PROBLEMĂ**: Nu există o garanție că layer-specific handler se execută ÎNAINTE de global handler
4. Dacă global handler se execută primul, pornește click & hold logic (linia 515-577)
5. Layer-specific handler se execută după, dar click & hold deja a început
6. Rezultat: **NICI DRAG, NICI CLICK & HOLD NU FUNCȚIONEAZĂ CORECT**

#### 1.5. VERIFICAREA `isDraggingRef.current` ÎN GLOBAL HANDLER

**În global `mousemove` handler (linia 329):**
```typescript
if (isDraggingRef.current && draggedFeatureIdRef.current && isEditMode) {
  // ... procesează drag
}
```

**PROBLEMA:**
- Verificarea este corectă, dar **NU SE AJUNGE NICIODATĂ** la acest cod pentru că:
  - `isDraggingRef.current` este setat în layer-specific handler
  - Dar layer-specific handler se execută DOAR dacă layer-ul există și este renderizat
  - Dacă layer-ul nu este renderizat sau dacă există o problemă cu event-ul, `isDraggingRef.current` nu este setat
  - Global handler verifică `isDraggingRef.current`, dar este `false`, deci nu procesează drag-ul

### Rezumat Problema #1:
**DRAG & DROP NU FUNCȚIONEAZĂ** pentru că:
1. Există două seturi de event handlers care se interferează
2. Source IDs nu se potrivesc între locuri
3. Map panning nu este dezactivat la timp
4. Event propagation nu este oprit corect
5. Verificarea `isDraggingRef.current` nu funcționează corect

**REZULTAT**: Când încerci să tragi un marker, harta se pannează în loc să tragă markerul.

---

## PROBLEMA #2: CLICK PE MARKERI NU FUNCȚIONEAZĂ PENTRU EDITARE

### Descrierea problemei:
Când activezi modul de editare și dai click pe un marker pentru a-l edita, **NU SE ÎNTÂMPLĂ NIMIC**. Dialogul de editare nu se deschide. În schimb, se activează click & hold logic, care pornește procesul de creare a unei locații noi.

### Analiza tehnică detaliată:

#### 2.1. GLOBAL `mousedown` HANDLER INTERCEPTEAZĂ CLICK-UL

**Global `mousedown` handler (linia 473-577):**
- Atașat la `map.on('mousedown')` (linia 648)
- Se execută pentru **ORICE** click pe hartă, inclusiv pe markeri
- Verifică dacă există features la punctul de click (linia 499-513)
- Dacă **NU** găsește features, pornește click & hold logic (linia 515-577)

**Layer-specific `click` handler (linia 863 pentru shops, linia 1132 pentru fishing locations):**
- Atașat la `map.on('click', layerId, ...)`
- Se execută doar când dai click pe un marker din acel layer
- Ar trebui să deschidă dialogul de editare (linia 869-993)

**PROBLEMA CRITICĂ:**
- Global `mousedown` handler se execută **ÎNAINTE** de layer-specific `click` handler
- Când dai click pe un marker:
  1. Global `mousedown` handler se execută (linia 473)
  2. Verifică dacă există features (linia 499-513)
  3. **PROBLEMĂ**: `map.queryRenderedFeatures(e.point, { layers: existingLayers })` poate să **NU GĂSEASCĂ** features pentru că:
     - Layer-urile nu sunt încă renderizate complet
     - `e.point` nu este exact acolo unde este markerul (offset de câțiva pixeli)
     - Layer-urile sunt ascunse sau nu sunt în stilul hărții
  4. Dacă nu găsește features, pornește click & hold logic (linia 515)
  5. Layer-specific `click` handler se execută după, dar click & hold deja a început
  6. Rezultat: **NICI CLICK PENTRU EDITARE, NICI CLICK & HOLD NU FUNCȚIONEAZĂ CORECT**

#### 2.2. `queryRenderedFeatures` NU FUNCȚIONEAZĂ CORECT

**Codul actual (linia 499-513):**
```typescript
const existingLayers: string[] = [];
const layerIds = ['admin-fishing-circles', 'admin-shop-circles', 'admin-ajvps-circles', 'admin-accommodation-circles'];

for (const layerId of layerIds) {
  if (map.getLayer(layerId)) {
    existingLayers.push(layerId);
  }
}

if (existingLayers.length > 0) {
  try {
    const features = map.queryRenderedFeatures(e.point, {
      layers: existingLayers
    });
    
    if (features && features.length > 0) {
      // This is a marker click, not an empty map click - don't start click & hold
      return;
    }
  } catch (error) {
    console.warn('Error querying features:', error);
  }
}
```

**PROBLEME MULTIPLE:**

**A. Layer-urile pot să nu fie încă renderizate:**
- Când schimbi stilul hărții, layer-urile sunt șterse și re-adăugate
- `map.getLayer(layerId)` returnează `true` dacă layer-ul există, dar **NU** garantează că este renderizat
- `queryRenderedFeatures` returnează doar features care sunt **RENDERIZATE** în acel moment
- Dacă layer-ul nu este încă renderizat, `queryRenderedFeatures` returnează `[]`, chiar dacă markerul există

**B. `e.point` poate să nu fie exact acolo unde este markerul:**
- `e.point` este coordonata pixelului unde ai dat click
- Dar markerii sunt renderizați ca cercuri cu o anumită rază
- Dacă dai click pe marginea cercului sau pe o zonă unde nu este exact centrul, `queryRenderedFeatures` poate să nu găsească feature-ul
- Ar trebui să folosești un buffer sau să verifici într-o zonă mai mare

**C. Layer-urile pot să fie ascunse:**
- Dacă `activeLocationType` este setat la un tip specific, alte layer-uri sunt ascunse (linia 1196-1226)
- `map.getLayer(layerId)` returnează `true` chiar dacă layer-ul este ascuns
- Dar `queryRenderedFeatures` **NU** returnează features din layer-uri ascunse
- Dacă markerul este într-un layer ascuns, nu este găsit

**D. Timing issues:**
- Când dai click foarte rapid sau când harta se mișcă, `queryRenderedFeatures` poate să nu funcționează corect
- Există un delay între momentul când dai click și momentul când layer-urile sunt renderizate

#### 2.3. CLICK & HOLD SE PORNEȘTE CHIAR DACĂ DAI CLICK PE MARKER

**Codul actual (linia 515-577):**
```typescript
mouseDownTime = Date.now();
mouseDownPosition = { x: e.point.x, y: e.point.y };
hasMoved = false;

// Show holding indicator only after 300ms to avoid flickering
holdingIndicatorTimer = setTimeout(() => {
  if (!hasMoved) {
    setIsHolding(true);
  }
}, 300);

// Create temporary marker immediately
const tempMarkerEl = document.createElement('div');
// ... creează marker temporar

holdTimer = setTimeout(() => {
  if (!hasMoved && isEditMode) {
    // ... deschide meniul pentru locație nouă
  }
}, 500); // 500ms hold
```

**PROBLEMA:**
- Chiar dacă `queryRenderedFeatures` nu găsește features (din cauza problemelor de mai sus), click & hold logic se pornește
- Creează un marker temporar (linia 527-555)
- După 500ms, deschide meniul pentru locație nouă (linia 557-576)
- **REZULTAT**: Când dai click pe un marker pentru editare, se activează click & hold în loc să se deschidă dialogul de editare

#### 2.4. LAYER-SPECIFIC `click` HANDLER NU SE EXECUTĂ

**Codul actual (linia 863 pentru shops, linia 1132 pentru fishing locations):**
```typescript
map.on('click', layerId, async (e) => {
  if (!e.features || !e.features[0]) return;
  const properties = e.features[0].properties;
  const locationType = properties.locationType as MapLocationType;
  const locationId = properties.id;

  if (isEditMode) {
    // ... deschide dialogul de editare
  }
});
```

**PROBLEMA:**
- Layer-specific `click` handler se execută DOAR dacă:
  1. Layer-ul există și este renderizat
  2. Click-ul este exact pe un feature din acel layer
  3. `e.features` conține feature-ul
- Dar din cauza problemelor de mai sus:
  - Global `mousedown` handler interceptează click-ul
  - Click & hold logic se pornește
  - Layer-specific `click` handler se execută după, dar click & hold deja a început
  - Sau layer-specific handler nu se execută deloc pentru că event-ul este oprit

### Rezumat Problema #2:
**CLICK PE MARKERI NU FUNCȚIONEAZĂ** pentru că:
1. Global `mousedown` handler interceptează click-ul înainte de layer-specific handler
2. `queryRenderedFeatures` nu funcționează corect (layer-uri ne-renderizate, timing issues, layer-uri ascunse)
3. Click & hold se pornește chiar dacă dai click pe marker
4. Layer-specific `click` handler nu se execută sau se execută prea târziu

**REZULTAT**: Când dai click pe un marker pentru editare, se activează click & hold în loc să se deschidă dialogul de editare.

---

## PROBLEMA #3: MARKERELE DISPAR CÂND SCHIMBI STILUL HĂRȚII (SATELIT/HIBRID)

### Descrierea problemei:
Când schimbi stilul hărții la satelit sau hibrid, **TOATE MARKERELE DISPAR**. Când revii la OSM, markerele **NU MAI APAR**. Harta rămâne goală, fără niciun marker. Pe homepage apare și eroarea "refresh page" când miști harta rapid sau dai zoom.

### Analiza tehnică detaliată:

#### 3.1. `map.setStyle()` ȘTERGE TOATE LAYER-URILE ȘI SOURCE-URILE

**Codul actual (linia 1244-1315):**
```typescript
const changeMapStyle = useCallback((style: 'osm' | 'satellite' | 'hybrid') => {
  if (!mapInstanceRef.current) return;
  const currentMap = mapInstanceRef.current;
  
  setMapStyle(style);
  
  if (style === 'satellite') {
    currentMap.setStyle({
      version: 8,
      sources: { ... },
      layers: [ ... ]
    });
  }
  // ... similar pentru hibrid și OSM
  
  // Re-add markers after style loads
  currentMap.once('style.load', () => {
    setTimeout(() => {
      if (mapInstanceRef.current) {
        addAllMarkersToMap();
      }
    }, 200);
  });
}, [ ... ]);
```

**PROBLEMA CRITICĂ:**
- Când apelezi `map.setStyle()`, MapLibre **ȘTERGE TOATE** layer-urile și source-urile existente
- Apoi adaugă noile layer-uri și source-uri din stilul nou
- **PROBLEMĂ**: Layer-urile și source-urile pentru markeri (ex: `'admin-fishing-locations'`, `'admin-shop-circles'`) sunt **ȘTERSE**
- `addAllMarkersToMap()` trebuie să re-adauge toate layer-urile și source-urile, dar **NU FUNCȚIONEAZĂ CORECT**

#### 3.2. `map.once('style.load')` NU ESTE SUFICIENT

**Codul actual (linia 1318-1326):**
```typescript
currentMap.once('style.load', () => {
  setTimeout(() => {
    if (mapInstanceRef.current) {
      addAllMarkersToMap();
    }
  }, 200);
});
```

**PROBLEME MULTIPLE:**

**A. `once` înseamnă o singură dată:**
- `map.once('style.load')` se execută **O SINGURĂ DATĂ**
- Dacă schimbi stilul de mai multe ori rapid, callback-ul se poate executa doar o dată
- Dacă există o eroare la încărcarea stilului, callback-ul nu se execută deloc

**B. `style.load` se declanșează când stilul ÎNCEPE să se încarce, nu când este complet gata:**
- `style.load` se declanșează imediat după ce `setStyle()` este apelat
- Dar stilul poate să nu fie complet încărcat încă
- Tile-urile pentru satelit/hibrid se încarcă asincron
- Dacă apelezi `addAllMarkersToMap()` înainte ca stilul să fie complet gata, layer-urile nu se adaugă corect

**C. Timeout-ul de 200ms nu este suficient:**
- Pentru stilurile satelit/hibrid, tile-urile se încarcă de pe servere externe
- Poate dura mai mult de 200ms pentru ca stilul să fie complet gata
- Dacă apelezi `addAllMarkersToMap()` prea devreme, layer-urile nu se adaugă sau se adaugă incorect

**D. Nu verifică dacă stilul este complet încărcat:**
- Nu există verificare cu `map.isStyleLoaded()` înainte de a adăuga markerele
- Dacă stilul nu este complet încărcat, `addAllMarkersToMap()` poate să eșueze silențios

#### 3.3. `addAllMarkersToMap()` NU FUNCȚIONEAZĂ CORECT DUPĂ SCHIMBAREA STILULUI

**Codul actual (linia 788-1241):**
```typescript
const addAllMarkersToMap = () => {
  if (!mapInstanceRef.current) return;
  const map = mapInstanceRef.current;

  // Helper to add a layer for a specific type
  const addLayerForType = (sourceId: string, layerId: string, ...) => {
    // ... adaugă source și layer
  };

  // Add fishing locations
  if (fishingData.length > 0 || ...) {
    const sourceId = 'admin-fishing-locations';
    const layerId = 'admin-fishing-circles';
    
    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(fishingGeojson);
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', 'visible');
      }
    } else {
      map.addSource(sourceId, { type: 'geojson', data: fishingGeojson });
      // ... adaugă layer
    }
  }
  // ... similar pentru shops, ajvps, accommodations
};
```

**PROBLEME MULTIPLE:**

**A. Verifică dacă source-ul există, dar source-ul a fost șters:**
- Când schimbi stilul, toate source-urile sunt șterse
- `map.getSource(sourceId)` returnează `undefined`
- Codul intră în `else` și încearcă să adauge source-ul și layer-ul
- **PROBLEMĂ**: Dacă stilul nu este complet încărcat, `map.addSource()` poate să eșueze sau să nu funcționează corect

**B. Layer-urile sunt adăugate înainte ca stilul să fie gata:**
- Dacă apelezi `map.addSource()` sau `map.addLayer()` înainte ca stilul să fie complet încărcat, layer-urile nu se adaugă corect
- MapLibre poate să arunce erori sau să ignore comenzile

**C. Event handlers sunt pierduți:**
- Când layer-urile sunt șterse, toate event handlers atașați la ele sunt pierduți
- `addLayerForType` adaugă event handlers (linia 860-1043), dar dacă layer-urile nu sunt adăugate corect, handlers nu sunt atașați
- **REZULTAT**: Chiar dacă markerele apar, click și drag nu funcționează

#### 3.4. ACEEAȘI PROBLEMĂ PE HOMEPAGE

**Codul actual în `Home.tsx` (linia 1772-1869):**
```typescript
const changeMapStyle = (style: 'osm' | 'satellite' | 'hybrid') => {
  // ... schimbă stilul similar cu MapEditor
  
  // Re-add all markers after style loads
  map.once('style.load', () => {
    setTimeout(() => {
      if (fishingMarkers.length > 0 || ...) {
        addAllLocationTypesToMap(map, activeFilter);
      }
    }, 100); // CHIAR MAI MIC DECÂT ÎN MAPEDITOR!
  });
};
```

**PROBLEMA:**
- Aceeași problemă ca în MapEditor
- Timeout-ul este chiar mai mic (100ms în loc de 200ms)
- Nu verifică `map.isStyleLoaded()`
- `addAllLocationTypesToMap` poate să nu funcționează corect

#### 3.5. EROAREA "REFRESH PAGE" PE HOMEPAGE

**Cauza:**
- Când miști harta rapid sau dai zoom, MapLibre încearcă să încarce multe tile-uri deodată
- Stilurile satelit/hibrid folosesc tile-uri externe care pot să fie mai lente
- Dacă tile-urile nu se încarcă suficient de rapid, MapLibre poate să arunce erori
- Browser-ul detectează erorile și sugerează "refresh page"

**PROBLEMA:**
- Nu există error handling pentru tile loading errors
- Nu există retry logic pentru tile-uri care eșuează
- Nu există verificare că tile-urile sunt încărcate înainte de a adăuga markerele

### Rezumat Problema #3:
**MARKERELE DISPAR** pentru că:
1. `map.setStyle()` șterge toate layer-urile și source-urile
2. `map.once('style.load')` nu este suficient - se declanșează prea devreme
3. Timeout-ul de 200ms nu este suficient pentru stilurile satelit/hibrid
4. Nu se verifică `map.isStyleLoaded()` înainte de a adăuga markerele
5. `addAllMarkersToMap()` nu funcționează corect dacă stilul nu este complet încărcat
6. Event handlers sunt pierduți când layer-urile sunt șterse
7. Aceeași problemă pe homepage cu timeout chiar mai mic

**REZULTAT**: Când schimbi stilul hărții, markerele dispar și nu mai apar nici când revii la OSM.

---

## PROBLEMA #4: FILTRELE NU FUNCȚIONEAZĂ CORECT

### Descrierea problemei:
Când selectezi "Locații" și apoi "Lacuri", filtrul se închide în loc să rămână deschis. Filtrele nu filtrează corect markerele - nu apar markerele corecte. Când selectezi un sub-filtru (ex: "Lacuri"), filtrul principal se închide.

### Analiza tehnică detaliată:

#### 4.1. LOGICĂ DE FILTRARE INCORECTĂ

**Codul actual (linia 1048-1070):**
```typescript
let fishingData = fishingMarkers;
if (activeLocationType === 'river' || activeLocationType === 'lake' || activeLocationType === 'balti_salbatic' || activeLocationType === 'private_pond') {
  // Filter by specific type
  fishingData = fishingMarkers.filter(marker => {
    const markerType = marker.type?.toLowerCase();
    if (activeLocationType === 'river') {
      return markerType === 'river' || markerType === 'fluviu';
    } else if (activeLocationType === 'lake') {
      return markerType === 'lake' || markerType === 'lac';
    } // ... similar pentru alte tipuri
  });
} else if (activeLocationType !== 'all' && activeLocationType !== 'fishing_location') {
  // Hide fishing locations if other type is selected
  fishingData = [];
}
```

**PROBLEMA:**
- Când `activeLocationType` este `'lake'`, filtrul ar trebui să arate doar lacurile
- Dar logica de vizibilitate (linia 1070) verifică dacă `fishingData.length > 0` SAU dacă `activeLocationType` este unul dintre tipurile de fishing location
- Dacă `fishingData.length === 0` (nu există lacuri), layer-ul nu este adăugat sau este ascuns
- **PROBLEMĂ**: Dacă nu există lacuri în baza de date, layer-ul nu este adăugat, dar UI-ul arată că filtrul este activ

#### 4.2. UI PENTRU FILTRE - BUTOANELE SE COMPORTĂ INCORECT

**Codul actual (linia 1917-1938):**
```typescript
{(activeLocationType === 'fishing_location' || activeLocationType === 'river' || activeLocationType === 'lake' || activeLocationType === 'balti_salbatic' || activeLocationType === 'private_pond') && (
  <div className="flex gap-1 border border-gray-200 rounded-lg p-1">
    {[
      { type: 'river' as const, label: 'Ape curgătoare', ... },
      { type: 'lake' as const, label: 'Lacuri', ... },
      // ...
    ].map(({ type, label, color }) => (
      <button
        key={type}
        onClick={() => setActiveLocationType(type as any)}
        className={...}
      >
        {label}
      </button>
    ))}
  </div>
)}
```

**PROBLEMA:**
- Sub-filtrele apar doar când `activeLocationType === 'fishing_location'` SAU când este un sub-tip
- Când selectezi un sub-tip (ex: `'lake'`), `activeLocationType` devine `'lake'`
- Condiția de la linia 1917 este adevărată (pentru că `activeLocationType === 'lake'`), deci sub-filtrele rămân vizibile ✓
- **DAR**: Când selectezi un sub-tip, filtrul principal ("Locații") nu ar trebui să se "deselecteze" - ar trebui să rămână activ
- Problema este că `activeLocationType` nu poate fi atât `'fishing_location'` cât și `'lake'` în același timp
- **REZULTAT**: UI-ul nu arată corect care filtru este activ

#### 4.3. FILTRAREA NU ACTUALIZEAZĂ CORECT MARKERELE

**Codul actual (linia 1367-1371):**
```typescript
useEffect(() => {
  if (mapInstanceRef.current && (fishingMarkers.length > 0 || shopMarkers.length > 0 || ajvpsMarkers.length > 0 || accommodationMarkers.length > 0)) {
    addAllMarkersToMap();
  }
}, [isEditMode, fishingMarkers.length, shopMarkers.length, ajvpsMarkers.length, accommodationMarkers.length, activeLocationType]);
```

**PROBLEMA:**
- `useEffect` se execută când se schimbă `activeLocationType`
- Apelează `addAllMarkersToMap()` care filtrează markerele bazat pe `activeLocationType`
- **DAR**: Filtrarea în `addAllMarkersToMap` (linia 1050-1064) verifică `activeLocationType` și filtrează `fishingMarkers`
- Dacă `fishingMarkers` conține toate locațiile, filtrarea funcționează ✓
- Dar dacă `fishingMarkers` este deja filtrat sau dacă există o problemă cu încărcarea datelor, filtrarea nu funcționează corect

### Rezumat Problema #4:
**FILTRELE NU FUNCȚIONEAZĂ** pentru că:
1. Logică de filtrare incorectă - nu verifică corect toate cazurile
2. UI-ul nu păstrează starea corectă - când selectezi un sub-tip, filtrul principal se "deselectează"
3. Filtrarea nu actualizează corect markerele - `useEffect` se execută, dar filtrarea din `addAllMarkersToMap` poate să nu funcționează corect

**REZULTAT**: Filtrele nu funcționează corect - se închid când selectezi sub-filtre și nu filtrează corect markerele.

---

## PROBLEMA #5: CLICK & HOLD SE ACTIVEAZĂ CÂND DAI CLICK PE MARKERE

### Descrierea problemei:
Când activezi modul de editare și dai click pe un marker, se activează click & hold logic în loc să deschidă dialogul de editare. Markerul temporar apare pe hartă și după 500ms se deschide meniul pentru locație nouă.

### Analiza tehnică detaliată:

#### 5.1. VERIFICAREA ÎN `handleMouseDown` NU FUNCȚIONEAZĂ

**Codul actual (linia 488-513):**
```typescript
// Check if there are any features at this point - if yes, it's a marker click, not empty map click
const existingLayers: string[] = [];
const layerIds = ['admin-fishing-circles', 'admin-shop-circles', 'admin-ajvps-circles', 'admin-accommodation-circles'];

for (const layerId of layerIds) {
  if (map.getLayer(layerId)) {
    existingLayers.push(layerId);
  }
}

if (existingLayers.length > 0) {
  try {
    const features = map.queryRenderedFeatures(e.point, {
      layers: existingLayers
    });
    
    if (features && features.length > 0) {
      // This is a marker click, not an empty map click - don't start click & hold
      return;
    }
  } catch (error) {
    console.warn('Error querying features:', error);
  }
}
```

**PROBLEMA:**
- Verificarea se face DOAR dacă există layer-uri în `existingLayers`
- Dacă layer-urile nu sunt încă încărcate sau nu există, verificarea nu se face și click & hold se activează
- `queryRenderedFeatures` poate să nu găsească features din cauza problemelor de timing sau renderizare
- Dacă `queryRenderedFeatures` eșuează sau returnează `[]`, click & hold se activează

#### 5.2. EVENT PROPAGATION NU ESTE OPRIT CORECT

**Problema este aceeași ca la #1.4 și #2.1:**
- Global `mousedown` handler se execută înainte de layer-specific handlers
- Chiar dacă layer-specific handler oprește propagarea, global handler deja a început click & hold logic

### Rezumat Problema #5:
**CLICK & HOLD SE ACTIVEAZĂ PE MARKERE** pentru că:
1. Verificarea în `handleMouseDown` nu funcționează corect
2. `queryRenderedFeatures` nu găsește features din cauza problemelor de timing
3. Event propagation nu este oprit corect

**REZULTAT**: Când dai click pe un marker, se activează click & hold în loc să deschidă dialogul de editare.

---

## REZUMAT FINAL - DE CE PANOUL ESTE COMPLET INUTIL

### Situația actuală:
1. ❌ **DRAG & DROP NU FUNCȚIONEAZĂ** - Nu poți trage markerii pe hartă
2. ❌ **CLICK PE MARKERI NU FUNCȚIONEAZĂ** - Nu poți da click pe markeri pentru editare
3. ❌ **MARKERELE DISPAR** - Când schimbi stilul hărții, markerele dispar și nu mai apar
4. ❌ **FILTRELE NU FUNCȚIONEAZĂ** - Filtrele nu filtrează corect și se închid când selectezi sub-filtre
5. ❌ **CLICK & HOLD SE ACTIVEAZĂ PE MARKERE** - Când dai click pe markeri, se activează click & hold în loc de editare

### Cauzele principale:
1. **DUPLICARE EVENT HANDLERS** - Există două seturi de handlers care se interferează
2. **SOURCE IDs INCONSISTENTE** - Source IDs nu se potrivesc între locuri
3. **TIMING ISSUES** - Event handlers se execută în ordinea greșită
4. **STILUL HĂRȚII** - Când schimbi stilul, layer-urile sunt șterse și nu sunt re-adăugate corect
5. **VERIFICĂRI INSUFICIENTE** - Nu se verifică corect dacă layer-urile există, sunt renderizate, sau dacă stilul este gata

### Ce trebuie făcut:
1. **UNIFICARE EVENT HANDLERS** - Elimină duplicarea, păstrează doar un set de handlers
2. **UNIFICARE SOURCE IDs** - Folosește aceleași source IDs peste tot
3. **FIXARE TIMING** - Asigură-te că event handlers se execută în ordinea corectă
4. **FIXARE STILUL HĂRȚII** - Verifică `map.isStyleLoaded()` și re-adaugă markerele corect
5. **ÎMBUNĂTĂȚIRE VERIFICĂRI** - Verifică corect dacă layer-urile există, sunt renderizate, și dacă stilul este gata

---

**CONCLUZIE**: Panoul de gestionare locații este **COMPLET INUTIL** în starea actuală. Nu poți face absolut nimic cu markerii. Toate funcționalitățile esențiale (drag & drop, click pentru editare, filtrare, schimbare stil) nu funcționează.

