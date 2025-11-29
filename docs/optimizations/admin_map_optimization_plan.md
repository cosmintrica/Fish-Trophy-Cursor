# Plan Optimizare Hartă Admin (MapEditor.tsx)

**Data:** 2025-01-29  
**Obiectiv:** Migrare de la DOM markers la GeoJSON layers (GPU-accelerated) pentru performanță, identic cu Homepage  
**Status:** ⏳ PENDING

---

## 📊 Situație Actuală

### Probleme Identificate:
- ❌ Folosește DOM markers (`maplibregl.Marker`) - lent cu multe locații
- ❌ Fără optimizări GPU
- ❌ Markerele sunt create individual pentru fiecare locație
- ❌ Nu folosește `loadFishingMarkers` (minimal data)
- ❌ Nu are code splitting sau lazy loading

### Funcționalități Existente (DE PĂSTRAT):
- ✅ Drag & Drop pentru editare coordonate
- ✅ Click pe marker pentru editare locație
- ✅ Click & Hold pe hartă pentru adăugare locație nouă
- ✅ Hover tooltip cu nume locație
- ✅ Edit mode toggle
- ✅ Temp marker pentru placement

---

## 🎯 Plan de Optimizare

### Partea 1: Pregătire Date (fishingLocations.ts)

**Status:** ✅ DEJA EXISTĂ
- `loadFishingMarkers()` - minimal data (FAST)
- `getLocationDetails()` - full data on-demand
- `FishingMarker` interface

**Verificare:** ✅ Funcțiile există deja din optimizarea Homepage

---

### Partea 2: Migrare la GeoJSON Layers

#### 2.1 Înlocuire DOM Markers cu GeoJSON

**Fișier:** `client/src/components/admin/MapEditor.tsx`

**Modificări necesare:**

1. **Imports:**
   ```typescript
   // ADAUGĂ:
   import { loadFishingMarkers, getLocationDetails, FishingMarker } from '@/services/fishingLocations';
   import type * as GeoJSON from 'geojson';
   ```

2. **State:**
   ```typescript
   // ADAUGĂ:
   const [fishingMarkers, setFishingMarkers] = useState<FishingMarker[]>([]);
   const [isLoadingMarkers, setIsLoadingMarkers] = useState(false);
   
   // ELIMINĂ sau PĂSTREAZĂ pentru drag:
   // const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
   ```

3. **Încărcare Date:**
   ```typescript
   // ÎNAINTE de map initialization:
   useEffect(() => {
     const loadData = async () => {
       setIsLoadingMarkers(true);
       try {
         const markers = await loadFishingMarkers();
         setFishingMarkers(markers);
       } catch (error) {
         console.error('Error loading markers:', error);
       } finally {
         setIsLoadingMarkers(false);
       }
     };
     loadData();
   }, []);
   ```

4. **Funcție `addMarkersToMap` - RESCRIS:**
   ```typescript
   const addMarkersToMap = (locationsData: DatabaseFishingLocation[]) => {
     if (!mapInstanceRef.current) return;
     
     const map = mapInstanceRef.current;
     const sourceId = 'admin-locations';
     
     // Create GeoJSON
     const geojson: GeoJSON.FeatureCollection = {
       type: 'FeatureCollection',
       features: locationsData.map(loc => ({
         type: 'Feature',
         geometry: {
           type: 'Point',
           coordinates: [loc.longitude, loc.latitude]
         },
         properties: {
           id: loc.id,
           name: loc.name,
           type: loc.type,
           county: loc.county,
           region: loc.region
         }
       }))
     };
     
     // Update or create source
     if (map.getSource(sourceId)) {
       (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
     } else {
       map.addSource(sourceId, {
         type: 'geojson',
         data: geojson
       });
       
       // Add circle layer
       map.addLayer({
         id: 'admin-location-circles',
         type: 'circle',
         source: sourceId,
         paint: {
           'circle-color': [
             'match',
             ['get', 'type'],
             'river', '#10b981',
             'fluviu', '#10b981',
             'lake', '#3b82f6',
             'pond', '#ef4444',
             'balti_salbatic', '#ef4444',
             'private_pond', '#a855f7',
             'maritime', '#6366f1',
             '#6b7280'
           ],
           'circle-radius': [
             'interpolate', ['linear'], ['zoom'],
             5, 10,
             10, 14,
             15, 18
           ],
           'circle-stroke-width': 2,
           'circle-stroke-color': '#ffffff',
           'circle-opacity': 0.95
         }
       });
     }
   };
   ```

---

### Partea 3: Păstrare Funcționalități Editare

#### 3.1 Drag & Drop pentru GeoJSON

**Problema:** GeoJSON layers nu suportă drag & drop direct.

**Soluție:** Folosim `map.on('mousedown')` + `map.on('mousemove')` + `map.on('mouseup')` pe layer-ul `admin-location-circles`:

```typescript
// Drag handler pentru GeoJSON markers
let isDragging = false;
let draggedFeatureId: string | null = null;
let dragStartPoint: { x: number; y: number } | null = null;

map.on('mousedown', 'admin-location-circles', (e) => {
  if (!isEditMode) return;
  
  isDragging = true;
  draggedFeatureId = e.features?.[0]?.properties?.id || null;
  dragStartPoint = e.point;
  
  // Prevent default map drag
  e.preventDefault();
  map.getCanvas().style.cursor = 'grabbing';
});

map.on('mousemove', (e) => {
  if (!isDragging || !draggedFeatureId) return;
  
  // Update marker position in real-time
  const source = map.getSource('admin-locations') as maplibregl.GeoJSONSource;
  const data = source._data as GeoJSON.FeatureCollection;
  
  const feature = data.features.find(f => f.properties?.id === draggedFeatureId);
  if (feature) {
    feature.geometry = {
      type: 'Point',
      coordinates: [e.lngLat.lng, e.lngLat.lat]
    };
    source.setData(data);
  }
});

map.on('mouseup', () => {
  if (isDragging && draggedFeatureId) {
    // Save final position
    const source = map.getSource('admin-locations') as maplibregl.GeoJSONSource;
    const data = source._data as GeoJSON.FeatureCollection;
    const feature = data.features.find(f => f.properties?.id === draggedFeatureId);
    
    if (feature) {
      const [lng, lat] = feature.geometry.coordinates as [number, number];
      handleLocationDragEnd(draggedFeatureId, lat, lng);
    }
    
    isDragging = false;
    draggedFeatureId = null;
    map.getCanvas().style.cursor = '';
  }
});
```

#### 3.2 Click pentru Editare

```typescript
map.on('click', 'admin-location-circles', async (e) => {
  if (isEditMode) {
    const locationId = e.features?.[0]?.properties?.id;
    if (locationId) {
      // Load full details and open edit dialog
      const fullDetails = await getLocationDetails(locationId);
      if (fullDetails) {
        handleLocationClick(fullDetails);
      }
    }
  }
});
```

#### 3.3 Hover Tooltip

```typescript
map.on('mouseenter', 'admin-location-circles', (e) => {
  if (!isDraggingMarker) {
    const properties = e.features?.[0]?.properties;
    if (properties) {
      const point = map.project(e.lngLat);
      setHoverTooltip({
        id: properties.id,
        name: properties.name,
        county: properties.county,
        x: point.x,
        y: point.y
      });
    }
  }
  map.getCanvas().style.cursor = isEditMode ? 'grab' : 'pointer';
});

map.on('mouseleave', 'admin-location-circles', () => {
  if (!isDraggingMarker) {
    setHoverTooltip(null);
  }
  map.getCanvas().style.cursor = '';
});
```

---

### Partea 4: Temp Marker pentru Placement

**Status:** ✅ PĂSTREAZĂ LOGICA EXISTENTĂ

Temp marker-ul pentru click & hold poate rămâne ca DOM marker (nu afectează performanța - e doar unul).

---

### Partea 5: Update Marker Individual (după editare)

**Problema:** Când se editează o locație, trebuie să actualizăm doar acel marker.

**Soluție:**
```typescript
const updateSingleMarker = (locationId: string, newCoords: [number, number]) => {
  const source = map.getSource('admin-locations') as maplibregl.GeoJSONSource;
  const data = source._data as GeoJSON.FeatureCollection;
  
  const feature = data.features.find(f => f.properties?.id === locationId);
  if (feature) {
    feature.geometry = {
      type: 'Point',
      coordinates: newCoords
    };
    source.setData(data);
  }
};
```

---

## 📋 Checklist Implementare

### Pasul 1: Pregătire
- [ ] Backup `MapEditor.tsx` (creare `MapEditor.tsx.backup`)
- [ ] Verifică că `loadFishingMarkers` și `getLocationDetails` există
- [ ] Verifică imports necesare

### Pasul 2: Migrare GeoJSON
- [ ] Adaugă imports (`FishingMarker`, `GeoJSON`, `loadFishingMarkers`, `getLocationDetails`)
- [ ] Adaugă state pentru `fishingMarkers`
- [ ] Adaugă `useEffect` pentru încărcare date
- [ ] Rescrie `addMarkersToMap` cu GeoJSON layers
- [ ] Adaugă layer `admin-location-circles` cu culori identice cu Homepage

### Pasul 3: Funcționalități Editare
- [ ] Implementează drag & drop pentru GeoJSON markers
- [ ] Implementează click handler pentru editare
- [ ] Implementează hover tooltip
- [ ] Păstrează temp marker pentru placement (DOM marker - OK)

### Pasul 4: Update Individual
- [ ] Implementează `updateSingleMarker` pentru update după editare
- [ ] Testează update după drag & drop
- [ ] Testează update după editare din dialog

### Pasul 5: Cleanup
- [ ] Elimină `markersRef` (dacă nu mai e necesar)
- [ ] Elimină logica veche de DOM markers
- [ ] Verifică că toate funcționalitățile funcționează

### Pasul 6: Testare
- [ ] Testează drag & drop
- [ ] Testează click pentru editare
- [ ] Testează click & hold pentru adăugare
- [ ] Testează hover tooltip
- [ ] Testează update după editare
- [ ] Verifică performanța cu multe locații (690+)

---

## ⚠️ Note Importante

1. **Drag & Drop:** GeoJSON layers nu suportă drag direct - trebuie implementat manual cu `mousedown`/`mousemove`/`mouseup`

2. **Temp Marker:** Poate rămâne DOM marker (nu afectează performanța - e doar unul)

3. **Culori:** Păstrează EXACT aceleași culori ca pe Homepage pentru consistență

4. **Dimensiuni:** Păstrează aceleași dimensiuni de marker ca pe Homepage

5. **Edit Mode:** Toate funcționalitățile de editare trebuie să funcționeze identic

---

## 🎯 Rezultate Așteptate

- ✅ Performanță îmbunătățită (GPU-accelerated rendering)
- ✅ Smooth panning/zooming chiar cu 690+ locații
- ✅ Toate funcționalitățile de editare funcționează
- ✅ Design identic cu Homepage
- ✅ Cod mai curat și mai ușor de întreținut

---

## 📝 Fișiere de Modificat

1. `client/src/components/admin/MapEditor.tsx` - migrare la GeoJSON
2. (Opțional) `client/src/services/fishingLocations.ts` - verificare funcții există

---

**Status Final:** ⏳ PENDING - Implementare mâine

