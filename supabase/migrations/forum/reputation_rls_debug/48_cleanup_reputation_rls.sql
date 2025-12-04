-- =============================================
-- Migration 48: Curățare RLS pentru Reputație
-- =============================================
-- Descriere: Actualizează comentariile pentru funcția și policy-urile
-- NOTĂ: Funcția get_visible_reputation_log_ids() este folosită de migration-ul 47
-- pentru a evita recursiunea infinită în policy-ul SELECT
-- Dependințe: 47_fix_reputation_rls_use_profiles_role.sql
-- =============================================

-- =============================================
-- NOTĂ: Funcția get_visible_reputation_log_ids() este NECESARĂ
-- =============================================
-- Migration-ul 47 o re-creă cu profiles.role în loc de is_forum_admin()
-- Nu o ștergem pentru că este folosită de policy-ul SELECT pentru a evita recursiunea

-- =============================================
-- 2. Verifică și curăță policy-urile (dacă există duplicate)
-- =============================================
-- Migration-ul 47 deja face DROP și CREATE, dar verificăm pentru siguranță
-- Nu facem nimic aici, migration-ul 47 deja gestionează asta

-- =============================================
-- Comentarii
-- =============================================

COMMENT ON POLICY "Acordare reputație" ON forum_reputation_logs IS 
'Permite acordarea reputației: like simplu (oricine), dislike/amplificat (putere 1+), admin award (doar admini din profiles.role, nelimitat, post_id nullable). Folosește profiles.role direct pentru simplitate și siguranță.';

COMMENT ON POLICY "Log-uri reputație vizibile limitat" ON forum_reputation_logs IS 
'Public: ultimele 10 log-uri pe profil utilizator. Admin (din profiles.role): toate log-urile în admin panel. Folosește funcție SECURITY DEFINER (get_visible_reputation_log_ids) pentru a evita recursiunea infinită.';

COMMENT ON FUNCTION get_visible_reputation_log_ids IS 
'Returnează ID-urile log-urilor de reputație vizibile pentru un utilizator. Admin (din profiles.role): toate. Alții: ultimele 10. SECURITY DEFINER pentru a evita recursiune RLS. Folosește profiles.role direct pentru simplitate.';

