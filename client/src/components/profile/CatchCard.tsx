import { Card, CardContent } from '@/components/ui/card';
import { Fish, Heart, MessageCircle, MapPin, Scale, Ruler } from 'lucide-react';
import { getR2ImageUrlProxy } from '@/lib/supabase';
import { toast } from 'sonner';

interface CatchItem {
  id: string;
  user_id?: string; // Opțional - nu folosit în componentă
  species_id: string | null;
  location_id: string | null;
  weight: number | null;
  length_cm: number | null;
  captured_at: string;
  notes: string | null;
  photo_url: string | null;
  video_url: string | null;
  is_public?: boolean; // Opțional - nu folosit în componentă
  created_at?: string; // Opțional - nu folosit în componentă
  updated_at?: string; // Opțional - nu folosit în componentă
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

interface CatchCardProps {
  catchItem: CatchItem;
  onCatchClick: () => void;
  onLike?: (catchId: string, isLiked: boolean) => void;
  showLikeButton?: boolean;
}

export const CatchCard = ({ catchItem, onCatchClick, onLike, showLikeButton = false }: CatchCardProps) => {
  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer flex flex-col aspect-square sm:aspect-auto sm:h-full dark:bg-slate-800 dark:border-slate-700"
      onClick={(e) => {
        // Only open modal if click is not on image
        if (e.target === e.currentTarget || !(e.target as HTMLElement).closest('img')) {
          onCatchClick();
        }
      }}
    >
      {/* Mobile: Full screen image with overlay */}
      <div className="relative w-full h-full sm:aspect-video sm:h-auto">
        {catchItem.photo_url ? (
          <img
            src={getR2ImageUrlProxy(catchItem.photo_url)}
            alt={catchItem.fish_species?.name || 'Captură'}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent sm:hidden pointer-events-none"></div>
        
        {/* Detalii peste gradient - doar pe mobil */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white sm:hidden z-10 pointer-events-none">
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
                className="text-[10px] text-white/80 hover:text-white px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors font-mono shrink-0 backdrop-blur-sm pointer-events-auto"
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
          {showLikeButton && onLike && (
            <div className="pt-3 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLike(catchItem.id, catchItem.is_liked_by_current_user);
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
        <div className="flex items-start justify-between mb-2 gap-2">
          <h3 className="font-bold text-lg text-gray-900 dark:text-slate-50 truncate">
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
              className="text-[10px] text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300 px-1.5 py-0.5 rounded bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors font-mono shrink-0"
              title="Click pentru a copia ID-ul"
            >
              #{catchItem.global_id}
            </button>
          )}
        </div>

        {catchItem.fishing_locations && (
          <div className="text-sm text-gray-600 dark:text-slate-300 flex items-center gap-1 mb-2">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{catchItem.fishing_locations.name}</span>
          </div>
        )}

        {(catchItem.weight || catchItem.length_cm) && (
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {catchItem.weight && (
              <div className="flex items-center gap-1 text-sm">
                <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-semibold text-gray-900 dark:text-slate-50">{catchItem.weight} kg</span>
              </div>
            )}
            {catchItem.length_cm && (
              <div className="flex items-center gap-1 text-sm">
                <Ruler className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                <span className="font-semibold text-gray-900 dark:text-slate-50">{catchItem.length_cm} cm</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700 gap-2">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Heart className={`w-3.5 h-3.5 ${catchItem.is_liked_by_current_user ? 'fill-current text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-slate-400'}`} />
              <span>{catchItem.like_count || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{catchItem.comment_count || 0}</span>
            </div>
          </div>
          <span className="text-xs text-gray-500 dark:text-slate-400 shrink-0">
            {new Date(catchItem.captured_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

