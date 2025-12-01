# 🎣 Fish Trophy Forum - Database Migrations

## 📋 Structura Migrațiilor

Migrațiile sunt organizate granular pentru control maxim și debugging ușor.

### Ordine de Rulare

1. **01_extensions.sql** - Extensii PostgreSQL (uuid-ossp, pg_trgm)
2. **02_roles.sql** - Sistem roluri cu permisiuni JSON
3. **03_categories.sql** - Ierarhie categorii (categorii, sub-forumuri, subcategorii)
4. **04_users.sql** - Profil extins utilizatori (reputație, putere, ranguri)
5. **05_restrictions.sql** - Sistem ban granular (mute, view ban, shadow ban)
6. **06_topics_posts.sql** - Topicuri și postări cu full-text search
7. **07_reputation.sql** - Sistem reputație (ultimele 10 pe profil public, toate în admin)
8. **08_moderation.sql** - Moderare, raportări, braconaj
9. **09_marketplace.sql** - Piața pescarului cu verificare vânzători
10. **10_additional_features.sql** - PM, subscriptions, polls, ads
11. **11_triggers.sql** - Trigger-e automate (counts, ranks, search)
12. **12_functions.sql** - Funcții helper (stats, search, eligibility)
13. **13_seed_data.sql** - Date inițiale (roluri, ranguri)

## 🚀 Rulare Migrații

### Opțiunea 1: Supabase CLI (Recomandat)

```bash
cd supabase/migrations/forum
supabase db push
```

### Opțiunea 2: Manual (PostgreSQL)

```bash
psql -U postgres -d fish_trophy -f 01_extensions.sql
psql -U postgres -d fish_trophy -f 02_roles.sql
# ... și așa mai departe
```

### Opțiunea 3: Supabase Dashboard

1. Mergi la Project → Database → SQL Editor
2. Copy-paste fiecare fișier în ordine
3. Run Query

## ✅ Verificare Post-Migrație

```sql
-- Verifică tabele create
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'forum_%';

-- Verifică roluri seeded
SELECT name, display_name FROM forum_roles ORDER BY name;

-- Verifică ranguri seeded
SELECT name, display_name, min_posts FROM forum_user_ranks ORDER BY min_posts;

-- Test funcție statistici
SELECT get_forum_stats();
```

## 📊 Tabele Create (Total: 29)

| Categorie | Tabele |
|-----------|--------|
| **Core** | forum_roles, forum_user_ranks, forum_categories, forum_subforums, forum_subcategories |
| **Utilizatori** | forum_users, forum_user_restrictions, forum_sales_verification |
| **Conținut** | forum_topics, forum_posts, forum_attachments |
| **Reputație** | forum_reputation_logs |
| **Moderare** | forum_moderators, forum_reports, forum_braconaj_reports |
| **Marketplace** | forum_marketplace_feedback |
| **Features** | forum_private_messages, forum_subscriptions, forum_polls, forum_poll_votes, forum_stats, forum_ads |

## 🔧 Features Implementate

✅ Sub-forumuri și ierarhie completă  
✅ Sistem reputație cu putere (0-7)  
✅ Roluri flexibile JSON  
✅ Ban system granular  
✅ Marketplace cu verificare (15 zile, 10 rep, 25 posts)  
✅ Raportare braconaj cu regulament strict  
✅ Full-text search românesc  
✅ Sondaje (polls)  
✅ Trigger-e automate (counts, ranks, reputation)  
✅ Funcții helper (stats, search, eligibility)  

## 📝 Note Importante

- **Reputația este PUBLICĂ**: Log-urile nu pot fi ascunse (conform cerințelor)
- **Puterea reputației**: 0-7 (calculată automat)
- **Rangurile**: Actualizate automat pe baza post_count
- **Full-text search**: Optimizat pentru limba română
- **Marketplace**: Verificare strictă (15 zile + 10 rep + 25 posts + email)

## 🆘 Troubleshooting

### Eroare: "extension already exists"
- Normal, extensiile pot fi deja create de migrații anterioare.

### Eroare: "relation already exists"
- Rulează doar migrațiile noi, nu rula din nou cele vechi.

### Performance issues
- Toate indexurile sunt create automat în fiecare migrație.

## 📚 Referințe

- Plan complet: `../../FORUM_PLAN_COMPLETE.md`
- Implementation plan: artifact `implementation_plan.md`
- Task progress: artifact `task.md`
