-- Initialize Romanian Fishing Hub Database
-- This script runs when the PostgreSQL container starts

-- Enable PostGIS extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create database user for the application (optional)
-- CREATE USER fishing_hub_user WITH PASSWORD 'secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE fishing_hub TO fishing_hub_user;

-- Set timezone
SET timezone = 'Europe/Bucharest';

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE '✅ Romanian Fishing Hub database initialized successfully!';
    RAISE NOTICE '📊 PostGIS extensions enabled';
    RAISE NOTICE '🌍 Timezone set to Europe/Bucharest';
END $$;
