import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { MessageSquare, Send, Archive, Inbox, Trash2, Reply, ArrowLeft, ArchiveRestore, Lock, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { deriveKeyFromUsers, encryptMessage, decryptMessage } from '@/lib/encryption';

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
  is_read: boolean;
  is_archived_by_sender: boolean;
  is_archived_by_recipient: boolean;
  created_at: string;
  read_at: string | null;
  sender_name?: string;
  sender_username?: string;
  sender_avatar?: string;
  recipient_name?: string;
  recipient_username?: string;
  recipient_avatar?: string;
  reply_count?: number;
}

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const context = (searchParams.get('context') || 'site') as 'site' | 'forum';
  const toUsername = searchParams.get('to'); // New: support ?to=username
  const [activeTab, setActiveTab] = useState<'inbox' | 'archived'>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]); // All messages in thread
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [recipientProfile, setRecipientProfile] = useState<{ id: string; username: string; display_name: string; photo_url?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('messages_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Smart auto-scroll: scroll to bottom of messages container (not the whole page)
  const scrollToBottom = () => {
    if (!messagesContainerRef.current) return;
    
    const container = messagesContainerRef.current;
    // Scroll to bottom of the container
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  };

  // Auto-scroll when thread messages change (only if there are messages)
  useEffect(() => {
    if (threadMessages.length > 0 && selectedMessage) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [threadMessages.length, selectedMessage?.id]);

  // Auto-focus textarea when thread is selected - REMOVED (user requested)
  // useEffect(() => {
  //   if (selectedMessage && textareaRef.current) {
  //     setTimeout(() => textareaRef.current?.focus(), 100);
  //   }
  // }, [selectedMessage]);

  // Handle ?to=username parameter - create new message or find existing thread
  useEffect(() => {
    if (toUsername && user) {
      handleToUsername(toUsername);
    }
  }, [toUsername, user]);

  const handleToUsername = async (username: string) => {
    try {
      if (!username || !username.trim()) {
        toast.error('Username invalid');
        navigate('/messages');
        return;
      }

      // Get recipient profile - use maybeSingle() instead of single() to avoid 400 error
      // Note: profiles table uses photo_url, not avatar_url
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, photo_url')
        .eq('username', username.toLowerCase().trim())
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        toast.error('Eroare la încărcarea profilului: ' + profileError.message);
        navigate('/messages');
        return;
      }

      if (!profile) {
        toast.error('Utilizatorul nu a fost găsit');
        navigate('/messages');
        return;
      }

      setRecipientProfile({
        id: profile.id,
        username: profile.username || username,
        display_name: profile.display_name || username,
        photo_url: profile.photo_url // profiles table uses photo_url
      });

      // Check if there's an existing thread with this user
      const { data: existingThread, error: threadError } = await supabase
        .from('private_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${profile.id}),and(sender_id.eq.${profile.id},recipient_id.eq.${user.id})`)
        .eq('context', context)
        .is('parent_message_id', null) // Only root messages (use is() instead of eq() for null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingThread && !threadError) {
        // Existing thread found - load it
        setSelectedMessage(existingThread as Message);
        loadThread(existingThread.thread_root_id || existingThread.id);
      } else {
        // No existing thread - create a placeholder for new message
        setSelectedMessage({
          id: 'new',
          sender_id: user.id,
          recipient_id: profile.id,
          subject: '',
          content: '',
          context,
          thread_root_id: 'new',
          is_read: false,
          is_archived_by_sender: false,
          is_archived_by_recipient: false,
          created_at: new Date().toISOString(),
          read_at: null,
          sender_name: user.user_metadata?.display_name || user.email,
          sender_username: user.user_metadata?.username,
          recipient_name: profile.display_name,
          recipient_username: profile.username,
          recipient_avatar: profile.photo_url
        } as Message);
        setThreadMessages([]);
      }
    } catch (error: any) {
      console.error('Error handling to username:', error);
      toast.error('Eroare la încărcarea profilului');
    }
  };

  useEffect(() => {
    if (user) {
      loadMessages();
      if (selectedMessage && selectedMessage.id !== 'new') {
        loadThread(selectedMessage.thread_root_id || selectedMessage.id);
      }
    }
  }, [user, activeTab, context]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages in real-time (both received and sent)
    const channel = supabase
      .channel(`private_messages_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `or(recipient_id.eq.${user.id},sender_id.eq.${user.id})`
        },
        async (payload) => {
          // Filter already ensures message is for current user, just check context
          if (payload.new.context !== context) {
            return; // Ignore messages from different context
          }

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
          
          const formattedNewMessage: Message = {
            id: fullMessageData.id,
            sender_id: fullMessageData.sender_id,
            recipient_id: fullMessageData.recipient_id,
            subject: fullMessageData.subject || '',
            content: decryptedContent || '',
            encrypted_content: fullMessageData.encrypted_content,
            encryption_iv: fullMessageData.encryption_iv,
            is_encrypted: fullMessageData.is_encrypted || false,
            context: fullMessageData.context as 'site' | 'forum',
            parent_message_id: fullMessageData.parent_message_id,
            thread_root_id: fullMessageData.thread_root_id || fullMessageData.id,
            is_read: fullMessageData.is_read || false,
            is_archived_by_sender: fullMessageData.is_archived_by_sender || false,
            is_archived_by_recipient: fullMessageData.is_archived_by_recipient || false,
            created_at: fullMessageData.created_at,
            read_at: fullMessageData.read_at || null,
            sender_name: fullMessageData.sender?.display_name || fullMessageData.sender_name,
            sender_username: fullMessageData.sender?.username || fullMessageData.sender_username,
            sender_avatar: fullMessageData.sender?.photo_url || fullMessageData.sender_avatar,
            recipient_name: fullMessageData.recipient?.display_name || fullMessageData.recipient_name,
            recipient_username: fullMessageData.recipient?.username || fullMessageData.recipient_username,
            recipient_avatar: fullMessageData.recipient?.photo_url || fullMessageData.recipient_avatar
          };

          // Check if this message is for the currently open thread
          const isInActiveThread = selectedMessage && (
            formattedNewMessage.thread_root_id === selectedMessage.thread_root_id || 
            formattedNewMessage.thread_root_id === selectedMessage.id ||
            formattedNewMessage.id === selectedMessage.thread_root_id ||
            (formattedNewMessage.sender_id === user.id && formattedNewMessage.recipient_id === (selectedMessage.sender_id === user.id ? selectedMessage.recipient_id : selectedMessage.sender_id)) ||
            (formattedNewMessage.recipient_id === user.id && formattedNewMessage.sender_id === (selectedMessage.sender_id === user.id ? selectedMessage.recipient_id : selectedMessage.sender_id))
          );
          
          // If message is for active thread, add it immediately
          if (isInActiveThread) {
            // Check if message already exists in threadMessages to avoid duplicates
            setThreadMessages(prev => {
              const exists = prev.some(msg => msg.id === formattedNewMessage.id);
              if (exists) {
                return prev;
              }
              return [...prev, formattedNewMessage];
            });
            
            // Auto-scroll to bottom when new message arrives in open thread
            setTimeout(() => {
              scrollToBottom();
            }, 100);
            
            // Only play sound if in active thread (no visual notification)
            if (soundEnabled) {
              playNotificationSound();
            }
          } else {
            // Not in active thread - ALWAYS show notification (sound + toast)
            if (soundEnabled) {
              playNotificationSound();
            }
            toast.success('Mesaj nou primit', { duration: 2000 });
            
            // Reload messages list to update conversation list
            if (activeTab === 'inbox') {
              // Reload messages list inline (can't use loadMessages here as it's defined later)
              const { data, error } = await supabase
                .from('private_messages')
                .select(`
                  *,
                  sender:profiles!private_messages_sender_id_fkey(id, username, display_name, photo_url),
                  recipient:profiles!private_messages_recipient_id_fkey(id, username, display_name, photo_url)
                `)
                .eq('context', context)
                .or(`and(recipient_id.eq.${user.id},is_deleted_by_recipient.eq.false,is_archived_by_recipient.eq.false),and(sender_id.eq.${user.id},is_deleted_by_sender.eq.false,is_archived_by_sender.eq.false)`)
                .order('created_at', { ascending: false });

              if (!error && data) {
                // Decrypt and format messages
                const decryptedMessages: Message[] = await Promise.all((data || []).map(async (msg: any) => {
                  let decryptedContent = msg.content;
                  
                  if (msg.is_encrypted && msg.encrypted_content && msg.encryption_iv) {
                    try {
                      const key = await deriveKeyFromUsers(msg.sender_id, msg.recipient_id);
                      decryptedContent = await decryptMessage(msg.encrypted_content, msg.encryption_iv, key);
                    } catch (decryptError) {
                      decryptedContent = null;
                    }
                  }

                  return {
                    ...msg,
                    content: decryptedContent || '',
                    sender_name: msg.sender?.display_name || msg.sender_name,
                    sender_username: msg.sender?.username || msg.sender_username,
                    sender_avatar: msg.sender?.photo_url || msg.sender_avatar,
                    recipient_name: msg.recipient?.display_name || msg.recipient_name,
                    recipient_username: msg.recipient?.username || msg.recipient_username,
                    recipient_avatar: msg.recipient?.photo_url || msg.recipient_avatar,
                    read_at: msg.read_at || null
                  } as Message;
                }));
                
                // Group by thread
                const threadMap = new Map<string, Message>();
                decryptedMessages.forEach((msg: Message) => {
                  const rootId = msg.thread_root_id || msg.id;
                  if (!threadMap.has(rootId) || new Date(msg.created_at) > new Date(threadMap.get(rootId)!.created_at)) {
                    threadMap.set(rootId, msg);
                  }
                });
                
                setMessages(Array.from(threadMap.values()));
                updateBrowserTabNotification();
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeTab, context, selectedMessage?.id, selectedMessage?.thread_root_id, selectedMessage?.sender_id, selectedMessage?.recipient_id, soundEnabled]);

  const loadMessages = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query;
      
      // Load directly from private_messages to get encryption fields
      if (activeTab === 'inbox') {
        // Inbox: combine both received and sent messages (all conversations)
        query = supabase
          .from('private_messages')
          .select(`
            *,
            sender:profiles!private_messages_sender_id_fkey(id, username, display_name, photo_url),
            recipient:profiles!private_messages_recipient_id_fkey(id, username, display_name, photo_url)
          `)
          .eq('context', context)
          .or(`and(recipient_id.eq.${user.id},is_deleted_by_recipient.eq.false,is_archived_by_recipient.eq.false),and(sender_id.eq.${user.id},is_deleted_by_sender.eq.false,is_archived_by_sender.eq.false)`)
          .order('created_at', { ascending: false });
      } else {
        // Archived: messages archived by user
        query = supabase
          .from('private_messages')
          .select(`
            *,
            sender:profiles!private_messages_sender_id_fkey(id, username, display_name, photo_url),
            recipient:profiles!private_messages_recipient_id_fkey(id, username, display_name, photo_url)
          `)
          .eq('context', context)
          .or(`and(sender_id.eq.${user.id},is_archived_by_sender.eq.true,is_deleted_by_sender.eq.false),and(recipient_id.eq.${user.id},is_archived_by_recipient.eq.true,is_deleted_by_recipient.eq.false)`)
          .order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Decrypt messages if encrypted and format with profile data
      const decryptedMessages = await Promise.all((data || []).map(async (msg: any) => {
        let decryptedContent = msg.content;
        
        // If message is encrypted, decrypt it
        if (msg.is_encrypted && msg.encrypted_content && msg.encryption_iv) {
          try {
            const key = await deriveKeyFromUsers(msg.sender_id, msg.recipient_id);
            decryptedContent = await decryptMessage(msg.encrypted_content, msg.encryption_iv, key);
          } catch (decryptError) {
            // Decryption failed - use placeholder
            decryptedContent = null;
          }
        }

        return {
          ...msg,
          content: decryptedContent,
          sender_name: msg.sender?.display_name || msg.sender_name,
          sender_username: msg.sender?.username || msg.sender_username,
          sender_avatar: msg.sender?.photo_url || msg.sender_avatar,
          recipient_name: msg.recipient?.display_name || msg.recipient_name,
          recipient_username: msg.recipient?.username || msg.recipient_username,
          recipient_avatar: msg.recipient?.photo_url || msg.recipient_avatar
        };
      }));
      
      // Group by thread_root_id to show only one message per thread
      const threadMap = new Map<string, Message>();
      decryptedMessages.forEach((msg: Message) => {
        const rootId = msg.thread_root_id || msg.id;
        if (!threadMap.has(rootId) || new Date(msg.created_at) > new Date(threadMap.get(rootId)!.created_at)) {
          threadMap.set(rootId, msg);
        }
      });
      
      setMessages(Array.from(threadMap.values()).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (error: any) {
      toast.error('Eroare la încărcarea mesajelor');
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (threadRootId: string) => {
    if (!user || !threadRootId) return;

    try {
      const { data, error } = await supabase
        .from('private_messages')
        .select(`
          *,
          sender:profiles!private_messages_sender_id_fkey(id, username, display_name, photo_url),
          recipient:profiles!private_messages_recipient_id_fkey(id, username, display_name, photo_url)
        `)
        .or(`thread_root_id.eq.${threadRootId},id.eq.${threadRootId}`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Decrypt messages if encrypted
      const formattedMessages: Message[] = await Promise.all((data || []).map(async (msg: any) => {
        let decryptedContent = msg.content;
        
        // If message is encrypted, decrypt it
        if (msg.is_encrypted && msg.encrypted_content && msg.encryption_iv) {
          try {
            const key = await deriveKeyFromUsers(msg.sender_id, msg.recipient_id);
            decryptedContent = await decryptMessage(msg.encrypted_content, msg.encryption_iv, key);
          } catch (decryptError) {
            // Decryption failed - show error to user
            decryptedContent = '[Eroare la decriptare]';
          }
        }

        return {
          ...msg,
          content: decryptedContent || '',
          sender_name: msg.sender?.display_name || msg.sender_name,
          sender_username: msg.sender?.username || msg.sender_username,
          sender_avatar: msg.sender?.photo_url || msg.sender_avatar,
          recipient_name: msg.recipient?.display_name || msg.recipient_name,
          recipient_username: msg.recipient?.username || msg.recipient_username,
          recipient_avatar: msg.recipient?.photo_url || msg.recipient_avatar,
          read_at: msg.read_at || null
        } as Message;
      }));

      setThreadMessages(formattedMessages);
      
      // Auto-scroll to bottom when thread is loaded (only if there are messages)
      if (formattedMessages.length > 0) {
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }

      // Mark as read if recipient
      if (formattedMessages.length > 0) {
        const unreadMessages = formattedMessages.filter(
          (m: Message) => !m.is_read && m.recipient_id === user.id
        );
        if (unreadMessages.length > 0) {
          for (const msg of unreadMessages) {
            try {
              const { error } = await supabase.rpc('mark_message_read', { message_uuid: msg.id });
              if (error) {
                // Fallback: update directly if RPC fails
                await supabase
                  .from('private_messages')
                  .update({ is_read: true, read_at: new Date().toISOString() })
                  .eq('id', msg.id)
                  .eq('recipient_id', user.id);
              }
            } catch (err) {
              // Fallback: update directly if RPC fails
              await supabase
                .from('private_messages')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('id', msg.id)
                .eq('recipient_id', user.id);
            }
          }
          loadMessages(); // Refresh list
        }
      }
    } catch (error: any) {
      console.error('Error loading thread:', error);
      toast.error('Eroare la încărcarea conversației');
    }
  };

  const handleSendReply = async () => {
    if (!user || !replyText.trim() || sendingReply) return;
    if (!selectedMessage) {
      toast.error('Selectează o conversație');
      return;
    }

    setSendingReply(true);
    try {
      const isNewMessage = selectedMessage.id === 'new';
      const recipientId = isNewMessage 
        ? (recipientProfile?.id || selectedMessage.recipient_id)
        : (selectedMessage.sender_id === user.id ? selectedMessage.recipient_id : selectedMessage.sender_id);

      if (!recipientId) {
        toast.error('Nu s-a putut determina destinatarul');
        return;
      }

      // Encrypt message content
      let encryptedContent: string | null = null;
      let encryptionIv: string | null = null;
      let plainContent: string | null = null;
      
      try {
        const key = await deriveKeyFromUsers(user.id, recipientId);
        const encrypted = await encryptMessage(replyText.trim(), key);
        encryptedContent = encrypted.encrypted;
        encryptionIv = encrypted.iv;
      } catch (encryptError) {
        toast.error('Eroare la criptarea mesajului. Încearcă din nou.');
        setSendingReply(false);
        return;
      }

      const messageData: any = {
        sender_id: user.id,
        recipient_id: recipientId,
        subject: isNewMessage ? `Mesaj de la ${user.user_metadata?.display_name || user.user_metadata?.username || 'Utilizator'}` : selectedMessage.subject,
        encrypted_content: encryptedContent,
        encryption_iv: encryptionIv,
        is_encrypted: true,
        // Keep content empty for encrypted messages (NULL is allowed when is_encrypted = true)
        content: null, // Encrypted messages don't store plain text
        context
      };

      if (!isNewMessage) {
        // Reply to existing message
        messageData.parent_message_id = selectedMessage.id;
        messageData.thread_root_id = selectedMessage.thread_root_id || selectedMessage.id;
      }

      const { data: newMessage, error } = await supabase
        .from('private_messages')
        .insert(messageData)
        .select(`
          *,
          sender:profiles!private_messages_sender_id_fkey(id, username, display_name, photo_url),
          recipient:profiles!private_messages_recipient_id_fkey(id, username, display_name, photo_url)
        `)
        .single();

      if (error) {
        // Log error without exposing sensitive data
        throw error;
      }


      // Decrypt the new message if encrypted
      let decryptedContent = newMessage.content;
      if (newMessage.is_encrypted && newMessage.encrypted_content && newMessage.encryption_iv) {
        try {
          const key = await deriveKeyFromUsers(newMessage.sender_id, newMessage.recipient_id);
          decryptedContent = await decryptMessage(newMessage.encrypted_content, newMessage.encryption_iv, key);
        } catch (decryptError) {
          // Decryption failed - show error to user
          decryptedContent = '[Eroare la decriptare]';
        }
      }

      const formattedMessage: Message = {
        id: newMessage.id,
        sender_id: newMessage.sender_id,
        recipient_id: newMessage.recipient_id,
        subject: newMessage.subject || '',
        content: decryptedContent || '', // Use decrypted content
        encrypted_content: newMessage.encrypted_content,
        encryption_iv: newMessage.encryption_iv,
        is_encrypted: newMessage.is_encrypted || false,
        context: newMessage.context as 'site' | 'forum',
        parent_message_id: newMessage.parent_message_id,
        thread_root_id: newMessage.thread_root_id || newMessage.id,
        is_read: newMessage.is_read || false,
        is_archived_by_sender: newMessage.is_archived_by_sender || false,
        is_archived_by_recipient: newMessage.is_archived_by_recipient || false,
        created_at: newMessage.created_at,
        read_at: newMessage.read_at || null,
        sender_name: newMessage.sender?.display_name || user.user_metadata?.display_name || user.email,
        sender_username: newMessage.sender?.username || user.user_metadata?.username,
        sender_avatar: newMessage.sender?.photo_url,
        recipient_name: newMessage.recipient?.display_name,
        recipient_username: newMessage.recipient?.username,
        recipient_avatar: newMessage.recipient?.photo_url
      };

      // Update thread immediately with decrypted message
      if (isNewMessage) {
        setSelectedMessage(formattedMessage);
        setThreadMessages([formattedMessage]);
      } else {
        setThreadMessages([...threadMessages, formattedMessage]);
        // Auto-scroll to bottom after sending
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }

      setReplyText('');
      loadMessages(); // Refresh list
      toast.success('Mesaj trimis!');
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast.error('Eroare la trimiterea mesajului: ' + (error.message || 'Necunoscută'));
    } finally {
      setSendingReply(false);
    }
  };

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    loadThread(message.thread_root_id || message.id);
    // Clear to parameter
    if (toUsername) {
      navigate('/messages?context=' + context);
    }
  };

  const handleArchive = async (messageId: string, isSender: boolean) => {
    try {
      const updateField = isSender ? 'is_archived_by_sender' : 'is_archived_by_recipient';
      const { error } = await supabase
        .from('private_messages')
        .update({ [updateField]: true })
        .eq('id', messageId);

      if (error) throw error;
      toast.success('Mesaj arhivat');
      loadMessages();
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
        setThreadMessages([]);
      }
    } catch (error) {
      console.error('Error archiving message:', error);
      toast.error('Eroare la arhivare');
    }
  };

  const handleUnarchive = async (messageId: string, isSender: boolean) => {
    try {
      const updateField = isSender ? 'is_archived_by_sender' : 'is_archived_by_recipient';
      const { error } = await supabase
        .from('private_messages')
        .update({ [updateField]: false })
        .eq('id', messageId);

      if (error) throw error;
      toast.success('Mesaj scos din arhivă');
      loadMessages();
      // Reload thread to update archive status
      if (selectedMessage) {
        loadThread(selectedMessage.thread_root_id || selectedMessage.id);
      }
    } catch (error) {
      console.error('Error unarchiving message:', error);
      toast.error('Eroare la scoaterea din arhivă');
    }
  };

  const handleDelete = async (messageId: string, isSender: boolean) => {
    try {
      const updateField = isSender ? 'is_deleted_by_sender' : 'is_deleted_by_recipient';
      const { error } = await supabase
        .from('private_messages')
        .update({ [updateField]: true })
        .eq('id', messageId);

      if (error) throw error;
      toast.success('Mesaj șters');
      loadMessages();
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
        setThreadMessages([]);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Eroare la ștergere');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Trebuie să fii autentificat</h1>
          <p className="text-gray-600">Conectează-te pentru a-ți vedea mesajele</p>
        </div>
      </div>
    );
  }

  // Play notification sound (simple ping)
  const playNotificationSound = () => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Higher pitch for notification
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // Silent fail if audio is not supported
    }
  };

  // Update browser tab notification badge
  const updateBrowserTabNotification = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('private_messages')
        .select('id', { count: 'exact', head: false })
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .eq('is_deleted_by_recipient', false)
        .eq('is_archived_by_recipient', false)
        .eq('context', context);

      if (!error) {
        const unreadCount = data?.length || 0;
        
        // Update document title
        if (unreadCount > 0) {
          document.title = `(${unreadCount > 99 ? '99+' : unreadCount}) Mesaje - Fish Trophy`;
        } else {
          document.title = 'Mesaje - Fish Trophy';
        }
      }
    } catch (error) {
      // Silent fail
    }
  };

  // Calculate unread count only for inbox messages
  const unreadCount = activeTab === 'inbox' 
    ? messages.filter(m => !m.is_read && m.recipient_id === user.id).length
    : 0;
  const isSender = (msg: Message) => msg.sender_id === user.id;
  const otherUser = selectedMessage 
    ? (isSender(selectedMessage) 
        ? { name: selectedMessage.recipient_name, username: selectedMessage.recipient_username, avatar: selectedMessage.recipient_avatar }
        : { name: selectedMessage.sender_name, username: selectedMessage.sender_username, avatar: selectedMessage.sender_avatar })
    : recipientProfile
    ? { name: recipientProfile.display_name, username: recipientProfile.username, avatar: recipientProfile.photo_url }
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-4 lg:px-6 xl:px-8 py-6">
        {/* Messages List - Mobile: hidden when thread selected, Desktop: always visible */}
        <div className={`${selectedMessage ? 'hidden lg:flex' : 'flex'} lg:w-1/3 border-r border-gray-200 bg-white rounded-lg shadow-sm flex-col min-h-[600px] max-h-[calc(100vh-8rem)]`}>
          <div className="p-4 border-b border-gray-200 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Mesaje</h1>
              <div className="flex gap-2">
                <Button
                  variant={context === 'site' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => navigate('/messages?context=site' + (toUsername ? `&to=${toUsername}` : ''))}
                >
                  Site
                </Button>
                <Button
                  variant={context === 'forum' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => navigate('/messages?context=forum' + (toUsername ? `&to=${toUsername}` : ''))}
                >
                  Forum
                </Button>
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="inbox" className="relative text-xs sm:text-sm">
                  <Inbox className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Mesaje</span>
                  {unreadCount > 0 && (
                    <span className="ml-1 sm:ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 sm:px-2 py-0.5 shadow-sm">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="archived" className="relative text-xs sm:text-sm">
                  <Archive className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Arhivate</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Se încarcă...</div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nu există mesaje
              </div>
            ) : (
              <>
              <div className="divide-y flex-1">
                {messages.map((message) => {
                  const isMsgSender = isSender(message);
                  const otherUserInList = isMsgSender 
                    ? { name: message.recipient_name, avatar: message.recipient_avatar }
                    : { name: message.sender_name, avatar: message.sender_avatar };
                  
                  return (
                    <div
                      key={message.thread_root_id || message.id}
                      onClick={() => handleMessageClick(message)}
                      className={`p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedMessage?.thread_root_id === (message.thread_root_id || message.id) 
                          ? 'bg-blue-50 border-l-4 border-blue-600' 
                          : ''
                      } ${!message.is_read && message.recipient_id === user.id ? 'font-semibold' : ''}`}
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                          <AvatarImage src={otherUserInList.avatar} />
                          <AvatarFallback>
                            {otherUserInList.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {otherUserInList.name || 'Utilizator'}
                            </p>
                            {!message.is_read && message.recipient_id === user.id && (
                              <span className="w-2.5 h-2.5 bg-red-500 rounded-full shrink-0 ml-2"></span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 truncate mt-0.5">
                            {message.content ? message.content.substring(0, 60).trim() : message.subject || '(Fără mesaj)'}
                            {message.content && message.content.length > 60 ? '...' : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(message.created_at).toLocaleDateString('ro-RO', { 
                              day: 'numeric', 
                              month: 'short',
                              ...(new Date(message.created_at).getFullYear() !== new Date().getFullYear() && { year: 'numeric' })
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
        </div>

        {/* Thread View - Instagram/WhatsApp Style */}
        <div className={`${selectedMessage ? 'flex' : 'hidden lg:flex'} flex-1 flex flex-col bg-white rounded-lg shadow-sm min-h-[600px] max-h-[calc(100vh-8rem)] ml-0 lg:ml-4`}>
          {selectedMessage ? (
            <>
              {/* Header */}
              <div className="p-2 sm:p-3 border-b border-gray-200 bg-white shrink-0 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => {
                    setSelectedMessage(null);
                    setThreadMessages([]);
                    navigate('/messages?context=' + context);
                  }}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Link
                  to={otherUser?.username ? `/profile/${otherUser.username}` : '#'}
                  className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0"
                >
                  <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                    <AvatarImage src={otherUser?.avatar} />
                    <AvatarFallback>
                      {otherUser?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors">
                      {otherUser?.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      @{otherUser?.username}
                    </p>
                  </div>
                </Link>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSoundEnabled(!soundEnabled);
                      localStorage.setItem('messages_sound_enabled', (!soundEnabled).toString());
                    }}
                    title={soundEnabled ? 'Dezactivează sunetul' : 'Activează sunetul'}
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </Button>
                  {activeTab === 'archived' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleUnarchive(selectedMessage.id, isSender(selectedMessage))}
                      title="Scoate din arhivă"
                    >
                      <ArchiveRestore className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleArchive(selectedMessage.id, isSender(selectedMessage))}
                      title="Arhivează"
                    >
                      <Archive className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(selectedMessage.id, isSender(selectedMessage))}
                    title="Șterge"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </div>
              </div>

              {/* Messages Container - Scrollable */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-2 sm:p-3 pb-2 sm:pb-3 bg-gray-50 min-h-0" 
                style={{ scrollBehavior: 'smooth' }}
              >
                <div className="space-y-2 sm:space-y-3 max-w-3xl mx-auto">
                  {threadMessages.map((msg) => {
                    const isMsgFromMe = msg.sender_id === user.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMsgFromMe ? 'justify-end' : 'justify-start'} animate-in fade-in-0 slide-in-from-bottom-2 duration-200`}
                      >
                        <div className={`flex gap-2 sm:gap-3 max-w-[85%] sm:max-w-[75%] ${isMsgFromMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Avatar - only show for received messages */}
                          {!isMsgFromMe && (
                            <Avatar className="w-8 h-8 shrink-0">
                              <AvatarImage src={msg.sender_avatar} />
                              <AvatarFallback>
                                {msg.sender_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          {/* Message Bubble */}
                          <div className={`flex flex-col ${isMsgFromMe ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm ${
                                isMsgFromMe
                                  ? 'bg-blue-600 text-white rounded-br-sm'
                                  : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                              }`}
                            >
                              <p className={`text-sm sm:text-base whitespace-pre-wrap break-words ${isMsgFromMe ? 'text-white' : 'text-gray-900'}`}>
                                {msg.content}
                              </p>
                            </div>
                            <div className={`flex items-center gap-1 mt-1 px-1 ${isMsgFromMe ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-xs text-gray-500">
                                {new Date(msg.created_at).toLocaleTimeString('ro-RO', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                              {/* WhatsApp-style read indicators (only for sent messages) */}
                              {isMsgFromMe && (
                                <div 
                                  className="flex items-center cursor-help"
                                  title={
                                    msg.is_read && msg.read_at
                                      ? `Citit: ${new Date(msg.read_at).toLocaleString('ro-RO', { 
                                          day: 'numeric', 
                                          month: 'short', 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        })}`
                                      : 'Livrat (necitit)'
                                  }
                                >
                                  {msg.is_read && msg.read_at ? (
                                    // Two blue checkmarks for read (side by side, second slightly to the right like WhatsApp)
                                    <div className="flex items-center relative" style={{ width: '18px', height: '16px' }}>
                                      <svg className="w-4 h-4 text-blue-500 absolute left-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <svg className="w-4 h-4 text-blue-500 absolute" style={{ left: '5px' }} fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  ) : (
                                    // Single gray checkmark for delivered
                                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Reply Input - Fixed at bottom */}
              <div className="p-2 sm:p-3 border-t border-gray-200 bg-white shrink-0 pb-2 sm:pb-3">
                <div className="flex gap-2 items-end">
                  <Textarea
                    ref={textareaRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder="Scrie un mesaj..."
                    className="flex-1 min-h-[40px] max-h-24 resize-none text-sm sm:text-base py-2 px-3"
                    rows={1}
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || sendingReply}
                    size="icon"
                    className="shrink-0 h-10 w-10 bg-blue-600 hover:bg-blue-700"
                  >
                    {sendingReply ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-1 sm:mt-1.5 pb-2 sm:pb-0">
                  <p className="text-xs text-gray-500 px-1 hidden sm:block">
                    Apasă Enter pentru a trimite, Shift+Enter pentru linie nouă
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-auto">
                    <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="hidden sm:inline">Mesajele sunt criptate end-to-end</span>
                    <span className="sm:hidden">Criptate</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 min-h-0">
              <div className="text-center text-gray-500">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">Selectează un mesaj pentru a-l citi</p>
                <p className="text-sm mt-2">Sau trimite un mesaj nou de pe profilul unui utilizator</p>
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 max-w-md mx-auto">
                  <div className="flex items-center justify-center gap-3 text-xs text-gray-600">
                    <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="text-center flex-1">
                      <div>Mesajele sunt criptate end-to-end.</div>
                      <div>Nimeni nu le poate citi, nici măcar administratorii.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
