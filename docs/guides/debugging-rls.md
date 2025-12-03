# 🔍 Ghid Debugging Row Level Security (RLS) în Supabase

## 📋 Query-uri Rapide pentru Diagnostic

### 1. Vezi TOATE politicile pe un tabel
```sql
SELECT 
    policyname,
    cmd,                    -- INSERT, SELECT, UPDATE, DELETE, ALL
    permissive,            -- PERMISSIVE sau RESTRICTIVE
    roles,                 -- {public}, {authenticated}, etc.
    qual as using_clause,  -- Condiția USING
    with_check            -- Condiția WITH CHECK (pentru INSERT/UPDATE)
FROM pg_policies 
WHERE tablename = 'NUME_TABEL'  -- Înlocuiește cu tabelul tău
ORDER BY cmd, policyname;
```

### 2. Verifică status RLS pe tabele
```sql
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'forum_%'
ORDER BY tablename;
```

### 3. Testează dacă utilizatorul curent e recunoscut
```sql
-- În SQL Editor (va returna NULL - normal, ești super admin)
SELECT auth.uid() as my_user_id, auth.role() as my_role;

-- Pentru a testa cu un user real, adaugă în cod frontend:
-- const { data: { user } } = await supabase.auth.getUser()
-- console.log('User ID:', user?.id)
```

### 4. Verifică rolul utilizatorului din profiles
```sql
SELECT 
    id,
    email,
    role,
    display_name
FROM profiles
WHERE id = 'USER_ID_AICI';  -- Înlocuiește cu ID-ul userului
```

### 5. Verifică rolul utilizatorului din forum_users
```sql
SELECT 
    fu.user_id,
    fu.username,
    fu.role_id,
    fr.name as role_name
FROM forum_users fu
LEFT JOIN forum_roles fr ON fu.role_id = fr.id
WHERE fu.user_id = 'USER_ID_AICI';
```

---

## 🚨 Cazul Specific: Eroare la DELETE/UPDATE

### Ce s-a întâmplat cu ștergerea postărilor?

**Eroare:**
```
new row violates row-level security policy for table "forum_posts"
```

**Verificări făcute (toate OK):**
- ✅ User e admin în `profiles.role = 'admin'`
- ✅ User e owner al postării
- ✅ Politica UPDATE are `WITH CHECK (true)`
- ✅ Codul frontend trimite datele corect

**Cauza REALĂ:**
Politica **SELECT** bloca vizualizarea postării după ce devine `is_deleted = true`!

```sql
-- Politica SELECT VECHE (problematică):
CREATE POLICY "Postări vizibile" ON forum_posts
FOR SELECT
USING (is_deleted = false);  -- ❌ Blochează postările șterse!
```

**Ce se întâmpla:**
1. ✅ UPDATE-ul trece (politica UPDATE e OK)
2. ✅ WITH CHECK trece (e `true`)
3. ❌ PostgreSQL încearcă să returneze rândul modificat
4. ❌ Politica SELECT verifică `is_deleted = false` și blochează!

**Soluția:**
```sql
-- Politica SELECT NOUĂ (funcționează):
CREATE POLICY "Postări vizibile" ON forum_posts
FOR SELECT
USING (
  -- Postări active pentru toți
  (is_deleted = false)
  OR
  -- Postări șterse pentru owner/admin/moderator
  (is_deleted = true AND auth.uid() = user_id)
  OR
  (is_deleted = true AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
);
```

---

## 🎯 Checklist Debugging RLS

Când primești eroare RLS, verifică în ordine:

### 1. **Este RLS activ pe tabel?**
```sql
SELECT rowsecurity FROM pg_tables 
WHERE tablename = 'tabel_problematic';
```

### 2. **Utilizatorul e autentificat?**
- **401 Unauthorized** = nu e logat
- **403 Forbidden** = e logat, dar RLS blochează

### 3. **Ce politici există?**
```sql
-- Vezi TOATE politicile (INSERT, SELECT, UPDATE, DELETE)
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'tabel_problematic';
```

### 4. **Verifică fiecare tip de politică:**
- **SELECT** - blochează citirea (poate bloca și RETURNING după UPDATE!)
- **INSERT** - verifică WITH CHECK
- **UPDATE** - verifică USING (pentru selectare) și WITH CHECK (pentru modificare)
- **DELETE** - verifică USING

### 5. **Test rapid - Dezactivează RLS temporar:**
```sql
ALTER TABLE tabel_problematic DISABLE ROW LEVEL SECURITY;
-- Testează operațiunea
-- Dacă merge = problema e în politici RLS
ALTER TABLE tabel_problematic ENABLE ROW LEVEL SECURITY;
```

### 6. **Adaugă logging în cod:**
```typescript
const { data: { user } } = await supabase.auth.getUser()
console.log('User ID:', user?.id);

const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();
console.log('Role:', profile?.role);
```

---

## 💡 Probleme Comune RLS

### 1. **Politica SELECT blochează RETURNING**
Când faci UPDATE/DELETE, PostgreSQL încearcă să returneze rândul modificat, dar politica SELECT îl blochează dacă condiția nu mai e îndeplinită.

**Fix:** Permite SELECT pe rândurile modificate pentru owner/admin.

### 2. **auth.uid() returnează NULL**
În SQL Editor, `auth.uid()` e NULL pentru că nu ești autentificat ca user Supabase.

**Fix:** Testează din aplicație, nu din SQL Editor.

### 3. **WITH CHECK lipsă pe UPDATE**
Dacă lipsește `WITH CHECK`, PostgreSQL aplică implicit condiția `USING` și pe rândul NOU.

**Fix:** Adaugă explicit `WITH CHECK (true)` sau duplicate condiția USING.

### 4. **JOIN-uri complexe în politici**
Verificări cu multe JOIN-uri pot eșua în anumite contexte API.

**Fix:** Folosește subquery-uri simple sau funcții SECURITY DEFINER.

### 5. **Verificarea rolului din mai multe tabele**
Dacă verifici `forum_users JOIN forum_roles`, pot apărea probleme de sincronizare.

**Fix:** Folosește `profiles.role` direct (mai simplu și mai rapid).

---

## 🛠️ Template pentru Politici RLS Sigure

### Pentru tabel cu soft delete:

```sql
-- SELECT - permite vizualizare postări active + șterse de owner/admin
CREATE POLICY "nume_select" ON tabel
FOR SELECT
USING (
  (is_deleted = false)
  OR
  (is_deleted = true AND auth.uid() = user_id)
  OR
  (is_deleted = true AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
);

-- INSERT - doar utilizatori autentificați
CREATE POLICY "nume_insert" ON tabel
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND auth.uid() = user_id
);

-- UPDATE - owner sau admin
CREATE POLICY "nume_update" ON tabel
FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (true);  -- Permite modificări care fac rândul invizibil

-- DELETE - owner sau admin
CREATE POLICY "nume_delete" ON tabel
FOR DELETE
USING (
  auth.uid() = user_id
  OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
```

---

## 📚 Resurse Utile

- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

## ✅ Rezumat

**Când ai probleme RLS:**
1. Verifică TOATE politicile cu primul query
2. Testează cu RLS disabled
3. Adaugă logging în cod
4. Verifică și politica SELECT (nu doar UPDATE/DELETE)
5. Folosește `profiles.role` direct în loc de verificări complexe

**Regula de aur:** 
> Dacă UPDATE-ul merge cu RLS OFF dar nu cu RLS ON, problema e în politici, nu în cod! 🎯
