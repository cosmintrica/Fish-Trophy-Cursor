import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { X, Heart, MessageCircle, Send, Calendar, MapPin, Scale, Ruler, Fish, Hash, Edit, Trash2, Reply, MoreVertical, ExternalLink, AlertCircle, Video, User, Play, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase, getR2ImageUrlProxy } from '@/lib/supabase';
import { toast } from 'sonner';
import ShareButton from '@/components/ShareButton';
import ImageZoom from '@/forum/components/ImageZoom';
import { useStructuredData } from '@/hooks/useStructuredData';
import { createSlug } from '@/utils/slug';
import { ReportModal } from '@/components/ReportModal';
import { AuthRequiredModal } from '@/components/AuthRequiredModal';
import AuthModal from '@/components/AuthModal';

// Helper function for relative time
const getRelativeTime = (date: string): string => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 1) return 'acum';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 30) return `${diffDays}z`;
  if (diffMonths < 12) return `${diffMonths}m`;
  return `${diffYears}y`;
};

interface Catch {
  id: string;
  user_id: string;
  species_id: string | null;
  location_id: string | null;
  weight: number | null;
  length_cm: number | null;
  captured_at: string;
  notes: string | null;
  photo_url: string | null;
  video_url: string | null;
  is_public: boolean;
  global_id: number | null;
  like_count: number;
  comment_count: number;
  is_liked_by_current_user: boolean;
  fish_species?: {
    id: string;
    name: string;
    scientific_name?: string;
  };
  fishing_locations?: {
    id: string;
    name: string;
    type: string;
    county: string;
  };
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  parent_comment_id?: string | null;
  reply_count?: number;
  user_display_name?: string;
  user_username?: string;
  user_avatar_url?: string;
  replies?: Comment[];
}

interface CatchDetailModalProps {
  catchItem: Catch | null;
  isOpen: boolean;
  onClose: () => void;
  onCatchUpdated?: () => void;
  isOwner?: boolean;
  onEdit?: () => void;
  username?: string; // Username for share URL
  onAuthRequired?: () => void; // Callback when auth is required (for unauthenticated users)
}

export const CatchDetailModal: React.FC<CatchDetailModalProps> = ({
  catchItem,
  isOpen,
  onClose,
  onCatchUpdated,
  isOwner = false,
  onEdit,
  username,
  onAuthRequired
}) => {
  const { user } = useAuth();
  const { createVideoObjectData } = useStructuredData();
  const [catchData, setCatchData] = useState<Catch | null>(catchItem);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [likeAnimation, setLikeAnimation] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState<{ [key: string]: string }>({});
  const [deletingComment, setDeletingComment] = useState<string | null>(null);
  const [deleteCommentModalOpen, setDeleteCommentModalOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<{ id: string, isOwnerDelete: boolean } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Zoom state
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Report state
  const [showReportInput, setShowReportInput] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isAuthRequiredModalOpen, setIsAuthRequiredModalOpen] = useState(false);
  const reportButtonRef = useRef<HTMLButtonElement>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobil
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculează poziția popup-ului când se deschide - jos, magnetic legat de buton
  useEffect(() => {
    if (showReportInput && reportButtonRef.current) {
      const rect = reportButtonRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + 8, // 8px sub buton
        left: rect.left
      });
    } else {
      setPopupPosition(null);
    }
  }, [showReportInput, isMobile]);

  // Închide popup-ul când se dă click în afara lui
  useEffect(() => {
    if (!showReportInput) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        reportButtonRef.current &&
        !reportButtonRef.current.contains(target) &&
        !target.closest(`[id^="report-popup-catch-"]`)
      ) {
        setShowReportInput(false);
        setReportReason('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showReportInput]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Video Player Component
  const VideoPlayer = ({ url, poster }: { url: string, poster?: string }) => {
    const [isPlaying, setIsPlaying] = useState(false);

    // Helper to extract YouTube ID
    const extractYouTubeId = (url: string): string | null => {
      if (!url) return null;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    };

    const youtubeId = extractYouTubeId(url);

    if (!isPlaying) {
      return (
        <div
          className="w-full h-full relative cursor-pointer group bg-black"
          onClick={() => setIsPlaying(true)}
        >
          {poster ? (
            <img src={poster} className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" alt="Video thumbnail" />
          ) : (
            <div className="w-full h-full bg-slate-900 flex items-center justify-center">
              {youtubeId ? (
                <img
                  src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                  className="w-full h-full object-cover opacity-80"
                  alt="YouTube thumbnail"
                />
              ) : (
                <Video className="w-12 h-12 text-slate-700" />
              )}
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40 group-hover:scale-110 transition-transform shadow-lg">
              <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white ml-1 fill-white" />
            </div>
          </div>
          {youtubeId && (
            <div className="absolute bottom-4 right-4 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
              YouTube
            </div>
          )}
        </div>
      );
    }

    if (youtubeId) {
      return (
        <div className="w-full h-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube Video"
          />
        </div>
      );
    }

    return (
      <video
        src={url}
        controls
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />
    );
  };

  // Define functions before useEffect to avoid hoisting issues
  const loadCatchStats = useCallback(async () => {
    if (!catchItem) return;

    try {
      // Single optimized query for both likes and comment count (including replies)
      const [likesResult, commentsResult] = await Promise.all([
        supabase
          .from('catch_likes')
          .select('user_id')
          .eq('catch_id', catchItem.id),
        supabase
          .from('catch_comments')
          .select('id', { count: 'exact', head: true })
          .eq('catch_id', catchItem.id)
      ]);

      const likes = likesResult.data || [];
      const commentCount = commentsResult.count || 0; // Total comments including ALL replies
      const isLiked = user ? likes.some(l => l.user_id === user.id) : false;

      setCatchData(prev => prev ? {
        ...prev,
        like_count: likes.length,
        comment_count: commentCount, // This includes all comments + replies
        is_liked_by_current_user: isLiked
      } : null);
    } catch (error) {
      console.error('Error loading catch stats:', error);
    }
  }, [catchItem?.id, user?.id]);

  const loadComments = useCallback(async () => {
    if (!catchItem) return;

    try {
      // Load all comments (including replies)
      const { data, error } = await supabase
        .from('catch_comments')
        .select(`
          *,
          profiles:user_id (
            display_name,
            username,
            photo_url
          )
        `)
        .eq('catch_id', catchItem.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Organize comments into tree structure
      const allComments: Comment[] = (data || []).map((comment: any) => ({
        id: comment.id,
        user_id: comment.user_id,
        content: comment.content,
        is_edited: comment.is_edited,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        parent_comment_id: comment.parent_comment_id,
        user_display_name: comment.profiles?.display_name,
        user_username: comment.profiles?.username,
        user_avatar_url: comment.profiles?.photo_url,
        replies: []
      }));

      // Calculate reply_count and organize into tree
      const commentsMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      // First pass: create map and calculate reply_count
      allComments.forEach(comment => {
        commentsMap.set(comment.id, comment);
        comment.reply_count = allComments.filter(c => c.parent_comment_id === comment.id).length;
      });

      // Second pass: organize into tree
      allComments.forEach(comment => {
        if (!comment.parent_comment_id) {
          rootComments.push(comment);
        } else {
          const parent = commentsMap.get(comment.parent_comment_id);
          if (parent) {
            if (!parent.replies) parent.replies = [];
            parent.replies.push(comment);
          }
        }
      });

      // Sort root comments by date (newest first) and replies by date (oldest first)
      rootComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      rootComments.forEach(comment => {
        if (comment.replies) {
          comment.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
      });

      setComments(rootComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Eroare la încărcarea comentariilor');
    }
  }, [catchItem?.id]);

  // Use existing data from catchItem if available, only fetch if missing
  useEffect(() => {
    if (catchItem && isOpen) {
      setCatchData(catchItem);
      // Only load stats if we don't have them already
      if (catchItem.like_count === undefined && catchItem.comment_count === undefined) {
        loadCatchStats();
      }
      // Always load comments when modal opens
      loadComments();
      // Reset showCommentForm when modal opens
      setShowCommentForm(false);
    }
  }, [catchItem?.id, isOpen, loadCatchStats, loadComments]); // Only depend on catch ID, not entire object

  // Real-time subscription for likes
  useEffect(() => {
    if (!catchItem?.id || !isOpen) return;

    const likesChannel = supabase
      .channel(`catch-likes-${catchItem.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'catch_likes',
          filter: `catch_id=eq.${catchItem.id}`
        },
        async () => {
          // Reload stats when likes change
          await loadCatchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
    };
  }, [catchItem?.id, isOpen, loadCatchStats]);

  // Real-time subscription for comments
  useEffect(() => {
    if (!catchItem?.id || !isOpen) return;

    const commentsChannel = supabase
      .channel(`catch-comments-${catchItem.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'catch_comments',
          filter: `catch_id=eq.${catchItem.id}`
        },
        async () => {
          // Reload comments when they change
          await loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [catchItem?.id, isOpen, loadComments]);

  const handleLike = useCallback(async () => {
    if (!catchData) return;

    // If user is not authenticated, show auth modal
    if (!user) {
      onAuthRequired?.();
      return;
    }

    // Optimistic update - update UI immediately
    const wasLiked = catchData.is_liked_by_current_user;
    setCatchData(prev => prev ? {
      ...prev,
      is_liked_by_current_user: !wasLiked,
      like_count: wasLiked ? (prev.like_count || 0) - 1 : (prev.like_count || 0) + 1
    } : null);

    // Trigger animation
    setLikeAnimation(true);
    setTimeout(() => setLikeAnimation(false), 200);

    setIsLiking(true);
    try {
      if (wasLiked) {
        // Unlike
        const { error } = await supabase
          .from('catch_likes')
          .delete()
          .eq('catch_id', catchData.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('catch_likes')
          .insert({
            catch_id: catchData.id,
            user_id: user.id
          });

        if (error) throw error;
      }

      // Only call onCatchUpdated if provided, but don't refresh the page
      // The parent component can update its local state if needed
      onCatchUpdated?.();
    } catch (error: any) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      setCatchData(prev => prev ? {
        ...prev,
        is_liked_by_current_user: wasLiked,
        like_count: wasLiked ? (prev.like_count || 0) + 1 : (prev.like_count || 0) - 1
      } : null);
      toast.error('Eroare la actualizarea like-ului');
    } finally {
      setIsLiking(false);
    }
  }, [catchData, user, onCatchUpdated]);

  const handleSubmitComment = useCallback(async () => {
    if (!catchData || !user || !newComment.trim()) return;

    // Check if current user is the owner of this catch
    const isCatchOwner = user.id === catchData.user_id;
    if (isCatchOwner) {
      toast.info('Nu poți comenta pe propriile capturi');
      return;
    }

    const commentText = newComment.trim();
    setNewComment(''); // Clear immediately for better UX
    setIsSubmittingComment(true);

    try {
      const { data, error } = await supabase
        .from('catch_comments')
        .insert({
          catch_id: catchData.id,
          user_id: user.id,
          content: commentText
        })
        .select(`
          *,
          profiles:user_id (
            display_name,
            username,
            photo_url
          )
        `)
        .single();

      if (error) throw error;

      // Optimistically add comment to list
      if (data) {
        const newCommentObj: Comment = {
          id: data.id,
          user_id: data.user_id,
          content: data.content,
          is_edited: data.is_edited || false,
          created_at: data.created_at,
          updated_at: data.updated_at,
          user_display_name: (data.profiles as any)?.display_name,
          user_username: (data.profiles as any)?.username,
          user_avatar_url: (data.profiles as any)?.photo_url
        };

        setComments(prev => [newCommentObj, ...prev]);
        setCatchData(prev => prev ? {
          ...prev,
          comment_count: (prev.comment_count || 0) + 1
        } : null);
      }

      // Refresh comments to ensure consistency (but don't reload page)
      await loadComments();
      onCatchUpdated?.();
      toast.success('Comentariu adăugat');
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      setNewComment(commentText); // Restore comment on error
      toast.error('Eroare la adăugarea comentariului');
    } finally {
      setIsSubmittingComment(false);
    }
  }, [catchData, user, newComment, loadComments, onCatchUpdated]);

  const handleSubmitReply = useCallback(async (parentCommentId: string) => {
    if (!catchData || !user || !replyText[parentCommentId]?.trim()) return;

    const replyContent = replyText[parentCommentId].trim();
    const currentReplies = { ...replyText };
    delete currentReplies[parentCommentId];
    setReplyText(currentReplies);
    setReplyingTo(null);

    try {
      const { error } = await supabase
        .from('catch_comments')
        .insert({
          catch_id: catchData.id,
          user_id: user.id,
          parent_comment_id: parentCommentId,
          content: replyContent
        });

      if (error) throw error;

      await loadComments();
      // Real-time subscription will update the count, but we update optimistically
      setCatchData(prev => prev ? {
        ...prev,
        comment_count: (prev.comment_count || 0) + 1
      } : null);
      // Also reload stats to get accurate count
      await loadCatchStats();
      onCatchUpdated?.();
      toast.success('Răspuns adăugat');
    } catch (error: any) {
      console.error('Error submitting reply:', error);
      setReplyText({ ...currentReplies, [parentCommentId]: replyContent });
      toast.error('Eroare la adăugarea răspunsului');
    }
  }, [catchData, user, replyText, loadComments, loadCatchStats, onCatchUpdated]);

  const handleEditComment = useCallback(async (commentId: string) => {
    if (!editText[commentId]?.trim()) return;

    const newContent = editText[commentId].trim();
    setEditingComment(null);
    const currentEdit = { ...editText };
    delete currentEdit[commentId];
    setEditText(currentEdit);

    try {
      const { error } = await supabase
        .from('catch_comments')
        .update({
          content: newContent,
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', user?.id);

      if (error) throw error;

      await loadComments();
      // Reload stats to ensure consistency
      await loadCatchStats();
      toast.success('Comentariu actualizat');
    } catch (error: any) {
      console.error('Error editing comment:', error);
      setEditText({ ...currentEdit, [commentId]: newContent });
      toast.error('Eroare la actualizarea comentariului');
    }
  }, [user, editText, loadComments, loadCatchStats]);

  const handleDeleteComment = useCallback((commentId: string) => {
    setCommentToDelete({ id: commentId, isOwnerDelete: false });
    setDeleteCommentModalOpen(true);
    setDeleteReason('');
  }, []);

  const handleDeleteCommentAsOwner = useCallback((commentId: string) => {
    setCommentToDelete({ id: commentId, isOwnerDelete: true });
    setDeleteCommentModalOpen(true);
    setDeleteReason('');
  }, []);

  const confirmDeleteComment = useCallback(async () => {
    if (!commentToDelete) return;

    // For owner deletes, reason is mandatory (minim 3 caractere)
    if (commentToDelete.isOwnerDelete && (!deleteReason || deleteReason.trim().length < 3)) {
      toast.error('Motivul este obligatoriu (minim 3 caractere)');
      return;
    }

    setDeletingComment(commentToDelete.id);
    try {
      const deleteQuery = supabase
        .from('catch_comments')
        .delete()
        .eq('id', commentToDelete.id);

      // If not owner delete, also check user_id
      if (!commentToDelete.isOwnerDelete) {
        deleteQuery.eq('user_id', user?.id);
      }

      const { error } = await deleteQuery;
      if (error) throw error;

      await loadComments();
      setCatchData(prev => prev ? {
        ...prev,
        comment_count: Math.max((prev.comment_count || 0) - 1, 0)
      } : null);
      await loadCatchStats();
      onCatchUpdated?.();
      toast.success('Comentariu șters');
      setDeleteCommentModalOpen(false);
      setCommentToDelete(null);
      setDeleteReason('');
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast.error('Eroare la ștergerea comentariului');
    } finally {
      setDeletingComment(null);
    }
  }, [commentToDelete, deleteReason, user, loadComments, loadCatchStats, onCatchUpdated]);

  // Memoize expensive computations
  // Use isOwner prop if provided, otherwise calculate from user and catchData
  // Always recalculate to ensure it's up to date when user changes
  const isCatchOwner = useMemo(() => {
    // Always calculate from user and catchData to ensure it's current
    if (user && catchData) {
      return user.id === catchData.user_id;
    }
    // Fallback to prop if user is not available
    return isOwner || false;
  }, [user?.id, catchData?.user_id, isOwner]);

  const formattedDate = useMemo(() => {
    if (!catchData?.captured_at) return '';
    return new Date(catchData.captured_at).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [catchData?.captured_at]);

  if (!isOpen || !catchData) return null;

  // SEO Meta Tags for Catch
  const catchTitle = `Captură ${catchData.fish_species?.name || 'Pescuit'} - ${catchData.weight || 'N/A'}kg - Fish Trophy`;
  const catchDescription = `Captură de pescuit: ${catchData.fish_species?.name || 'Specie necunoscută'}${catchData.weight ? ` de ${catchData.weight}kg` : ''}${catchData.length_cm ? `, ${catchData.length_cm}cm` : ''}, capturat la ${catchData.fishing_locations?.name || 'locație necunoscută'}${catchData.fishing_locations?.county ? `, ${catchData.fishing_locations.county}` : ''}${username ? ` de ${username}` : ''}. ${catchData.notes ? `${catchData.notes.substring(0, 100)}${catchData.notes.length > 100 ? '...' : ''}` : ''}`;
  // Use username if available, otherwise fallback to user_id
  const profileIdentifier = username || catchData.user_id;
  const catchUrl = `https://fishtrophy.ro/profile/${profileIdentifier}${catchData.global_id ? `#catch-${catchData.global_id}` : `?catch=${catchData.id}`}`;
  const catchImage = catchData.photo_url ? getR2ImageUrlProxy(catchData.photo_url) : 'https://fishtrophy.ro/social-media-banner-v2.jpg';

  // Video structured data (if video exists)
  const videoStructuredData = catchData.video_url ? createVideoObjectData({
    name: catchTitle,
    description: catchDescription,
    thumbnailUrl: catchImage,
    contentUrl: getR2ImageUrlProxy(catchData.video_url),
    uploadDate: catchData.captured_at,
    author: username || 'Pescar'
  }) : null;

  return (
    <>
      {isOpen && catchData && (
        <Helmet>
          <title>{catchTitle}</title>
          <meta name="description" content={catchDescription} />
          <meta property="og:type" content="article" />
          <meta property="og:title" content={catchTitle} />
          <meta property="og:description" content={catchDescription} />
          <meta property="og:image" content={catchImage} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:url" content={catchUrl} />
          <meta property="og:site_name" content="Fish Trophy" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={catchTitle} />
          <meta name="twitter:description" content={catchDescription} />
          <meta name="twitter:image" content={catchImage} />
          <link rel="canonical" href={catchUrl} />
          {videoStructuredData && (
            <script type="application/ld+json">
              {JSON.stringify(videoStructuredData)}
            </script>
          )}
        </Helmet>
      )}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/70 transition-opacity duration-300"
        onClick={onClose}
      >
        <div
          id="catch-modal-content"
          className="bg-white dark:bg-slate-800 w-full sm:max-w-4xl md:max-w-[1000px] h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button Mobile */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors md:hidden touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left Side - Media (Hero) */}
          <div className="w-full md:w-[45%] flex-1 min-h-0 relative bg-slate-100 dark:bg-slate-900 flex items-center justify-center group overflow-hidden flex-shrink-0">
            {catchData.video_url ? (
              <div className="w-full h-full bg-black">
                <VideoPlayer url={getR2ImageUrlProxy(catchData.video_url)} poster={catchData.photo_url ? getR2ImageUrlProxy(catchData.photo_url) : undefined} />
              </div>
            ) : catchData.photo_url ? (
              <div
                className="relative w-full h-full cursor-zoom-in group/image"
                onClick={() => setIsZoomOpen(true)}
              >
                <img
                  src={getR2ImageUrlProxy(catchData.photo_url)}
                  alt={catchData.fish_species?.name || 'Captură'}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105 will-change-transform"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity pointer-events-none" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 p-8 min-h-[200px]">
                <Fish className="w-16 h-16 mb-2 opacity-50" />
                <span className="text-sm">Fără imagine</span>
              </div>
            )}
          </div>

          {/* Right Side - Details */}
          <div className="w-full md:w-[55%] flex flex-col md:h-full bg-white dark:bg-slate-900 overflow-y-auto overscroll-contain custom-scrollbar min-h-0">
            {/* Mobile Header - Show on mobile */}
            <div className="md:hidden p-4 pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 -ml-0.5">
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase tracking-wider rounded-full">
                      Captură
                    </span>
                    {catchData.global_id && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await navigator.clipboard.writeText(catchData.global_id!.toString());
                            toast.success(`ID ${catchData.global_id} copiat!`);
                          } catch (err) {
                            toast.error('Eroare la copierea ID-ului');
                          }
                        }}
                        className="text-[10px] text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300 px-1.5 py-0.5 rounded bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors font-mono shrink-0"
                        title="Click pentru a copia ID-ul"
                      >
                        #{catchData.global_id}
                      </button>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                    {catchData.fish_species?.name || 'Specie necunoscută'}
                  </h2>
                  {catchData.fish_species?.scientific_name && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 italic mt-1">
                      {catchData.fish_species.scientific_name}
                    </p>
                  )}
                </div>
              </div>
              {catchData.fishing_locations && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  {catchData.fishing_locations.county && catchData.fishing_locations.name
                    ? `${catchData.fishing_locations.county} - ${catchData.fishing_locations.name}`
                    : catchData.fishing_locations.name}
                </div>
              )}
            </div>

            {/* Desktop Header */}
            <div className="hidden md:block p-5 pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1 -ml-0.5">
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase tracking-wider rounded-full">
                      Captură
                    </span>
                    {catchData.global_id && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await navigator.clipboard.writeText(catchData.global_id!.toString());
                            toast.success(`ID ${catchData.global_id} copiat!`);
                          } catch (err) {
                            toast.error('Eroare la copierea ID-ului');
                          }
                        }}
                        className="text-[10px] text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300 px-1.5 py-0.5 rounded bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors font-mono shrink-0"
                        title="Click pentru a copia ID-ul"
                      >
                        #{catchData.global_id}
                      </button>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight mt-0">
                    {catchData.fish_species?.name || 'Specie necunoscută'}
                  </h2>
                  {catchData.fish_species?.scientific_name && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 italic mt-1">
                      {catchData.fish_species.scientific_name}
                    </p>
                  )}
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-1">
                  {/* YouTube Button */}
                  {catchData?.video_url && (catchData.video_url.includes('youtube.com') || catchData.video_url.includes('youtu.be')) && (
                    <a
                      href={catchData.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Vezi pe YouTube"
                    >
                      <Youtube className="w-5 h-5" />
                    </a>
                  )}
                  {catchData && (
                    <ShareButton
                      url={catchUrl}
                      title={catchTitle}
                      description={catchDescription}
                      image={catchImage}
                      size="sm"
                      variant="ghost"
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    />
                  )}
                  {isCatchOwner && onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Editează captura"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Location & Meta Row */}
              <div className="flex flex-col gap-3 mb-0.5 mt-1.5">
                {catchData.fishing_locations && (
                  <Link
                    to={`/records?location=${createSlug(catchData.fishing_locations.name)}`}
                    className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MapPin className="w-4 h-4 text-blue-500" />
                    {catchData.fishing_locations.county && catchData.fishing_locations.name
                      ? `${catchData.fishing_locations.county} - ${catchData.fishing_locations.name}`
                      : catchData.fishing_locations.name}
                  </Link>
                )}
              </div>
            </div>

            <div className="p-3 md:p-4 space-y-3 md:space-y-4">
              {/* Stats Cards */}
              {(catchData.weight || catchData.length_cm) && (
                <div className="grid grid-cols-2 gap-2 md:gap-2.5">
                  {catchData.weight && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 md:p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-1 md:gap-1.5 text-blue-600 dark:text-blue-400 mb-0.5 md:mb-1">
                        <Scale className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        <span className="text-[9px] md:text-[10px] font-bold uppercase">Greutate</span>
                      </div>
                      <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                        {catchData.weight} <span className="text-[10px] md:text-xs text-slate-400 font-medium">kg</span>
                      </div>
                    </div>
                  )}
                  {catchData.length_cm && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 md:p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-1 md:gap-1.5 text-emerald-600 dark:text-emerald-400 mb-0.5 md:mb-1">
                        <Ruler className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        <span className="text-[9px] md:text-[10px] font-bold uppercase">Lungime</span>
                      </div>
                      <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                        {catchData.length_cm} <span className="text-[10px] md:text-xs text-slate-400 font-medium">cm</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Date */}
              <div className="flex items-center gap-1.5 md:gap-2 text-slate-500 dark:text-slate-400 text-xs md:text-sm font-medium">
                <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500 flex-shrink-0" />
                <span className="break-words">{formattedDate}</span>
              </div>

              {/* Notes */}
              {catchData.notes && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 md:p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 md:mb-2">Note</div>
                  <p className="text-xs md:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed break-words">{catchData.notes}</p>
                </div>
              )}

              {/* Like/Comment buttons */}
              <div className="flex items-center gap-2 md:gap-3 pt-2 md:pt-3 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={handleLike}
                  disabled={isLiking && !!user}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg font-medium transition-all duration-200 touch-manipulation min-h-[44px] flex-1 ${catchData.is_liked_by_current_user && user
                    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 active:bg-red-200 dark:active:bg-red-900/40'
                    : 'text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 active:bg-gray-300 dark:active:bg-slate-500'
                    }`}
                  style={{
                    transform: 'translateZ(0)',
                    willChange: 'transform, background-color'
                  }}
                >
                  <Heart
                    className={`w-4 h-4 md:w-5 md:h-5 ${catchData.is_liked_by_current_user && user ? 'fill-current text-red-600' : ''}`}
                    style={{
                      transform: likeAnimation ? 'translateZ(0) scale(1.2)' : 'translateZ(0) scale(1)',
                      willChange: 'transform',
                      transition: 'transform 0.2s ease-out'
                    }}
                  />
                  <span className="text-xs md:text-sm font-semibold">{catchData.like_count || 0}</span>
                </button>

                <button
                  onClick={() => {
                    if (!user) {
                      onAuthRequired?.();
                      return;
                    }
                    setShowCommentForm(!showCommentForm);
                  }}
                  className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg font-medium transition-all duration-200 touch-manipulation min-h-[44px] flex-1 text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 active:bg-gray-300 dark:active:bg-slate-500"
                  style={{
                    transform: 'translateZ(0)',
                    willChange: 'transform, background-color'
                  }}
                >
                  <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-xs md:text-sm font-semibold">{catchData.comment_count || 0}</span>
                </button>
              </div>
            </div>

            {/* Comments Section */}
            <div className="p-3 md:p-4 pt-0 border-t border-gray-200 dark:border-slate-700">
              <h4 className="text-xs md:text-sm font-semibold text-gray-900 dark:text-slate-50 mb-2 md:mb-3">Comentarii ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})</h4>

              {/* Comment Form - available for authenticated users when showCommentForm is true */}
              {showCommentForm && user && (
                <div className="mb-4 bg-gray-50 dark:bg-slate-700 p-3 rounded-lg border border-gray-200 dark:border-slate-600">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Lasă un comentariu..."
                    className="min-h-[60px] text-sm mb-2 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-50 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleSubmitComment();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-sm py-2 px-3 h-auto touch-manipulation"
                    size="sm"
                  >
                    <Send className="w-4 h-4 mr-1.5" />
                    {isSubmittingComment ? 'Se trimite...' : 'Trimite'}
                  </Button>
                </div>
              )}

              {/* Comments List - Show all comments including replies */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto overscroll-contain custom-scrollbar">
                {comments.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                    <MessageCircle className="w-8 h-8 text-gray-300 dark:text-slate-500 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 dark:text-slate-400">Nu există comentarii încă</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">Fii primul care comentează!</p>
                  </div>
                ) : (
                  <>
                    {/* Render all root comments */}
                    {comments.map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        user={user}
                        isCatchOwner={isCatchOwner}
                        replyingTo={replyingTo}
                        setReplyingTo={setReplyingTo}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        handleSubmitReply={handleSubmitReply}
                        editingComment={editingComment}
                        setEditingComment={setEditingComment}
                        editText={editText}
                        setEditText={setEditText}
                        handleEditComment={handleEditComment}
                        deletingComment={deletingComment}
                        handleDeleteComment={handleDeleteComment}
                        handleDeleteCommentAsOwner={handleDeleteCommentAsOwner}
                        getR2ImageUrlProxy={getR2ImageUrlProxy}
                      />
                    ))}
                  </>
                )}
              </div>

              {/* Internal Links + Report Button */}
              <div className="mt-6 pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
                {(catchData.fish_species || catchData.fishing_locations) ? (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-gray-500 dark:text-slate-400">
                    <span className="text-gray-400 dark:text-slate-500">Vezi și alte capturi:</span>
                    {catchData.fish_species && (
                      <Link
                        to={`/records?species=${createSlug(catchData.fish_species.name)}`}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        de {catchData.fish_species.name}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    )}
                    {catchData.fishing_locations && (
                      <>
                        <span className="text-gray-300 dark:text-slate-600">•</span>
                        <Link
                          to={`/records?location=${createSlug(catchData.fishing_locations.name)}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="truncate max-w-[120px]">
                            {(() => {
                              const type = catchData.fishing_locations?.type || '';
                              const name = catchData.fishing_locations?.name || '';
                              if (type === 'lac' || type === 'baraj') return `pe ${name}`;
                              if (type === 'rau' || type === 'fluviu') return `pe râul ${name}`;
                              if (type === 'mare') return `pe ${name}`;
                              if (type === 'delta') return `în ${name}`;
                              return `de la ${name}`;
                            })()}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </>
                    )}
                  </div>
                ) : (
                  <div></div>
                )}
                {!isCatchOwner && (
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 relative">
                    <button
                      ref={reportButtonRef}
                      className="flex items-center gap-1 text-[9px] text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors opacity-70 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!user) {
                          setIsAuthRequiredModalOpen(true);
                          return;
                        }
                        setShowReportInput(!showReportInput);
                      }}
                    >
                      <AlertCircle className="w-2.5 h-2.5" />
                      Raportează
                    </button>

                    {/* Popup motiv - jos, magnetic legat de buton, fără overlay */}
                    {showReportInput && popupPosition && typeof document !== 'undefined' && createPortal(
                      <div
                        id={`report-popup-catch-${catchData.id}`}
                        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg p-3 flex flex-col gap-2"
                        style={{
                          position: 'fixed',
                          top: `${popupPosition.top}px`,
                          left: `${popupPosition.left}px`,
                          zIndex: 1000,
                          width: isMobile ? '280px' : '320px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <textarea
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                          placeholder="Motivul raportării (min. 10 caractere)..."
                          className="text-xs p-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-slate-50 resize-none"
                          style={{ minHeight: '80px', fontSize: '0.6875rem' }}
                          maxLength={500}
                          autoFocus
                        />
                        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-slate-400">
                          <span className={reportReason.trim().length < 10 ? 'text-red-500' : ''}>
                            {reportReason.trim().length < 10
                              ? `Mai sunt necesare ${10 - reportReason.trim().length} caractere`
                              : `${500 - reportReason.length} caractere rămase`}
                          </span>
                          <button
                            onClick={() => {
                              setShowReportInput(false);
                              setReportReason('');
                            }}
                            className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 underline text-[10px]"
                          >
                            Anulează
                          </button>
                        </div>
                        {/* Buton separat pentru trimitere */}
                        <button
                          onClick={async () => {
                            if (!user) {
                              setIsAuthRequiredModalOpen(true);
                              return;
                            }
                            if (reportReason.trim().length < 10) {
                              toast.error('Motivul trebuie să aibă minim 10 caractere');
                              return;
                            }
                            setIsSubmittingReport(true);
                            try {
                              const { error } = await supabase
                                .from('reports')
                                .insert({
                                  report_type: 'catch',
                                  item_id: catchData.id,
                                  item_url: username ? `${window.location.origin}/profile/${username}${catchData.global_id ? `#catch-${catchData.global_id}` : `?catch=${catchData.id}`}` : `${window.location.origin}/profile/${catchData.user_id}${catchData.global_id ? `#catch-${catchData.global_id}` : `?catch=${catchData.id}`}`,
                                  message: reportReason.trim(),
                                  reporter_id: user.id,
                                  status: 'pending',
                                  created_at: new Date().toISOString()
                                });
                              if (error) throw error;
                              toast.success('Raportare trimisă cu succes!');
                              setShowReportInput(false);
                              setReportReason('');
                            } catch (error: any) {
                              console.error('Error submitting report:', error);
                              toast.error('Eroare la trimiterea raportării');
                            } finally {
                              setIsSubmittingReport(false);
                            }
                          }}
                          disabled={isSubmittingReport || reportReason.trim().length < 10}
                          className="text-xs px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSubmittingReport ? '⏳ Se trimite...' : 'Trimite raport'}
                        </button>
                      </div>,
                      document.body
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Image Zoom */}
        {isZoomOpen && catchData.photo_url && (
          <ImageZoom
            src={getR2ImageUrlProxy(catchData.photo_url)}
            alt={catchData.fish_species?.name || 'Captură'}
            onClose={() => setIsZoomOpen(false)}
          />
        )}


        <AuthRequiredModal
          isOpen={isAuthRequiredModalOpen}
          onClose={() => setIsAuthRequiredModalOpen(false)}
          onLogin={() => {
            setIsAuthRequiredModalOpen(false);
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
          }}
          onRegister={() => {
            setIsAuthRequiredModalOpen(false);
            setAuthModalMode('register');
            setIsAuthModalOpen(true);
          }}
          title="Autentificare necesară"
          message="Trebuie să fii autentificat pentru a raporta o captură."
          actionName="raportarea unei capturi"
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
        />

        {/* Delete Comment Modal */}
        {deleteCommentModalOpen && commentToDelete && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70"
            onClick={() => {
              setDeleteCommentModalOpen(false);
              setCommentToDelete(null);
              setDeleteReason('');
            }}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-gray-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Șterge comentariul
                </h3>
                <button
                  onClick={() => {
                    setDeleteCommentModalOpen(false);
                    setCommentToDelete(null);
                    setDeleteReason('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {commentToDelete.isOwnerDelete && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Motivul ștergerii <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Motivul este obligatoriu (minim 3 caractere)..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                    required
                  />
                  {deleteReason && deleteReason.trim().length < 3 && (
                    <p className="mt-1 text-xs text-red-500">Minim 3 caractere</p>
                  )}
                </div>
              )}

              {!commentToDelete.isOwnerDelete && (
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                  Ești sigur că vrei să ștergi acest comentariu?
                </p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteCommentModalOpen(false);
                    setCommentToDelete(null);
                    setDeleteReason('');
                  }}
                  className="flex-1"
                >
                  Anulează
                </Button>
                <Button
                  onClick={confirmDeleteComment}
                  disabled={commentToDelete.isOwnerDelete && (!deleteReason || deleteReason.trim().length < 3)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Șterge
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Comment Item Component with replies
const CommentItem: React.FC<{
  comment: Comment;
  user: any;
  isCatchOwner: boolean;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  replyText: { [key: string]: string };
  setReplyText: (text: { [key: string]: string }) => void;
  handleSubmitReply: (parentId: string) => void;
  editingComment: string | null;
  setEditingComment: (id: string | null) => void;
  editText: { [key: string]: string };
  setEditText: (text: { [key: string]: string }) => void;
  handleEditComment: (id: string) => void;
  deletingComment: string | null;
  handleDeleteComment: (id: string) => void;
  handleDeleteCommentAsOwner: (id: string) => void;
  getR2ImageUrlProxy: (url: string) => string;
}> = ({
  comment,
  user,
  isCatchOwner,
  replyingTo,
  setReplyingTo,
  replyText,
  setReplyText,
  handleSubmitReply,
  editingComment,
  setEditingComment,
  editText,
  setEditText,
  handleEditComment,
  deletingComment,
  handleDeleteComment,
  handleDeleteCommentAsOwner,
  getR2ImageUrlProxy
}) => {
    const isCommentOwner = user?.id === comment.user_id;
    const isEditing = editingComment === comment.id;
    const isReplying = replyingTo === comment.id;

    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        {/* Main Comment */}
        <div className="p-2.5 sm:p-3">
          <div className="flex gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 overflow-hidden shrink-0 border border-white dark:border-slate-700 shadow-sm">
              {comment.user_avatar_url ? (
                <img
                  src={getR2ImageUrlProxy(comment.user_avatar_url)}
                  alt={comment.user_display_name || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-blue-400">
                  <Fish className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-slate-50">
                    {comment.user_display_name || comment.user_username || 'Utilizator'}
                  </span>
                  <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
                    {getRelativeTime(comment.created_at)}
                  </span>
                  {comment.is_edited && (
                    <span className="text-[10px] sm:text-xs text-gray-400 dark:text-slate-500 italic">(editat)</span>
                  )}
                </div>
                {(isCommentOwner || isCatchOwner) && (
                  <div className="flex items-center gap-2">
                    {isCommentOwner && (
                      <>
                        <button
                          onClick={() => {
                            setEditingComment(isEditing ? null : comment.id);
                            if (!isEditing) {
                              setEditText({ ...editText, [comment.id]: comment.content });
                            }
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                          title="Editează"
                        >
                          <Edit className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deletingComment === comment.id}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                          title="Șterge"
                        >
                          <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                        </button>
                      </>
                    )}
                    {isCatchOwner && !isCommentOwner && (
                      <button
                        onClick={() => handleDeleteCommentAsOwner(comment.id)}
                        disabled={deletingComment === comment.id}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Șterge ca owner"
                      >
                        <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2 sm:space-y-3">
                  <Textarea
                    value={editText[comment.id] || ''}
                    onChange={(e) => setEditText({ ...editText, [comment.id]: e.target.value })}
                    className="min-h-[60px] sm:min-h-[80px] text-sm sm:text-base bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-50 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleEditComment(comment.id);
                      }
                      if (e.key === 'Escape') {
                        setEditingComment(null);
                      }
                    }}
                  />
                  <div className="flex gap-2 sm:gap-3">
                    <Button
                      onClick={() => handleEditComment(comment.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm sm:text-base py-2 sm:py-3 px-3 sm:px-4 h-auto min-h-[40px] sm:min-h-[44px] touch-manipulation"
                    >
                      Salvează
                    </Button>
                    <Button
                      onClick={() => setEditingComment(null)}
                      variant="outline"
                      className="px-3 sm:px-4 py-2 sm:py-3 h-auto min-h-[40px] sm:min-h-[44px] touch-manipulation"
                    >
                      Anulează
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 dark:text-slate-200 text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{comment.content}</p>
              )}

              {!isEditing && (
                <div className="flex items-center gap-2 sm:gap-3 mt-2">
                  {isCatchOwner && (
                    <button
                      onClick={() => setReplyingTo(isReplying ? null : comment.id)}
                      className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-slate-700 touch-manipulation"
                    >
                      <Reply className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Răspunde</span>
                    </button>
                  )}
                  {comment.reply_count !== undefined && comment.reply_count > 0 && (
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                      {comment.reply_count} {comment.reply_count === 1 ? 'răspuns' : 'răspunsuri'}
                    </span>
                  )}
                </div>

              )}
            </div>
          </div>
        </div>

        {/* Reply Form */}
        {isReplying && (
          <div className="px-2.5 sm:px-4 pb-2.5 sm:pb-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700">
            <div className="pt-2.5 sm:pt-4">
              <Textarea
                value={replyText[comment.id] || ''}
                onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                placeholder="Scrie un răspuns..."
                className="min-h-[60px] sm:min-h-[80px] text-sm sm:text-base mb-2 sm:mb-3 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-50 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleSubmitReply(comment.id);
                  }
                  if (e.key === 'Escape') {
                    setReplyingTo(null);
                  }
                }}
              />
              <div className="flex gap-2 sm:gap-3">
                <Button
                  onClick={() => handleSubmitReply(comment.id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm sm:text-base py-2 sm:py-3 px-3 sm:px-4 h-auto min-h-[40px] sm:min-h-[44px] touch-manipulation"
                  disabled={!replyText[comment.id]?.trim()}
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                  Trimite
                </Button>
                <Button
                  onClick={() => setReplyingTo(null)}
                  variant="outline"
                  className="px-3 sm:px-4 py-2 sm:py-3 h-auto min-h-[40px] sm:min-h-[44px] touch-manipulation"
                >
                  Anulează
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="border-t border-gray-100 bg-blue-50/30">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="px-2.5 sm:px-4 py-2 sm:py-3 ml-4 sm:ml-8 relative pl-3 sm:pl-5">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 sm:w-1 bg-blue-300 rounded-full"></div>
                <div className="flex gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 overflow-hidden shrink-0 border border-white shadow-sm">
                    {reply.user_avatar_url ? (
                      <img
                        src={getR2ImageUrlProxy(reply.user_avatar_url)}
                        alt={reply.user_display_name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-blue-400">
                        <Fish className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-slate-50">
                          {reply.user_display_name || reply.user_username || 'Utilizator'}
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
                          {getRelativeTime(reply.created_at)}
                        </span>
                        {reply.is_edited && (
                          <span className="text-[10px] sm:text-xs text-gray-400 dark:text-slate-500 italic">(editat)</span>
                        )}
                      </div>
                      {(user?.id === reply.user_id || isCatchOwner) && (
                        <div className="flex items-center gap-2">
                          {user?.id === reply.user_id && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingComment(editingComment === reply.id ? null : reply.id);
                                  if (editingComment !== reply.id) {
                                    setEditText({ ...editText, [reply.id]: reply.content });
                                  }
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                                title="Editează"
                              >
                                <Edit className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(reply.id)}
                                disabled={deletingComment === reply.id}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                                title="Șterge"
                              >
                                <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                              </button>
                            </>
                          )}
                          {isCatchOwner && user?.id !== reply.user_id && (
                            <button
                              onClick={() => handleDeleteCommentAsOwner(reply.id)}
                              disabled={deletingComment === reply.id}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title="Șterge ca owner"
                            >
                              <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {editingComment === reply.id ? (
                      <div className="space-y-2 sm:space-y-3">
                        <Textarea
                          value={editText[reply.id] || ''}
                          onChange={(e) => setEditText({ ...editText, [reply.id]: e.target.value })}
                          className="min-h-[60px] sm:min-h-[80px] text-sm sm:text-base bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-50 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              handleEditComment(reply.id);
                            }
                            if (e.key === 'Escape') {
                              setEditingComment(null);
                            }
                          }}
                        />
                        <div className="flex gap-2 sm:gap-3">
                          <Button
                            onClick={() => handleEditComment(reply.id)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm sm:text-base py-2 sm:py-3 px-3 sm:px-4 h-auto min-h-[40px] sm:min-h-[44px] touch-manipulation"
                          >
                            Salvează
                          </Button>
                          <Button
                            onClick={() => setEditingComment(null)}
                            variant="outline"
                            className="px-3 sm:px-4 py-2 sm:py-3 h-auto min-h-[40px] sm:min-h-[44px] touch-manipulation"
                          >
                            Anulează
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 dark:text-slate-200 text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{reply.content}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

