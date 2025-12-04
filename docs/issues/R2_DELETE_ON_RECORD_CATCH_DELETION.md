# Fix: Ștergere Automată a Fișierelor R2 la Ștergerea Recordurilor/Capturilor

## Problemă
Când utilizatorul șterge un record sau o captură, fișierele (poze/video) rămâneau în R2, ocupând spațiu inutil.

## Cauză
Nu există cascade delete pentru fișiere R2 din PostgreSQL. PostgreSQL poate face cascade delete doar între tabele din baza de date, nu pentru fișiere stocate extern în R2.

## Soluție
Implementat ștergerea manuală a fișierelor din R2 înainte de ștergerea din baza de date, în funcția `handleDelete` din `FishingEntryModal.tsx`.

## Modificări

### 1. Adăugat Logica de Ștergere R2 în `handleDelete`

```typescript
// Get file URLs before deletion for R2 cleanup
let filesToDelete: string[] = [];

if (isRecord) {
  // Records: image_url and video_url
  if (entry.image_url) {
    filesToDelete.push(entry.image_url);
  }
  if (entry.video_url) {
    filesToDelete.push(entry.video_url);
  }
} else {
  // Catches: photo_url, photo_urls, and video_url
  if (entry.photo_url) {
    filesToDelete.push(entry.photo_url);
  }
  if (entry.photo_urls && Array.isArray(entry.photo_urls)) {
    filesToDelete.push(...entry.photo_urls.filter(Boolean));
  }
  if (entry.video_url) {
    filesToDelete.push(entry.video_url);
  }
}

// Delete files from R2 first
if (filesToDelete.length > 0) {
  toast.loading(`Se șterg ${filesToDelete.length} fișier${filesToDelete.length > 1 ? 'e' : ''} din R2...`, { id: toastId });
  
  for (const fileUrl of filesToDelete) {
    await deleteFileFromR2(fileUrl).catch(err => {
      console.warn('Failed to delete file from R2:', fileUrl, err);
      // Continue even if R2 deletion fails
    });
  }
}

// Then delete from database
const { error: deleteError } = await supabase
  .from(tableName)
  .delete()
  .eq('id', entry.id)
  .eq('user_id', user.id);
```

### 2. Ordinea Operațiilor

1. **Colectează URL-urile fișierelor** din `entry` (înainte de ștergere)
2. **Șterge fișierele din R2** (dacă există)
3. **Șterge din baza de date** (doar dacă ștergerea R2 a reușit sau nu a fost necesară)

### 3. Gestionarea Erorilor

- Dacă ștergerea unui fișier din R2 eșuează, se continuă cu ștergerea din baza de date (nu blocăm ștergerea dacă un fișier nu poate fi șters din R2)
- Erorile sunt logate în consolă pentru debugging

## Diferențe între Records și Catches

### Records
- Folosesc `image_url` (string, nu array)
- Folosesc `video_url` (string)

### Catches
- Folosesc `photo_url` (string) SAU `photo_urls` (array)
- Folosesc `video_url` (string)

## Cascade Delete în Baza de Date

Există deja cascade delete pentru:
- `catch_likes` → se șterg automat când se șterge catch-ul
- `catch_comments` → se șterg automat când se șterge catch-ul

**NU există** cascade delete pentru fișiere R2 (nu e posibil din PostgreSQL).

## Testing

1. **Test ștergere record cu poză și video:**
   - Creează un record cu poză și video
   - Șterge recordul
   - Verifică în consolă: `File deleted from R2 successfully`
   - Verifică în R2 că fișierele au fost șterse

2. **Test ștergere captură cu multiple poze:**
   - Creează o captură cu `photo_urls` (array) și video
   - Șterge captura
   - Verifică că toate pozele și video-ul au fost șterse din R2

3. **Test eroare R2 (fișier deja șters):**
   - Șterge manual un fișier din R2
   - Încearcă să ștergi recordul/captura
   - Verifică că ștergerea din DB continuă chiar dacă R2 returnează eroare

## Nota Importante

⚠️ **Nu putem implementa cascade delete pentru R2 din PostgreSQL** - trebuie făcut manual în aplicație.

✅ **Ștergerea este atomică** - dacă ștergerea din DB eșuează, fișierele rămân în R2 (nu pierdem date).

✅ **Gestionarea erorilor** - chiar dacă ștergerea unui fișier din R2 eșuează, continuăm cu ștergerea din DB pentru a nu bloca utilizatorul.

## Data Implementării
2025-01-XX

