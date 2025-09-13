# 🐟 Fish Trophy - Platforma Pescarilor din România

> **Platforma completă pentru pescarii români** - Descoperă locații, urmărește recorduri, concurează cu alții și explorează comunitatea pescarilor din România.

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-badge-id/deploy-status)](https://app.netlify.com/sites/fishtrophy/deploys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Demo Live

**🌐 [fishtrophy.ro](https://fishtrophy.ro)** - Site-ul live

## 📁 Structura Proiectului

```
Fish-Trophy-Cursor/
├── 📱 client/                          # Frontend React + Vite
│   ├── 📁 src/
│   │   ├── 📁 components/              # Componente React reutilizabile
│   │   ├── 📁 pages/                   # Pagini principale ale aplicației
│   │   ├── 📁 hooks/                   # Custom React hooks
│   │   ├── 📁 lib/                     # Librării și utilitare
│   │   ├── 📁 services/                # Servicii API și Supabase
│   │   ├── 📁 styles/                  # Stiluri CSS și Tailwind
│   │   └── 📁 utils/                   # Funcții utilitare
│   ├── 📁 public/                      # Assets statice
│   │   ├── 🤖 robots.txt               # Configurare crawler
│   │   ├── 🗺️ sitemap.xml              # Sitemap static
│   │   ├── 🎨 icon-*.png               # Iconițe PWA
│   │   └── 📄 manifest.json            # Configurare PWA
│   ├── 📁 scripts/                     # Scripturi de build
│   ├── 📁 sql-scripts/                 # Scripturi SQL pentru client
│   └── ⚙️ vite.config.ts               # Configurare Vite
│
├── 🌐 netlify/                         # Backend Netlify Functions
│   └── 📁 functions/                   # Serverless functions
│       ├── 🔍 analytics.mjs            # Analytics și statistici
│       ├── 📊 records.mjs              # CRUD pentru recorduri
│       ├── 🗺️ locations.mjs            # Gestionare locații
│       ├── 🐟 species.mjs              # Gestionare specii
│       ├── 🖼️ og.mjs                   # Generator Open Graph
│       ├── 🗺️ sitemap.mjs              # Generator sitemap dinamic
│       └── 📤 upload.mjs               # Upload fișiere
│
├── 🗄️ supabase/                        # Baza de date Supabase
│   ├── 📁 migrations/                  # Migrări baza de date
│   └── 📁 functions/                   # Funcții Supabase Edge
│
├── 📚 docs/                            # Documentație completă
│   ├── 📁 guides/                      # Ghiduri și instrucțiuni
│   ├── 📁 backup/                      # Sistem backup și restore
│   ├── 📁 deployment/                  # Ghiduri deployment
│   └── 📁 database/                    # Schema și scripturi DB
│
├── 🗃️ sql-scripts/                     # Scripturi SQL pentru dezvoltare
│   ├── 📄 *.sql                        # Scripturi de migrare
│   └── 📄 README.md                    # Documentație SQL
│
├── ⚙️ netlify.toml                     # Configurare Netlify
├── 📦 package.json                     # Dependințe Node.js
└── 📖 README.md                        # Acest fișier
```

## 🛠️ Tehnologii

### Frontend
- **⚛️ React 18** - Framework UI
- **⚡ Vite** - Build tool rapid
- **🎨 Tailwind CSS** - Styling framework
- **📱 PWA** - Progressive Web App
- **🗺️ Leaflet** - Hărți interactive
- **📊 Chart.js** - Grafice și statistici

### Backend
- **☁️ Netlify Functions** - Serverless backend
- **🗄️ Supabase** - Baza de date PostgreSQL
- **🔐 Supabase Auth** - Autentificare
- **📤 Supabase Storage** - Storage fișiere
- **🌐 Cloudflare R2** - CDN și storage

### DevOps
- **🚀 Netlify** - Hosting și deployment
- **📊 Google Analytics** - Analytics
- **🔍 Google Search Console** - SEO
- **🤖 GitHub Actions** - CI/CD

## 🚀 Instalare și Rulare

### 1. Clonează repository-ul
```bash
git clone https://github.com/cosmintrica/Fish-Trophy-Cursor.git
cd Fish-Trophy-Cursor
```

### 2. Instalează dependințele
```bash
npm install
cd client
npm install
```

### 3. Configurează variabilele de mediu
```bash
# Copiază fișierul de exemplu
cp client/env.example client/.env.local

# Editează cu datele tale
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Rulează aplicația
```bash
# Development server
npm run dev

# Sau direct din client/
cd client
npm run dev
```

Aplicația va fi disponibilă la `http://localhost:5173`

## 📚 Documentație

### 🗂️ Ghiduri principale
- **[Ghid Deployment](docs/deployment/)** - Cum să deployezi aplicația
- **[Ghid Backup](docs/backup/)** - Sistem de backup și restore
- **[Ghid Database](docs/database/)** - Schema și migrări baza de date
- **[Ghiduri Utilizatori](docs/guides/)** - Instrucțiuni pentru utilizatori

### 🔧 Configurare
- **[Configurare Netlify](docs/deployment/NETLIFY_ENV_VARS.md)**
- **[Configurare Cloudflare R2](docs/deployment/cloudflare-r2-setup.md)**
- **[Instrucțiuni Producție](docs/deployment/production-instructions.md)**

## 🌟 Funcționalități

### 🗺️ Hărți Interactive
- **Locații de pescuit** din toată România
- **Filtrare avansată** pe tip, județ, specie
- **Căutare inteligentă** cu autocomplete
- **Detalii complete** pentru fiecare locație

### 🏆 Recorduri și Competiții
- **Sistem de recorduri** cu verificare
- **Clasamente** pe categorii (general, lunar, pe specii, echipe)
- **Statistici detaliate** pentru fiecare utilizator
- **Sistem de echipe** pe locații

### 🐟 Catalog de Specii
- **Peste 100 de specii** de pești din România
- **Informații detaliate** despre habitat și comportament
- **Tehnici de pescuit** specifice
- **Căutare și filtrare** avansată

### 👤 Profil Utilizator
- **Profil personalizabil** cu poze și bio
- **Statistici personale** de pescuit
- **Istoric recorduri** și realizări
- **Sistem de verificare** pentru recorduri

### 📊 Analytics și Admin
- **Dashboard admin** complet
- **Statistici trafic** și utilizatori
- **Grafice interactive** cu Chart.js
- **Rapoarte detaliate** de performanță

## 🔒 Securitate

- **Autentificare** prin Supabase Auth
- **Autorizare** bazată pe roluri
- **Validare** strictă a datelor
- **Protecție** împotriva SQL injection
- **Rate limiting** pentru API-uri

## 📱 PWA Features

- **Instalare** pe dispozitive mobile
- **Offline support** pentru funcționalități de bază
- **Push notifications** pentru recorduri noi
- **Iconițe** personalizate pentru platforme

## 🚀 Deployment

### Netlify (Recomandat)
```bash
# Build pentru producție
npm run build

# Deploy pe Netlify
netlify deploy --prod
```

### Variabile de mediu necesare
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ADMIN_EMAIL=admin@example.com
```

## 🤝 Contribuții

1. **Fork** repository-ul
2. **Creează** o branch pentru feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** modificările (`git commit -m 'Add some AmazingFeature'`)
4. **Push** la branch (`git push origin feature/AmazingFeature`)
5. **Deschide** un Pull Request

## 📄 Licență

Acest proiect este licențiat sub licența MIT - vezi fișierul [LICENSE](LICENSE) pentru detalii.

## 👨‍💻 Autor

**Cosmin Trica** - [@cosmintrica](https://github.com/cosmintrica)

## 🙏 Mulțumiri

- **Supabase** pentru backend-ul excelent
- **Netlify** pentru hosting-ul gratuit
- **Tailwind CSS** pentru framework-ul de styling
- **Comunitatea React** pentru suportul continuu

---

## 📞 Contact

- **Website**: [fishtrophy.ro](https://fishtrophy.ro)
- **Email**: cosmin.trica@outlook.com
- **GitHub**: [@cosmintrica](https://github.com/cosmintrica)

---

<div align="center">
  <p>Făcut cu ❤️ în România pentru pescarii români</p>
  <p>🐟 Fish Trophy - Platforma Pescarilor din România 🐟</p>
</div>
