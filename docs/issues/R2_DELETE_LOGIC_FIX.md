# Fix: Logica Ștergere Poze/Video din R2 - Doar la Salvare

## Problemă
Când utilizatorul șterge poze/video (apasă "X" sau "Șterge videoclip") și apoi apasă "Anulează", fișierele erau deja șterse din R2 și recordurile rămâneau goale.

## Cauză
Fișierele erau șterse **imediat** din R2 când utilizatorul apăsa butonul de ștergere, fără a aștepta confirmarea prin salvare.

## Soluție
Implementat logică de "pending deletion" - similar cu upload-ul:
1. Când utilizatorul apasă "X" sau "Șterge videoclip" → doar marchează pentru ștergere (NU șterge din R2)
2. Când utilizatorul apasă "Salvează Modificările" → șterge efectiv din R2 fișierele marcate
3. Când utilizatorul apasă "Anulează" → resetează state-urile, NU șterge nimic din R2, formularul se restaurează la valorile originale când modal-ul se deschide din nou

## Modificări

### 1. State-uri pentru Tracking
```typescript
// Track files to be deleted from R2 (only delete when saving, not when canceling)
const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
const [videoToDelete, setVideoToDelete] = useState<string | null>(null);

// Store original URLs for cancel restoration
const [originalPhotoUrls, setOriginalPhotoUrls] = useState<string[]>([]);
const [originalVideoUrl, setOriginalVideoUrl] = useState<string>('');
```

### 2. Modificat `removePhoto`
- **Înainte:** Ștergea imediat din R2 cu `deleteFileFromR2()`
- **Acum:** Doar marchează pentru ștergere cu `setPhotosToDelete()`

### 3. Modificat `removeVideo`
- **Înainte:** Ștergea imediat din R2 cu `deleteFileFromR2()`
- **Acum:** Doar marchează pentru ștergere cu `setVideoToDelete()`

### 4. Adăugat Ștergere la Salvare
```typescript
// Delete files marked for deletion (only on save, not on cancel)
if (photosToDelete.length > 0) {
  for (const photoUrl of photosToDelete) {
    await deleteFileFromR2(photoUrl);
  }
}

if (videoToDelete) {
  await deleteFileFromR2(videoToDelete);
}
```

### 5. Resetare la Anulare
- Butonul "X" și "Anulează" resetează state-urile de ștergere
- Formularul se restaurează automat la valorile originale când modal-ul se deschide din nou (via `useEffect`)

## Rezultat

✅ **Când apasă "X" sau "Șterge videoclip":**
- Fișierul dispare din UI
- NU este șters din R2 (doar marcat pentru ștergere)

✅ **Când apasă "Salvează Modificările":**
- Fișierele marcate sunt șterse efectiv din R2
- Modificările sunt salvate în baza de date

✅ **Când apasă "Anulează":**
- State-urile de ștergere sunt resetate
- NU se șterge nimic din R2
- Când modal-ul se deschide din nou, formularul se restaurează la valorile originale

## Testing

1. **Test ștergere + anulare:**
   - Editează un record cu poză/video
   - Apasă "X" pe poză sau "Șterge videoclip"
   - Apasă "Anulează"
   - Verifică în R2 că fișierul NU a fost șters
   - Deschide din nou modal-ul → poză/video ar trebui să fie acolo

2. **Test ștergere + salvare:**
   - Editează un record cu poză/video
   - Apasă "X" pe poză sau "Șterge videoclip"
   - Apasă "Salvează Modificările"
   - Verifică în consolă: `File deleted from R2 successfully`
   - Verifică în R2 că fișierul A FOST șters

## Data Rezolvării
2025-01-XX

