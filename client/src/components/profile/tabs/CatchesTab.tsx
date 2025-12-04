import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Fish, Heart, MessageCircle, Plus, Calendar, MapPin, Scale, Ruler, Hash, Edit } from 'lucide-react';
import { supabase, getR2ImageUrlProxy } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { CatchDetailModal } from '@/components/CatchDetailModal';
import FishingEntryModal from '@/components/FishingEntryModal';
import { CatchCard } from '@/components/profile/CatchCard';

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
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  is_liked_by_current_user: boolean;
  global_id: number | null;
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

interface CatchesTabProps {
  userId: string;
  onShowCatchModal: () => void;
  onCatchAdded?: () => void;
}

export const CatchesTab = ({ userId, onShowCatchModal, onCatchAdded }: CatchesTabProps) => {
  const { user } = useAuth();
  const [catches, setCatches] = useState<Catch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCatch, setSelectedCatch] = useState<Catch | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingCatch, setEditingCatch] = useState<Catch | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const isOwner = user?.id === userId;

  useEffect(() => {
    if (userId) {
      loadCatches();
    }
  }, [userId]);


  const loadCatches = async () => {
    try {
      setLoading(true);
      
      // Query catches with relationships using explicit foreign keys
      const { data, error } = await supabase
        .from('catches')
        .select(`
          *,
          fish_species:species_id (id, name, scientific_name),
          fishing_locations:location_id (id, name, type, county)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get like counts and comment counts separately
      const catchIds = (data || []).map(c => c.id);
      
      if (catchIds.length > 0) {
        // Get like counts
        const { data: likesData } = await supabase
          .from('catch_likes')
          .select('catch_id')
          .in('catch_id', catchIds);

        // Get comment counts (only top-level comments)
        const { data: commentsData } = await supabase
          .from('catch_comments')
          .select('catch_id')
          .in('catch_id', catchIds)
          .is('parent_comment_id', null);

        // Get user's likes
        const { data: userLikes } = user ? await supabase
          .from('catch_likes')
          .select('catch_id')
          .in('catch_id', catchIds)
          .eq('user_id', user.id) : { data: [] };

        const userLikedIds = new Set((userLikes || []).map(l => l.catch_id));

        // Aggregate counts
        const likeCounts = new Map<string, number>();
        (likesData || []).forEach(like => {
          likeCounts.set(like.catch_id, (likeCounts.get(like.catch_id) || 0) + 1);
        });

        const commentCounts = new Map<string, number>();
        (commentsData || []).forEach(comment => {
          commentCounts.set(comment.catch_id, (commentCounts.get(comment.catch_id) || 0) + 1);
        });

        // Combine data with stats
        const catchesWithStats = (data || []).map(catchItem => ({
          ...catchItem,
          like_count: likeCounts.get(catchItem.id) || 0,
          comment_count: commentCounts.get(catchItem.id) || 0,
          is_liked_by_current_user: userLikedIds.has(catchItem.id),
          global_id: (catchItem as any).global_id || null
        }));

        setCatches(catchesWithStats);
      } else {
        setCatches([]);
      }
    } catch (error: any) {
      console.error('Error loading catches:', error);
      toast.error('Eroare la încărcarea capturilor');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (catchId: string, isLiked: boolean) => {
    if (!user) {
      toast.error('Trebuie să fii autentificat pentru a da like');
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('catch_likes')
          .delete()
          .eq('catch_id', catchId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('catch_likes')
          .insert({
            catch_id: catchId,
            user_id: user.id
          });

        if (error) throw error;
      }

      // Reload catches to update like count
      await loadCatches();
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast.error('Eroare la actualizarea like-ului');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Se încarcă capturile...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Jurnalul meu de capturi</h2>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={onShowCatchModal}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adaugă captură
        </Button>
      </div>

      {catches.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Fish className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nu ai încă capturi</h3>
            <p className="text-gray-600 mb-4">Începe să adaugi capturile tale în jurnal!</p>
            <Button onClick={onShowCatchModal}>
              Adaugă prima captură
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {catches.map((catchItem) => (
            <Card 
              key={catchItem.id} 
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow flex flex-col aspect-square sm:aspect-auto sm:h-full"
              onClick={() => {
                setSelectedCatch(catchItem);
                setShowDetailModal(true);
              }}
            >
              {/* Mobile: Full screen image with overlay */}
              <div className="relative w-full h-full sm:aspect-video sm:h-auto">
                {catchItem.photo_url ? (
                  <img
                    src={getR2ImageUrlProxy(catchItem.photo_url)}
                    alt={catchItem.fish_species?.name || 'Captură'}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                            <svg class="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                          </div>
                        `;
                      }
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                    <Fish className="w-16 h-16 text-blue-400" />
                  </div>
                )}
                
                {/* Gradient overlay pentru mobil - doar în partea de jos */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent sm:hidden"></div>
                
                {/* Detalii peste gradient - doar pe mobil */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white sm:hidden z-10">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg text-white drop-shadow-lg">
                      {catchItem.fish_species?.name || 'Specie necunoscută'}
                    </h3>
                    {catchItem.global_id && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await navigator.clipboard.writeText(catchItem.global_id!.toString());
                            toast.success(`ID ${catchItem.global_id} copiat!`);
                          } catch (err) {
                            toast.error('Eroare la copierea ID-ului');
                          }
                        }}
                        className="text-[10px] text-white/80 hover:text-white px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors font-mono shrink-0 backdrop-blur-sm"
                        title="Click pentru a copia ID-ul"
                      >
                        #{catchItem.global_id}
                      </button>
                    )}
                  </div>

                  {catchItem.fishing_locations && (
                    <div className="flex items-center gap-1.5 text-sm text-white/90 mb-2 drop-shadow">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{catchItem.fishing_locations.name}</span>
                    </div>
                  )}

                  {(catchItem.weight || catchItem.length_cm) && (
                    <div className="flex items-center gap-4 mb-3">
                      {catchItem.weight && (
                        <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-md">
                          <Scale className="w-4 h-4 text-white" />
                          <span className="text-sm font-semibold text-white">{catchItem.weight} kg</span>
                        </div>
                      )}
                      {catchItem.length_cm && (
                        <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-md">
                          <Ruler className="w-4 h-4 text-white" />
                          <span className="text-sm font-semibold text-white">{catchItem.length_cm} cm</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-white/20">
                    <div className="flex items-center gap-3 text-xs text-white/90">
                      <div className="flex items-center gap-1">
                        <Heart className={`w-3.5 h-3.5 ${catchItem.is_liked_by_current_user ? 'fill-red-400 text-red-400' : ''}`} />
                        <span>{catchItem.like_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{catchItem.comment_count || 0}</span>
                      </div>
                    </div>
                    <span className="text-xs text-white/80">
                      {new Date(catchItem.captured_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Show like button only if not owner - pe mobil */}
                  {!isOwner && (
                    <div className="pt-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(catchItem.id, catchItem.is_liked_by_current_user);
                        }}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors backdrop-blur-sm ${
                          catchItem.is_liked_by_current_user
                            ? 'text-red-100 bg-red-500/30 hover:bg-red-500/40 border border-red-400/30'
                            : 'text-white bg-white/20 hover:bg-white/30 border border-white/30'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${catchItem.is_liked_by_current_user ? 'fill-current' : ''}`}
                        />
                        <span className="text-sm font-medium">
                          {catchItem.is_liked_by_current_user ? 'Ai dat like' : 'Dă like'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Desktop: CardContent normal */}
              <CardContent className="hidden sm:block p-4 flex-shrink-0">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg text-gray-900">
                    {catchItem.fish_species?.name || 'Specie necunoscută'}
                  </h3>
                  {catchItem.global_id && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await navigator.clipboard.writeText(catchItem.global_id!.toString());
                          toast.success(`ID ${catchItem.global_id} copiat!`);
                        } catch (err) {
                          toast.error('Eroare la copierea ID-ului');
                        }
                      }}
                      className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded bg-gray-50 hover:bg-gray-100 transition-colors font-mono shrink-0"
                      title="Click pentru a copia ID-ul"
                    >
                      #{catchItem.global_id}
                    </button>
                  )}
                </div>

                {catchItem.fishing_locations && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-3">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{catchItem.fishing_locations.name}</span>
                  </div>
                )}

                {(catchItem.weight || catchItem.length_cm) && (
                  <div className="flex items-center gap-4 mb-3">
                    {catchItem.weight && (
                      <div className="flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-900">{catchItem.weight} kg</span>
                      </div>
                    )}
                    {catchItem.length_cm && (
                      <div className="flex items-center gap-1.5">
                        <Ruler className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-gray-900">{catchItem.length_cm} cm</span>
                      </div>
                    )}
                  </div>
                )}

                {catchItem.notes && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{catchItem.notes}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Heart className={`w-3.5 h-3.5 ${catchItem.is_liked_by_current_user ? 'fill-red-500 text-red-500' : ''}`} />
                      <span>{catchItem.like_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{catchItem.comment_count || 0}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(catchItem.captured_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                {/* Show like button only if not owner */}
                {!isOwner && (
                  <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(catchItem.id, catchItem.is_liked_by_current_user);
                      }}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        catchItem.is_liked_by_current_user
                          ? 'text-red-600 bg-red-50 hover:bg-red-100'
                          : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${catchItem.is_liked_by_current_user ? 'fill-current' : ''}`}
                      />
                      <span className="text-sm font-medium">
                        {catchItem.is_liked_by_current_user ? 'Ai dat like' : 'Dă like'}
                      </span>
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Catch Detail Modal */}
      {selectedCatch && (
        <CatchDetailModal
          catchItem={selectedCatch}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCatch(null);
          }}
          onCatchUpdated={() => {
            // Don't reload entire list, modal handles its own state updates
            // Only update local state if needed (e.g., for like counts in list)
          }}
          isOwner={isOwner}
          onEdit={() => {
            setShowDetailModal(false);
            setEditingCatch(selectedCatch);
            setShowEditModal(true);
          }}
        />
      )}

      {/* Edit Catch Modal */}
      {editingCatch && (
        <FishingEntryModal
          entry={editingCatch}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingCatch(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingCatch(null);
            loadCatches();
            onCatchAdded?.();
          }}
          type="catch"
          mode="edit"
          onDelete={() => {
            setShowEditModal(false);
            setEditingCatch(null);
            loadCatches();
            onCatchAdded?.();
          }}
        />
      )}
    </>
  );
};

