import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { X, Fish, MapPin, Calendar, Scale, Ruler, User, Clock, CheckCircle, AlertCircle, Edit, Trash2, Video, ExternalLink, Share2, Info, ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getR2ImageUrlProxy, supabase } from '@/lib/supabase';
import ShareButton from '@/components/ShareButton';
import ImageZoom from '@/forum/components/ImageZoom';
import { useStructuredData } from '@/hooks/useStructuredData';
import { createSlug } from '@/utils/slug';
import { useAuth } from '@/hooks/useAuth';
import { AuthRequiredModal } from '@/components/AuthRequiredModal';
import AuthModal from '@/components/AuthModal';

interface FishRecord {
  id: string;
  user_id: string;
  species_id: string;
  location_id: string;
  weight: number;
  length?: number;
  length_cm?: number;
  date_caught?: string;
  time_caught?: string;
  captured_at?: string;
  notes?: string;
  image_url?: string;
  extra_images?: string[]; // Added support for multiple images
  photo_url?: string;
  video_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  global_id?: number | null;
  fish_species?: {
    name: string;
    scientific_name?: string;
  };
  fishing_locations?: {
    name: string;
    type: string;
    county: string;
  };
  profiles?: {
    id: string;
    display_name: string;
    username?: string;
    email?: string;
    photo_url?: string;
  };
  verified_by_profile?: {
    id: string;
    display_name: string;
    username?: string;
  };
}

interface RecordDetailsModalProps {
  record: FishRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (record: FishRecord) => void;
  onDelete?: (recordId: string) => void;
  isAdmin?: boolean;
  isOwner?: boolean;
}

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
      className="w-full h-full"
    />
  );
};

const RecordDetailsModal = ({
  record,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  isAdmin = false,
  isOwner = false,
}: RecordDetailsModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [showReportInput, setShowReportInput] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const reportButtonRef = useRef<HTMLButtonElement>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [isAuthRequiredModalOpen, setIsAuthRequiredModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isMobile, setIsMobile] = useState(false);
  const { createVideoObjectData } = useStructuredData();
  const { user } = useAuth();

  // Gallery Logic State - Must be before early return
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Performance: Use layout effect or simple effect to handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Force hardware acceleration on modal content
      const modalContent = document.getElementById('record-modal-content');
      if (modalContent) modalContent.style.willChange = 'transform';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset gallery index when record changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [record?.id]);

  if (!isOpen || !record) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCapturedAt = () => {
    if (record.date_caught && record.time_caught) {
      return `${record.date_caught}T${record.time_caught}`;
    }
    return record.captured_at || record.date_caught || record.created_at;
  };

  // Gallery Logic Helpers
  const getImageUrl = () => record.image_url || record.photo_url;
  const allImages = [record.image_url || record.photo_url, ...(record.extra_images || [])].filter(Boolean) as string[];
  const recordTitle = record.fish_species?.name || 'Specie Necunoscută';
  const shareTitle = `Record ${record.fish_species?.name} - ${record.weight}kg - Fish Trophy`;

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const currentImageUrl = allImages[currentImageIndex];
  const getLength = () => record.length || record.length_cm;

  const handleEdit = () => {
    if (onEdit) {
      onEdit(record);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!onDelete || !record.id) return;
    if (window.confirm('Ești sigur că vrei să ștergi acest record?')) {
      setIsLoading(true);
      try {
        await onDelete(record.id);
        onClose();
      } catch (error) {
        console.error('Error deleting record:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const recordDescription = `Record de pescuit: ${record.fish_species?.name || 'Specie necunoscută'} de ${record.weight}kg${getLength() ? `, ${getLength()}cm` : ''}, capturat la ${record.fishing_locations?.name || 'locație necunoscută'}${record.fishing_locations?.county ? `, ${record.fishing_locations.county}` : ''}${record.profiles?.display_name ? ` de ${record.profiles.display_name}` : ''}. ${record.status === 'verified' ? 'Record verificat.' : ''}${record.notes ? ` ${record.notes.substring(0, 100)}${record.notes.length > 100 ? '...' : ''}` : ''}`;
  const recordUrl = `https://fishtrophy.ro/records${record.global_id ? `#record-${record.global_id}` : `?record=${record.id}`}`;
  const recordImage = getImageUrl() ? getR2ImageUrlProxy(getImageUrl()!) : 'https://fishtrophy.ro/social-media-banner-v2.jpg';

  const videoStructuredData = record.video_url ? createVideoObjectData({
    name: recordTitle,
    description: recordDescription,
    thumbnailUrl: currentImageUrl ? getR2ImageUrlProxy(currentImageUrl) : 'https://fishtrophy.ro/social-media-banner-v2.jpg',
    contentUrl: getR2ImageUrlProxy(record.video_url),
    uploadDate: getCapturedAt(),
    author: record.profiles?.display_name || 'Pescar'
  }) : null;

  return (
    <>
      <Helmet>
        <title>{shareTitle}</title>
        <meta name="description" content={recordDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={shareTitle} />
        <meta property="og:description" content={recordDescription} />
        <meta property="og:image" content={recordImage} />
        <meta property="og:url" content={recordUrl} />
      </Helmet>

      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/70 transition-opacity duration-300"
        onClick={onClose}
      >
        <div
          id="record-modal-content"
          className="bg-white dark:bg-slate-800 w-full sm:max-w-4xl md:max-w-[1000px] h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button Mobile/Desktop absolute */}
          {/* This button is now moved to the header for desktop, but kept for mobile */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors md:hidden touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left Side - Media (Hero) */}
          <div className="w-full md:w-[45%] flex-1 min-h-0 relative bg-slate-100 dark:bg-slate-900 flex items-center justify-center group overflow-hidden flex-shrink-0">
            {allImages.length > 0 ? (
              <div
                className="relative w-full h-full cursor-zoom-in group/image"
                onClick={() => setIsZoomOpen(true)}
              >
                <img
                  src={getR2ImageUrlProxy(currentImageUrl)}
                  alt={`${record.fish_species?.name} - Imagine ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105 will-change-transform"
                  loading="eager"
                />

                {/* Gradient Overlay for Text Contrast if needed */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity pointer-events-none" />

                {/* Navigation Arrows - Always visible on mobile, hover on desktop */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevImage();
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2.5 sm:p-2 bg-black/50 hover:bg-black/70 active:bg-black/80 text-white rounded-full opacity-100 md:opacity-0 md:group-hover/image:opacity-100 transition-all duration-200 z-20 backdrop-blur-[2px] touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Imaginea anterioară"
                    >
                      <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 sm:p-2 bg-black/50 hover:bg-black/70 active:bg-black/80 text-white rounded-full opacity-100 md:opacity-0 md:group-hover/image:opacity-100 transition-all duration-200 z-20 backdrop-blur-[2px] touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Imaginea următoare"
                    >
                      <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    {/* Dots Indicator - Always visible on mobile */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 pointer-events-none">
                      {allImages.map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-2 h-2 sm:w-1.5 sm:h-1.5 rounded-full transition-all shadow-sm ${idx === currentImageIndex ? 'bg-white w-5 sm:w-4' : 'bg-white/60'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : record.video_url ? (
              <div className="w-full h-full bg-black">
                <VideoPlayer url={getR2ImageUrlProxy(record.video_url)} poster={getR2ImageUrlProxy(record.photo_url || '')} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 p-8 min-h-[200px]">
                <Fish className="w-16 h-16 mb-2 opacity-50" />
                <span className="text-sm">Fără imagine</span>
              </div>
            )}

            {/* Mobile Overlay Info (When collapsed) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/60 to-transparent text-white md:hidden">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-blue-500/80 text-white text-[10px] font-bold uppercase rounded-full">
                  Record
                </span>
                {record.status === 'verified' && (
                  <span className="flex items-center gap-1 text-green-400 text-[10px] font-bold uppercase">
                    <CheckCircle className="w-3 h-3" /> Verificat
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black mb-1">{record.fish_species?.name}</h2>
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <MapPin className="w-4 h-4" />
                {record.fishing_locations?.name}
              </div>
            </div>
          </div>

          {/* Right Side - Details */}
          <div className="w-full md:w-[55%] flex flex-col md:h-full bg-white dark:bg-slate-900 overflow-y-auto overscroll-contain custom-scrollbar min-h-0">
            {/* Desktop Header */}
            <div className="hidden md:block p-5 pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1 -ml-0.5">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider rounded-full">
                      Record
                    </span>
                    {record.global_id && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await navigator.clipboard.writeText(record.global_id!.toString());
                            toast.success(`ID ${record.global_id} copiat!`);
                          } catch (err) {
                            toast.error('Eroare la copierea ID-ului');
                          }
                        }}
                        className="text-[10px] text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300 px-1.5 py-0.5 rounded bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors font-mono shrink-0"
                        title="Click pentru a copia ID-ul"
                      >
                        #{record.global_id}
                      </button>
                    )}
                    {record.status === 'verified' && (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle className="w-3 h-3" /> Verificat
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight mt-0">
                    {recordTitle}
                  </h2>
                  {record.fish_species?.scientific_name && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 italic mt-1">
                      {record.fish_species.scientific_name}
                    </p>
                  )}
                </div>

                {/* Header Actions: Close Button (Correctly positioned) */}
                <div className="flex items-center gap-1">
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
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  {record.fishing_locations?.name || 'Locație necunoscută'}
                </div>

              </div>
            </div>

            <div className="p-3 md:p-4 space-y-3 md:space-y-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-2 md:gap-2.5">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 md:p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1 md:gap-1.5 text-blue-600 dark:text-blue-400 mb-0.5 md:mb-1">
                    <Scale className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    <span className="text-[9px] md:text-[10px] font-bold uppercase">Greutate</span>
                  </div>
                  <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                    {record.weight} <span className="text-[10px] md:text-xs text-slate-400 font-medium">kg</span>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 md:p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1 md:gap-1.5 text-emerald-600 dark:text-emerald-400 mb-0.5 md:mb-1">
                    <Ruler className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    <span className="text-[9px] md:text-[10px] font-bold uppercase">Lungime</span>
                  </div>
                  <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                    {getLength() || '-'} <span className="text-[10px] md:text-xs text-slate-400 font-medium">cm</span>
                  </div>
                </div>
              </div>




              {/* User Info */}
              <div className="flex items-center gap-2 md:gap-2.5 p-2 md:p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50">
                {record.profiles?.photo_url ? (
                  <img src={getR2ImageUrlProxy(record.profiles.photo_url)} className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-700" alt="User" />
                ) : (
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] md:text-[10px] text-slate-500 uppercase font-bold tracking-wider">Capturat de</p>
                  <a href={`/profile/${record.profiles?.username || record.user_id}`} className="text-xs md:text-sm font-bold text-slate-900 dark:text-white hover:text-blue-500 transition-colors block truncate">
                    {record.profiles?.display_name || 'Utilizator Anonim'}
                  </a>
                </div>
              </div>

              {/* Video Section (if image was main) */}
              {getImageUrl() && record.video_url && (
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 text-red-500" /> Video Captură
                  </h3>
                  <div className="rounded-lg overflow-hidden bg-black aspect-video relative group">
                    <video
                      src={getR2ImageUrlProxy(record.video_url)}
                      preload="metadata"
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Meta Info */}
              <div className="space-y-2 md:space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] md:text-xs text-slate-600 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" />
                    <span className="break-words">Capturat pe: <span className="font-medium text-slate-900 dark:text-slate-200">{formatDate(getCapturedAt())}</span></span>
                  </div>

                  {/* Share - Compact & Right Aligned */}
                  <ShareButton
                    url={recordUrl}
                    title={shareTitle}
                    description={recordDescription}
                    image={recordImage}
                    variant="ghost"
                    size="sm"
                    showLabel={true}
                    className="text-[9px] md:text-[10px] h-7 md:h-6 px-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  />
                </div>

                {record.notes && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 p-2.5 md:p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/20">
                    <h4 className="text-[9px] md:text-[10px] font-bold text-yellow-700 dark:text-yellow-500 uppercase mb-1">Povestea capturii</h4>
                    <p className="text-[11px] md:text-xs text-yellow-800 dark:text-yellow-200 italic break-words">"{record.notes}"</p>
                  </div>
                )}
              </div>

              {/* Admin Actions */}
              {(isOwner || isAdmin) && (
                <div className="grid grid-cols-2 gap-2 md:gap-2.5 pt-3 md:pt-4">
                  <Button
                    variant="outline"
                    className="w-full gap-1 md:gap-1.5 text-[11px] md:text-xs h-8 md:h-9 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 touch-manipulation"
                    onClick={() => {
                      if (onEdit && record) onEdit(record);
                    }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editează
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full gap-1 md:gap-1.5 text-[11px] md:text-xs h-8 md:h-9 bg-red-500 hover:bg-red-600 text-white border-none touch-manipulation"
                    onClick={() => {
                      if (onDelete && record) onDelete(record.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    Șterge
                  </Button>
                </div>
              )}

              {/* Internal Links + Report Button - All on one row */}
              <div className="pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
                {(record.fish_species || record.fishing_locations || record.profiles?.username) && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-gray-500 dark:text-slate-400">
                    <span className="text-gray-400 dark:text-slate-500">Vezi și alte recorduri:</span>
                    {record.profiles?.username && (
                      <a
                        href={`/records?user=${record.profiles.username}`}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-0.5"
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                      >
                        de {record.profiles.display_name || 'utilizator'}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    {record.fish_species && (
                      <>
                        {(record.profiles?.username) && <span className="text-gray-300 dark:text-slate-600">•</span>}
                        <a
                          href={`/records?species=${createSlug(record.fish_species.name)}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-0.5"
                          onClick={(e) => { e.stopPropagation(); onClose(); }}
                        >
                          de {record.fish_species.name}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </>
                    )}
                    {record.fishing_locations && (
                      <>
                        {(record.profiles?.username || record.fish_species) && <span className="text-gray-300 dark:text-slate-600">•</span>}
                        <a
                          href={`/records?location=${createSlug(record.fishing_locations.name)}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-0.5"
                          onClick={(e) => { e.stopPropagation(); onClose(); }}
                        >
                          <span className="truncate max-w-[120px]">
                            {(() => {
                              const type = record.fishing_locations?.type || '';
                              const name = record.fishing_locations?.name || '';
                              if (type === 'lac' || type === 'baraj') return `pe ${name}`;
                              if (type === 'rau' || type === 'fluviu') return `pe râul ${name}`;
                              if (type === 'mare') return `pe ${name}`;
                              if (type === 'delta') return `în ${name}`;
                              return `de la ${name}`;
                            })()}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </>
                    )}
                  </div>
                )}
                {!isOwner && (
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
                        id={`report-popup-record-${record.id}`}
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
                                  report_type: 'record',
                                  item_id: record.id,
                                  item_url: `${window.location.origin}/records${record.global_id ? `#record-${record.global_id}` : `?record=${record.id}`}`,
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
        </div >
      </div >

      {isZoomOpen && currentImageUrl && typeof document !== 'undefined' && createPortal(
        <ImageZoom
          src={getR2ImageUrlProxy(currentImageUrl)}
          alt={`Poza record ${record.fish_species?.name} - ${currentImageIndex + 1}`}
          onClose={() => setIsZoomOpen(false)}
          onNext={allImages.length > 1 ? handleNextImage : undefined}
          onPrev={allImages.length > 1 ? handlePrevImage : undefined}
        />,
        document.body
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
        message="Trebuie să fii autentificat pentru a raporta un record."
        actionName="raportarea unui record"
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </>
  );
};

export default RecordDetailsModal;
