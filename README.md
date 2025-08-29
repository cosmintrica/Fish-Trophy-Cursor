# 🎣 Fish Trophy

Platformă completă pentru pescarii din România cu hărți interactive, recorduri, specii și comunitate.

## 🚀 Caracteristici

- **Hărți Interactive** cu ape (polygons) și locații (points)
- **Sistem de Recorduri** cu moderare și leaderboards
- **Catalog de Specii** cu detalii și habitat
- **Secțiunea Mării Negre** cu temă dedicată
- **Admin Panel** custom cu editare geo și moderare
- **Notificări Email** pentru aprobări/respingeri

## 🛠️ Tech Stack

- **Frontend**: React + Vite + Tailwind + shadcn/ui + TanStack Query
- **Backend**: Vercel Functions + Firebase Admin
- **Database**: Neon (PostgreSQL + PostGIS)
- **ORM**: Drizzle
- **Auth**: Firebase Auth
- **Maps**: Leaflet + OSM tiles
- **Email**: Resend

## 📋 Cerințe

- Node.js >= 20.x
- pnpm >= 8.0
- Cont Neon (PostgreSQL)
- Proiect Firebase
- Cont Vercel

## 🚀 Setup Rapid

### 1. Clone și Install
```bash
git clone <your-repo>
cd fishtrophy
pnpm install
```

### 2. Configurare Environment
```bash
# Copiază .env.example în fiecare director
cp client/.env.example client/.env.local
cp api/.env.example api/.env.local
```

### 3. Configurare Database
```bash
# Generează migrări
pnpm db:generate

# Push la database
pnpm db:push
```

### 4. Run Development
```bash
# Client + API în paralel
pnpm dev

# Sau separat
pnpm dev:client    # Port 3000
pnpm dev:api       # Port 3001
```

## 📁 Structura Proiectului

```
.
├── client/                 # React app (Vite)
├── api/                    # Vercel Functions
├── packages/
│   └── db/                # Database schema + migrations
├── production-instructions.md  # Instrucțiuni complete
└── README.md
```

## 🔧 Scripts Disponibile

- `pnpm dev` - Client + API în paralel
- `pnpm build` - Build pentru producție
- `pnpm lint` - Verificare cod
- `pnpm db:generate` - Generează migrări
- `pnpm db:push` - Push la database
- `pnpm db:studio` - Drizzle Studio

## 🌊 Secțiunea Mării Negre

Accesibilă la `/black-sea` cu:
- Temă personalizată (albastru deschis)
- Filtre preset pentru zona Mării Negre
- Specii specifice marine

## 👑 Admin Panel

Accesibil la `/admin` pentru utilizatorii cu rol `moderator` sau `admin`:
- Moderare recorduri
- Editare ape (polygons) cu Leaflet.draw
- Management utilizatori și amenități

## 📧 Notificări Email

- Confirmare record aprobat/respins
- Notificare când un record top 3 este depășit
- Template-uri personalizate cu Resend

## 🗺️ Hărți și Geo

- **OSM tiles** gratuite
- **PostGIS** pentru operații geo
- **BBox queries** pentru performanță
- **Leaflet.draw** pentru editare admin

## 🚀 Deployment

1. **Vercel**: Link la GitHub cu Preview deployments
2. **Database**: Migrări automate la deploy
3. **Environment**: Variabile setate în Vercel

## 📚 Documentație

- [Instrucțiuni Complete](./production-instructions.md)
- [API Endpoints](./api/README.md)
- [Database Schema](./packages/db/README.md)

## 🤝 Contribuție

1. Fork repository
2. Creează feature branch
3. Commit cu mesaje clare
4. Push și Pull Request

## 📄 Licență

MIT License - vezi [LICENSE](LICENSE) pentru detalii.

---

**Construit cu ❤️ pentru comunitatea pescarilor din România**
