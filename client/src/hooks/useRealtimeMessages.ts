import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { deriveKeyFromUsers, decryptMessage } from '@/lib/encryption';

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
  onMessageReceived?: () => void; // Callback to reload messages list
} | null = null;

export function setActiveThread(thread: typeof globalActiveThread) {
  globalActiveThread = thread;
}

export function useRealtimeMessages() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages in real-time (both received and sent)
    const channel = supabase
      .channel(`private_messages_global_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `or(recipient_id.eq.${user.id},sender_id.eq.${user.id})`
        },
        async (payload) => {
          // Process message immediately - no filters, no delays
          try {
            // Load full message data including profiles
            const { data: fullMessageData, error: fullMessageError } = await supabase
              .from('private_messages')
              .select(`
                *,
                sender:profiles!private_messages_sender_id_fkey(id, username, display_name, photo_url),
                recipient:profiles!private_messages_recipient_id_fkey(id, username, display_name, photo_url)
              `)
              .eq('id', payload.new.id)
              .single();

            if (fullMessageError || !fullMessageData) {
              return; // Skip if we can't load the message
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
              // Add missing fields for Message interface
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
            // For new messages (thread_root_id = id), check if it matches the active thread
            const messageThreadRootId = formattedMessage.thread_root_id || formattedMessage.id;
            const isInActiveThread = globalActiveThread && (
              messageThreadRootId === globalActiveThread.threadRootId ||
              formattedMessage.id === globalActiveThread.selectedMessageId ||
              formattedMessage.id === globalActiveThread.threadRootId || // For new messages where thread_root_id = id
              (formattedMessage.sender_id === user.id && formattedMessage.recipient_id === (globalActiveThread.senderId === user.id ? globalActiveThread.recipientId : globalActiveThread.senderId)) ||
              (formattedMessage.recipient_id === user.id && formattedMessage.sender_id === (globalActiveThread.senderId === user.id ? globalActiveThread.recipientId : globalActiveThread.senderId))
            );

            // Check if message matches active thread context
            const matchesActiveContext = !globalActiveThread || globalActiveThread.context === formattedMessage.context;

            // Always check if message is for active thread first
            if (isInActiveThread && globalActiveThread?.onNewMessage && matchesActiveContext) {
              // Message is for active thread - send to Messages component immediately
              // This works for both sent and received messages in the active thread
              console.log('Realtime: Message for active thread, calling onNewMessage', formattedMessage.id);
              globalActiveThread.onNewMessage(formattedMessage);
            } else {
              console.log('Realtime: Message not in active thread', {
                isInActiveThread,
                hasCallback: !!globalActiveThread?.onNewMessage,
                matchesContext: matchesActiveContext,
                messageId: formattedMessage.id,
                threadRootId: formattedMessage.thread_root_id,
                activeThreadRootId: globalActiveThread?.threadRootId
              });
              // Not in active thread - show notification
              // Only show for received messages (not sent by current user)
              if (formattedMessage.recipient_id === user.id) {
                toast.success('Mesaj nou primit', { duration: 2000 });
                
                // Trigger reload of messages list if callback exists
                if (globalActiveThread?.onMessageReceived && matchesActiveContext) {
                  globalActiveThread.onMessageReceived();
                }
              } else if (formattedMessage.sender_id === user.id) {
                // Message sent by us but not in active thread - reload list to show it
                if (globalActiveThread?.onMessageReceived && matchesActiveContext) {
                  globalActiveThread.onMessageReceived();
                }
              }
            }
          } catch (error) {
            // Silent fail - don't break the app
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
}

