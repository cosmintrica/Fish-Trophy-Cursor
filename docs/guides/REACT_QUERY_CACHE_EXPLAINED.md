# React Query Cache - Explicație Detaliată

**Data:** 3 decembrie 2025

## Cum Funcționează Cache-ul în React Query

### ❌ NU înseamnă că datele nu se actualizează!

React Query **face update-uri**, dar optimizează **când** le face.

---

## StaleTime vs GC Time - Diferența

### 1. StaleTime (2 minute) ⏱️

**Ce înseamnă:**
- Datele sunt considerate **"fresh"** (proaspete) timp de 2 minute
- Dacă datele sunt fresh, React Query le returnează **instant** din cache
- **NU face request** dacă datele sunt fresh

**Exemplu:**
```typescript
// 10:00 - Primele request, datele se încarcă
// 10:01 - Utilizatorul navighează înapoi la pagină
//         → Datele sunt fresh (doar 1 minut trecut)
//         → React Query returnează INSTANT din cache
//         → ZERO request către server

// 10:03 - Utilizatorul navighează din nou la pagină
//         → Datele sunt STALE (3 minute trecut, peste staleTime)
//         → React Query face refetch în background
//         → Returnează datele din cache instant
//         → Apoi actualizează cu noile date când sosesc
```

**Rezultat:**
- ✅ UI instant (datele din cache)
- ✅ Update automat în background (dacă sunt stale)
- ✅ Zero delay perceput de utilizator

---

### 2. GC Time (5 minute) 🗄️

**Ce înseamnă:**
- Datele rămân în cache **5 minute** după ce nu mai sunt folosite
- După 5 minute de neutilizare, datele sunt șterse din cache
- Când revii la pagină, datele sunt deja în cache (dacă nu au trecut 5 minute)

**Exemplu:**
```typescript
// 10:00 - Utilizatorul accesează pagina Records
//         → Datele se încarcă și se salvează în cache

// 10:02 - Utilizatorul navighează la altă pagină
//         → Datele rămân în cache (nu sunt șterse)

// 10:05 - Utilizatorul revine la pagina Records
//         → Datele sunt încă în cache (doar 3 minute)
//         → React Query verifică dacă sunt fresh (staleTime: 2 min)
//         → Datele sunt STALE (3 > 2 minute)
//         → Returnează instant din cache
//         → Face refetch în background pentru update

// 10:08 - Utilizatorul navighează din nou la altă pagină
//         → Datele rămân în cache

// 10:14 - Utilizatorul revine la pagina Records (6 minute după ultima utilizare)
//         → Datele au fost șterse din cache (6 > 5 minute GC time)
//         → React Query face request nou
//         → Se încarcă datele fresh
```

---

## Când se Fac Update-uri? 🔄

React Query face update-uri în următoarele situații:

### 1. Când datele sunt STALE (după staleTime)

```typescript
// staleTime: 2 minute
// După 2 minute, datele devin "stale"
// React Query face refetch automat în background
```

### 2. Când se face o MUTATION (create, update, delete)

```typescript
// Utilizatorul creează un record nou
const mutation = useMutation({
  mutationFn: createRecord,
  onSuccess: () => {
    // Invalidează cache-ul pentru records
    queryClient.invalidateQueries({ queryKey: ['records'] })
    // → Forțează refetch pentru a obține datele actualizate
  }
})
```

**Rezultat:** Datele se actualizează instant după o mutație!

### 3. Când se face refetch manual

```typescript
const { refetch } = useQuery(...)

// Utilizatorul apasă butonul "Refresh"
refetch() // → Forțează refetch imediat
```

### 4. Când componenta se remount (dacă e configurat)

```typescript
refetchOnMount: 'always' // → Refetch când componenta se remount
```

---

## Exemplu Real: Pagina Records

### Scenariul 1: Navigare rapidă (sub 2 minute)

```typescript
// 10:00 - Utilizatorul accesează /records
//         → Request către server
//         → Datele se încarcă și se salvează în cache
//         → staleTime: 2 minute (datele sunt fresh până la 10:02)

// 10:01 - Utilizatorul navighează la /profile, apoi revine la /records
//         → Datele sunt încă fresh (doar 1 minut)
//         → React Query returnează INSTANT din cache
//         → ZERO request către server
//         → UI instant, zero delay
```

### Scenariul 2: Navigare după staleTime (peste 2 minute)

```typescript
// 10:00 - Utilizatorul accesează /records
//         → Request către server
//         → Datele se încarcă și se salvează în cache

// 10:03 - Utilizatorul revine la /records (3 minute după)
//         → Datele sunt STALE (3 > 2 minute staleTime)
//         → React Query returnează INSTANT datele din cache
//         → UI apare instant (utilizatorul nu așteaptă)
//         → În background, React Query face refetch
//         → Când noile date sosesc, UI se actualizează automat
//         → Utilizatorul vede update-ul fără să aștepte
```

**Rezultat:** UI instant + update automat în background!

### Scenariul 3: Mutație (create/update/delete)

```typescript
// 10:00 - Utilizatorul accesează /records
//         → Datele se încarcă

// 10:01 - Utilizatorul creează un record nou
//         → Mutation rulează
//         → onSuccess: invalidateQueries(['records'])
//         → Cache-ul este invalidat
//         → React Query face refetch IMEDIAT
//         → UI se actualizează cu noul record
//         → Utilizatorul vede record-ul nou instant
```

**Rezultat:** Update instant după mutații!

---

## Comparație: Fără Cache vs Cu Cache

### Fără Cache (request la fiecare acces):
```
10:00 - Request → 500ms delay → Datele apar
10:01 - Request → 500ms delay → Datele apar
10:02 - Request → 500ms delay → Datele apar
```
**Problema:** Delay la fiecare acces, multe request-uri inutile

### Cu Cache (React Query):
```
10:00 - Request → 500ms delay → Datele apar (se salvează în cache)
10:01 - Cache → 0ms delay → Datele apar INSTANT (fresh)
10:02 - Cache → 0ms delay → Datele apar INSTANT (fresh)
10:03 - Cache → 0ms delay → Datele apar INSTANT (stale, dar din cache)
         + Background refetch → Update automat când sosesc
```
**Beneficiu:** UI instant + update automat când e nevoie

---

## Garantii

### ✅ Datele se actualizează:
- După staleTime (2 minute) → refetch automat
- După mutații → refetch instant
- La refetch manual → refetch imediat

### ✅ UI-ul este instant:
- Datele fresh → instant din cache
- Datele stale → instant din cache + update în background
- Zero delay perceput de utilizator

### ✅ Nu se blochează:
- Query-urile rulează în background
- UI-ul rămâne interactiv
- Datele se actualizează automat

---

## Concluzie

**React Query NU blochează update-urile!**

- ✅ Datele se actualizează automat când sunt stale
- ✅ Datele se actualizează instant după mutații
- ✅ UI-ul este instant (datele din cache)
- ✅ Update-urile se fac în background (fără blocare)

**StaleTime și GC Time optimizează CÂND se fac update-urile, nu le blochează!**

