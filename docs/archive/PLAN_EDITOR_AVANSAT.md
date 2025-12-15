# 📝 Plan Implementare Editor Avansat Forum

**Data**: 2025-01-02  
**Prioritate**: CRITIC (Prioritate 1)

---

## 🎯 Obiective

Implementare completă a sistemului de editare mesaje pentru forum:
1. **Quick Reply Box** - Răspuns rapid (sticky bottom) ✅ COMPLETAT
2. **Advanced Editor Modal** - Editor complet cu formatare ⏳ ÎN PROGRES
3. **Parser BBCode** - Pentru [record], [gear], [quote]
4. **Quote Parțial & Multi-Quote** - Selectare text și citare multiplă ⭐ NOU

---

## 📋 Task-uri

### Faza 1: Quick Reply Box (Sticky Bottom) ⚡ ✅ COMPLETAT

#### 1.1 Componenta QuickReplyBox ✅
- ✅ Textarea simplă (multi-line)
- ✅ Emoji button (placeholder)
- ✅ Buton "Postează Răspuns"
- ✅ Link "Răspuns Complex" → deschide Advanced Editor
- ✅ Sticky bottom (position: fixed/sticky)
- ✅ Auto-resize textarea
- ✅ Validare minim caractere
- ✅ Loading state
- ✅ Error handling
- ✅ Picker pentru pageSize (10, 20, 50)

#### 1.2 Integrare în TopicPage ✅
- ✅ Adăugare QuickReplyBox înainte de ActiveViewers
- ✅ Poziționare sticky bottom
- ✅ Auto-scroll la quick reply după postare
- ✅ Refresh lista postări după postare reușită
- ✅ Paginare pentru postări (10, 20, 50)

---

### Faza 2: Advanced Editor Modal ⚡ ⏳ ÎN PROGRES

#### 2.1 Componenta AdvancedEditorModal
- **Fișier**: `client/src/forum/components/AdvancedEditorModal.tsx`
- **Funcționalități**:
  - Formatare text:
    - Bold, Italic, Underline, Strikethrough
    - Headings (H1-H3)
    - Lists (ordered, unordered)
    - Code blocks
  - Inserare link (cu text și URL)
  - Upload imagini (drag & drop + file picker)
  - Embed video (YouTube, Vimeo auto-detect)
  - Emoji picker avansat
  - Preview mesaj (toggle view)
  - Save draft (localStorage)
  - Character counter
  - Validare format

#### 2.2 Toolbar Component
- **Fișier**: `client/src/forum/components/EditorToolbar.tsx`
- Butoane formatare (B, I, U, S, H1-H3, List, Code)
- Buton insert link
- Buton insert image
- Buton insert video
- Buton emoji
- Buton preview

#### 2.3 Editor Core
- Folosește `contentEditable` sau `textarea` cu markdown
- Sau bibliotecă existentă (ex: `react-quill`, `draft-js` - dar preferăm custom pentru control)

---

### Faza 3: Parser BBCode 🎨

#### 3.1 Parser Core
- **Fișier**: `client/src/forum/utils/bbcodeParser.ts`
- Parse [record]ID[/record]
- Parse [gear]ID[/gear]
- Parse [quote user="..." post="..."]text[/quote]
- Parse [b], [i], [u], [s], [url], [img], [video]
- Sanitize HTML output

#### 3.2 Renderer Component
- **Fișier**: `client/src/forum/components/BBCodeRenderer.tsx`
- Render HTML din BBCode
- Embed Record Card
- Embed Gear Card
- Quote Card
- Formatare text

#### 3.3 Record Card Component
- **Fișier**: `client/src/forum/components/RecordCard.tsx`
- Fetch date record din API
- Display: specie, greutate, lungime, apă, dată, poză
- Link către pagina record
- Loading state
- Error handling

#### 3.4 Gear Card Component
- **Fișier**: `client/src/forum/components/GearCard.tsx`
- Fetch date echipament din API
- Display: nume, marcă, preț, dată achiziție, imagine
- Expand detalii
- Loading state
- Error handling

---

### Faza 4: Quote Parțial & Multi-Quote 📋 ⭐

#### 4.1 Text Selection Handler
- **Fișier**: `client/src/forum/utils/textSelection.ts`
- Detectează selectare text în postări
- Afișează floating toolbar cu buton "Quote"
- Capturează textul selectat
- Capturează post_id și user_id

#### 4.2 Quote Modal
- **Fișier**: `client/src/forum/components/QuoteModal.tsx`
- Preview text citat
- Editează text citat (opțional)
- Adaugă comentariu personal (opțional)
- Buton "Adaugă la Răspuns"
- Inserează BBCode în editor

#### 4.3 Quote Card Component
- **Fișier**: `client/src/forum/components/QuoteCard.tsx`
- Render card cu text citat
- Avatar user
- Link către postare originală
- Styling distinct (background gri, border)

#### 4.4 Multi-Quote System ⭐ NOU
- **Fișier**: `client/src/forum/components/MultiQuoteSelector.tsx`
- **Buton Toggle pe fiecare postare** - permite selectarea multiplă
- **Indicatori vizuali** - highlight postările selectate pentru quote
- **Contor global** - afișează câte postări sunt selectate (ex: "3 postări selectate")
- **Buton "Quote Selected"** - în QuickReplyBox sau Advanced Editor
- **Funcționalitate**:
  - Toggle on/off pentru fiecare postare
  - Păstrează selecțiile în state/context
  - Când apeși Quote, citează TOATE postările selectate în ordine
  - Format: `[quote user="..." post="..."]text[/quote]` pentru fiecare
  - Buton "Clear Selected" pentru resetare
- **Integrare**:
  - Buton toggle în MessageActions.tsx
  - Context/State pentru multi-quote în TopicPage sau App level
  - Integrare în QuickReplyBox și AdvancedEditorModal

---

### Faza 5: Integrare și Optimizări ⚙️

#### 5.1 Integrare în TopicPage
- Quick Reply Box la final
- Buton "Răspuns Complex" → Advanced Editor
- Buton "Quote" pe fiecare postare
- Integrare BBCodeRenderer în afișare postări

#### 5.2 Draft System
- Save draft în localStorage
- Restore draft la deschidere editor
- Clear draft după postare reușită
- Auto-save la fiecare 30 secunde

#### 5.3 Mobile Optimizations
- Quick Reply Box responsive
- Advanced Editor Modal fullscreen pe mobile
- Touch-friendly toolbar
- Optimizat pentru tastatură mobilă

---

## 📁 Structură Fișiere

```
client/src/forum/
├── components/
│   ├── QuickReplyBox.tsx          # Quick Reply (sticky bottom) ✅
│   ├── AdvancedEditorModal.tsx     # Editor complet modal ⏳
│   ├── EditorToolbar.tsx           # Toolbar formatare ⏳
│   ├── BBCodeRenderer.tsx          # Render BBCode → HTML
│   ├── RecordCard.tsx              # Embed record card
│   ├── GearCard.tsx                # Embed gear card
│   ├── QuoteCard.tsx               # Quote card display
│   ├── QuoteModal.tsx              # Modal pentru citare
│   ├── MultiQuoteSelector.tsx      # Multi-quote selector ⭐
│   └── message/
│       └── MessageActions.tsx      # Adaugare buton "Quote" + Multi-Quote Toggle
│
├── utils/
│   ├── bbcodeParser.ts             # Parser BBCode → HTML
│   └── textSelection.ts            # Text selection handler
│
└── hooks/
    └── useEditorDraft.ts           # Hook pentru draft management
```

---

## 🔧 Tehnologii

- **React** - Componente
- **TypeScript** - Type safety
- **Supabase** - API pentru records/gear
- **localStorage** - Draft management
- **Emoji Picker** - `emoji-mart` sau `@emoji-mart/react`
- **File Upload** - R2 sau Supabase Storage

---

## 📝 API-uri Necesare

### 1. Get Record by ID
```
GET /api/records/:id
Response: {
  id, species, weight, length, water, date, image_url, user_id, ...
}
```

### 2. Get Gear by ID
```
GET /api/gear/:id
Response: {
  id, name, brand, price, purchase_date, image_url, user_id, ...
}
```

### 3. Upload Image
```
POST /api/upload/image
Body: FormData (file)
Response: { url, id }
```

---

## ✅ Checklist Implementare

### Quick Reply Box ✅
- [x] Componenta QuickReplyBox.tsx
- [x] Integrare în TopicPage
- [x] Emoji button (placeholder)
- [x] Validare și error handling
- [x] Mobile responsive
- [x] Picker pentru pageSize

### Advanced Editor
- [ ] Componenta AdvancedEditorModal.tsx ⏳
- [ ] EditorToolbar.tsx
- [ ] Formatare text (B, I, U, S, H1-H3, Lists, Code)
- [ ] Insert link
- [ ] Upload imagini
- [ ] Embed video (YouTube, Vimeo)
- [ ] Preview mesaj
- [ ] Save/restore draft

### BBCode Parser
- [ ] Parser core (bbcodeParser.ts)
- [ ] Renderer component (BBCodeRenderer.tsx)
- [ ] RecordCard component
- [ ] GearCard component
- [ ] Integrare în afișare postări

### Quote Parțial & Multi-Quote
- [ ] Text selection handler
- [ ] QuoteModal component
- [ ] QuoteCard component
- [ ] Buton "Quote" pe postări
- [ ] **Multi-Quote System** ⭐
  - [ ] Buton toggle pe fiecare postare
  - [ ] Indicatori vizuali pentru selecții
  - [ ] Contor postări selectate
  - [ ] Buton "Quote Selected" în editor
  - [ ] Integrare în QuickReplyBox și AdvancedEditor
- [ ] Integrare în editor

### Optimizări
- [ ] Mobile responsive
- [ ] Performance optimizations
- [ ] Error handling complet
- [ ] Loading states
- [ ] Accessibility

---

## 🚀 Prioritate Implementare

1. **Quick Reply Box** (Faza 1) - ✅ COMPLETAT
2. **Advanced Editor Modal** (Faza 2) - ⏳ ÎN PROGRES
3. **Multi-Quote System** (Faza 4.4) - ⭐ IMPORTANT
4. **BBCode Parser** (Faza 3) - Pentru embed-uri speciale
5. **Quote Parțial** (Faza 4.1-4.3) - Nice to have, dar util

---

## 📊 Estimare Timp

- **Faza 1** (Quick Reply): ✅ ~2-3 ore - COMPLETAT
- **Faza 2** (Advanced Editor): ~4-6 ore ⏳
- **Faza 3** (BBCode Parser): ~3-4 ore
- **Faza 4** (Quote Parțial & Multi-Quote): ~3-4 ore ⭐
- **Faza 5** (Integrare): ~1-2 ore

**Total**: ~13-19 ore (din care ~2-3 completate)

---

## 🎯 Start

Să continuăm cu **Faza 2: Advanced Editor Modal** și **Faza 4.4: Multi-Quote System** ⭐
