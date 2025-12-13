# Ghid Testare SEO - Fish Trophy

## 1. Testare Structured Data (Schema.org)

### Google Rich Results Test
**URL**: https://search.google.com/test/rich-results

**Pași**:
1. Deschide URL-ul de mai sus
2. Introdu URL-ul unei pagini (ex: `https://fishtrophy.ro/records`)
3. Click pe "Test URL"
4. Verifică dacă apare:
   - ✅ BreadcrumbList
   - ✅ WebSite
   - ✅ Organization

**Pentru Profile Pages**:
- URL: `https://fishtrophy.ro/profile/{username}`
- Verifică: ProfilePage structured data

**Pentru Recorduri/Capturi cu Video**:
- URL: `https://fishtrophy.ro/records#record-{id}` (deschide modalul)
- Verifică: VideoObject structured data (dacă există video)

**Pentru Forum Topics**:
- URL: `https://fishtrophy.ro/forum/{category}/{subcategory}/{topic-slug}`
- Verifică: Article structured data + BreadcrumbList

### Schema.org Validator
**URL**: https://validator.schema.org/

**Pași**:
1. Deschide URL-ul de mai sus
2. Selectează "Code Snippet"
3. Copiază conținutul din `<script type="application/ld+json">` din pagina testată
4. Click pe "Run Test"
5. Verifică dacă nu sunt erori

## 2. Testare Sitemap

### Verificare Sitemap.xml
**URL**: https://fishtrophy.ro/sitemap.xml

**Verificări**:
- ✅ Sitemap-ul se încarcă corect
- ✅ Conține pagini statice (Home, Records, Species, etc.)
- ✅ Conține recorduri (până la 1000)
- ✅ Conține topicuri forum (până la 1000)
- ✅ Conține profile publice (până la 500)
- ✅ Toate URL-urile sunt valide (status 200)

### Google Search Console - Sitemap Submission
**URL**: https://search.google.com/search-console

**Pași**:
1. Deschide Google Search Console
2. Mergi la "Sitemaps" în meniul din stânga
3. Adaugă sitemap-ul: `https://fishtrophy.ro/sitemap.xml`
4. Verifică statusul (ar trebui să fie "Success")

### XML Sitemap Validator
**URL**: https://www.xml-sitemaps.com/validate-xml-sitemap.html

**Pași**:
1. Introdu URL-ul sitemap-ului: `https://fishtrophy.ro/sitemap.xml`
2. Click pe "Validate"
3. Verifică dacă nu sunt erori

## 3. Testare Open Graph & Social Sharing

### Facebook Sharing Debugger
**URL**: https://developers.facebook.com/tools/debug/

**Pași**:
1. Introdu URL-ul unei pagini (ex: `https://fishtrophy.ro/records`)
2. Click pe "Debug"
3. Verifică:
   - ✅ og:title
   - ✅ og:description
   - ✅ og:image
   - ✅ og:url
   - ✅ og:type

**Pentru a reîmprospăta cache-ul**:
- Click pe "Scrape Again" după modificări

### Twitter Card Validator
**URL**: https://cards-dev.twitter.com/validator

**Pași**:
1. Introdu URL-ul unei pagini
2. Verifică:
   - ✅ twitter:card
   - ✅ twitter:title
   - ✅ twitter:description
   - ✅ twitter:image

### LinkedIn Post Inspector
**URL**: https://www.linkedin.com/post-inspector/

**Pași**:
1. Introdu URL-ul unei pagini
2. Verifică preview-ul

## 4. Testare Robots.txt

### Verificare Robots.txt
**URL**: https://fishtrophy.ro/robots.txt

**Verificări**:
- ✅ User-agent: *
- ✅ Allow: /profile/*
- ✅ Allow: /forum/*
- ✅ Disallow: /admin
- ✅ Disallow: /profile (fără username)
- ✅ Sitemap: https://fishtrophy.ro/sitemap.xml

### Google Search Console - Robots.txt Tester
**URL**: https://search.google.com/search-console

**Pași**:
1. Mergi la "Robots.txt Tester" în meniul din stânga
2. Verifică dacă robots.txt este corect

## 5. Testare Meta Tags

### View Page Source
**Pași**:
1. Deschide orice pagină (ex: `https://fishtrophy.ro/records`)
2. Click dreapta → "View Page Source" (sau Ctrl+U)
3. Caută `<head>` și verifică:
   - ✅ `<title>` - optimizat, unic
   - ✅ `<meta name="description">` - optimizat, unic
   - ✅ `<meta name="keywords">` - relevant
   - ✅ `<link rel="canonical">` - corect
   - ✅ `<meta property="og:*">` - complet
   - ✅ `<script type="application/ld+json">` - structured data

### SEO Meta Tags Checker
**URL**: https://www.seoptimer.com/meta-tags-analyzer

**Pași**:
1. Introdu URL-ul unei pagini
2. Verifică toate meta tag-urile

## 6. Testare Performance & Core Web Vitals

### Google PageSpeed Insights
**URL**: https://pagespeed.web.dev/

**Pași**:
1. Introdu URL-ul unei pagini
2. Click pe "Analyze"
3. Verifică:
   - Performance Score (target: >90)
   - LCP (Largest Contentful Paint) - target: <2.5s
   - FID (First Input Delay) - target: <100ms
   - CLS (Cumulative Layout Shift) - target: <0.1

### Lighthouse (Chrome DevTools)
**Pași**:
1. Deschide Chrome DevTools (F12)
2. Mergi la tab-ul "Lighthouse"
3. Selectează "SEO" și "Performance"
4. Click pe "Generate report"
5. Verifică:
   - SEO Score (target: 100)
   - Performance Score (target: >90)

## 7. Testare Deep Linking

### Testare URL-uri cu Hash
**URL-uri de testat**:
- `https://fishtrophy.ro/records#record-{global_id}`
- `https://fishtrophy.ro/profile/{username}#catch-{global_id}`

**Verificări**:
- ✅ Modalul se deschide automat când accesezi URL-ul
- ✅ URL-ul se actualizează când deschizi modalul manual
- ✅ Modalul se închide corect și hash-ul dispare

## 8. Testare Google Search Console

### Coverage Report
**URL**: https://search.google.com/search-console

**Pași**:
1. Mergi la "Coverage" în meniul din stânga
2. Verifică:
   - ✅ Valid pages (ar trebui să crească)
   - ✅ Excluded pages (ar trebui să fie minim)
   - ✅ Errors (ar trebui să fie 0)

### Performance Report
**Pași**:
1. Mergi la "Performance" în meniul din stânga
2. Verifică:
   - ✅ Impressions (ar trebui să crească)
   - ✅ Clicks (ar trebui să crească)
   - ✅ CTR (Click-Through Rate)
   - ✅ Average Position

### Enhancements
**Pași**:
1. Mergi la "Enhancements" în meniul din stânga
2. Verifică:
   - ✅ Breadcrumbs (ar trebui să apară)
   - ✅ Videos (ar trebui să apară pentru recorduri/capturi cu video)

## 9. Checklist Final

### Structured Data
- [ ] BreadcrumbList pe toate paginile importante
- [ ] ProfilePage pe profile publice
- [ ] VideoObject pe recorduri/capturi cu video
- [ ] Article pe topicuri forum
- [ ] WebSite și Organization pe toate paginile

### Sitemap
- [ ] Sitemap.xml accesibil
- [ ] Conține toate paginile importante
- [ ] URL-urile sunt valide
- [ ] Submit în Google Search Console

### Robots.txt
- [ ] Robots.txt accesibil
- [ ] Reguli corecte pentru indexare
- [ ] Sitemap declarat

### Meta Tags
- [ ] Title optimizat pe toate paginile
- [ ] Description optimizat pe toate paginile
- [ ] Open Graph tags complete
- [ ] Twitter Card tags complete
- [ ] Canonical tags pe toate paginile

### Performance
- [ ] PageSpeed Insights score >90
- [ ] Lighthouse SEO score = 100
- [ ] Core Web Vitals în limitele acceptabile

## 10. Resurse Utile

- **Google Search Central**: https://developers.google.com/search
- **Schema.org Documentation**: https://schema.org/
- **Open Graph Protocol**: https://ogp.me/
- **Twitter Cards**: https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards

## Note

- După modificări SEO, poate dura 1-7 zile până Google reindexează paginile
- Folosește "Request Indexing" în Google Search Console pentru pagini importante
- Verifică regulat erorile în Google Search Console
- Monitorizează performance-ul în timp real

