# Forum RPC Functions Guide

Acest ghid documentează toate funcțiile RPC optimizate pentru forum.

---

## Rezumat Îmbunătățiri Performanță

| Zonă | Înainte | După | Îmbunătățire |
|------|---------|------|--------------|
| Topic Page (20 posts) | ~65 queries | 2 queries | **97% mai puține** |
| Subcategory Page | ~8 queries | 2 queries | **75% mai puține** |
| Homepage | ~50 queries | 1 query | **98% mai puține** |

---

## Migrații RPC

### Migration 67: `batch_subcategory_unread_status`
**Fișier**: `supabase/migrations/forum/67_batch_subcategory_unread_status.sql`

Verifică statusul de necitit pentru mai multe subcategorii într-un singur query.

---

### Migration 68: `get_categories_with_stats`
**Fișier**: `supabase/migrations/forum/68_optimized_categories_with_stats.sql`

Returnează categoriile cu statistici (count topicuri, posturi) într-un singur query.

---

### Migration 70: `get_posts_with_authors`
**Fișier**: `supabase/migrations/forum/70_optimized_posts_with_authors.sql`

**Impact**: 60 queries → 1 query

**Parametri**:
- `p_topic_id` (UUID) - ID-ul topic-ului
- `p_page` (INT, default 1) - Pagina curentă
- `p_page_size` (INT, default 20) - Posturi per pagină

**Returnează**:
```json
{
  "data": [{
    "id": "...",
    "content": "...",
    "author_username": "Cosmin",
    "author_avatar": "https://...",
    "author_respect": 100,
    "author_rank": "pescar_expert",
    "edited_by_username": null
  }],
  "total": 25,
  "page": 1,
  "page_size": 20,
  "has_more": true
}
```

**Coloane forum_posts disponibile**:
- id, topic_id, user_id, content, is_deleted, is_first_post
- edited_at, edited_by, edit_reason, edited_by_admin, is_edited
- created_at, post_number, deleted_at, deleted_by, delete_reason
- search_vector

---

### Migration 71: `get_topic_with_hierarchy`
**Fișier**: `supabase/migrations/forum/71_optimized_topic_with_hierarchy.sql`

**Impact**: 4-5 queries → 1 query

**Parametri**:
- `p_topic_slug` (TEXT) - Slug-ul sau UUID-ul topic-ului
- `p_subcategory_slug` (TEXT, optional) - Slug-ul subcategoriei pentru dezambiguizare

**Returnează**:
```json
{
  "topic": {
    "id": "...",
    "title": "...",
    "slug": "...",
    "author_username": "Cosmin",
    "author_avatar": "https://..."
  },
  "subcategory": {
    "id": "...",
    "name": "Pescuit la Feeder",
    "slug": "pescuit-la-feeder"
  },
  "category": {
    "id": "...",
    "name": "Tehnici Pescuit",
    "slug": "tehnici-pescuit"
  }
}
```

---

## Schema Tabele (Referință)

### forum_posts
```
id, topic_id, user_id, content, is_deleted, is_first_post,
edited_at, edited_by, edit_reason, edited_by_admin, is_edited,
created_at, post_number, deleted_at, deleted_by, delete_reason,
search_vector
```

### forum_topics
```
id, subcategory_id, user_id, title, topic_type, is_pinned,
is_locked, is_deleted, view_count, reply_count, last_post_at,
last_post_user_id, created_at, updated_at, slug
```

### forum_subcategories
```
id, category_id, subforum_id, name, description, icon,
sort_order, is_active, moderator_only, created_at, updated_at, slug
```

### forum_categories
```
id, name, description, icon, sort_order, is_active,
created_at, updated_at, slug
```

### profiles
```
id, email, display_name, photo_url, phone, bio, location,
website, role, created_at, updated_at, county_id, city_id,
username, username_last_changed_at, youtube_channel, cover_photo_url,
show_gear_publicly, cover_position, show_county_publicly, show_city_publicly,
show_website_publicly, show_youtube_publicly, cover_position_mobile
```

### forum_users
```
id, user_id, username, role_id, avatar_url, signature,
post_count, topic_count, reputation_points, reputation_power,
rank, badges, is_online, last_seen_at, created_at, updated_at
```

---

## Utilizare în Cod

### posts.ts
```typescript
const { data: rpcData } = await supabase
  .rpc('get_posts_with_authors', {
    p_topic_id: topicId,
    p_page: page,
    p_page_size: pageSize
  });
```

### topics.ts
```typescript
const { data: rpcData } = await supabase
  .rpc('get_topic_with_hierarchy', {
    p_topic_slug: topicSlug,
    p_subcategory_slug: subcategorySlug || null
  });
```

---

## Troubleshooting

### Eroare 400 Bad Request
- Migrația nu e rulată în Supabase
- Rulează SQL-ul din fișierul de migrație în SQL Editor

### Eroare "column does not exist"
- Verifică schema tabelului cu:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'table_name' ORDER BY ordinal_position;
```
