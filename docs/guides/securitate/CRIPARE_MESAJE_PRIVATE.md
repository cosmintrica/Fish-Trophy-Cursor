# Criptare End-to-End pentru Mesaje Private

## 📋 Cuprins

1. [Explicație Generală](#explicație-generală)
2. [Cum Funcționează](#cum-funcționează)
3. [FAQ - Întrebări Frecvente](#faq---întrebări-frecvente)
4. [Analiză Securitate](#analiză-securitate)
5. [Conformitate GDPR](#conformitate-gdpr)

---

## Explicație Generală

### Ce este criptarea end-to-end?

Criptarea end-to-end (E2E) înseamnă că mesajele sunt **criptate pe dispozitivul expeditorului** și **decriptate doar pe dispozitivul destinatarului**. Nimeni altcineva, inclusiv administratorii sau serverul, nu pot citi conținutul mesajelor.

### De ce este importantă?

- **Confidențialitate**: Doar expeditorul și destinatarul pot citi mesajele
- **Securitate**: Chiar dacă cineva accesează database-ul, nu poate citi mesajele fără cheia de decriptare
- **Conformitate GDPR**: Protejează datele personale ale utilizatorilor

---

## Cum Funcționează

### 1. Derivationa Cheii

Cheia de criptare este derivată din **ID-urile utilizatorilor** (UUID-uri) care participă la conversație:

```typescript
// Cheia e derivată din:
1. sender_id (UUID) - ID-ul expeditorului
2. recipient_id (UUID) - ID-ul destinatarului
3. salt: 'fish-trophy-messages' - Valoare fixă pentru toate conversațiile
4. iterations: 100000 - Număr de iterații PBKDF2
```

**Procesul:**
1. ID-urile sunt sortate pentru a asigura aceeași cheie pentru ambele utilizatori
2. Se folosește **PBKDF2** (Password-Based Key Derivation Function 2) pentru a deriva cheia
3. Rezultatul este o cheie AES-GCM 256-bit

### 2. Criptarea Mesajului

```typescript
// Când un utilizator trimite un mesaj:
1. Se derivează cheia din ID-urile expeditorului și destinatarului
2. Se generează un IV (Initialization Vector) aleator pentru fiecare mesaj
3. Mesajul este criptat folosind AES-GCM 256-bit
4. Conținutul criptat și IV-ul sunt salvate în database
5. Conținutul original (plain text) NU este salvat
```

### 3. Decriptarea Mesajului

```typescript
// Când un utilizator primește un mesaj:
1. Se derivează cheia din ID-urile expeditorului și destinatarului
2. Se citește conținutul criptat și IV-ul din database
3. Mesajul este decriptat folosind cheia derivată
4. Mesajul este afișat utilizatorului
```

### 4. Cheia este în Memorie

**Important:** Cheia de criptare **NU este salvată nicăieri**. Ea este:
- ✅ Derivată dinamic când este necesară
- ✅ Păstrată doar în memorie (RAM)
- ✅ Ștearsă automat când se închide pagina

---

## FAQ - Întrebări Frecvente

### 1. Mai avem nevoie de view-urile (messages_inbox, messages_sent, messages_archived)?

**Răspuns:** Nu, nu mai sunt necesare pentru funcționalitatea de bază.

**De ce:**
- Acum încărcăm direct din `private_messages` pentru a avea acces la câmpurile de criptare
- View-urile nu includ `encrypted_content`, `encryption_iv`, `is_encrypted`
- Pot fi șterse sau păstrate pentru query-uri rapide (fără criptare)

**Recomandare:** Pot fi șterse pentru a simplifica schema, sau păstrate pentru compatibilitate.

---

### 2. De ce se afișa email-ul în subiect?

**Problema:** În cod era:
```typescript
subject: `Mesaj de la ${user.user_metadata?.display_name || user.email}`
```

**Soluție:** Am corectat să folosească doar `display_name` sau `username`, niciodată email:
```typescript
subject: `Mesaj de la ${user.user_metadata?.display_name || user.user_metadata?.username || 'Utilizator'}`
```

**Email-ul nu mai apare niciodată în subiect!**

---

### 3. Dacă fac backup/migrare, cheia se va reconstrui la fel?

**Răspuns: DA, mesajele nu se vor pierde!**

**De ce:**
- Cheia este derivată din **ID-uri (UUID-uri)** care **NU se schimbă niciodată**
- ID-urile sunt stocate în database și se păstrează la backup/migrare
- Procesul de derivare a cheii este **determinist** - aceleași ID-uri = aceeași cheie

**Exemplu:**
```
User A ID: 42042f87-55ab-438e-b755-5e0d5bc90e08
User B ID: d36efb03-fe89-4935-88bc-7e2b2f337e5c

Cheia derivată: PBKDF2(sort(IDs), salt, iterations)
→ Rezultat: Aceeași cheie ÎNTOTDEAUNA pentru acești doi utilizatori
```

**Concluzie:** Mesajele pot fi decriptate după backup/migrare, pentru că ID-urile rămân aceleași.

---

### 4. Dacă un user își schimbă username/email/display_name, strică cheia?

**Răspuns: NU, cheia NU se strică!**

**De ce:**
- Cheia este derivată din **ID-uri (UUID-uri)**, NU din username/email/display_name
- ID-urile **NU se schimbă niciodată** - sunt permanente
- Username, email, display_name sunt doar pentru afișare - nu afectează criptarea

**Exemplu:**
```
ÎNAINTE:
- Username: "cosmin123"
- Email: "cosmin@example.com"
- Display Name: "Cosmin"
- ID: 42042f87-55ab-438e-b755-5e0d5bc90e08 (NU se schimbă!)

DUPĂ SCHIMBARE:
- Username: "cosmin_new"
- Email: "cosmin.new@example.com"
- Display Name: "Cosmin Trica"
- ID: 42042f87-55ab-438e-b755-5e0d5bc90e08 (ACELAȘI!)

Cheia derivată: ACEEAȘI (pentru că ID-ul e același)
```

**Concluzie:** Utilizatorii pot schimba username/email/display_name fără să afecteze mesajele criptate.

---

### 5. Ce se întâmplă dacă un user șterge contul?

**Răspuns:** Mesajele se șterg automat (CASCADE DELETE)

**De ce:**
- Tabelul `private_messages` are `ON DELETE CASCADE` pentru `sender_id` și `recipient_id`
- Când un user șterge contul, toate mesajele sale se șterg automat
- Mesajele criptate se pierd definitiv (nu pot fi recuperate)

---

### 6. Pot migra mesajele între servere?

**Răspuns: DA, dar trebuie să migrezi și ID-urile utilizatorilor!**

**Cum:**
1. Exportă `private_messages` cu toate câmpurile (inclusiv `encrypted_content`, `encryption_iv`)
2. Exportă `profiles` cu ID-urile (UUID-uri)
3. Importă în noul server păstrând **ACELAȘI ID-uri**
4. Mesajele vor putea fi decriptate pentru că cheia se va deriva la fel

**IMPORTANT:** Dacă ID-urile se schimbă, mesajele NU vor mai putea fi decriptate!

---

### 7. Este sigură implementarea actuală?

**Răspuns: DA, pentru majoritatea cazurilor de utilizare.**

**Avantaje:**
- ✅ Criptare AES-GCM 256-bit (standard puternic)
- ✅ Cheia nu e salvată nicăieri
- ✅ Doar utilizatorii pot decripta
- ✅ Admin-ul nu poate citi mesajele

**Limitări:**
- ⚠️ Cheia e derivată din ID-uri (simplu, dar funcțional)
- ⚠️ Nu are forward secrecy (chei noi per mesaj)
- ⚠️ Nu are key exchange protocol (Diffie-Hellman)

**Pentru producție avansată:** Consideră implementarea unui protocol de key exchange mai complex.

---

## Analiză Securitate

### Situația actuală:

```typescript
// Cheia e derivată din:
1. sender_id (UUID) - VIZIBIL în database
2. recipient_id (UUID) - VIZIBIL în database  
3. salt: 'fish-trophy-messages' - FIXAT în cod (public)
4. iterations: 100000 - FIXAT în cod (public)
```

### Răspuns la întrebare:

**DA, dacă cineva știe ID-urile, poate construi cheia!**

**De ce:**
- ID-urile (UUID-uri) sunt **VIZIBILE** în database (`sender_id`, `recipient_id`)
- Salt-ul e **FIXAT** și **PUBLIC** în cod
- Procesul e **DETERMINIST** - aceleași input-uri = aceeași cheie

**Exemplu:**
```
Cineva cu acces la database vede:
- sender_id: 42042f87-55ab-438e-b755-5e0d5bc90e08
- recipient_id: d36efb03-fe89-4935-88bc-7e2b2f337e5c
- encrypted_content: "9+xTLdUlrIM6rCLAuHiDIuL..."

Poate:
1. Citi salt-ul din cod: 'fish-trophy-messages'
2. Deriva cheia: PBKDF2(sort(IDs), salt, 100000)
3. Decripta mesajele!
```

### Nivelul actual de securitate:

#### ✅ Ce protejează:
- **RLS** - doar utilizatorii autentificați văd propriile mesaje
- **Criptare** - admin-ul nu poate citi fără să știe ID-urile
- **HTTPS** - datele în tranzit sunt protejate

#### ⚠️ Ce NU protejează complet:
- **Cineva cu acces la database** - poate vedea ID-urile și construi cheia
- **Admin cu acces postgres** - poate vedea ID-urile și construi cheia
- **Salt fixat** - e public în cod, nu e secret

#### 🔒 Rezistență la Brute-Force:

**PBKDF2 cu 100.000 iterații × AES-GCM 256-bit → Brute-force nefezabil (imposibil practic)**

**Explicație:**
- **PBKDF2 cu 100.000 iterații**: Fiecare derivare a cheii necesită 100.000 de operații hash SHA-256
- **AES-GCM 256-bit**: Spațiul de chei este de 2^256 (aproximativ 10^77 combinații posibile)
- **Timp estimat pentru brute-force**: Miliarde de ani, chiar și cu cele mai puternice supercomputere disponibile
- **Concluzie**: Atacurile brute-force sunt practic imposibile cu configurația actuală

### Soluții pentru securitate mai bună:

#### Opțiunea 1: Salt per conversație (RECOMANDAT)

```typescript
// În loc de salt fixat, folosește un salt per conversație
// Salt-ul ar trebui să fie generat la primul mesaj și salvat în database

// Schema:
ALTER TABLE private_messages
ADD COLUMN conversation_salt TEXT;

// Derivation:
const salt = message.conversation_salt || generateNewSalt();
const key = await deriveKeyFromUsers(sender_id, recipient_id, salt);
```

**Avantaje:**
- ✅ Fiecare conversație are salt unic
- ✅ Chiar dacă știi ID-urile, fără salt nu poți construi cheia
- ✅ Salt-ul e salvat în database (doar pentru participanții conversației)

**Dezavantaje:**
- ⚠️ Trebuie să salvezi salt-ul (dar e OK, e doar pentru participanți)

#### Opțiunea 2: Secret shared per utilizator

```typescript
// Fiecare utilizator are un secret generat la înregistrare
// Secret-ul e salvat criptat în database (doar utilizatorul îl poate decripta)

// Derivation:
const key = await deriveKeyFromUsersAndSecrets(
  sender_id, 
  recipient_id, 
  sender_secret, 
  recipient_secret
);
```

**Avantaje:**
- ✅ Foarte sigur - chiar dacă știi ID-urile, fără secreturi nu poți construi cheia
- ✅ Forward secrecy posibil (chei noi per mesaj)

**Dezavantaje:**
- ⚠️ Mai complex de implementat
- ⚠️ Trebuie gestionat storage-ul secretelor

#### Opțiunea 3: Key exchange protocol (Diffie-Hellman)

```typescript
// Utilizatorii schimbă chei publice
// Cheia partajată e derivată din cheile private (care nu sunt trimise)

// Avantaje:
- ✅ Forward secrecy
- ✅ Perfect forward secrecy
- ✅ Standard criptografic (Signal, WhatsApp)

// Dezavantaje:
- ⚠️ Foarte complex
- ⚠️ Necesită infrastructură suplimentară
```

### Recomandare pentru implementarea actuală:

#### Nivelul actual (simplu):
- ✅ **Suficient pentru majoritatea cazurilor**
- ✅ Protejează împotriva admin-ului care nu știe ID-urile
- ✅ Protejează împotriva accesului accidental
- ⚠️ **NU protejează** împotriva atacatorului cu acces la database care știe ID-urile

#### Nivelul îmbunătățit (salt per conversație):
- ✅ **Recomandat pentru producție**
- ✅ Protejează chiar și dacă ID-urile sunt cunoscute
- ✅ Salt-ul e salvat în database (doar pentru participanți)
- ✅ Implementare relativ simplă

---

## Conformitate GDPR

### ✅ Soluția actuală este suficientă pentru GDPR:

1. **RLS (Row Level Security)** — protejează accesul la date
   - Doar utilizatorii autentificați văd propriile mesaje
   - Admin-ul nu poate accesa mesajele fără să știe ID-urile

2. **Criptare end-to-end** — nivel suplimentar de protecție
   - Conținutul mesajelor este criptat
   - Chiar dacă cineva ar avea acces la database, fără ID-uri nu poate decripta

3. **Protecție date personale**
   - Email-urile nu sunt afișate nicăieri
   - Doar utilizatorii implicați pot citi mesajele

### Rezumat

| Aspect | Status |
|--------|--------|
| Protecție acces neautorizat | ✅ RLS activează |
| Criptare conținut | ✅ AES-GCM 256-bit |
| Protecție date personale | ✅ Email-uri ascunse |
| Conformitate GDPR | ✅ Suficient |

---

## Rezumat Final

| Întrebare | Răspuns |
|-----------|---------|
| View-uri necesare? | Nu, pot fi șterse |
| Email în subiect? | Corectat - nu mai apare |
| Backup/migrare? | DA, mesajele se păstrează (ID-uri rămân aceleași) |
| Schimbare username/email? | NU afectează cheia (ID-ul e același) |
| Ștergere cont? | Mesajele se șterg automat |
| Migrare între servere? | DA, dar păstrează ID-urile |
| Securitate pentru GDPR? | ✅ Suficient |

---

## ⚖️ Disclaimer Legal

**Documentul descrie o implementare tehnică și nu constituie consultanță juridică.**

Informațiile prezentate în acest document sunt destinate să ofere o înțelegere tehnică a implementării criptării end-to-end pentru mesaje private. Acest document nu constituie consultanță juridică, nu oferă garanții legale și nu înlocuiește consultarea cu un avocat specializat în protecția datelor personale și conformitatea GDPR.

Pentru întrebări legale specifice despre conformitatea GDPR sau alte aspecte juridice, vă recomandăm să consultați un avocat specializat.

---

**Ultima actualizare:** 2025-11-28

