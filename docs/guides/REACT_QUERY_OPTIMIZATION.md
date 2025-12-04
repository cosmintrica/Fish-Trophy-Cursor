# React Query - Optimizări și DevTools

**Data:** 3 decembrie 2025

## DevTools - Icon-ul cu Palmierul 🌴

### Cine vede DevTools?

**IMPORTANT**: DevTools apare DOAR în development, NU în production!

- ✅ **Development** (`npm run dev`): DevTools este activ și apare icon-ul cu palmierul în colțul din dreapta jos
- ❌ **Production** (`npm run build`): DevTools este complet dezactivat, niciun utilizator nu-l vede

### Cum funcționează?

```typescript
// În App.tsx
{import.meta.env.DEV && (
  <ReactQueryDevtools 
    initialIsOpen={false}
    position="bottom-right"
  />
)}
```

- `import.meta.env.DEV` este `true` doar în development
- În build-ul de production, acest cod este eliminat complet
- **Zero impact** asupra bundle size în production

### Ce face DevTools?

- Vizualizează toate query-urile active
- Vezi cache-ul și statusul query-urilor
- Inspectează mutations
- Network inspector pentru request-uri
- **Doar pentru dezvoltatori** - utilizatorii finali nu-l văd niciodată

---

## Optimizări pentru Performanță Maximă ⚡

### 1. Stale Time Optimizat

```typescript
staleTime: 2 * 60 * 1000, // 2 minute
```

**Ce înseamnă:**
- Datele sunt considerate "fresh" 2 minute
- Dacă datele sunt fresh, React Query le returnează **instant** din cache
- **Zero request-uri** dacă datele sunt fresh
- Similar cu SWR `dedupingInterval`

**Beneficiu:** UI instant, fără delay-uri percepute

### 2. Cache Time (GC Time)

```typescript
gcTime: 5 * 60 * 1000, // 5 minute
```

**Ce înseamnă:**
- Datele rămân în cache 5 minute după ce nu mai sunt folosite
- Mai lung decât staleTime pentru cache persistence
- Când revii la o pagină, datele sunt deja în cache

**Beneficiu:** Navigare instant între pagini

### 3. Refetch On Window Focus - Dezactivat

```typescript
refetchOnWindowFocus: false,
```

**De ce?**
- SWR avea `revalidateOnFocus: false` pentru multe query-uri
- Previne request-uri inutile când utilizatorul schimbă tab-ul
- Datele sunt fresh 2 minute, deci nu e nevoie de refetch constant

**Beneficiu:** Mai puține request-uri, mai rapid

### 4. Retry Logic Inteligent

```typescript
retry: (failureCount, error) => {
  // Nu retry pentru erori 4xx (client errors)
  if (error?.status >= 400 && error?.status < 500) {
    return false;
  }
  // Retry maxim 2 ori pentru erori de rețea
  return failureCount < 2;
},
```

**Ce înseamnă:**
- Nu retry pentru erori client (404, 400, etc.) - e inutil
- Retry doar pentru erori de rețea (timeout, connection lost)
- Max 2 retry-uri pentru a nu bloca UI-ul

**Beneficiu:** Mai rapid, mai puține request-uri inutile

### 5. Structural Sharing

```typescript
structuralSharing: true, // Default în React Query
```

**Ce înseamnă:**
- React Query compară obiectele și păstrează referințele dacă datele nu s-au schimbat
- Previne re-render-uri inutile în componente

**Beneficiu:** Mai puține re-render-uri, UI mai fluid

---

## Comparație Performanță: SWR vs React Query Optimizat

### SWR (configurație veche):
```typescript
{
  revalidateOnFocus: true, // Request la fiecare focus
  dedupingInterval: 2000,  // 2 secunde
  errorRetryCount: 3,
}
```

### React Query (optimizat):
```typescript
{
  staleTime: 2 * 60 * 1000,      // 2 minute - date fresh
  gcTime: 5 * 60 * 1000,         // 5 minute - cache persistence
  refetchOnWindowFocus: false,   // Nu refetch la focus
  retry: inteligent,             // Doar pentru erori de rețea
  structuralSharing: true,       // Previne re-render-uri
}
```

**Rezultat:**
- ✅ **Mai rapid** - mai puține request-uri
- ✅ **Mai eficient** - cache mai inteligent
- ✅ **Mai fluid** - mai puține re-render-uri

---

## Garantii de Performanță

### ✅ Nu blochează nimic:
- Query-urile rulează în background
- UI-ul rămâne interactiv
- Datele sunt returnate instant din cache dacă sunt fresh

### ✅ Nu întârzie nimic:
- Stale time previne request-uri inutile
- Cache time asigură date disponibile instant
- Structural sharing previne re-render-uri

### ✅ Optimizat pentru mobile:
- Mai puține request-uri = mai puțină consumare de baterie
- Cache persistence = mai puțină consumare de date
- Retry logic inteligent = mai puține request-uri eșuate

---

## Concluzie

React Query optimizat este:
- ⚡ **Mai rapid** decât SWR (mai puține request-uri)
- 🎯 **Mai eficient** (cache mai inteligent)
- 🔧 **Mai ușor de debug** (DevTools doar în development)
- 📱 **Mai bun pentru mobile** (mai puțină consumare)

**DevTools** apare doar în development - utilizatorii finali nu-l văd niciodată!

