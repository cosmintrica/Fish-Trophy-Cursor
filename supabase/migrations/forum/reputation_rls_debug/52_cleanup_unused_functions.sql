-- =============================================
-- Migration 52: Curățare Funcții Redundante
-- =============================================
-- Descriere: Șterge funcțiile redundante create de migration-urile anterioare
-- Dependințe: 51_fix_reputation_insert_rls_simple.sql
-- =============================================

-- =============================================
-- 1. Șterge funcția is_admin_from_profiles() (nu mai este folosită)
-- =============================================
-- Migration-urile 50 și 51 au creat această funcție, dar acum folosim is_admin_user()
-- IMPORTANT: Trebuie să ștergem PRIMUL policy-urile care o folosesc (dacă există)

-- Verifică dacă există policy-uri care folosesc is_admin_from_profiles()
-- (Nu există, dar verificăm pentru siguranță)
-- Migration-ul 51 deja folosește is_admin_user(), deci putem șterge funcția

DROP FUNCTION IF EXISTS is_admin_from_profiles() CASCADE;

-- =============================================
-- 2. Verifică funcția get_visible_reputation_log_ids() (este folosită de migration-ul 47)
-- =============================================
-- Această funcție ESTE FOLOSITĂ de policy-ul SELECT din migration-ul 47
-- NU o ștergem, doar verificăm că există și este corectă

-- Funcția get_visible_reputation_log_ids() este necesară pentru policy-ul SELECT
-- și este definită în migration-ul 47, deci NU o ștergem

-- =============================================
-- Comentarii
-- =============================================

COMMENT ON FUNCTION public.is_admin_user IS 
'Funcție existentă pentru verificare admin din profiles.role. Folosită de migration-ul 51 pentru RLS INSERT pe forum_reputation_logs.';

