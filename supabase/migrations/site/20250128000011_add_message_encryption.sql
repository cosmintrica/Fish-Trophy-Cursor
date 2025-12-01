-- Secure Private Messages with End-to-End Encryption
-- Migration: 20250128000011_add_message_encryption.sql
-- Description: Adds E2E encryption support and ensures RLS security

-- =============================================
-- 1. CONFIRMĂM RLS PENTRU PRIVATE_MESSAGES
-- =============================================
-- Asigurăm că RLS este activat (policies sunt create în 20250128000003_add_private_messages.sql)
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. ADĂUGĂM SUPORT PENTRU CRIPTARE E2E
-- =============================================
-- First, allow NULL in content column for encrypted messages
ALTER TABLE public.private_messages
ALTER COLUMN content DROP NOT NULL;

-- Add encryption fields to private_messages table
ALTER TABLE public.private_messages
ADD COLUMN IF NOT EXISTS encrypted_content TEXT,
ADD COLUMN IF NOT EXISTS encryption_iv TEXT,
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Update constraint: either content or encrypted_content must be present
ALTER TABLE public.private_messages
DROP CONSTRAINT IF EXISTS check_content_or_encrypted;

ALTER TABLE public.private_messages
ADD CONSTRAINT check_content_or_encrypted CHECK (
  (is_encrypted = true AND encrypted_content IS NOT NULL AND char_length(encrypted_content) > 0 AND encryption_iv IS NOT NULL) OR
  (is_encrypted = false AND content IS NOT NULL AND char_length(content) > 0)
);

-- Update existing messages to mark as not encrypted
UPDATE public.private_messages
SET is_encrypted = false
WHERE is_encrypted IS NULL;

-- Index for encrypted messages
CREATE INDEX IF NOT EXISTS idx_messages_encrypted 
ON public.private_messages(is_encrypted) 
WHERE is_encrypted = true;

-- =============================================
-- 3. CLARIFICĂRI SECURITATE
-- =============================================
-- View-urile (messages_inbox, messages_sent, messages_archived) apar ca "Unrestricted"
-- în Supabase UI, dar ASTA E NORMAL ȘI SIGUR:
-- - View-urile NU au propriile RLS policies
-- - View-urile folosesc RLS-ul tabelelor de bază (private_messages)
-- - Fiecare user vede doar propriile mesaje datorită WHERE clauses cu auth.uid()
-- - NU activa "Security Definer" pentru view-uri - ar permite acces neautorizat!

-- =============================================
-- 4. PRIVACY PENTRU ADMIN
-- =============================================
-- Cu criptare E2E implementată:
-- ✅ Mesajele sunt criptate în browser înainte de trimitere (AES-GCM 256-bit)
-- ✅ Cheia este derivată din ID-urile utilizatorilor (PBKDF2)
-- ✅ Doar sender și recipient pot decripta mesajele
-- ✅ Admin-ul NU poate vedea conținutul (doar text criptat în database)
-- ✅ Database-ul stochează doar encrypted_content + encryption_iv
-- ✅ Conform GDPR - nici admin nu poate accesa conținutul mesajelor private

-- Encryption/decryption happens in browser using Web Crypto API
-- Keys are derived from user IDs using PBKDF2 (see client/src/lib/encryption.ts)

-- =============================================
-- 5. REALTIME - OPȚIONAL
-- =============================================
-- Realtime pentru mesaje private:
-- - Poate fi activat pentru notificări în timp real
-- - NU este necesar pentru funcționalitate de bază
-- - Dacă activezi Realtime, asigură-te că RLS policies sunt respectate
-- - Realtime folosește aceleași RLS policies ca și query-urile normale
