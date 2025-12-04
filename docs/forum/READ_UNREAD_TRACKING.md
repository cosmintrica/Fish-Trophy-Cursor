# Forum Read/Unread Tracking System

## Overview

Sistem pentru tracking-ul mesajelor citite/necitite în forum, cu marker vizual `iconread.png`.

## Cum Funcționează

### 1. **Tracking-ul Citirii**
- Când un user deschide un topic, sistemul salvează `last_read_at` în tabela `forum_topic_reads`
- Compară `last_read_at` cu `last_post_at` din topic pentru a determina dacă sunt mesaje noi

### 2. **Detectarea Mesajelor Necitite**
- **Mesaje necitite** = `last_post_at` > `last_read_at` sau user-ul nu a citit niciodată topicul
- Funcția RPC `has_unread_posts(user_id, topic_id)` verifică rapid status-ul

### 3. **Marker Vizual**
- `iconread.png` - marker colorat când sunt mesaje necitite
- `iconread.png` - marker greyed (grayscale + opacity) când toate mesajele sunt citite
- Poziționat în stânga iconurilor pentru categorii și topicuri

## Componente

### Migration
- `supabase/migrations/forum/36_forum_topic_reads.sql`
- Tabelă `forum_topic_reads` pentru tracking
- Funcții RPC: `has_unread_posts()`, `mark_topic_as_read()`

### Hooks
- `useTopicReadStatus(topicId)` - verifică dacă un topic are mesaje necitite
- `useMarkTopicAsRead()` - marchează un topic ca citit
- `useMultipleTopicsReadStatus(topicIds[])` - verifică batch pentru liste

### Componente
- `ReadStatusMarker` - marker vizual cu `iconread.png`
- Integrat în `CategoryPage`, `CategoryList`, `MobileOptimizedCategories`

## Utilizare

### Pentru un singur topic:
```typescript
const { hasUnread } = useTopicReadStatus(topicId);
<ReadStatusMarker hasUnread={hasUnread} />
```

### Pentru multiple topicuri (liste):
```typescript
const { hasUnread } = useMultipleTopicsReadStatus(topicIds);
{topics.map(topic => (
  <ReadStatusMarker hasUnread={hasUnread(topic.id)} />
))}
```

### Marcare ca citit:
```typescript
const { markAsRead } = useMarkTopicAsRead();
// Când user-ul intră pe topic page:
useEffect(() => {
  if (topic?.id) {
    markAsRead({ topicId: topic.id, postId: lastPostId });
  }
}, [topic?.id]);
```

## Limitări

⚠️ **Pentru subcategorii**: Sistemul verifică dacă există cel puțin un topic cu mesaje necitite în subcategorie. Pentru performanță, nu verificăm toate topicurile, ci doar cele mai recente.

## Performanță

- Cache: 30 secunde pentru status-ul read/unread
- Batch queries pentru liste de topicuri
- RPC functions pentru verificări rapide în baza de date

