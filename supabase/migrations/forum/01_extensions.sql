-- =============================================
-- Migration 01: Core Extensions și Configurări
-- =============================================
-- Descriere: Activare extensii PostgreSQL necesare pentru forum
-- Dependințe: Niciunul
-- =============================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigram pentru căutare fuzzy (toleranță la typo-uri)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Text search românesc (already exists in main DB, but ensure)
-- CREATE EXTENSION IF NOT EXISTS "unaccent"; -- Uncomment dacă e nevoie

-- =============================================
-- Comentarii
-- =============================================
COMMENT ON EXTENSION "pg_trgm" IS 'Trigram matching pentru căutare fuzzy în forum';
