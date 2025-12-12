# 🚀 FISH TROPHY DOMINATION: Plan Masiv de Optimizare SEO

> **Obiectiv Unic**: Devenirea autorității absolute în pescuitul din România. Locul #1 pentru orice căutare legată de pescuit, specii, locații sau tehnică.

---

## 🏛️ PILONUL 1: EXCELENȚĂ TEHNICĂ (The Foundation)
*Dacă fundația nu e solidă, conținutul nu contează.*

### 1.1. Core Web Vitals (Viteză & Stabilitate) - 🔴 CRITIC
Google penalizează site-urile lente.
- [ ] **LCP (Largest Contentful Paint)**: Optimizare imagini (WebP, lazy loading inteligent pentru imaginile below-fold, eager loading pentru hero images).
- [ ] **CLS (Cumulative Layout Shift)**: Dimensionare fixă pentru containerele de reclame/imagini înainte de încărcare (skeleton screens deja avem, trebuie verificate dimensiunile).
- [ ] **Caching Strategy**: Configurare cache-control headers în Netlify pentru assets statice (1 an) și content dinamic (stale-while-revalidate).

### 1.2. Arhitectura Informațională & Indexare
- [ ] **Sitemap Dinamic V2**: Trecerea de la sitemap-ul curent la unul care se regenerează automat la fiecare record/topic nou (Serverless Function).
  - *Include*: `/records/:id`, `/forum/topic/:slug`, `/profile/:username`.
  - *Exclude*: Pagini de admin, profil privat, setări.
- [ ] **Canonical Tags**: Asigurarea că `https://fishtrophy.ro/forum` și `https://fishtrophy.ro/forum/` sunt văzute ca aceeași pagină pentru a evita "duplicate content".
- [ ] **Robots.txt Avansat**: Optimizare crawl budget (nu lăsa Google să piardă timp pe pagini de filtrare irelevante).

### 1.3. Mobile-First Indexing
- [ ] Verificare "Tap targets" (butoane prea apropiate).
- [ ] Font size lizibil pe orice device (minim 16px pentru body text).

---

## 🧠 PILONUL 2: DOMINAȚIA SEMANTICĂ (Structured Data)
*Vorbește limba lui Google mai bine decât oricine altcineva.*

### 2.1. Schema Markup Dinamic (JSON-LD)
Nu doar "Website", ci **specificitate maximă**:
- [ ] **`VideoObject`**: Pentru fiecare record care are video atașat. (Google iubește video in search results).
- [ ] **`QAPage`**: Pentru topicurile de forum de tip "Întrebare".
- [ ] **`HowTo`**: Pentru secțiunea DIY și articole educaționale.
- [ ] **`ProfilePage`**: Pentru pagini de utilizator (Rank, Statistici).
- [ ] **`Dataset`**: Pentru paginile de statistici/clasamente (Google poate arăta tabele direct în rezultate).
- [ ] **`BreadcrumbList`**: (Deja început, trebuie extins peste tot).

### 2.2. Programmatic SEO (Scalare Masivă)
Generarea automată de "Landing Pages" pentru căutări specifice, fără a scrie manual mii de pagini.
- [ ] **"Pescuit în [Județ]"**: Pagină generată care agregă toate recordurile, discuțiile și speciile din județul respectiv.
- [ ] **"Record [Specie] România"**: Pagină dedicată per specie (ex: "Record Crap România", "Record Știucă România") optimizată agresiv pentru acest keyword.

---

## 📣 PILONUL 3: SOCIAL GRAPH & VIRALITATE
*Transformă fiecare share într-un magnet de trafic.*

### 3.1. Dynamic Open Graph Images (OG Images)
Cea mai mare oportunitate ratată momentan. Când cineva dă share la un record, imaginea de preview trebuie să fie generată dinamic, nu logo-ul generic.
- [ ] **Implementare**: Serverless function care generează o imagine `png` on-the-fly conținând:
  - Poza peștelui (background)
  - Text suprapus: "NOU RECORD: Crap 25kg"
  - Text secundar: "Prins de [Username] pe [Data]"
  - Badge "Fish Trophy Verified"
- *Impact*: Crește CTR-ul pe social media cu 300%+.

### 3.2. Twitter Cards & WhatsApp Previews
- [ ] Optimizare titluri trunchiate pentru WhatsApp (primele 40 caractere sunt cruciale).

---

## 👑 PILONUL 4: CONȚINUT & AUTORITATE
*Conținut care atrage link-uri naturale (Backlinks).*

### 4.1. "Ghidul Suprem" Series
Articole *pilon* ("Cornerstone Content") de 2000+ cuvinte, interconectate.
- [ ] "Ghidul Complet al Speciilor de Apă Dulce din România"
- [ ] "Harta Legală a Pescuitului: Unde ai voie să pescuiești?"

### 4.2. Local SEO
- [ ] Dacă vom avea parteneriate cu bălți private: `LocalBusiness` schema pentru fiecare baltă, cu review-uri agregate din forum.

---

## 📅 PLAN DE ACȚIUNE IMEDIAT (Săptămâna 1-2)

### Faza 1: "Low Hanging Fruit" (Impact Maxim / Efort Minim)
1.  ✅ **Sitelinks (DONE)**: Navigation Schema implementat.
2.  ⬜ **Audit Viteza**: Rulare Lighthouse pe tot site-ul și rezolvarea alertelor roșii.
3.  ⬜ **Canonical Tags**: Audit rapid în `<head>` pe toate paginile.

### Faza 2: "The Social Booster"
1.  ⬜ **Dynamic OG Images**: Implementare generator imagini pentru Recorduri.
2.  ⬜ **Share Buttons**: Adăugare butoane "Sticky" pe mobil pentru paginile de recorduri.

### Faza 3: "Data Integrity"
1.  ⬜ **Video Schema**: Adăugare JSON-LD pentru video-urile de la recorduri.
2.  ⬜ **Forum Schema**: Adăugare `DiscussionForumPosting` pe paginile de topicuri.

---

## 📈 KPIS (Cum măsurăm succesul)
1.  **Impresii GSC**: Creștere lunară 20%.
2.  **CTR Mediu**: > 5%.
3.  **Keywords în Top 3**: Minim 50 de keywords în 3 luni.
4.  **Rich Results**: Apariția "Video", "FAQ" sau "Review" snippet-uri în Google.
