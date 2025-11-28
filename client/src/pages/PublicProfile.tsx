import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, Trophy, Globe, Fish, TrendingUp, Wrench, Camera, Trash2, Upload, ExternalLink, Move, Youtube, MessageSquare, Inbox } from 'lucide-react';
import RecordDetailsModal from '@/components/RecordDetailsModal';
import { toast } from 'sonner';
import { usePhotoUpload } from '@/components/profile/hooks/usePhotoUpload';
import { InlineCoverEditor } from '@/components/profile/InlineCoverEditor';
import { AuthRequiredModal } from '@/components/AuthRequiredModal';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  id: string;
  username?: string;
  display_name: string;
  email: string;
  photo_url?: string;
  avatar_url?: string;
  cover_photo_url?: string;
  cover_position?: any;
  bio?: string;
  location?: string;
  county_id?: string;
  city_id?: string;
  website?: string;
  youtube_channel?: string;
  show_gear_publicly?: boolean;
  show_county_publicly?: boolean;
  show_city_publicly?: boolean;
  show_website_publicly?: boolean;
  show_youtube_publicly?: boolean;
  created_at: string;
}

interface UserGear {
  id: string;
  brand: string;
  model: string;
  gear_type: string;
  description?: string;
  quantity: number;
  purchase_price?: number;
  purchase_date?: string;
}

interface UserRecord {
  id: string;
  user_id: string;
  species_id: string;
  location_id: string;
  weight: number;
  length_cm: number;
  captured_at: string;
  notes?: string;
  photo_url?: string;
  video_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  fish_species?: {
    name: string;
  };
  fishing_locations?: {
    name: string;
    type: string;
    county: string;
  };
}

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRecords, setUserRecords] = useState<UserRecord[]>([]);
  const [userGear, setUserGear] = useState<UserGear[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<UserRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [countyName, setCountyName] = useState<string>('');
  const [cityName, setCityName] = useState<string>('');
  const [showAuthRequiredModal, setShowAuthRequiredModal] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Track if we just uploaded a cover to auto-open editor
  const [justUploadedCover, setJustUploadedCover] = useState(false);
  
  // Load unread messages count for owner
  useEffect(() => {
    if (isOwner && user?.id) {
      const loadUnreadCount = async () => {
        try {
          const { data, error } = await supabase
            .from('private_messages')
            .select('id', { count: 'exact', head: false })
            .eq('recipient_id', user.id)
            .eq('is_read', false)
            .eq('is_deleted_by_recipient', false)
            .eq('is_archived_by_recipient', false)
            .eq('context', 'site');

          if (error) {
            console.error('Error loading unread messages count:', error);
            return;
          }

          setUnreadMessagesCount(data?.length || 0);
        } catch (error) {
          console.error('Error loading unread messages count:', error);
        }
      };

      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadMessagesCount(0);
    }
  }, [isOwner, user?.id]);
  
  // Photo upload
  const handleProfileReload = () => {
    if (userProfile?.id) {
      loadUserData();
    }
  };
  
  const { isUploadingAvatar, isUploadingCover, uploadPhoto, deletePhoto } = usePhotoUpload(
    userProfile?.id, 
    handleProfileReload
  );
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [showCoverMenu, setShowCoverMenu] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [coverPosition, setCoverPosition] = useState({ x: 50, y: 50, scale: 100, rotation: 0 });
  
  // Auto-open cover editor after upload
  useEffect(() => {
    if (justUploadedCover && userProfile?.cover_photo_url && !isUploadingCover) {
      // Small delay to ensure cover is loaded
      const timer = setTimeout(() => {
        setShowCoverEditor(true);
        setJustUploadedCover(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [justUploadedCover, userProfile?.cover_photo_url, isUploadingCover]);

  // Avatar Menu Positioning
  const [avatarMenuPos, setAvatarMenuPos] = useState({ top: 0, left: 0 });
  const avatarContainerRef = useRef<HTMLDivElement>(null);

  // Cleanup portals on unmount
  useEffect(() => {
    return () => {
      // Close menus on unmount to prevent portal errors
      setShowAvatarMenu(false);
      setShowCoverMenu(false);
    };
  }, []);

  // Close avatar menu when clicking outside
  useEffect(() => {
    if (!showAvatarMenu) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside avatar menu
      if (!target.closest('.avatar-menu-container') && !target.closest('.avatar-menu-portal')) {
        setShowAvatarMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showAvatarMenu]);

  useEffect(() => {
    if (username) {
      loadUserData();
    }
  }, [username]);

  const loadUserData = async () => {
    try {
      setLoading(true);

      // Load user profile by username - respect ALL privacy settings
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, photo_url, cover_photo_url, cover_position, bio, show_gear_publicly, show_county_publicly, show_city_publicly, show_website_publicly, show_youtube_publicly, role, created_at, updated_at')
        .eq('username', username?.toLowerCase())
        .single();
      
      // Load website and YouTube ONLY if user chose to make them public
      if (profileData?.show_website_publicly) {
        const { data: websiteData } = await supabase
          .from('profiles')
          .select('website')
          .eq('id', profileData.id)
          .single();
        if (websiteData?.website) {
          profileData.website = websiteData.website;
        }
      }
      
      if (profileData?.show_youtube_publicly) {
        const { data: youtubeData } = await supabase
          .from('profiles')
          .select('youtube_channel')
          .eq('id', profileData.id)
          .single();
        if (youtubeData?.youtube_channel) {
          profileData.youtube_channel = youtubeData.youtube_channel;
        }
      }

      if (profileError) throw profileError;

      // Get avatar from profiles table or auth metadata
      let avatarUrl = profileData.avatar_url || profileData.photo_url;
      // Normalize empty strings to null
      if (avatarUrl && avatarUrl.trim() === '') {
        avatarUrl = null;
      }

      // Check if current user is owner
      let isCurrentUserOwner = false;
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser && authUser.id === profileData.id) {
          isCurrentUserOwner = true;
          if (authUser.user_metadata?.avatar_url) {
            const metadataAvatar = authUser.user_metadata.avatar_url;
            if (metadataAvatar && metadataAvatar.trim() !== '') {
              avatarUrl = metadataAvatar;
            }
          }
        }
      } catch (e) {
        // Ignore auth errors for public profiles
      }

      // Load cover position if exists
      let coverPos = { x: 50, y: 50, scale: 100, rotation: 0 };
      if (profileData.cover_position) {
        if (typeof profileData.cover_position === 'string') {
          try {
            coverPos = JSON.parse(profileData.cover_position);
          } catch {
            coverPos = { x: 50, y: 50, scale: 100, rotation: 0 };
          }
        } else if (typeof profileData.cover_position === 'object') {
          coverPos = profileData.cover_position as { x: number; y: number; scale: number; rotation: number };
        }
      }

      // Normalize cover_photo_url - empty strings to null
      const coverPhotoUrl = profileData.cover_photo_url && profileData.cover_photo_url.trim() !== '' 
        ? profileData.cover_photo_url 
        : null;
      
      // Normalize avatar_url - empty strings to null
      const finalAvatarUrl = avatarUrl && avatarUrl.trim() !== '' ? avatarUrl : null;
      
      setUserProfile({
        ...profileData,
        avatar_url: finalAvatarUrl,
        cover_photo_url: coverPhotoUrl
      });
      setCoverPosition(coverPos);
      setIsOwner(isCurrentUserOwner);

      // Load county and city names ONLY if user has chosen to make them public
      if (profileData.show_county_publicly && profileData.county_id) {
        // Need to fetch county_id separately if it's public
        const { data: profileWithLocation } = await supabase
          .from('profiles')
          .select('county_id, city_id')
          .eq('id', profileData.id)
          .single();
        
        if (profileWithLocation?.county_id) {
          const { data: countyData } = await supabase
            .from('counties')
            .select('name')
            .eq('id', profileWithLocation.county_id)
            .single();
          if (countyData) {
            setCountyName(countyData.name);
          }
        }
      }

      if (profileData.show_city_publicly) {
        // Need to fetch city_id separately if it's public
        const { data: profileWithLocation } = await supabase
          .from('profiles')
          .select('city_id')
          .eq('id', profileData.id)
          .single();
        
        if (profileWithLocation?.city_id) {
          const { data: cityData } = await supabase
            .from('cities')
            .select('name')
            .eq('id', profileWithLocation.city_id)
            .single();
          if (cityData) {
            setCityName(cityData.name);
          }
        }
      }

      // Load user records
      const { data: recordsData, error: recordsError } = await supabase
        .from('records')
        .select(`
          *,
          fish_species:species_id(name),
          fishing_locations:location_id(name, type, county)
        `)
        .eq('user_id', profileData.id)
        .in('status', ['verified', 'pending'])
        .order('weight', { ascending: false });

      if (recordsError) throw recordsError;
      setUserRecords(recordsData || []);

      // Load user gear if public
      if (profileData.show_gear_publicly) {
        const { data: gearData, error: gearError } = await supabase
          .from('user_gear')
          .select('*')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false });

        if (!gearError) {
          setUserGear(gearData || []);
        }
      }

    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Nu s-a putut încărca profilul');
    } finally {
      setLoading(false);
    }
  };

  const handleCoverUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadPhoto(e.target.files[0], 'cover');
      setShowCoverMenu(false);
      // Auto-open cover editor after successful upload
      setJustUploadedCover(true);
    }
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadPhoto(e.target.files[0], 'avatar');
      setShowAvatarMenu(false);
    }
  };

  const handleCoverDelete = async () => {
    await deletePhoto('cover');
    setShowCoverMenu(false);
  };

  const handleAvatarDelete = async () => {
    await deletePhoto('avatar');
    setShowAvatarMenu(false);
  };

  const openRecordModal = (record: UserRecord) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const formatWebsiteUrl = (url: string) => {
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  };

  const getYoutubeChannelName = (channel: string) => {
    const match = channel.match(/(?:youtube\.com\/(?:c\/|channel\/|user\/)|youtu\.be\/)([^\/\?]+)/);
    if (match) {
      return match[1];
    }
    return channel.replace('https://', '').replace('www.', '').split('/').pop() || channel;
  };

  // Calculate stats
  const verifiedRecords = userRecords.filter(r => r.status === 'verified');
  const totalCatches = verifiedRecords.length;
  const biggestCatch = verifiedRecords.length > 0 ? verifiedRecords[0] : null;
  const uniqueLocations = new Set(verifiedRecords.map(r => r.location_id)).size;
  const memberSince = userProfile ? new Date(userProfile.created_at) : new Date();
  const daysSinceMember = Math.floor((new Date().getTime() - memberSince.getTime()) / (1000 * 60 * 60 * 24));

  // Get top 3 for trophy showcase
  const topThree = verifiedRecords.slice(0, 3);

  // Handle Avatar Click to calculate menu position
  const handleAvatarClick = (e: React.MouseEvent) => {
    if (isOwner) {
      e.stopPropagation();
      if (avatarContainerRef.current) {
        const rect = avatarContainerRef.current.getBoundingClientRect();
        setAvatarMenuPos({
          top: rect.bottom + window.scrollY + 10,
          left: rect.left + rect.width / 2
        });
      }
      setShowAvatarMenu(!showAvatarMenu);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="bg-gray-200 h-64 rounded-2xl"></div>
            <div className="h-32 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <Card>
            <CardContent className="p-12 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Profilul nu a fost găsit</h1>
              <p className="text-gray-600">Utilizatorul cu acest ID nu există sau profilul este privat.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Main Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative">
          {/* Cover Photo */}
          <div className="h-64 md:h-80 lg:h-96 bg-gray-900 relative group z-0 -mb-32 md:-mb-36 lg:-mb-40">
            {showCoverEditor && userProfile?.cover_photo_url ? (
              <InlineCoverEditor
                coverUrl={userProfile.cover_photo_url}
                initialPosition={coverPosition}
                onSave={async (position) => {
                  // Optimistic Update: Update local state immediately
                  setCoverPosition(position);
                  if (userProfile) {
                    setUserProfile({ ...userProfile, cover_position: position });
                  }
                  setShowCoverEditor(false);

                  // Background Save
                  if (userProfile?.id) {
                    try {
                      const { error } = await supabase
                        .from('profiles')
                        .update({ cover_position: position })
                        .eq('id', userProfile.id);
                      if (error) throw error;
                      toast.success('Poziția cover-ului a fost salvată!');
                    } catch (error: any) {
                      console.error('Error saving cover position:', error);
                      toast.error(`Eroare la salvare: ${error.message || 'Necunoscută'}`);
                    }
                  }
                }}
                onCancel={() => setShowCoverEditor(false)}
              />
            ) : (
              <>
                <div className="absolute inset-0 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{
                      backgroundImage: userProfile?.cover_photo_url ? `url(${userProfile.cover_photo_url})` : undefined,
                      backgroundPosition: `${coverPosition.x}% ${coverPosition.y}%`,
                      backgroundSize: `${coverPosition.scale}% auto`,
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                </div>
                {!userProfile?.cover_photo_url && (
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Edit Cover Button */}
                {isOwner && (
                  <div className="absolute top-4 right-4 z-10">
                    <button
                      onClick={() => setShowCoverMenu(!showCoverMenu)}
                      className="bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 border border-white/10 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    {showCoverMenu && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="py-1">
                          <label className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
                            <Upload className="w-4 h-4" />
                            Încarcă cover
                            <input
                              ref={coverInputRef}
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleCoverUpload}
                              disabled={isUploadingCover}
                            />
                          </label>
                          {userProfile?.cover_photo_url && (
                            <button
                              onClick={() => {
                                setShowCoverEditor(true);
                                setShowCoverMenu(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Move className="w-4 h-4" />
                              Editează poziția
                            </button>
                          )}
                          {userProfile?.cover_photo_url && (
                            <button
                              onClick={handleCoverDelete}
                              disabled={isUploadingCover}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              Șterge cover
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Profile Header Content */}
          <div className="px-6 pb-6 md:px-10 relative z-20 bg-white">
            <div className="flex flex-col md:flex-row gap-6 items-end -mt-12 md:-mt-16 justify-center md:justify-start">

              {/* Avatar Container */}
              <div
                ref={avatarContainerRef}
                className="relative shrink-0 z-30 mx-auto md:mx-0 avatar-menu-container"
              >
                {/* Avatar with Border - Circular */}
                <div
                  className="relative w-32 h-32 md:w-40 md:h-40 bg-white group/avatar cursor-pointer"
                  style={{
                    borderRadius: '50%',
                    border: '4px solid white',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                  }}
                  onClick={handleAvatarClick}
                >
                  {/* Image Container */}
                  <div
                    className="w-full h-full overflow-hidden"
                    style={{ borderRadius: '50%' }}
                  >
                    {userProfile?.avatar_url || userProfile?.photo_url ? (
                      <img
                        src={userProfile.avatar_url || userProfile.photo_url}
                        alt={userProfile?.display_name || 'Avatar'}
                        className="w-full h-full object-cover"
                        style={{ borderRadius: '50%' }}
                      />
                    ) : (
                      <div
                        className="w-full h-full bg-slate-100 text-slate-400 font-bold text-4xl flex items-center justify-center"
                        style={{ borderRadius: '50%' }}
                      >
                        {userProfile?.display_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>

                  {/* Hover Overlay */}
                  {isOwner && (
                    <div
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all pointer-events-none"
                      style={{ borderRadius: '50%' }}
                    >
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>

                {/* Menu - Using Portal to escape overflow-hidden */}
                {isOwner && showAvatarMenu && createPortal(
                  <div
                    className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 w-48 avatar-menu-portal"
                    style={{
                      top: avatarMenuPos.top,
                      left: avatarMenuPos.left,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <div className="py-1">
                      <label className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer block">
                        <Upload className="w-4 h-4" />
                        Încarcă avatar
                        <input
                          ref={avatarInputRef}
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={isUploadingAvatar}
                        />
                      </label>
                      {userProfile?.avatar_url && (
                        <button
                          onClick={handleAvatarDelete}
                          disabled={isUploadingAvatar}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Șterge avatar
                        </button>
                      )}
                    </div>
                  </div>,
                  document.body
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left mb-2 w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    {userProfile?.username ? (
                      <Link
                        to={`/profile/${userProfile.username}`}
                        className="text-3xl font-bold text-gray-900 leading-tight hover:text-blue-600 transition-colors cursor-pointer inline-block"
                      >
                        {userProfile?.display_name || 'Utilizator'}
                      </Link>
                    ) : (
                      <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                        {userProfile?.display_name || 'Utilizator'}
                      </h1>
                    )}
                    <p className="text-gray-500 font-medium text-sm mt-1 flex items-center justify-center md:justify-start gap-2">
                      {(() => {
                        const locationParts: string[] = [];
                        if (userProfile?.show_county_publicly && countyName) {
                          locationParts.push(countyName);
                        }
                        if (userProfile?.show_city_publicly && cityName) {
                          locationParts.push(cityName);
                        }
                        const locationText = locationParts.join(', ');
                        return locationText ? (
                          <>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {locationText}
                            </span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          </>
                        ) : null;
                      })()}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Membru din {memberSince.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' })}
                      </span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-end">
                    {isOwner ? (
                      <>
                        <Link
                          to="/messages?context=site"
                          className="relative px-5 py-2 bg-gray-100 text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                          <Inbox className="w-4 h-4" />
                          Inbox
                          {unreadMessagesCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 border-2 border-white shadow-lg">
                              {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                            </span>
                          )}
                        </Link>
                        <a
                          href="/profile"
                          className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                        >
                          Editează profilul
                        </a>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            if (user) {
                              window.location.href = `/messages?context=site&to=${userProfile?.username || ''}`;
                            } else {
                              setShowAuthRequiredModal(true);
                            }
                          }}
                          className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 flex items-center justify-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Mesaj privat
                        </button>
                        <button className="px-5 py-2 bg-gray-100 text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors shadow-sm">
                          Urmărește
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {userProfile?.bio && (
                  <p className="text-gray-600 mt-4 text-sm leading-relaxed max-w-2xl mx-auto md:mx-0">
                    {userProfile.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Capturi Totale', value: totalCatches, icon: Fish, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Record Personal', value: biggestCatch ? `${biggestCatch.weight} kg` : '-', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Locații', value: uniqueLocations, icon: MapPin, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Zile Membru', value: daysSinceMember, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 leading-none">{stat.value}</div>
                <div className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-wide">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Trophy Showcase */}
          <div className="lg:col-span-2 space-y-6">
            {topThree.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Sala Trofeelor
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {topThree.map((record, index) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    const bgs = ['bg-amber-50 border-amber-100', 'bg-slate-50 border-slate-100', 'bg-orange-50 border-orange-100'];

                    return (
                      <div
                        key={record.id}
                        className={`rounded-xl border ${bgs[index]} p-3 cursor-pointer hover:-translate-y-1 transition-transform`}
                        onClick={() => openRecordModal(record)}
                      >
                        <div className="aspect-square rounded-lg overflow-hidden bg-white mb-3 relative shadow-sm">
                          {record.photo_url ? (
                            <img src={record.photo_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Fish className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2 text-2xl drop-shadow-sm">{medals[index]}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-gray-900 truncate">{record.fish_species?.name}</div>
                          <div className="text-sm font-semibold text-blue-600">{record.weight} kg</div>
                          <div className="text-xs text-gray-500 truncate">{record.fishing_locations?.name}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Activity / All Records */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Fish className="w-5 h-5 text-blue-600" />
                Jurnal de Capturi
              </h2>

              {userRecords.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  Nu există capturi înregistrate.
                </div>
              ) : (
                <div className="space-y-3">
                  {userRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100 group"
                      onClick={() => openRecordModal(record)}
                    >
                      <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0 relative">
                        {record.photo_url ? (
                          <img src={record.photo_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Fish className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-gray-900 truncate pr-2">{record.fish_species?.name}</h3>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                            {new Date(record.captured_at).toLocaleDateString('ro-RO')}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {record.fishing_locations?.name}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm">
                          <span className="font-semibold text-blue-600 bg-blue-50 px-1.5 rounded">{record.weight} kg</span>
                          <span className="text-gray-600 bg-gray-100 px-1.5 rounded">{record.length_cm} cm</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Details & Gear */}
          <div className="space-y-6">
            {/* About Card - Only show if there's at least one public field */}
            {(() => {
              const hasPublicWebsite = userProfile?.website && userProfile?.show_website_publicly;
              const hasPublicYouTube = userProfile?.youtube_channel && userProfile?.show_youtube_publicly;
              const hasPublicLocation = (userProfile?.show_county_publicly && countyName) || (userProfile?.show_city_publicly && cityName);
              
              // Only show section if at least one field is public
              if (!hasPublicWebsite && !hasPublicYouTube && !hasPublicLocation) {
                return null;
              }

              return (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Despre</h3>
                  <div className="space-y-4 text-sm">
                    {hasPublicWebsite && (
                      <div className="flex items-center gap-3 text-gray-600">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">Website</div>
                          <a
                            href={userProfile.website.startsWith('http') ? userProfile.website : `https://${userProfile.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {formatWebsiteUrl(userProfile.website)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}

                    {hasPublicYouTube && (
                      <div className="flex items-center gap-3 text-gray-600">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                          <Youtube className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">YouTube</div>
                          <a
                            href={userProfile.youtube_channel.startsWith('http') ? userProfile.youtube_channel : `https://${userProfile.youtube_channel}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {getYoutubeChannelName(userProfile.youtube_channel)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}

                    {hasPublicLocation && (
                      <div className="flex items-center gap-3 text-gray-600">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">Locație</div>
                          <div>
                            {(() => {
                              const locationParts: string[] = [];
                              if (userProfile?.show_county_publicly && countyName) {
                                locationParts.push(countyName);
                              }
                              if (userProfile?.show_city_publicly && cityName) {
                                locationParts.push(cityName);
                              }
                              return locationParts.join(', ');
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Gear Card - Dark Theme Single Panel */}
            {userProfile?.show_gear_publicly && userGear.length > 0 && (
              <div className="bg-slate-900 rounded-2xl shadow-xl p-6 border border-slate-800">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-white" />
                  Echipament
                </h3>

                <div className="space-y-3">
                  {userGear.map((gear) => {
                    const getGearIcon = (type: string) => {
                      switch (type.toLowerCase()) {
                        case 'undita': return '🎣 Undiță';
                        case 'mulineta': return '⚙️ Mulinetă';
                        case 'scaun': return '🪑 Scaun';
                        case 'rucsac': return '🎒 Rucsac';
                        case 'vesta': return '🦺 Vestă';
                        case 'cizme': return '👢 Cizme';
                        case 'nada': return '🌽 Nadă';
                        case 'fir': return '🧵 Fir';
                        case 'carlige': return '🪝 Cârlige';
                        default: return `🔧 ${type.charAt(0).toUpperCase() + type.slice(1)}`;
                      }
                    };

                    return (
                      <div key={gear.id} className="bg-slate-800/40 hover:bg-slate-800 transition-all duration-300 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600 group">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1.5 w-full">
                            {/* Gear Type Title with Emoji */}
                            <div className="flex items-center justify-between">
                              <div className="text-blue-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 bg-blue-950/30 px-2 py-0.5 rounded border border-blue-900/30">
                                {getGearIcon(gear.gear_type)}
                              </div>
                              {gear.quantity > 1 && (
                                <div className="bg-slate-700 text-slate-200 px-2 py-0.5 rounded text-[10px] font-bold font-mono shadow-sm border border-slate-600">
                                  x{gear.quantity}
                                </div>
                              )}
                            </div>

                            <h4 className="font-bold text-lg text-white leading-tight group-hover:text-blue-200 transition-colors">
                              {gear.brand} <span className="text-slate-400 font-normal text-base">{gear.model}</span>
                            </h4>

                            {gear.description && (
                              <p className="text-slate-400 text-sm leading-relaxed pl-1">
                                {gear.description}
                              </p>
                            )}

                            {/* Details Footer */}
                            {(gear.purchase_price || gear.purchase_date) && (
                              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-700/50">
                                {gear.purchase_price && (
                                  <div className="flex items-center text-xs text-emerald-400 font-medium bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50">
                                    <span className="mr-1.5 text-sm">💰</span>
                                    {gear.purchase_price} RON
                                  </div>
                                )}
                                {gear.purchase_date && (
                                  <div className="flex items-center text-xs text-slate-400 bg-slate-700/30 px-2 py-1 rounded border border-slate-700/50">
                                    <Calendar className="w-3 h-3 mr-1.5 opacity-70" />
                                    {new Date(gear.purchase_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <RecordDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        record={selectedRecord}
      />

      {/* Auth Required Modal */}
      <AuthRequiredModal
        isOpen={showAuthRequiredModal}
        onClose={() => setShowAuthRequiredModal(false)}
        onLogin={() => {
          setShowAuthRequiredModal(false);
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
        }}
        onRegister={() => {
          setShowAuthRequiredModal(false);
          setAuthModalMode('register');
          setIsAuthModalOpen(true);
        }}
        title="Autentificare necesară"
        message="Trebuie să fii autentificat pentru a trimite un mesaj privat."
        actionName="trimiterea unui mesaj privat"
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </div>
  );
};

export default PublicProfile;
