# Fix: Records Images/Videos Uploaded to Wrong R2 Folder

## Problemă
Recordurile erau încărcate în folderul greșit în R2. Toate fișierele (atât pentru records cât și pentru catches) erau încărcate în `username/journal/images/` sau `username/journal/videos/` în loc ca records să fie în `username/records/images/` sau `username/records/videos/`.

## Cauză
În `FishingEntryModal.tsx`, funcția `uploadFileToR2` avea categoria hardcodată ca `'journal'` pentru toate tipurile de entry-uri:
```typescript
const fullPath = `${userUsername}/journal/${category}/${fileName}`;
formDataObj.append('category', 'journal'); // ❌ Hardcodat
```

## Soluție
Am modificat funcția să folosească categoria corectă în funcție de tipul entry-ului:
```typescript
const subCategory = fileType === 'photo' ? 'images' : 'videos';
// Records use 'records' category, catches use 'journal' category
const category = isRecord ? 'records' : 'journal';
const fullPath = `${userUsername}/${category}/${subCategory}/${fileName}`;
formDataObj.append('category', category); // ✅ Corect
```

## Structură Corectă R2

### Records
- `username/records/images/record-{global_id}_{timestamp}_{filename}.jpg`
- `username/records/videos/record-{global_id}_{timestamp}_{filename}.mp4`

### Catches (Journal)
- `username/journal/images/catch-{global_id}_{timestamp}_{filename}.jpg`
- `username/journal/videos/catch-{global_id}_{timestamp}_{filename}.mp4`

## Fișiere Modificate
- `client/src/components/FishingEntryModal.tsx` - Funcția `uploadFileToR2`

## Note
- Records existente care au fost încărcate în folderul greșit (`journal`) vor rămâne acolo
- Records noi vor fi încărcate corect în folderul `records`
- Dacă vrei să muți records existente, ar trebui să creezi un script de migrare

## Testing
1. Adaugă un record nou cu imagine/video
2. Verifică în R2 că fișierul este în `username/records/images/` sau `username/records/videos/`
3. Verifică că imaginea/video-ul se afișează corect în aplicație

## Data Rezolvării
2025-01-XX

