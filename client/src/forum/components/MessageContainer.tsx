/**
 * MessageContainer - Componenta principală pentru afișarea postărilor
 * Refactorizat: folosește componente separate pentru claritate și mentenanță
 */

import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '@/lib/supabase';
import MessageSidebar from './message/MessageSidebar';
import MessageActions from './message/MessageActions';
import GearModal from './message/GearModal';
import EditInfo from './message/EditInfo';
import { DeletePostModal, EditPostModal } from './message/MessageModals';
import type { MessagePost } from './message/types';

interface MessageContainerProps {
  post: {
    id: string;
    content: string;
    author: string;
    authorId?: string;
    authorRank: string;
    authorAvatar?: string;
    createdAt: string;
    editedAt?: string;
    editedBy?: string;
    editedByUsername?: string;
    editReason?: string;
    likes: number;
    dislikes: number;
    respect?: number;
  };
  isOriginalPost?: boolean;
  postNumber?: number;
  topicId?: string;
  onRespectChange?: (postId: string, delta: number, comment: string) => void;
  onReply?: (postId: string) => void;
  onQuote?: (postId: string) => void;
  onReputationChange?: () => void;
  onPostDeleted?: () => void;
  onPostEdited?: () => void;
}

export default function MessageContainer({
  post,
  isOriginalPost = false,
  postNumber,
  topicId,
  onRespectChange,
  onReply,
  onQuote,
  onReputationChange,
  onPostDeleted,
  onPostEdited
}: MessageContainerProps) {
  const { theme } = useTheme();
  const { forumUser } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [showGearModal, setShowGearModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userGear, setUserGear] = useState<any[]>([]);
  const [isLoadingGear, setIsLoadingGear] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleGearClick = async () => {
    if (!post.authorId) return;
    
    setShowGearModal(true);
    setIsLoadingGear(true);
    try {
      const { data, error } = await supabase
        .from('user_gear')
        .select('*')
        .eq('user_id', post.authorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading gear:', error);
        setUserGear([]);
      } else {
        setUserGear(data || []);
      }
    } catch (error) {
      console.error('Error loading gear:', error);
      setUserGear([]);
    } finally {
      setIsLoadingGear(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handlePostDeleted = () => {
    setShowDeleteModal(false);
    onPostDeleted?.();
    // Reîncarcă postările
    if (onPostEdited) {
      setTimeout(() => onPostEdited(), 100);
    }
  };

  const handlePostEdited = () => {
    setShowEditModal(false);
    onPostEdited?.();
    // Reîncarcă postările
    if (onPostEdited) {
      setTimeout(() => onPostEdited(), 100);
    }
  };

  // ID-ul pentru anchor trebuie să folosească post_number real (ex: post1, post2)
  const postAnchorId = postNumber ? `post${postNumber}` : `post-${post.id}`;

  // Map post props to MessagePost type
  const messagePost: MessagePost = {
    id: post.id,
    content: post.content,
    author: post.author,
    authorId: post.authorId,
    authorRank: post.authorRank,
    authorAvatar: post.authorAvatar,
    createdAt: post.createdAt,
    editedAt: post.editedAt,
    editedBy: post.editedBy,
    editedByUsername: post.editedByUsername,
    editReason: post.editReason,
    likes: post.likes,
    dislikes: post.dislikes,
    respect: post.respect
  };

  return (
    <>
      <div
        id={postAnchorId}
        style={{
          backgroundColor: theme.surface,
          border: isMobile ? `1px solid ${theme.border}` : `2px solid ${theme.border}`,
          borderRadius: isMobile ? '0.5rem' : '0.75rem',
          marginBottom: isMobile ? '1rem' : '1.5rem',
          overflow: 'hidden',
          boxShadow: isMobile ? '0 1px 3px rgba(0, 0, 0, 0.05)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          position: 'relative'
        }}
      >
        {/* Permalink simplu în colțul dreapta sus - #1, #2, etc. */}
        {postNumber && topicId && (
          <a
            href={`#${postAnchorId}`}
            onClick={(e) => {
              e.preventDefault();
              const element = document.getElementById(postAnchorId);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                window.history.replaceState(null, '', `#${postAnchorId}`);
              }
            }}
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              fontSize: '0.75rem',
              color: theme.textSecondary,
              textDecoration: 'none',
              padding: '0.25rem 0.5rem',
              backgroundColor: theme.background,
              borderRadius: '0.25rem',
              border: `1px solid ${theme.border}`,
              zIndex: 10,
              transition: 'all 0.2s',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme.primary;
              e.currentTarget.style.borderColor = theme.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme.textSecondary;
              e.currentTarget.style.borderColor = theme.border;
            }}
            title={`Post #${postNumber}`}
          >
            #{postNumber}
          </a>
        )}

        {/* Layout: Sidebar + Content - Optimizat pentru mobil */}
        <div style={{ 
          display: 'flex', 
          minHeight: isMobile ? '150px' : '200px', 
          flexDirection: 'row',
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          {/* Sidebar - Mai mic pe mobil, dar păstrat */}
          <MessageSidebar
            post={messagePost}
            isOriginalPost={isOriginalPost}
            isMobile={isMobile}
            onGearClick={handleGearClick}
          />

          {/* Content area - Flex pentru a nu ieși din lățime */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            minWidth: 0, // Important pentru overflow
            maxWidth: '100%'
          }}>
            {/* Message content - Word wrap și overflow control */}
            <div
              style={{
                flex: 1,
                padding: isMobile ? '0.75rem' : '1.5rem',
                fontSize: isMobile ? '0.8125rem' : '0.875rem',
                color: theme.text,
                lineHeight: '1.6',
                position: 'relative',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                maxWidth: '100%',
                overflowX: 'hidden'
              }}
            >
              <div style={{
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                maxWidth: '100%'
              }}>
                {post.content}
              </div>
              
              {/* Edit Info - afișează informații despre editare */}
              {post.editedAt && (
                <EditInfo
                  editedAt={post.editedAt}
                  editedByUsername={post.editedByUsername}
                  editReason={post.editReason}
                />
              )}
            </div>

            {/* Actions */}
            <MessageActions
              postId={post.id}
              authorId={post.authorId}
              onRespectChange={onRespectChange}
              onReply={onReply}
              onQuote={onQuote}
              onDelete={forumUser?.isAdmin ? handleDelete : undefined}
              onEdit={forumUser?.isAdmin ? handleEdit : undefined}
              onReputationChange={onReputationChange}
              isAdmin={forumUser?.isAdmin || false}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showGearModal && (
        <GearModal
          authorName={post.author}
          gear={userGear}
          isLoading={isLoadingGear}
          isMobile={isMobile}
          onClose={() => setShowGearModal(false)}
        />
      )}

      {showDeleteModal && (
        <DeletePostModal
          postId={post.id}
          isAdmin={forumUser?.isAdmin || false}
          onDeleted={handlePostDeleted}
          onClose={() => setShowDeleteModal(false)}
        />
      )}

      {showEditModal && (
        <EditPostModal
          postId={post.id}
          postContent={post.content}
          isAdmin={forumUser?.isAdmin || false}
          onEdited={handlePostEdited}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}