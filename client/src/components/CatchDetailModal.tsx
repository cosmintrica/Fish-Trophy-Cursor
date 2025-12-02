import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { X, Heart, MessageCircle, Send, Calendar, MapPin, Scale, Ruler, Fish, Hash, Edit, Trash2, Reply, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase, getR2ImageUrlProxy } from '@/lib/supabase';
import { toast } from 'sonner';

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
}

export const CatchDetailModal: React.FC<CatchDetailModalProps> = ({
  catchItem,
  isOpen,
  onClose,
  onCatchUpdated,
  isOwner = false,
  onEdit
}) => {
  const { user } = useAuth();
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
    if (!catchData || !user) return;

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

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!confirm('Ești sigur că vrei să ștergi acest comentariu?')) return;

    setDeletingComment(commentId);
    try {
      const { error } = await supabase
        .from('catch_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user?.id); // Only allow deleting own comments

      if (error) throw error;

      await loadComments();
      // Real-time subscription will update the count, but we update optimistically
      setCatchData(prev => prev ? {
        ...prev,
        comment_count: Math.max((prev.comment_count || 0) - 1, 0)
      } : null);
      // Also reload stats to get accurate count
      await loadCatchStats();
      onCatchUpdated?.();
      toast.success('Comentariu șters');
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast.error('Eroare la ștergerea comentariului');
    } finally {
      setDeletingComment(null);
    }
  }, [user, loadComments, loadCatchStats, onCatchUpdated]);

  const handleDeleteCommentAsOwner = useCallback(async (commentId: string) => {
    const isOwner = user && catchData ? user.id === catchData.user_id : false;
    if (!isOwner || !confirm('Ești sigur că vrei să ștergi acest comentariu?')) return;

    setDeletingComment(commentId);
    try {
      const { error } = await supabase
        .from('catch_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      await loadComments();
      // Real-time subscription will update the count, but we update optimistically
      setCatchData(prev => prev ? {
        ...prev,
        comment_count: Math.max((prev.comment_count || 0) - 1, 0)
      } : null);
      // Also reload stats to get accurate count
      await loadCatchStats();
      onCatchUpdated?.();
      toast.success('Comentariu șters');
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast.error('Eroare la ștergerea comentariului');
    } finally {
      setDeletingComment(null);
    }
  }, [user, catchData, loadComments, loadCatchStats, onCatchUpdated]);

  // Memoize expensive computations
  // Use isOwner prop if provided, otherwise calculate from user and catchData
  const isCatchOwner = useMemo(() => {
    if (isOwner !== undefined) return isOwner;
    return user && catchData ? user.id === catchData.user_id : false;
  }, [isOwner, user?.id, catchData?.user_id]);

  const formattedDate = useMemo(() => {
    if (!catchData?.captured_at) return '';
    return new Date(catchData.captured_at).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [catchData?.captured_at]);

  if (!isOpen || !catchData) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'translateZ(0)' : 'translateZ(0) scale(0.95)',
        transition: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1), transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'opacity, transform'
      }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-full sm:max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        style={{
          transform: isOpen ? 'translateZ(0) scale(1)' : 'translateZ(0) scale(0.95)',
          opacity: isOpen ? 1 : 0,
          transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform, opacity'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base font-semibold truncate">Detalii Captură</h2>
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
                className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded bg-gray-50 hover:bg-gray-100 transition-colors font-mono shrink-0"
                title="Click pentru a copia ID-ul"
              >
                #{catchData.global_id}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Edit button for owner */}
            {isCatchOwner && onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0 touch-manipulation"
                title="Editează captura"
              >
                <Edit className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0 touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          <div className="p-4">
            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4">
              {/* Left: Image */}
              <div className="order-2 lg:order-1 w-full">
                {catchData.photo_url ? (
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-md">
                    <img
                      src={getR2ImageUrlProxy(catchData.photo_url)}
                      alt={catchData.fish_species?.name || 'Captură'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-lg">
                    <Fish className="w-24 h-24 text-blue-400" />
                  </div>
                )}
              </div>

              {/* Right: Details */}
              <div className="order-1 lg:order-2 space-y-2 sm:space-y-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                    {catchData.fish_species?.name || 'Specie necunoscută'}
                  </h3>
                  {catchData.fish_species?.scientific_name && (
                    <p className="text-xs text-gray-500 italic">
                      {catchData.fish_species.scientific_name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2 sm:p-2.5 rounded-md text-xs sm:text-sm">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                    <span className="font-medium">{formattedDate}</span>
                  </div>

                  {catchData.fishing_locations && (
                    <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2 sm:p-2.5 rounded-md text-xs sm:text-sm">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium truncate">{catchData.fishing_locations.name}</span>
                    </div>
                  )}

                  {(catchData.weight || catchData.length_cm) && (
                    <div className="grid grid-cols-2 gap-2">
                      {catchData.weight && (
                        <div className="flex items-center gap-1.5 sm:gap-2 bg-blue-50 p-2 rounded-md">
                          <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                          <div>
                            <div className="text-[9px] sm:text-[10px] text-gray-500">Greutate</div>
                            <div className="font-bold text-xs sm:text-sm text-gray-900">{catchData.weight} kg</div>
                          </div>
                        </div>
                      )}
                      {catchData.length_cm && (
                        <div className="flex items-center gap-1.5 sm:gap-2 bg-green-50 p-2 rounded-md">
                          <Ruler className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 shrink-0" />
                          <div>
                            <div className="text-[9px] sm:text-[10px] text-gray-500">Lungime</div>
                            <div className="font-bold text-xs sm:text-sm text-gray-900">{catchData.length_cm} cm</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {catchData.notes && (
                    <div className="bg-gray-50 p-2.5 rounded-md border border-gray-200">
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Note</div>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{catchData.notes}</p>
                    </div>
                  )}
                </div>

                {/* Like/Comment buttons - available for all users (including owner) */}
                {user && (
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={handleLike}
                      disabled={isLiking}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 touch-manipulation min-h-[44px] ${catchData.is_liked_by_current_user
                        ? 'text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200'
                        : 'text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
                        }`}
                      style={{
                        transform: 'translateZ(0)',
                        willChange: 'transform, background-color'
                      }}
                    >
                      <Heart
                        className={`w-5 h-5 ${catchData.is_liked_by_current_user ? 'fill-current text-red-600' : ''}`}
                        style={{
                          transform: likeAnimation ? 'translateZ(0) scale(1.2)' : 'translateZ(0) scale(1)',
                          willChange: 'transform',
                          transition: 'transform 0.2s ease-out'
                        }}
                      />
                      <span className="text-sm font-semibold">{catchData.like_count || 0}</span>
                    </button>

                    <button
                      onClick={() => setShowCommentForm(!showCommentForm)}
                      className="flex items-center gap-2 text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 px-3 py-2 rounded-lg transition-colors touch-manipulation"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">{catchData.comment_count || 0}</span>
                      <span className="text-sm text-gray-600 ml-auto hidden sm:inline">Lasă un comentariu</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Comments Section - Always visible */}
            {user && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Comentarii ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})</h4>

                {/* Comment Form - available for all users when showCommentForm is true */}
                {showCommentForm && (
                  <div className="mb-4 bg-gray-50 p-3 rounded-lg">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Lasă un comentariu..."
                      className="min-h-[60px] text-sm mb-2 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
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
                <div className="space-y-2">
                  {comments.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Nu există comentarii încă</p>
                      <p className="text-[10px] text-gray-400 mt-1">Fii primul care comentează!</p>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Main Comment */}
        <div className="p-2.5 sm:p-3">
          <div className="flex gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 overflow-hidden shrink-0 border border-white shadow-sm">
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
                  <span className="font-semibold text-xs sm:text-sm text-gray-900">
                    {comment.user_display_name || comment.user_username || 'Utilizator'}
                  </span>
                  <span className="text-[10px] sm:text-xs text-gray-500">
                    {getRelativeTime(comment.created_at)}
                  </span>
                  {comment.is_edited && (
                    <span className="text-[10px] sm:text-xs text-gray-400 italic">(editat)</span>
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
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                          title="Editează"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deletingComment === comment.id}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                          title="Șterge"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </>
                    )}
                    {isCatchOwner && !isCommentOwner && (
                      <button
                        onClick={() => handleDeleteCommentAsOwner(comment.id)}
                        disabled={deletingComment === comment.id}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Șterge ca owner"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
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
                    className="min-h-[60px] sm:min-h-[80px] text-sm sm:text-base bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
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
                <p className="text-gray-700 text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{comment.content}</p>
              )}

              {!isEditing && (
                <div className="flex items-center gap-2 sm:gap-3 mt-2">
                  {isCatchOwner && (
                    <button
                      onClick={() => setReplyingTo(isReplying ? null : comment.id)}
                      className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors px-2 py-1 rounded hover:bg-gray-50 touch-manipulation"
                    >
                      <Reply className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Răspunde</span>
                    </button>
                  )}
                  {comment.reply_count !== undefined && comment.reply_count > 0 && (
                    <span className="text-xs sm:text-sm text-gray-500">
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
          <div className="px-2.5 sm:px-4 pb-2.5 sm:pb-4 border-t border-gray-100 bg-gray-50">
            <div className="pt-2.5 sm:pt-4">
              <Textarea
                value={replyText[comment.id] || ''}
                onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                placeholder="Scrie un răspuns..."
                className="min-h-[60px] sm:min-h-[80px] text-sm sm:text-base mb-2 sm:mb-3 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
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
                        <span className="font-semibold text-xs sm:text-sm text-gray-900">
                          {reply.user_display_name || reply.user_username || 'Utilizator'}
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-500">
                          {getRelativeTime(reply.created_at)}
                        </span>
                        {reply.is_edited && (
                          <span className="text-[10px] sm:text-xs text-gray-400 italic">(editat)</span>
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
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                                title="Editează"
                              >
                                <Edit className="w-4 h-4 text-gray-500" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(reply.id)}
                                disabled={deletingComment === reply.id}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                                title="Șterge"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </>
                          )}
                          {isCatchOwner && user?.id !== reply.user_id && (
                            <button
                              onClick={() => handleDeleteCommentAsOwner(reply.id)}
                              disabled={deletingComment === reply.id}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title="Șterge ca owner"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
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
                          className="min-h-[60px] sm:min-h-[80px] text-sm sm:text-base bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
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
                      <p className="text-gray-700 text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{reply.content}</p>
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

