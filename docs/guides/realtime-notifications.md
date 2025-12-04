# Ghid: Notificări Realtime pentru Forum

## Arhitectură

```
┌─────────────────────────────────────────────────────┐
│  App.tsx / Layout Principal                         │
│  └── RealtimeNotificationsProvider                  │
│        │                                            │
│        ├── 1 conexiune websocket globală            │
│        ├── Ascultă: notifications, messages         │
│        └── Expune: notificationCount, markAsRead    │
│                                                     │
│        ├── Site Pages (Map, Profile, etc)           │
│        └── Forum Pages (Topics, Posts, etc)         │
└─────────────────────────────────────────────────────┘
```

---

## Pași Implementare

### 1. Tabel `notifications` (dacă nu există)

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'reply', 'mention', 'like', 'message'
  title TEXT NOT NULL,
  body TEXT,
  link TEXT, -- URL pentru redirect
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### 2. RealtimeNotificationsProvider

```typescript
// client/src/providers/RealtimeNotificationsProvider.tsx

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface NotificationContextType {
  unreadCount: number;
  notifications: Notification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function RealtimeNotificationsProvider({ children, userId }: { 
  children: React.ReactNode; 
  userId: string | null;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    };

    fetchNotifications();

    // Subscribe to realtime
    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        // New notification received!
        setNotifications(prev => [payload.new as Notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Optional: Show toast
        // toast.info(payload.new.title);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead 
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within provider');
  return context;
};
```

### 3. Integrare în App

```typescript
// App.tsx
import { RealtimeNotificationsProvider } from './providers/RealtimeNotificationsProvider';

function App() {
  const { user } = useAuth();
  
  return (
    <RealtimeNotificationsProvider userId={user?.id || null}>
      <Routes>
        {/* toate rutele - site + forum */}
      </Routes>
    </RealtimeNotificationsProvider>
  );
}
```

### 4. Navbar cu Badge

```typescript
// În orice Navbar
const { unreadCount } = useNotifications();

<Bell />
{unreadCount > 0 && (
  <span className="badge">{unreadCount}</span>
)}
```

---

## Trigger pentru Notificări

Când cineva răspunde la topic-ul tău:

```sql
CREATE OR REPLACE FUNCTION notify_on_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- Nu notifica autorul pentru propriul post
  IF NEW.user_id != (SELECT user_id FROM forum_topics WHERE id = NEW.topic_id) THEN
    INSERT INTO notifications (user_id, type, title, body, link)
    SELECT 
      t.user_id,
      'reply',
      'Răspuns nou la topic-ul tău',
      LEFT(NEW.content, 100),
      '/forum/topic/' || t.slug
    FROM forum_topics t
    WHERE t.id = NEW.topic_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_post_insert
  AFTER INSERT ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_reply();
```

---

## Limite Supabase Realtime

| Plan | Conexiuni | Mesaje/sec |
|------|-----------|------------|
| Free | 200 | 100 |
| Pro | 500 | 500 |
| Team | 1000+ | Unlimited |

---

## Concluzie

- **1 provider** = 1 conexiune websocket pentru tot site-ul
- Funcționează pe toate paginile (site + forum)
- Badge-ul se actualizează instant
- Trigger SQL creează notificări automat
