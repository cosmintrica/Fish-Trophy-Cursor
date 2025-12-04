import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { deriveKeyFromUsers, decryptMessage } from '@/lib/encryption';
import { showMessageNotification } from '@/hooks/useMessageNotification';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  content: string;
  encrypted_content?: string;
  encryption_iv?: string;
  is_encrypted?: boolean;
  context: 'site' | 'forum';
  parent_message_id?: string;
  thread_root_id: string;
  created_at: string;
  is_read: boolean;
  is_archived_by_sender?: boolean;
  is_archived_by_recipient?: boolean;
  read_at?: string | null;
  sender_name?: string;
  sender_username?: string;
  sender_avatar?: string;
  recipient_name?: string;
  recipient_username?: string;
  recipient_avatar?: string;
}

// Global state for active thread (set by Messages component)
let globalActiveThread: {
  threadRootId?: string;
  selectedMessageId?: string;
  senderId?: string;
  recipientId?: string;
  context?: 'site' | 'forum';
  onNewMessage?: (message: Message) => void;
  onMessageReceived?: () => void;
  onMessageRead?: (messageId: string, readAt: string) => void; // Callback for read updates
} | null = null;

export function setActiveThread(thread: typeof globalActiveThread) {
  globalActiveThread = thread;
}

// Global callbacks for unread count updates
type UnreadCountCallback = () => void;
const unreadCountCallbacks = new Set<UnreadCountCallback>();

export function registerUnreadCountCallback(callback: UnreadCountCallback) {
  unreadCountCallbacks.add(callback);
  return () => {
    unreadCountCallbacks.delete(callback);
  };
}

export function notifyUnreadCountChange() {
  unreadCountCallbacks.forEach(cb => cb());
}

export function useRealtimeMessages() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Check if we're on messages page
    const isOnMessagesPage = () => {
      return window.location.pathname.startsWith('/messages');
    };

    // Navigate function that works in async callbacks
    const navigateToMessages = (context: string) => {
      window.location.href = `/messages?context=${context}`;
    };

    const channel = supabase
      .channel(`private_messages_global_${user.id}`)
      // Subscription 1: Mesaje primite (optimizat cu filter)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `recipient_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('[Realtime] 🔔 INSERT event received!', payload.new);
          try {
            const newMessage = payload.new as any;
            console.log('[Realtime] Processing message for recipient:', newMessage.recipient_id);

            // Mesajul este deja filtrat pentru recipient_id, dar verificăm context

            // Load full message data including profiles
            const { data: fullMessageData, error: fullMessageError } = await supabase
              .from('private_messages')
              .select(`
                *,
                sender:profiles!private_messages_sender_id_fkey(id, username, display_name, photo_url),
                recipient:profiles!private_messages_recipient_id_fkey(id, username, display_name, photo_url)
              `)
              .eq('id', newMessage.id)
              .single();

            if (fullMessageError || !fullMessageData) {
              return;
            }

            // Decrypt the new message
            let decryptedContent = fullMessageData.content;
            if (fullMessageData.is_encrypted && fullMessageData.encrypted_content && fullMessageData.encryption_iv) {
              try {
                const key = await deriveKeyFromUsers(fullMessageData.sender_id, fullMessageData.recipient_id);
                decryptedContent = await decryptMessage(fullMessageData.encrypted_content, fullMessageData.encryption_iv, key);
              } catch (decryptError) {
                decryptedContent = '[Eroare la decriptare]';
              }
            }

            const formattedMessage: Message = {
              id: fullMessageData.id,
              sender_id: fullMessageData.sender_id,
              recipient_id: fullMessageData.recipient_id,
              content: decryptedContent || '',
              encrypted_content: fullMessageData.encrypted_content,
              encryption_iv: fullMessageData.encryption_iv,
              is_encrypted: fullMessageData.is_encrypted || false,
              context: fullMessageData.context as 'site' | 'forum',
              thread_root_id: fullMessageData.thread_root_id || fullMessageData.id,
              created_at: fullMessageData.created_at,
              is_read: fullMessageData.is_read || false,
              sender_name: fullMessageData.sender?.display_name || fullMessageData.sender_name,
              recipient_name: fullMessageData.recipient?.display_name || fullMessageData.recipient_name,
              subject: fullMessageData.subject || '',
              parent_message_id: fullMessageData.parent_message_id,
              is_archived_by_sender: fullMessageData.is_archived_by_sender || false,
              is_archived_by_recipient: fullMessageData.is_archived_by_recipient || false,
              read_at: fullMessageData.read_at || null,
              sender_username: fullMessageData.sender?.username || fullMessageData.sender_username,
              sender_avatar: fullMessageData.sender?.photo_url || fullMessageData.sender_avatar,
              recipient_username: fullMessageData.recipient?.username || fullMessageData.recipient_username,
              recipient_avatar: fullMessageData.recipient?.photo_url || fullMessageData.recipient_avatar
            };

            // Check if message is for active thread
            const messageThreadRootId = formattedMessage.thread_root_id || formattedMessage.id;
            const isInActiveThread = globalActiveThread && (
              messageThreadRootId === globalActiveThread.threadRootId ||
              formattedMessage.id === globalActiveThread.selectedMessageId ||
              formattedMessage.id === globalActiveThread.threadRootId ||
              (formattedMessage.sender_id === user.id && formattedMessage.recipient_id === (globalActiveThread.senderId === user.id ? globalActiveThread.recipientId : globalActiveThread.senderId)) ||
              (formattedMessage.recipient_id === user.id && formattedMessage.sender_id === (globalActiveThread.senderId === user.id ? globalActiveThread.recipientId : globalActiveThread.senderId))
            );

            const matchesActiveContext = !globalActiveThread || globalActiveThread.context === formattedMessage.context;

            if (isInActiveThread && globalActiveThread?.onNewMessage && matchesActiveContext) {
              globalActiveThread.onNewMessage(formattedMessage);
            } else {
              // Not in active thread - show notification and update unread count
              if (formattedMessage.recipient_id === user.id) {
                // Only show notification if NOT on messages page
                if (!isOnMessagesPage()) {
                  const senderName = formattedMessage.sender_name || formattedMessage.sender_username || 'Cineva';
                  const messageContext = formattedMessage.context === 'forum' ? 'forum' : 'site';

                  showMessageNotification({
                    id: formattedMessage.id,
                    threadRootId: formattedMessage.thread_root_id || formattedMessage.id,
                    senderName,
                    senderAvatar: formattedMessage.sender_avatar,
                    context: messageContext
                  });
                }

                notifyUnreadCountChange();

                if (globalActiveThread?.onMessageReceived && matchesActiveContext) {
                  globalActiveThread.onMessageReceived();
                }
              } else if (formattedMessage.sender_id === user.id) {
                if (globalActiveThread?.onMessageReceived && matchesActiveContext) {
                  globalActiveThread.onMessageReceived();
                }
              }
            }
          } catch (error) {
            // Silent fail
          }
        }
      )
      // Subscription 2: Mesaje trimise (pentru sync când trimitem noi mesajul)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `sender_id=eq.${user.id}`
        },
        async (payload) => {
          try {
            const newMessage = payload.new as any;

            // Mesaj trimis de noi - doar pentru sync în active thread
            if (!globalActiveThread) return;

            const messageThreadRootId = newMessage.thread_root_id || newMessage.id;
            const isInActiveThread = globalActiveThread && (
              messageThreadRootId === globalActiveThread.threadRootId ||
              newMessage.id === globalActiveThread.selectedMessageId
            );

            if (isInActiveThread && globalActiveThread?.onMessageReceived) {
              globalActiveThread.onMessageReceived();
            }
          } catch (error) {
            console.error('[Realtime] Error processing sent message:', error);
          }
        }
      )
      // Subscription 3: UPDATE events for recipient (unread count)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages',
          filter: `recipient_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('[Realtime] UPDATE event (recipient):', payload.new);
          try {
            const updatedMessage = payload.new as any;
            const oldMessage = payload.old as any;

            // If is_read changed from false to true - update unread count
            if (oldMessage?.is_read === false && updatedMessage.is_read === true) {
              console.log('[Realtime] Message marked as read (recipient view)');
              notifyUnreadCountChange();
            }
          } catch (error) {
            console.error('[Realtime] Error processing recipient UPDATE:', error);
          }
        }
      )
      // Subscription 4: UPDATE events for sender (checkmarks!)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages',
          filter: `sender_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('[Realtime] UPDATE event (sender sees read):', payload.new);
          try {
            const updatedMessage = payload.new as any;
            const oldMessage = payload.old as any;

            // Check if message is in active thread
            const messageThreadRootId = updatedMessage.thread_root_id || updatedMessage.id;
            const isInActiveThread = globalActiveThread && (
              messageThreadRootId === globalActiveThread.threadRootId ||
              updatedMessage.id === globalActiveThread.selectedMessageId ||
              updatedMessage.id === globalActiveThread.threadRootId
            );

            // If is_read changed from false to true - update checkmarks
            if (oldMessage?.is_read === false && updatedMessage.is_read === true) {
              console.log('[Realtime] ✓ Checkmark update for sender!', updatedMessage.id);

              // Update checkmarks in active thread
              if (isInActiveThread && globalActiveThread?.onMessageRead) {
                globalActiveThread.onMessageRead(
                  updatedMessage.id,
                  updatedMessage.read_at || new Date().toISOString()
                );
              }
            }
          } catch (error) {
            console.error('[Realtime] Error processing sender UPDATE:', error);
          }
        }
      )
      .subscribe((status) => {
        // Log-urile au fost eliminate pentru a reduce zgomotul în consolă
        // Status-ul este gestionat automat de Supabase Realtime
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
}

