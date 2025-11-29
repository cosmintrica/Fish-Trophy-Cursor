# Analiză: Markerele nu se afișează uneori (necesită refresh)

**Data:** 2025-01-29  
**Status:** 🔍 ANALIZAT - Probleme identificate

---

## 🔴 Probleme Identificate

### 1. **Race Condition între Map Load și Data Load**

**Problema:**
- `map.once('load')` se apelează când harta e gata, dar `fishingMarkers` poate să nu fie încă încărcate
- `useEffect` pentru `fishingMarkers.length` se apelează când markerele sunt încărcate, dar harta poate să nu fie încă gata

**Cod problematic:**
```typescript
// map.once('load') - se apelează o singură dată
map.once('load', () => {
  setTimeout(() => {
    if (fishingMarkers.length > 0 || databaseLocations.length > 0) {
      addLocationsToMap(map, activeFilter);
    }
  }, 100); // Delay poate să nu fie suficient
});

// useEffect - se apelează când fishingMarkers se schimbă
useEffect(() => {
  if (mapInstanceRef.current && fishingMarkers.length > 0) {
    if (mapInstanceRef.current.isStyleLoaded()) {
      addLocationsToMap(mapInstanceRef.current, activeFilter);
    }
  }
}, [fishingMarkers.length, activeFilter]);
```

**Cauză:** Dacă harta se încarcă înainte ca `fishingMarkers` să fie gata, `map.once('load')` se apelează dar nu găsește date. Dacă `fishingMarkers` se încarcă după, `useEffect` se apelează dar harta poate să nu fie complet gata.

---

### 2. **Verificare Incompletă în `useEffect`**

**Problema:**
```typescript
useEffect(() => {
  if (mapInstanceRef.current && fishingMarkers.length > 0) {
    // Verifică doar fishingMarkers, nu și databaseLocations ca fallback
  }
}, [fishingMarkers.length, activeFilter]);
```

**Cauză:** Dacă `fishingMarkers` e gol dar `databaseLocations` are date, markerele nu se încarcă.

---

### 3. **`isAddingMarkers` Poate Rămâne Blocat**

**Problema:**
```typescript
if (isAddingMarkers) {
  return; // Blochează dacă e deja în proces
}
setIsAddingMarkers(true);
try {
  // ... cod
} catch (error) {
  // Dacă apare eroare, isAddingMarkers rămâne true
} finally {
  setIsAddingMarkers(false); // ✅ OK - se resetează în finally
}
```

**Cauză:** Dacă apare o eroare înainte de `setIsAddingMarkers(true)`, sau dacă există un race condition, `isAddingMarkers` poate să rămână `true`.

---

### 4. **`map.once('load')` se Apelează doar o Dată**

**Problema:**
- Dacă harta se reinițializează sau se re-renderizează, `map.once('load')` nu se va mai apela
- Dacă datele se încarcă după ce `map.once('load')` s-a apelat deja, markerele nu se vor adăuga

---

### 5. **Verificare `isStyleLoaded()` Nu e Suficientă**

**Problema:**
```typescript
if (mapInstanceRef.current.isStyleLoaded()) {
  addLocationsToMap(mapInstanceRef.current, activeFilter);
}
```

**Cauză:** `isStyleLoaded()` verifică doar dacă stilul e încărcat, dar nu verifică dacă harta e complet inițializată sau dacă source-ul există deja.

---

## ✅ Soluții Propuse

### Soluția 1: Funcție Unificată de Verificare

```typescript
const tryAddMarkersToMap = useCallback((filterType: string) => {
  if (!mapInstanceRef.current) return false;
  
  const map = mapInstanceRef.current;
  
  // Verifică dacă harta e gata
  if (!map.isStyleLoaded() || !map.loaded()) return false;
  
  // Verifică dacă avem date
  const hasData = fishingMarkers.length > 0 || databaseLocations.length > 0;
  if (!hasData) return false;
  
  // Verifică dacă nu suntem deja în proces
  if (isAddingMarkers) return false;
  
  // Adaugă markerele
  addLocationsToMap(map, filterType);
  return true;
}, [fishingMarkers, databaseLocations, activeFilter, isAddingMarkers]);
```

### Soluția 2: Folosește `map.on('load')` în Loc de `map.once('load')`

```typescript
// În loc de map.once('load')
map.on('load', () => {
  // Verifică și adaugă markerele dacă datele sunt gata
  tryAddMarkersToMap(activeFilter);
});
```

### Soluția 3: `useEffect` Unificat pentru Map + Data

```typescript
// Un singur useEffect care verifică atât harta cât și datele
useEffect(() => {
  if (!mapInstanceRef.current) return;
  
  const map = mapInstanceRef.current;
  
  // Verifică dacă harta e gata
  if (!map.isStyleLoaded() || !map.loaded()) {
    // Așteaptă până când harta e gata
    const onLoad = () => {
      tryAddMarkersToMap(activeFilter);
    };
    
    if (map.loaded()) {
      onLoad();
    } else {
      map.once('load', onLoad);
    }
    return;
  }
  
  // Harta e gata - verifică datele
  const hasData = fishingMarkers.length > 0 || databaseLocations.length > 0;
  if (hasData) {
    tryAddMarkersToMap(activeFilter);
  }
}, [mapInstanceRef.current, fishingMarkers.length, databaseLocations.length, activeFilter]);
```

### Soluția 4: Reset `isAddingMarkers` cu Timeout de Siguranță

```typescript
const addLocationsToMap = (_map: maplibregl.Map, filterType: string) => {
  if (!_map || !_map.getContainer()) {
    return;
  }

  if (isAddingMarkers) {
    return;
  }

  setIsAddingMarkers(true);
  
  // Timeout de siguranță pentru a reseta isAddingMarkers dacă ceva merge greșit
  const safetyTimeout = setTimeout(() => {
    setIsAddingMarkers(false);
  }, 5000); // 5 secunde timeout

  try {
    // ... cod existent ...
    
    clearTimeout(safetyTimeout);
    setIsAddingMarkers(false);
  } catch (error) {
    console.error('Error adding markers:', error);
    clearTimeout(safetyTimeout);
    setIsAddingMarkers(false);
  }
};
```

### Soluția 5: Verificare Fallback în `useEffect`

```typescript
useEffect(() => {
  if (!mapInstanceRef.current) return;
  
  const map = mapInstanceRef.current;
  const hasData = fishingMarkers.length > 0 || databaseLocations.length > 0;
  
  if (!hasData) return;
  
  // Verifică dacă harta e gata
  if (map.isStyleLoaded() && map.loaded()) {
    addLocationsToMap(map, activeFilter);
  } else {
    // Așteaptă până când harta e gata
    map.once('load', () => {
      addLocationsToMap(map, activeFilter);
    });
  }
}, [fishingMarkers.length, databaseLocations.length, activeFilter]);
```

---

## 🎯 Implementare Recomandată

**Combină Soluțiile 3 + 4 + 5:**

1. **Funcție unificată** `tryAddMarkersToMap` care verifică toate condițiile
2. **useEffect unificat** care verifică atât harta cât și datele
3. **Timeout de siguranță** pentru `isAddingMarkers`
4. **Fallback** la `databaseLocations` dacă `fishingMarkers` e gol
5. **Verificare robustă** pentru starea hărții (`isStyleLoaded()` + `loaded()`)

---

## 📝 Fișier de Modificat

- `client/src/pages/Home.tsx`

---

## ⚠️ Testare

După implementare, testează:
- ✅ Refresh pagină - markerele se încarcă
- ✅ Navigare de la altă pagină - markerele se încarcă
- ✅ Slow network (throttle în DevTools) - markerele se încarcă
- ✅ Harta se încarcă înainte de date - markerele se adaugă când datele sunt gata
- ✅ Datele se încarcă înainte de hartă - markerele se adaugă când harta e gata

---

**Status:** ✅ IMPLEMENTAT - 2025-01-29

---

## ✅ Soluții Implementate

### 1. Refs pentru Valori Curente
- Adăugat `fishingMarkersRef` și `databaseLocationsRef` pentru a evita closure issues
- Refs se actualizează când state-ul se schimbă
- Event listeners folosesc refs în loc de closure values

### 2. `map.on('load')` în Loc de `map.once('load')`
- Se apelează de fiecare dată când harta se încarcă
- Verifică datele din refs (valori curente)
- Retry logic cu timeout de 200ms

### 3. useEffect Unificat
- Verifică atât harta cât și datele
- Folosește refs pentru valori curente
- Retry logic pentru cazul când harta nu e gata

### 4. Timeout de Siguranță
- `isAddingMarkers` se resetează automat după 5 secunde
- Previne blocarea permanentă
- Clear timeout în toate cazurile (success, error, early return)

### 5. Fallback la `databaseLocations`
- Dacă `fishingMarkers` e gol, folosește `databaseLocations`
- Verificare în ambele locuri (map.on('load') și useEffect)

---

## 🧪 Testare Recomandată

După implementare, testează:
- ✅ Refresh pagină - markerele se încarcă
- ✅ Navigare de la altă pagină - markerele se încarcă
- ✅ Slow network (throttle în DevTools) - markerele se încarcă
- ✅ Harta se încarcă înainte de date - markerele se adaugă când datele sunt gata
- ✅ Datele se încarcă înainte de hartă - markerele se adaugă când harta e gata
- ✅ Multiple rapid refreshes - markerele se încarcă de fiecare dată

