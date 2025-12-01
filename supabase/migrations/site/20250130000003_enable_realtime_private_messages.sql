-- Enable Realtime for private_messages table
-- Migration: 20250130000003_enable_realtime_private_messages.sql
-- 
-- PROBLEMA: Mesajele private nu apar instant, doar după refresh
-- SOLUȚIA: Activăm Realtime doar pe tabelul private_messages pentru a primi notificări instant
-- SIGUR: Realtime este activat doar pe acest tabel, nu global
-- 
-- NOTĂ: Poți folosi și butonul "Enable Realtime" din Supabase Dashboard pentru același rezultat
-- Această migrație este opțională, dar recomandată pentru versionare

-- Enable Realtime publication for private_messages table (safe - checks if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'private_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;
  END IF;
END $$;

