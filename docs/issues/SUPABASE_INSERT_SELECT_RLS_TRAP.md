# 🐛 Supabase INSERT + SELECT RLS Trap: 403 Forbidden înșelător

**Data**: 4 Decembrie 2024  
**Status**: ✅ Rezolvat  
**Severitate**: Critică (funcționalitate admin blocată)  
**Categorie**: Supabase RLS, PostgREST Behavior

---

## 📋 Descrierea Problemei

La acordarea reputației din Admin Panel, request-ul eșua cu eroare **403 Forbidden**:

```json
{
  "code": "42501",
  "message": "new row violates row-level security policy for table \"forum_reputation_logs\""
}
```

**Mesajul de eroare era înșelător** - sugera că problema era cu INSERT policy, dar de fapt era SELECT policy!

**Impact**: Adminii nu puteau acorda/modifica reputația utilizatorilor din panoul de administrare, deși toate verificările individuale funcționau corect.

---

## 🔍 Investigație Detaliată

### Ipoteze Testate (Toate erau false)

| # | Ipoteză | Verificare | Rezultat |
|---|---------|------------|----------|
| 1 | `post_id` NOT NULL constraint | `ALTER TABLE` check | Era deja nullable ❌ |
| 2 | `check_is_admin()` nu funcționează | `SELECT check_is_admin('id')` | Returna `true` ✅ |
| 3 | RLS INSERT Policy incorect | Verificat policy structure | Era corect ❌ |
| 4 | Trigger fără SECURITY DEFINER | Adăugat SECURITY DEFINER | Tot nu mergea ❌ |
| 5 | JWT/Sesiune invalidă | RPC test + headers check | Era valid ❌ |
| 6 | `auth.uid()` nu funcționează în WITH CHECK | Test direct în SQL | Funcționa ✅ |
| 7 | Funcție `check_is_admin()` nu bypass RLS | Test cu SECURITY DEFINER | Funcționa ✅ |

### Testări Decisive

#### Test 1: RLS Dezactivat Complet
```sql
ALTER TABLE forum_reputation_logs DISABLE ROW LEVEL SECURITY;
-- Rezultat: ✅ INSERT MERGE!
```

**Concluzie**: RLS era problema, dar nu știam care policy.

#### Test 2: Policy Ultra-Permisiv pentru INSERT
```sql
DROP POLICY IF EXISTS "Acordare reputație" ON forum_reputation_logs;

CREATE POLICY "Ultra permissive" ON forum_reputation_logs
  FOR INSERT WITH CHECK (true);
-- Rezultat: ❌ Tot 403! (imposibil teoretic)
```

**Concluzie**: Chiar și cu INSERT policy care permite orice, tot 403! Problema nu era INSERT policy-ul.

#### Test 3: INSERT fără `.select()` (BREAKTHROUGH!)
```javascript
// Test fără .select()
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
  });
// Rezultat: ✅ Error: null (MERGE PERFECT!)

// Test cu .select()
const { data, error } = await supabase
  .from('forum_reputation_logs')
  .insert({...})
  .select()  // ← PROBLEMA!
  .single();
// Rezultat: ❌ 403 Error
```

**EUREKA!** 🎯 Problema era `.select()`, nu INSERT-ul!

---

## 🎯 Cauza Reală: PostgREST RETURNING Behavior

### Fluxul Problematic

```
┌─────────────────────────────────────────────────────────────┐
│ Client: .insert({...}).select()                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ PostgREST: Transformă în SQL                                │
│ INSERT INTO forum_reputation_logs (...)                     │
│ VALUES (...)                                                 │
│ RETURNING *;  ← Aici e problema!                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL: Execută operația                                │
│                                                              │
│ 1. INSERT ✅ (trece INSERT policy)                          │
│    - auth.role() = 'authenticated' ✅                        │
│    - auth.uid() = giver_user_id ✅                          │
│    - check_is_admin(giver_user_id) = true ✅                 │
│    - Rândul este INSERAT cu succes                           │
│                                                              │
│ 2. RETURNING * evaluat ca SELECT                            │
│    - PostgreSQL încearcă să returneze rândul inserat        │
│    - RETURNING * este evaluat de SELECT RLS policies        │
│                                                              │
│ 3. SELECT policy verifică:                                  │
│    SELECT * FROM forum_reputation_logs                       │
│    WHERE id = ANY(                                           │
│      SELECT get_visible_reputation_log_ids(receiver_id)      │
│    )                                                         │
│                                                              │
│ 4. Funcția get_visible_reputation_log_ids()                 │
│    - Pentru admini: returnează TOATE log-urile              │
│    - Pentru useri: returnează ultimele 10 log-uri           │
│    - PROBLEMA: Funcția NU include rândul nou inserat        │
│      imediat (poate fi o problemă de timing sau cache)      │
│                                                              │
│ 5. SELECT eșuează → Rândul nu este returnat                 │
│                                                              │
│ 6. PostgREST interpretează SELECT-ul eșuat ca 403          │
│    pe întregul request (chiar dacă INSERT-ul a reușit!)     │
└─────────────────────────────────────────────────────────────┘
```

### Explicație Tehnică

1. **Supabase `.insert().select()`** devine `INSERT ... RETURNING *` în SQL
2. **`RETURNING *`** este evaluat de **SELECT RLS policies**, nu doar INSERT policies
3. **SELECT policy** (`get_visible_reputation_log_ids`) limitează vizibilitatea log-urilor:
   - Pentru admini: returnează toate log-urile (dar funcția poate avea probleme de timing)
   - Pentru useri: returnează doar ultimele 10 log-uri
4. **Rândul nou inserat** nu era imediat vizibil conform acestei funcții (posibil din cauza cache-ului sau timing-ului)
5. **PostgREST** interpretează SELECT-ul eșuat ca 403 pe întregul request, chiar dacă INSERT-ul a reușit

### Funcția `get_visible_reputation_log_ids()`

```sql
CREATE OR REPLACE FUNCTION get_visible_reputation_log_ids(receiver_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_role TEXT;
  v_log_ids UUID[];
BEGIN
  -- Verifică dacă utilizatorul curent este admin
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = auth.uid();
  
  IF COALESCE(v_user_role, '') = 'admin' THEN
    -- Admin: returnează TOATE log-urile pentru receiver_id
    SELECT ARRAY_AGG(id) INTO v_log_ids
    FROM forum_reputation_logs
    WHERE receiver_user_id = receiver_id;
  ELSE
    -- User normal: returnează doar ultimele 10 log-uri
    SELECT ARRAY_AGG(id) INTO v_log_ids
    FROM (
      SELECT id
      FROM forum_reputation_logs
      WHERE receiver_user_id = receiver_id
      ORDER BY created_at DESC
      LIMIT 10
    ) sub;
  END IF;
  
  RETURN COALESCE(v_log_ids, ARRAY[]::UUID[]);
END;
$$;
```

**Problema**: Funcția este `STABLE`, ceea ce înseamnă că PostgreSQL poate cache-a rezultatul în cadrul aceleiași tranzacții. Când se face INSERT și apoi RETURNING, funcția poate returna rezultatul din cache (fără rândul nou inserat).

---

## ✅ Soluția

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
    .select()  // ← PROBLEMA! SELECT RLS policy bloca returnarea
    .single()

if (error) {
    return { error: { message: error.message, code: error.code } }
}

return { data }
```

**După:**
```typescript
// NOTE: Nu folosim .select() deoarece SELECT RLS policy restricționează
// vizibilitatea rândurilor și nu include immediate log-urile admin noi
// (posibil din cauza cache-ului sau timing-ului în funcția get_visible_reputation_log_ids)
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

if (error) {
    return { error: { message: error.message, code: error.code } }
}

// Return success without data (insert succeeded)
return { data: { success: true } }
```

### Alternativă (Dacă ai nevoie de date returnate)

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

if (selectError) {
    // INSERT-ul a reușit, dar nu putem returna datele
    return { data: { success: true } }
}

return { data }
```

---

## 📚 Lecții Învățate

### 1. `.select()` după `INSERT` nu e gratuit

Supabase transformă `.insert().select()` în `INSERT ... RETURNING *`, care este evaluat de **SELECT RLS policies**, nu doar INSERT policies!

**Implicații**:
- Dacă SELECT policy-ul este restrictiv, `.select()` poate eșua chiar dacă INSERT-ul reușește
- Funcțiile `STABLE` pot returna rezultate din cache, excluzând rândurile nou inserate

### 2. Eroarea poate fi înșelătoare

Mesajul "violates INSERT policy" poate indica de fapt o problemă cu **SELECT policy**, nu INSERT policy!

**Cum să identifici**:
- Dacă INSERT-ul funcționează fără `.select()`, problema este în SELECT policy
- Dacă INSERT-ul eșuează și fără `.select()`, problema este în INSERT policy

### 3. Debugging Tip: Testează fără `.select()`

**Când ai 403 pe INSERT în Supabase, testează fără `.select()`** pentru a izola problema:

```typescript
// Test 1: INSERT fără .select()
const { error } = await supabase
    .from('table')
    .insert({...})
// Dacă merge → problema este în SELECT policy

// Test 2: INSERT cu .select()
const { data, error } = await supabase
    .from('table')
    .insert({...})
    .select()
// Dacă eșuează → confirmă că problema este în SELECT policy
```

### 4. RPC vs CRUD

`supabase.rpc()` poate funcționa corect chiar dacă operațiile CRUD eșuează din cauza RLS, deoarece RPC-urile pot fi `SECURITY DEFINER` și pot bypass RLS complet.

**Alternativă pentru cazuri complexe**:
```typescript
// În loc de .insert().select(), folosește RPC
const { data, error } = await supabase.rpc('insert_reputation_log', {
    giver_user_id: currentUser.id,
    receiver_user_id: params.receiverUserId,
    points: params.points,
    // ...
})
```

### 5. Funcții STABLE și Cache-ul

Funcțiile `STABLE` pot returna rezultate din cache în cadrul aceleiași tranzacții, excluzând rândurile nou inserate.

**Soluții**:
- Evită `.select()` după INSERT când SELECT policy-ul folosește funcții STABLE
- Folosește SELECT separat după INSERT (în altă tranzacție)
- Consideră funcții `VOLATILE` pentru funcții care trebuie să vadă rândurile nou inserate

---

## 📄 Documente Asociate

- **Fix aplicat**: [`docs/issues/FIXES/FIXED-admin-reputation-403-forbidden.md`](./FIXES/FIXED-admin-reputation-403-forbidden.md)
- **Cod modificat**: `client/src/services/forum/reputation.ts` - funcția `adminAwardReputation()`

## 🔗 Referințe

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgREST RETURNING behavior](https://postgrest.org/en/stable/api.html#insertions)
- [PostgreSQL Function Volatility Categories](https://www.postgresql.org/docs/current/xfunc-volatility.html)
- [Supabase INSERT with SELECT](https://supabase.com/docs/reference/javascript/insert)

---

## 🎯 Key Takeaway

**Când ai 403 pe INSERT în Supabase, testează fără `.select()` - problema poate fi de fapt în SELECT policy, nu INSERT policy!** 🎯

**Concluzie**: Bug-ul părea imposibil de rezolvat pentru că toate componentele individuale funcționau corect:
- ✅ JWT valid
- ✅ `auth.role() = 'authenticated'`
- ✅ INSERT policy permitea operația
- ✅ `check_is_admin()` returna `true`
- ✅ Trigger-ul era SECURITY DEFINER

Dar combinația `.insert().select()` + SELECT RLS policy restrictiv = 403 Forbidden care părea să vină de la INSERT!

**Soluția**: Nu folosi `.select()` când SELECT policy-ul nu permite vizualizarea imediată a rândului inserat.

