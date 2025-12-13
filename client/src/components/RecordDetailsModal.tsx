import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { X, Fish, MapPin, Calendar, Scale, Ruler, User, Clock, CheckCircle, AlertCircle, Edit, Trash2, Hash, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getR2ImageUrlProxy } from '@/lib/supabase';
import ShareButton from '@/components/ShareButton';
import ImageZoom from '@/forum/components/ImageZoom';
import { useStructuredData } from '@/hooks/useStructuredData';
import { createSlug } from '@/utils/slug';

interface FishRecord {
  id: string;
  user_id: string;
  species_id: string;
  location_id: string;
  weight: number;
  length?: number; // records use 'length' (integer), not 'length_cm'
  length_cm?: number; // legacy/compatibility field
  date_caught?: string; // records use 'date_caught' (date)
  time_caught?: string; // records use 'time_caught' (time)
  captured_at?: string; // computed/legacy field - combine date_caught + time_caught
  notes?: string;
  image_url?: string; // records use 'image_url', not 'photo_url'
  photo_url?: string; // legacy/compatibility field
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
  };
  fishing_locations?: {
    name: string;
    type: string;
    county: string;
  };
  profiles?: {
    display_name: string;
    email: string;
  };
}

interface RecordDetailsModalProps {
  record: FishRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (record: FishRecord) => void;
  onDelete?: (recordId: string) => void;
  isAdmin?: boolean;
}

const RecordDetailsModal = ({
  record,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  isAdmin = false,
}: RecordDetailsModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const { createVideoObjectData } = useStructuredData();

  if (!isOpen || !record) return null;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'verified':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          text: 'Verificat',
          color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
          bgColor: 'bg-green-50 dark:bg-green-900/20'
        };
      case 'pending':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          text: 'În așteptare',
          color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
        };
      case 'rejected':
        return {
          icon: <X className="w-5 h-5" />,
          text: 'Respins',
          color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
          bgColor: 'bg-red-50 dark:bg-red-900/20'
        };
      default:
        return {
          icon: <Clock className="w-5 h-5" />,
          text: 'Necunoscut',
          color: 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300 border-gray-200 dark:border-slate-600',
          bgColor: 'bg-gray-50 dark:bg-slate-800'
        };
    }
  };

  const statusInfo = getStatusInfo(record.status);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Combine date_caught + time_caught for records, or use captured_at
  const getCapturedAt = () => {
    if (record.date_caught && record.time_caught) {
      return `${record.date_caught}T${record.time_caught}`;
    }
    return record.captured_at || record.date_caught || record.created_at;
  };

  // Get image URL - records use image_url, catches use photo_url
  const getImageUrl = () => {
    return record.image_url || record.photo_url;
  };

  // Get length - records use length (integer), catches use length_cm (decimal)
  const getLength = () => {
    return record.length || record.length_cm;
  };

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

  // SEO Meta Tags for Record
  const recordTitle = `Record ${record.fish_species?.name || 'Pescuit'} - ${record.weight}kg - Fish Trophy`;
  const recordDescription = `Record de pescuit: ${record.fish_species?.name || 'Specie necunoscută'} de ${record.weight}kg, capturat la ${record.fishing_locations?.name || 'locație necunoscută'}.`;
  const recordUrl = `https://fishtrophy.ro/records${record.global_id ? `#record-${record.global_id}` : `?record=${record.id}`}`;
  const recordImage = getImageUrl() ? getR2ImageUrlProxy(getImageUrl()!) : 'https://fishtrophy.ro/social-media-banner-v2.jpg';

  // Video structured data (if video exists)
  const videoStructuredData = record.video_url ? createVideoObjectData({
    name: recordTitle,
    description: recordDescription,
    thumbnailUrl: recordImage,
    contentUrl: getR2ImageUrlProxy(record.video_url),
    uploadDate: getCapturedAt(),
    author: record.profiles?.display_name || 'Pescar'
  }) : null;

  return (
    <>
      {isOpen && record && (
        <Helmet>
          <title>{recordTitle}</title>
          <meta name="description" content={recordDescription} />
          <meta property="og:type" content="article" />
          <meta property="og:title" content={recordTitle} />
          <meta property="og:description" content={recordDescription} />
          <meta property="og:image" content={recordImage} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:url" content={recordUrl} />
          <meta property="og:site_name" content="Fish Trophy" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={recordTitle} />
          <meta name="twitter:description" content={recordDescription} />
          <meta name="twitter:image" content={recordImage} />
          <link rel="canonical" href={recordUrl} />
          {videoStructuredData && (
            <script type="application/ld+json">
              {JSON.stringify(videoStructuredData)}
            </script>
          )}
        </Helmet>
      )}
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        opacity: isOpen ? 1 : 0,
        transition: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'opacity'
      }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-2xl h-full flex flex-col">
          <CardContent className="p-0 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 p-4 sm:p-6 text-white rounded-t-lg">
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2">
                <ShareButton
                  url={`https://fishtrophy.ro/records${record.global_id ? `#record-${record.global_id}` : `?record=${record.id}`}`}
                  title={`Record ${record.fish_species?.name || 'Pescuit'} - ${record.weight}kg - Fish Trophy`}
                  description={`Record de pescuit: ${record.fish_species?.name || 'Specie necunoscută'} de ${record.weight}kg, capturat la ${record.fishing_locations?.name || 'locație necunoscută'}.`}
                  image={getImageUrl() ? getR2ImageUrlProxy(getImageUrl()!) : 'https://fishtrophy.ro/social-media-banner-v2.jpg'}
                  size="sm"
                  variant="ghost"
                />
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors touch-manipulation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                  <Fish className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold truncate">{record.fish_species?.name || 'Specie necunoscută'}</h2>
                  <p className="text-sm sm:text-base text-blue-100 truncate">{record.fishing_locations?.name || 'Locație necunoscută'}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1 overscroll-contain bg-white dark:bg-slate-800">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <Badge className={`${statusInfo.color} border`}>
                  {statusInfo.icon}
                  <span className="ml-2">{statusInfo.text}</span>
                </Badge>
                {record.global_id ? (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(record.global_id!.toString());
                        toast.success(`ID ${record.global_id} copiat!`);
                      } catch (err) {
                        toast.error('Eroare la copierea ID-ului');
                      }
                    }}
                    className="text-[10px] text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300 px-1.5 py-0.5 rounded bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-500 transition-colors font-mono"
                    title="Click pentru a copia ID-ul"
                  >
                    #{record.global_id}
                  </button>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-slate-400">
                    ID: {record.id.slice(0, 8)}
                  </div>
                )}
              </div>

              {/* Main Stats */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-blue-200 dark:border-blue-900/50">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Scale className="w-5 h-5 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium">Greutate</p>
                      <p className="text-lg sm:text-2xl font-bold text-blue-900 dark:text-blue-100 truncate">
                        {record.weight || 'N/A'} kg
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-green-200 dark:border-green-900/50">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Ruler className="w-5 h-5 sm:w-8 sm:h-8 text-green-600 dark:text-green-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">Lungime</p>
                      <p className="text-lg sm:text-2xl font-bold text-green-900 dark:text-green-100 truncate">
                        {getLength() || 'N/A'} cm
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-slate-300 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300">Pescar</p>
                      <p className="font-medium text-sm sm:text-base truncate text-gray-900 dark:text-white">{record.profiles?.display_name || 'Utilizator'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-slate-300 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300">Locație</p>
                      <p className="font-medium text-sm sm:text-base truncate text-gray-900 dark:text-white">{record.fishing_locations?.name || 'Necunoscută'}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 capitalize truncate">
                        {record.fishing_locations?.type} • {record.fishing_locations?.county}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-slate-300 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300">Data capturii</p>
                      <p className="font-medium text-xs sm:text-sm truncate text-gray-900 dark:text-white">{formatDate(getCapturedAt())}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-slate-300 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300">Adăugat</p>
                      <p className="font-medium text-xs sm:text-sm truncate text-gray-900 dark:text-white">{formatDate(record.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Gallery */}
              {(getImageUrl() || record.video_url) && (
                <div className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 dark:text-white mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Media
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getImageUrl() && (
                      <div className="relative group">
                        <img
                          src={getR2ImageUrlProxy(getImageUrl()!)}
                          alt={`Poza record ${record.fish_species?.name}`}
                          className="w-full h-48 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow border border-gray-200 dark:border-slate-600 cursor-pointer"
                          onClick={() => setIsZoomOpen(true)}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    {record.video_url && (
                      <div className="relative group">
                        <video
                          src={getR2ImageUrlProxy(record.video_url)}
                          controls
                          className="w-full h-48 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow border border-gray-200 dark:border-slate-600"
                          onError={(e) => {
                            const target = e.target as HTMLVideoElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {record.notes && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Note</h4>
                  <p className="text-yellow-700 dark:text-yellow-400">{record.notes}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {record.status === 'rejected' && record.rejection_reason && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">Motivul respingerii</h4>
                  <p className="text-red-700 dark:text-red-400">{record.rejection_reason}</p>
                </div>
              )}

              {/* Admin Info */}
              {isAdmin && record.verified_by && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Informații Admin</h4>
                  <p className="text-blue-700 dark:text-blue-400">
                    Verificat de: {record.verified_by} la {record.verified_at ? formatDate(record.verified_at) : 'N/A'}
                  </p>
                </div>
              )}

              {/* Actions - Only for Admin */}
              {isAdmin && (onEdit || onDelete) && (
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
                  {onEdit && (
                    <Button 
                      onClick={handleEdit} 
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 w-full sm:w-auto touch-manipulation"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editează
                    </Button>
                  )}

                  {onDelete && (
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="w-full sm:w-auto touch-manipulation"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isLoading ? 'Se șterge...' : 'Șterge'}
                    </Button>
                  )}
                </div>
              )}

              {/* Internal Links - Discrete, small */}
              {(record.fish_species || record.fishing_locations) && (
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-slate-700">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-gray-500 dark:text-slate-400">
                    <span className="text-gray-400 dark:text-slate-500">Vezi și alte recorduri:</span>
                    {record.fish_species && (
                      <Link
                        to={`/records?species=${createSlug(record.fish_species.name)}`}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        de {record.fish_species.name}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    )}
                    {record.fishing_locations && (
                      <>
                        <span className="text-gray-300 dark:text-slate-600">•</span>
                        <Link
                          to={`/records?location=${createSlug(record.fishing_locations.name)}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(() => {
                            const type = record.fishing_locations?.type || '';
                            const name = record.fishing_locations?.name || '';
                            if (type === 'lac' || type === 'baraj') return `pe ${name}`;
                            if (type === 'rau' || type === 'fluviu') return `pe râul ${name}`;
                            if (type === 'mare') return `pe ${name}`;
                            if (type === 'delta') return `în ${name}`;
                            return `de la ${name}`;
                          })()}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image Zoom */}
      {isZoomOpen && getImageUrl() && (
        <ImageZoom
          src={getR2ImageUrlProxy(getImageUrl()!)}
          alt={`Poza record ${record.fish_species?.name}`}
          onClose={() => setIsZoomOpen(false)}
        />
      )}
    </div>
    </>
  );
};

export default RecordDetailsModal;
