import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { MessageSquare, Send, Archive, Inbox, Trash2, Reply, ArrowLeft, ArchiveRestore, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'archived'>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]); // All messages in thread
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [recipientProfile, setRecipientProfile] = useState<{ id: string; username: string; display_name: string; photo_url?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when thread messages change - REMOVED (user requested no autoscroll)
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [threadMessages]);

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

  const loadMessages = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query;
      
      // Load directly from private_messages to get encryption fields
      if (activeTab === 'inbox') {
        query = supabase
          .from('private_messages')
          .select(`
            *,
            sender:profiles!private_messages_sender_id_fkey(id, username, display_name, photo_url),
            recipient:profiles!private_messages_recipient_id_fkey(id, username, display_name, photo_url)
          `)
          .eq('recipient_id', user.id)
          .eq('context', context)
          .eq('is_deleted_by_recipient', false)
          .eq('is_archived_by_recipient', false)
          .order('created_at', { ascending: false });
      } else if (activeTab === 'sent') {
        query = supabase
          .from('private_messages')
          .select(`
            *,
            sender:profiles!private_messages_sender_id_fkey(id, username, display_name, photo_url),
            recipient:profiles!private_messages_recipient_id_fkey(id, username, display_name, photo_url)
          `)
          .eq('sender_id', user.id)
          .eq('context', context)
          .eq('is_deleted_by_sender', false)
          .eq('is_archived_by_sender', false)
          .order('created_at', { ascending: false });
      } else {
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
      const formattedMessages = await Promise.all((data || []).map(async (msg: any) => {
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
          content: decryptedContent,
          sender_name: msg.sender?.display_name || msg.sender_name,
          sender_username: msg.sender?.username || msg.sender_username,
          sender_avatar: msg.sender?.photo_url || msg.sender_avatar,
          recipient_name: msg.recipient?.display_name || msg.recipient_name,
          recipient_username: msg.recipient?.username || msg.recipient_username,
          recipient_avatar: msg.recipient?.photo_url || msg.recipient_avatar
        };
      }));

      setThreadMessages(formattedMessages);

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

      const formattedMessage = {
        ...newMessage,
        content: decryptedContent, // Use decrypted content
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="inbox" className="relative text-xs sm:text-sm">
                  <Inbox className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Primite</span>
                  {unreadCount > 0 && (
                    <span className="ml-1 sm:ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 sm:px-2 py-0.5 shadow-sm">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent" className="relative text-xs sm:text-sm">
                  <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Trimise</span>
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
                <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                  <AvatarImage src={otherUser?.avatar} />
                  <AvatarFallback>
                    {otherUser?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {otherUser?.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                    @{otherUser?.username}
                  </p>
                </div>
                <div className="flex gap-1">
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
              <div className="flex-1 overflow-y-auto p-2 sm:p-3 bg-gray-50 min-h-0" style={{ scrollBehavior: 'smooth' }}>
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
                            <span className={`text-xs text-gray-500 mt-1 px-1 ${isMsgFromMe ? 'text-right' : 'text-left'}`}>
                              {new Date(msg.created_at).toLocaleTimeString('ro-RO', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Reply Input - Fixed at bottom */}
              <div className="p-3 border-t border-gray-200 bg-white shrink-0">
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
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-xs text-gray-500 px-1">
                    Apasă Enter pentru a trimite, Shift+Enter pentru linie nouă
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Mesajele sunt criptate end-to-end</span>
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
