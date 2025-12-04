# 🧪 Testing Admin Panel Forum

## Pași pentru Testare

### 1. **Pornește Serverul de Dezvoltare**

```bash
# În directorul root al proiectului
cd client
npm run dev
```

Serverul va porni pe `http://localhost:5173` (sau alt port dacă 5173 e ocupat)

### 2. **Accesează Admin Panel-ul**

URL: `http://localhost:5173/forum/admin`

**IMPORTANT**: 
- Trebuie să fii logat cu un cont care are rolul de **admin** în forum
- Dacă nu ai rol de admin, vei primi mesajul "Acces Interzis" și vei fi redirecționat

### 3. **Verifică Rolul Admin**

Pentru a avea acces la Admin Panel, contul tău trebuie să aibă rolul `admin` în tabelul `forum_users`:

```sql
-- Verifică rolul tău
SELECT 
  fu.username,
  fr.name as role_name
FROM forum_users fu
JOIN forum_roles fr ON fu.role_id = fr.id
WHERE fu.user_id = 'YOUR_USER_ID_HERE';

-- Dacă nu ai rol admin, îl poți seta (doar dacă ești super admin în Supabase)
UPDATE forum_users 
SET role_id = (SELECT id FROM forum_roles WHERE name = 'admin')
WHERE user_id = 'YOUR_USER_ID_HERE';
```

### 4. **Ce să Testezi**

#### Dashboard (tab implicit)
- ✅ Statistici generale (Total Utilizatori, Topicuri, Postări)
- ✅ Statistici pentru astăzi (Topicuri astăzi, Postări astăzi, etc.)
- ✅ Grafice activitate (Postări/zi, Membri noi/săptămână)
- ✅ Utilizatori online

#### Navigare între Tabs
- ✅ Click pe fiecare tab (Dashboard, Moderare, Reputație, etc.)
- ✅ Verifică că tab-ul activ se evidențiază corect
- ✅ Verifică că conținutul se schimbă

### 5. **Probleme Posibile**

#### Eroare: "Acces Interzis"
**Cauză**: Nu ai rol de admin
**Soluție**: Verifică/actualizează rolul în baza de date (vezi pasul 3)

#### Eroare: "Se verifică permisiunile..." (blochează)
**Cauză**: Eroare la verificarea rolului sau nu ești logat
**Soluție**: 
- Verifică că ești logat în forum
- Verifică console-ul browser pentru erori
- Verifică conexiunea la Supabase

#### Dashboard-ul nu se încarcă
**Cauză**: Eroare la încărcarea statisticilor
**Soluție**: 
- Verifică console-ul browser pentru erori
- Verifică că tabelele `forum_users`, `forum_topics`, `forum_posts` există
- Verifică că funcția `get_forum_stats()` există în Supabase

### 6. **Console Browser - Debug**

Deschide **Developer Tools** (F12) și verifică:
- **Console** - pentru erori JavaScript
- **Network** - pentru request-uri către Supabase
- **Application** - pentru localStorage/session

### 7. **Teste Funcționale**

#### Test 1: Verificare Acces
1. Accesează `/forum/admin` fără să fii logat → ar trebui să te redirecționeze la `/forum`
2. Accesează cu cont fără rol admin → ar trebui să vezi "Acces Interzis"

#### Test 2: Dashboard
1. Accesează cu cont admin → ar trebui să vezi Dashboard-ul
2. Verifică că toate statisticile se încarcă
3. Verifică că graficele se afișează corect

#### Test 3: Tabs
1. Click pe fiecare tab
2. Verifică că tab-ul activ se evidențiază
3. Verifică că conținutul placeholder se afișează pentru tabs neimplementate

### 8. **Date de Test**

Pentru a testa cu date reale, poți:
- Creează câteva topicuri/postări în forum
- Așteaptă câteva minute pentru a avea date "astăzi"
- Verifică că graficele arată datele corect

### 9. **Dark Mode**

Testează și dark mode:
- Toggle dark mode din header
- Verifică că Dashboard-ul arată bine în ambele moduri
- Verifică că culorile sunt corecte

## Notă

Dacă Admin Panel-ul nu funcționează:
1. Verifică că toate componentele sunt importate corect
2. Verifică că nu există erori de TypeScript
3. Verifică console-ul pentru erori runtime
4. Verifică că React Query este configurat corect

---

**URL Testare**: `http://localhost:5173/forum/admin`

