# Fix: Imagini și Video Nu Se Afișează pe Mobile

## Problemă
Pe mobile, imaginile și videoclipurile nu se încărcau, în timp ce pe desktop funcționau perfect.

## Cauză
În development, funcțiile care accesau Netlify Functions (R2 proxy, upload, delete) foloseau hardcodat `http://localhost:8889`, care nu funcționează pe mobile. Când accesezi site-ul pe mobile prin IP-ul local al computerului (de ex. `http://192.168.1.100:5173`), `localhost` se referă la telefonul însuși, nu la computerul de development.

## Soluție
Am creat o funcție helper `getNetlifyFunctionsBaseUrl()` care detectează automat hostname-ul corect folosind `window.location.hostname`, astfel încât să funcționeze și pe mobile:

```typescript
export const getNetlifyFunctionsBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    // In development, use window.location.hostname to work on mobile
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:8889`;
  }
  // In production, use relative path
  return '';
};
```

## Fișiere Modificate

### 1. `client/src/lib/supabase.ts`
- Adăugat funcția helper `getNetlifyFunctionsBaseUrl()`
- Actualizat `getR2ImageUrlProxy()` să folosească hostname-ul dinamic

### 2. `client/src/components/FishingEntryModal.tsx`
- Actualizat endpoint-ul pentru delete (`delete-r2-file`) să folosească hostname-ul dinamic
- Actualizat endpoint-ul pentru upload să folosească hostname-ul dinamic

## Rezultat
- ✅ Pe desktop: funcționează cu `localhost`
- ✅ Pe mobile accesând prin IP local (ex: `192.168.1.100:5173`): funcționează cu IP-ul local
- ✅ În producție: folosește path-uri relative

## Testing
1. Pornește `netlify dev` pe computer
2. Accesează site-ul pe mobile prin IP-ul local (ex: `http://192.168.1.100:5173`)
3. Verifică că imaginile și videoclipurile se încarcă corect
4. Verifică că upload-ul și ștergerea funcționează pe mobile

## Note
- Pe mobile, asigură-te că telefonul este pe aceeași rețea WiFi ca computerul
- Portul 8889 este folosit de Netlify Functions (configurat în `netlify.toml`)
- Portul 5173 este folosit de Vite dev server

## Data Rezolvării
2025-01-XX

