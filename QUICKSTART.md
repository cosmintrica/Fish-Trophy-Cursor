# 🚀 Quick Start Guide

## ⚡ Setup în 5 Minute

### 1. Prerequisites
```bash
# Verifică versiunile
node --version  # >= 20.x
pnpm --version  # >= 8.0
```

### 2. Clone & Install
```bash
git clone <your-repo>
cd romanian-fishing-hub
pnpm install
```

### 3. Environment Setup
```bash
# Windows PowerShell
.\scripts\setup.ps1

# Linux/Mac
./scripts/setup.sh

# Sau manual
cp client/env.example client/.env.local
cp api/env.example api/.env.local
```

### 4. Configure Services

#### Firebase (Client)
```bash
# client/.env.local
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
# ... restul variabilelor
```

#### Database (API)
```bash
# api/.env.local
DATABASE_URL=postgres://user:pass@host/db?sslmode=require
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

### 5. Start Development
```bash
# Client + API în paralel
pnpm dev

# Sau separat
pnpm dev:client    # Port 3000
pnpm dev:api       # Port 3001
```

## 🗄️ Database Setup

### Option 1: Docker (Recomandat pentru Development)
```bash
# Start PostgreSQL + PostGIS
docker-compose up -d

# Database URL pentru development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fishing_hub
```

### Option 2: Neon (Production)
1. Creează cont pe [neon.tech](https://neon.tech)
2. Creează proiect PostgreSQL
3. Enable PostGIS extensions:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Generate & Push Schema
```bash
# Generează migrări
pnpm db:generate

# Push la database
pnpm db:push

# Deschide Drizzle Studio
pnpm db:studio
```

## 🔥 Firebase Setup

### 1. Create Project
1. [console.firebase.google.com](https://console.firebase.google.com)
2. Add Web App
3. Enable Authentication (Email/Password + Google)
4. Enable Storage

### 2. Service Account
1. Project Settings → Service Accounts
2. Generate Private Key
3. Download JSON
4. Copiază în `api/.env.local`

## 🚀 Deployment

### Vercel
1. Link la GitHub
2. Set Environment Variables
3. Deploy automat la push

### Environment Variables în Vercel
```bash
DATABASE_URL=postgres://...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
EMAIL_FROM=noreply@yourdomain.ro
RESEND_API_KEY=re_...
```

## 🛠️ Comenzi Utile

```bash
# Development
pnpm dev              # Client + API
pnpm dev:client       # Doar client
pnpm dev:api          # Doar API

# Build
pnpm build            # Build complet
pnpm build:client     # Build client
pnpm build:api        # Build API

# Database
pnpm db:generate      # Generează migrări
pnpm db:push          # Push schema
pnpm db:studio        # Drizzle Studio

# Code Quality
pnpm lint             # Verifică cod
pnpm lint:fix         # Fixează probleme
pnpm type-check       # Verifică TypeScript

# Docker
docker-compose up -d  # Start database
docker-compose down   # Stop database
```

## 📱 Structura Proiectului

```
.
├── client/                 # React App (Port 3000)
│   ├── src/
│   │   ├── components/    # UI Components
│   │   ├── pages/         # Route Pages
│   │   ├── lib/           # Utilities
│   │   └── styles/        # CSS + Tailwind
│   └── package.json
├── api/                    # Vercel Functions (Port 3001)
│   ├── _lib/              # Shared utilities
│   ├── records.ts         # Records API
│   ├── water-bodies.ts    # Water bodies API
│   └── package.json
├── packages/
│   └── db/                # Database schema
│       ├── schema.ts      # Drizzle schema
│       └── migrations/    # Generated migrations
└── scripts/                # Setup scripts
```

## 🎯 Next Steps

1. **Configure Firebase** - Authentication + Storage
2. **Setup Database** - Neon sau Docker
3. **Configure Environment** - .env files
4. **Start Development** - `pnpm dev`
5. **Build Features** - Follow production-instructions.md

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Database Connection Issues
```bash
# Verifică Docker
docker-compose ps
docker-compose logs db

# Testează conexiunea
psql postgres://postgres:postgres@localhost:5432/fishing_hub
```

### Firebase Issues
- Verifică API keys în .env.local
- Verifică Firebase project settings
- Verifică Authentication providers enabled

## 📚 Resources

- [Production Instructions](./production-instructions.md)
- [API Documentation](./api/README.md)
- [Database Schema](./packages/db/README.md)
- [React + Vite Docs](https://vitejs.dev/guide/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

---

**Happy Coding! 🎣🚀**
