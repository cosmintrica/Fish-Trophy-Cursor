# Explicație: De ce există dublura admin și soluția simplă

## Problema actuală

### 1. Două surse de adevăr pentru admin:

**A. `profiles.role = 'admin'`** (Sursa de adevăr pentru SITE)
- Folosit pentru: toate funcționalitățile site-ului (admin panel, moderare, etc.)
- Este sursa principală de adevăr
- Setat manual în baza de date

**B. `forum_users.role_id` -> `forum_roles.name = 'admin'`** (Pentru FORUM)
- Folosit pentru: verificări în forum (RLS policies, funcții)
- Sincronizat automat cu `profiles.role` prin triggers
- Poate fi NULL sau ne-sincronizat

### 2. Funcții diferite care verifică surse diferite:

- `is_forum_admin()` - verifică `forum_users.role_id` (poate fi NULL!)
- `is_admin_for_reputation()` - verifică `profiles.role` (corect, dar nou)
- Alte funcții care verifică direct `forum_users.role_id`

### 3. De ce nu funcționează:

Policy-ul RLS pentru `forum_reputation_logs` folosește `is_admin_for_reputation(giver_user_id)`, dar:
- `auth.uid()` poate să nu fie disponibil corect în contextul `WITH CHECK`
- `giver_user_id` este disponibil, dar funcția poate să nu funcționeze corect

## Soluția simplă

### Opțiunea 1: Folosim DOAR `profiles.role` (RECOMANDAT)

**Avantaje:**
- O singură sursă de adevăr
- Simplu și clar
- Nu depinde de sincronizare

**Pași:**
1. Actualizăm toate funcțiile să verifice `profiles.role = 'admin'`
2. Eliminăm dependența de `forum_users.role_id` pentru verificări admin
3. Păstrăm `forum_users.role_id` doar pentru display/UI (badge-uri, etc.)

### Opțiunea 2: Folosim DOAR `forum_users.role_id` (NU RECOMANDAT)

**Dezavantaje:**
- Depinde de sincronizare (triggers)
- Poate fi NULL sau ne-sincronizat
- Mai complex

## Recomandarea mea

**Folosim DOAR `profiles.role = 'admin'` pentru toate verificările admin.**

**Motiv:**
- Este sursa de adevăr pentru site
- Nu depinde de sincronizare
- Simplu și clar
- Funcționează întotdeauna

**Ce facem:**
1. Actualizăm `is_forum_admin()` să verifice `profiles.role` în loc de `forum_users.role_id`
2. Eliminăm `is_admin_for_reputation()` (redundant)
3. Folosim o singură funcție `is_forum_admin()` care verifică `profiles.role`
4. Actualizăm toate policy-urile RLS să folosească `is_forum_admin()`

**Rezultat:**
- O singură funcție
- O singură sursă de adevăr
- Simplu și clar
- Funcționează întotdeauna

