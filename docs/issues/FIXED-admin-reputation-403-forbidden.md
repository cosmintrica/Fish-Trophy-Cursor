# 🐛 Bug Fix: Admin Panel Reputation 403 Forbidden Error

**Data**: 4 Decembrie 2024  
**Status**: ✅ Rezolvat  
**Severitate**: Critică (funcționalitate admin blocată)

---

## Descrierea Problemei

La acordarea reputației din Admin Panel, request-ul eșua cu eroare **403 Forbidden**:

```json
{
  "code": "42501",
  "message": "new row violates row-level security policy for table \"forum_reputation_logs\""
}
```

**Impact**: Adminii nu puteau acorda/modifica reputația utilizatorilor din panoul de administrare.

---

## Investigație

### Ipoteze Testate (Nu erau cauza)

| Ipoteză | Verificare | Rezultat |
|---------|------------|----------|
| `post_id` NOT NULL constraint | `ALTER TABLE` check | Era deja nullable ❌ |
| `check_is_admin()` nu funcționează | `SELECT check_is_admin('id')` | Returna `true` ✅ |
| RLS INSERT Policy incorect | Verificat policy structure | Era corect ❌ |
| Trigger fără SECURITY DEFINER | Adăugat SECURITY DEFINER | Tot nu mergea ❌ |
| JWT/Sesiune invalidă | RPC test + headers check | Era valid ❌ |

### Testări Decisive

```sql
-- Test 1: RLS Dezactivat
ALTER TABLE forum_reputation_logs DISABLE ROW LEVEL SECURITY;
-- Rezultat: ✅ INSERT MERGE!

-- Test 2: Policy ultra-permisiv
CREATE POLICY "Ultra permissive" ON forum_reputation_logs
  FOR INSERT WITH CHECK (true);
-- Rezultat: ❌ Tot 403! (imposibil teoretic)
```

```javascript
// Test 3: INSERT fără .select()
await sb.from('forum_reputation_logs').insert({...});
// Rezultat: ✅ Error: null (MERGE!)

// Test 4: INSERT cu .select()
await sb.from('forum_reputation_logs').insert({...}).select();
// Rezultat: ❌ 403 Error
```

**EUREKA!** 🎯 Problema era `.select()`, nu INSERT-ul!

---

## Cauza Reală

### Fluxul Problematic

```
Client: .insert({...}).select()
         ↓
PostgREST: INSERT INTO forum_reputation_logs ... RETURNING *
         ↓
PostgreSQL:
  1. INSERT ✅ (trece INSERT policy)
  2. RETURNING * evaluat ca SELECT
  3. SELECT policy: id IN get_visible_reputation_log_ids() 
  4. Funcția NU returnează ID-ul nou creat
  5. SELECT eșuează → 403 Forbidden
```

### Explicație

1. **`.insert().select()`** în Supabase devine `INSERT ... RETURNING *`
2. **`RETURNING *`** e evaluat de SELECT RLS policies
3. **SELECT policy** (`get_visible_reputation_log_ids`) limitează vizibilitatea log-urilor
4. **Rândul nou inserat** nu era imediat vizibil conform acestei funcții
5. **PostgREST** interpreta SELECT-ul eșuat ca 403 pe întregul request

---

## Soluția

### Fișier Modificat

**`client/src/services/forum/reputation.ts`** - funcția `adminAwardReputation()`

### Modificare

**Înainte:**
```typescript
const { data, error } = await supabase
    .from('forum_reputation_logs')
    .insert({
        giver_user_id: currentUser.id,
        receiver_user_id: params.receiverUserId,
        post_id: null,
        points: params.points,
        comment: params.comment,
        giver_power: 7,
        is_admin_award: true
    })
    .select()  // ← PROBLEMA!
    .single()

return { data }
```

**După:**
```typescript
const { error } = await supabase
    .from('forum_reputation_logs')
    .insert({
        giver_user_id: currentUser.id,
        receiver_user_id: params.receiverUserId,
        post_id: null,
        points: params.points,
        comment: params.comment,
        giver_power: 7,
        is_admin_award: true
    })
    // Fără .select() - SELECT RLS policy bloca returnarea rândului

return { data: { success: true } }
```

---

## Lecții Învățate

### 1. `.select()` după `INSERT` nu e gratuit
Supabase transformă `.insert().select()` în `INSERT ... RETURNING *`, care e evaluat de SELECT RLS policies!

### 2. Eroarea poate fi înșelătoare
Mesajul "violates INSERT policy" poate indica de fapt o problemă cu SELECT policy.

### 3. Debugging tip
**Când ai 403 pe INSERT, testează fără `.select()`** pentru a izola problema.

### 4. RPC vs CRUD
`supabase.rpc()` poate funcționa corect chiar dacă operațiile CRUD eșuează din cauza RLS.

---

## Detalii Tehnice Suplimentare

### Funcția `get_visible_reputation_log_ids()`

Funcția folosită de SELECT policy este `STABLE`, ceea ce înseamnă că PostgreSQL poate cache-a rezultatul în cadrul aceleiași tranzacții. Când se face INSERT și apoi RETURNING, funcția poate returna rezultatul din cache (fără rândul nou inserat).

```sql
CREATE OR REPLACE FUNCTION get_visible_reputation_log_ids(receiver_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE  -- ← Poate cauza probleme cu cache-ul
AS $$
  -- Pentru admini: returnează TOATE log-urile
  -- Pentru useri: returnează doar ultimele 10
  -- PROBLEMA: Cache-ul poate exclude rândul nou inserat
END;
$$;
```

### PostgREST RETURNING Behavior

PostgREST transformă `.insert().select()` în `INSERT ... RETURNING *`, care este evaluat de SELECT RLS policies. Dacă SELECT policy-ul eșuează, PostgREST interpretează întregul request ca eșuat, chiar dacă INSERT-ul a reușit.

### Alternativă: SELECT Separated

Dacă ai nevoie de date returnate după INSERT, poți folosi o abordare în două pași:

```typescript
// Pas 1: INSERT fără .select()
const { error: insertError } = await supabase
    .from('forum_reputation_logs')
    .insert({...})

if (insertError) {
    return { error: { message: insertError.message, code: insertError.code } }
}

// Pas 2: SELECT separat (după ce INSERT-ul s-a finalizat)
const { data, error: selectError } = await supabase
    .from('forum_reputation_logs')
    .select('*')
    .eq('giver_user_id', currentUser.id)
    .eq('receiver_user_id', params.receiverUserId)
    .eq('is_admin_award', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
```

## Documentație Completă

Pentru o analiză mai detaliată, vezi: [`docs/issues/SUPABASE_INSERT_SELECT_RLS_TRAP.md`](./SUPABASE_INSERT_SELECT_RLS_TRAP.md)

## Referințe

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgREST RETURNING behavior](https://postgrest.org/en/stable/api.html#insertions)
- [PostgreSQL Function Volatility Categories](https://www.postgresql.org/docs/current/xfunc-volatility.html)
