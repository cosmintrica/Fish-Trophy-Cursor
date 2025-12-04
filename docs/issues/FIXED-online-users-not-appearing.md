# Fix: Utilizatori Online Nu Apar

## Problemă
Utilizatorii online nu apar în listă, deși `last_seen_at` este actualizat în consolă.

## Cauză
RLS policy pentru `UPDATE` pe `forum_users` bloca actualizarea `last_seen_at` de către utilizatori.

## Soluție
**Migrația 69**: `69_fix_forum_users_update_rls.sql`

Această migrație:
1. Șterge politica veche problematică `"Utilizatorii își pot edita profilul"`
2. Creează două politici noi:
   - `forum_users_update_own` - permite utilizatorilor să își actualizeze propriul profil (pentru `last_seen_at`)
   - `forum_users_update_admin` - permite adminilor să actualizeze orice profil

## Cum să aplici migrația

### Opțiunea 1: Supabase Dashboard
1. Deschide Supabase Dashboard
2. Mergi la **SQL Editor**
3. Copiază conținutul din `supabase/migrations/forum/69_fix_forum_users_update_rls.sql`
4. Rulează query-ul

### Opțiunea 2: Supabase CLI
```bash
supabase migration up --file migrations/forum/69_fix_forum_users_update_rls.sql
```

## Verificare
După aplicarea migrației:
1. Verifică în consolă că `Updated last_seen_at result:` arată date (nu `null`)
2. Verifică că utilizatorii online apar în listă după ~15 secunde
3. Verifică că `refetchInterval: 15 * 1000` funcționează corect

## Note
- `refetchOnWindowFocus` a fost dezactivat pentru a evita refresh-uri când schimbi tab-ul
- `refetchInterval` rămâne activ pentru actualizări automate la fiecare 15 secunde
- Problema cu refresh-urile persistă probabil din cauza extensiilor browser (testează în incognito)

