# Curățare Migration-uri Redundante

## Migration-uri Redundante pentru Reputație

Următoarele migration-uri au fost înlocuite de migration-ul 47:

### Migration-uri care pot fi ignorate (nu le șterge, doar nu le mai rulezi):

1. **40_fix_reputation_rls_use_function.sql**
   - Rezolvată de: **47_fix_reputation_rls_use_profiles_role.sql**
   - Motiv: Migration-ul 47 folosește `profiles.role` direct, mai simplu

2. **44_verify_admin_and_fix.sql**
   - Rezolvată de: **47_fix_reputation_rls_use_profiles_role.sql**
   - Motiv: Migration-ul 47 folosește `profiles.role` direct, mai simplu

3. **45_fix_reputation_rls_final.sql**
   - Rezolvată de: **47_fix_reputation_rls_use_profiles_role.sql**
   - Motiv: Migration-ul 47 folosește `profiles.role` direct, mai simplu

### Migration-uri care trebuie rulate (în ordine):

1. **39_fix_reputation_admin_award_rls.sql** - Face `post_id` nullable (NECESAR)
2. **47_fix_reputation_rls_use_profiles_role.sql** - Fix final cu `profiles.role` (NECESAR)
3. **48_cleanup_reputation_rls.sql** - Curăță funcțiile nefolosite (OPȚIONAL, dar recomandat)

### Funcții Eliminate:

- `get_visible_reputation_log_ids()` - Eliminată de migration-ul 48
  - Motiv: Migration-ul 47 folosește verificare directă în policy, nu mai e nevoie de funcție

### Policy-uri Active (după migration-ul 47):

1. **"Acordare reputație"** (INSERT) - Folosește `profiles.role` direct
2. **"Log-uri reputație vizibile limitat"** (SELECT) - Folosește `profiles.role` direct

## Verificare

Rulează `sql-scripts/verify_current_policies.sql` pentru a verifica policy-urile active.

