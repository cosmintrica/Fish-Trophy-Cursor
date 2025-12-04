# Reputation RLS Debug Migrations

Acest folder conține toate migrațiile de debug și încercările de fix pentru problema de RLS la acordarea reputației de către admini.

## ⚠️ IMPORTANT

**Aceste migrații sunt DOAR pentru referință istorică!**

Problema reală nu era în INSERT policy sau în funcțiile de verificare admin, ci în **SELECT policy** care bloca `.select()` după `INSERT`.

## 📋 Migrații Incluse (28 migrații)

Toate migrațiile 39-66 care au încercat să rezolve problema prin modificarea INSERT policy-ului:

| Migrație | Descriere | Status |
|----------|-----------|--------|
| 39 | Fix reputation admin award RLS (post_id nullable) | ❌ Nu a rezolvat |
| 40 | Fix reputation RLS use function | ❌ Nu a rezolvat |
| 44 | Verify admin and fix | ❌ Nu a rezolvat |
| 45 | Fix reputation RLS final | ❌ Nu a rezolvat |
| 47 | Fix reputation RLS use profiles.role | ❌ Nu a rezolvat |
| 48 | Cleanup reputation RLS | ❌ Nu a rezolvat |
| 49-66 | Multiple încercări de fix INSERT policy | ❌ Nu au rezolvat |

## ✅ Soluția Reală

Problema a fost rezolvată prin **eliminarea `.select()`** din `adminAwardReputation()` în `client/src/services/forum/reputation.ts`.

**Cauza**: `.insert().select()` devine `INSERT ... RETURNING *`, care este evaluat de SELECT RLS policies. SELECT policy-ul (`get_visible_reputation_log_ids`) nu includea imediat rândul nou inserat (posibil din cauza cache-ului sau timing-ului).

## 📚 Documentație

Pentru detalii complete despre problema și soluție, vezi:
- [`docs/issues/SUPABASE_INSERT_SELECT_RLS_TRAP.md`](../../../../docs/issues/SUPABASE_INSERT_SELECT_RLS_TRAP.md)
- [`docs/issues/FIXES/FIXED-admin-reputation-403-forbidden.md`](../../../../docs/issues/FIXES/FIXED-admin-reputation-403-forbidden.md)

## 🎯 Lecții Învățate

1. **`.select()` după `INSERT` nu e gratuit** - este evaluat de SELECT RLS policies
2. **Eroarea poate fi înșelătoare** - "violates INSERT policy" poate indica SELECT policy
3. **Debugging tip**: Când ai 403 pe INSERT, testează fără `.select()`
4. **Funcții STABLE** pot returna rezultate din cache, excluzând rândurile nou inserate

## 📝 Note

- Migrațiile 21, 23, 25 rămân în folderul principal deoarece sunt migrații funcționale (nu doar debug)
- Toate scripturile SQL de testare/debug au fost șterse din `sql-scripts/`
