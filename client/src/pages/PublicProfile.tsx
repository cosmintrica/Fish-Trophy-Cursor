import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase, getR2ImageUrlProxy } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, Trophy, Globe, Fish, TrendingUp, Wrench, Camera, Trash2, Upload, ExternalLink, Move, Youtube, MessageSquare, Inbox, Hash, Scale, Ruler, Heart, MessageCircle } from 'lucide-react';
import RecordDetailsModal from '@/components/RecordDetailsModal';
import { CatchDetailModal } from '@/components/CatchDetailModal';
import { toast } from 'sonner';
import { usePhotoUpload } from '@/components/profile/hooks/usePhotoUpload';
import { InlineCoverEditor } from '@/components/profile/InlineCoverEditor';
import { AuthRequiredModal } from '@/components/AuthRequiredModal';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { registerUnreadCountCallback } from '@/hooks/useRealtimeMessages';
import { CatchCard } from '@/components/profile/CatchCard';

interface UserProfile {
  id: string;
  username?: string;
  display_name: string;
  email?: string;
  photo_url?: string;
  cover_photo_url?: string;
  cover_position?: any;
  cover_position_mobile?: any;
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
  fish_species?: {
    name: string;
  };
  fishing_locations?: {
    name: string;
    type: string;
    county: string;
  };
}

interface UserCatch {
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

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRecords, setUserRecords] = useState<UserRecord[]>([]);
  const [userCatches, setUserCatches] = useState<UserCatch[]>([]);
  const [userGear, setUserGear] = useState<UserGear[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<UserRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCatch, setSelectedCatch] = useState<UserCatch | null>(null);
  const [showCatchDetailModal, setShowCatchDetailModal] = useState(false);
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
            return;
          }

          setUnreadMessagesCount(data?.length || 0);
        } catch (error) {
          // Silent fail
        }
      };

      loadUnreadCount();

      // Register for instant updates via Realtime
      const unregister = registerUnreadCountCallback(loadUnreadCount);

      return () => {
        unregister();
      };
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

  // Detect if device is mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Cover Menu Positioning
  const [coverMenuPos, setCoverMenuPos] = useState({ top: 0, left: 0 });
  const coverButtonRef = useRef<HTMLButtonElement>(null);

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

  // Close cover menu when clicking outside
  useEffect(() => {
    if (!showCoverMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside cover menu
      if (!target.closest('.cover-menu-container') && !target.closest('.cover-menu-portal')) {
        setShowCoverMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showCoverMenu]);

  useEffect(() => {
    if (username) {
      loadUserData();
    }
  }, [username]);

  // Update cover position when device type changes or when profile loads
  useEffect(() => {
    if (userProfile) {
      try {
        // Use mobile position if on mobile, otherwise use desktop position
        // Fallback to the other if current device's position is not set
        const positionToParse = isMobile
          ? (userProfile.cover_position_mobile || userProfile.cover_position)
          : (userProfile.cover_position || userProfile.cover_position_mobile);

        if (positionToParse) {
          const parsed = typeof positionToParse === 'string'
            ? JSON.parse(positionToParse)
            : positionToParse;
          setCoverPosition(parsed || { x: 50, y: 50, scale: 100, rotation: 0 });
        } else {
          setCoverPosition({ x: 50, y: 50, scale: 100, rotation: 0 });
        }
      } catch {
        // Use default on error
        setCoverPosition({ x: 50, y: 50, scale: 100, rotation: 0 });
      }
    }
  }, [userProfile?.cover_position, userProfile?.cover_position_mobile, isMobile]);

  const loadUserData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Profile (Single Request)
      // We fetch all public fields needed. Privacy filtering is done in UI or via RLS if strict.
      // Support both username and ID (UUID) for profile access
      let query = supabase
        .from('profiles')
        .select('*');

      // Check if username is a UUID (ID) or a username
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username || '');

      if (isUUID) {
        query = query.eq('id', username);
      } else {
        query = query.eq('username', username?.toLowerCase());
      }

      const { data: profileDataRaw, error: profileError } = await query.single();

      if (profileError) throw profileError;
      if (!profileDataRaw) throw new Error('Profile not found');

      // Type assertion
      const profileData = profileDataRaw as UserProfile;

      // Check owner status
      let isCurrentUserOwner = false;
      let avatarUrl = profileData.photo_url;
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser && authUser.id === profileData.id) {
          isCurrentUserOwner = true;
          // Use auth metadata avatar if profile avatar is missing
          if (authUser.user_metadata?.avatar_url && !avatarUrl) {
            avatarUrl = authUser.user_metadata.avatar_url;
          }
        }
      } catch (e) { /* Ignore auth error */ }

      // Normalize URLs - keep valid URLs even if they're Google URLs
      if (avatarUrl && avatarUrl.trim() === '') {
        avatarUrl = undefined;
      }
      const coverPhotoUrl = profileData.cover_photo_url && profileData.cover_photo_url.trim() !== ''
        ? profileData.cover_photo_url
        : undefined;

      // Parse cover position - use separate columns for desktop and mobile
      let coverPos = { x: 50, y: 50, scale: 100, rotation: 0 };
      const isMobileDevice = window.innerWidth < 768;

      // Use mobile position if on mobile, otherwise use desktop position
      const positionToParse = isMobileDevice
        ? (profileData.cover_position_mobile || profileData.cover_position)
        : (profileData.cover_position || profileData.cover_position_mobile);

      if (positionToParse) {
        try {
          coverPos = typeof positionToParse === 'string'
            ? JSON.parse(positionToParse)
            : positionToParse;
        } catch { /* use default */ }
      }

      // Update Profile State
      // Ensure photo_url is properly set (even if it's a Google URL)
      const finalPhotoUrl = avatarUrl && avatarUrl.trim() !== '' ? avatarUrl : undefined;
      setUserProfile({
        ...profileData,
        photo_url: finalPhotoUrl,
        cover_photo_url: coverPhotoUrl,
        cover_position: profileData.cover_position // Store full object, not just device-specific
      });
      setCoverPosition(coverPos); // Set device-specific position
      setIsOwner(isCurrentUserOwner);

      // 2. Parallel Fetch for Related Data
      // We start all these requests at the same time
      const promises = [];

      // A. Fetch Records
      const recordsPromise = supabase
        .from('records')
        .select(`
          *,
          fish_species:species_id(name),
          fishing_locations:location_id(name, type, county)
        `)
        .eq('user_id', profileData.id)
        .in('status', ['verified', 'pending'])
        .order('weight', { ascending: false });
      promises.push(recordsPromise);

      // A2. Fetch Catches (for journal - only public or owner's catches)
      const catchesPromise = (async () => {
        try {
          const { data: catchesData, error } = await supabase
            .from('catches')
            .select(`
              *,
              fish_species:species_id (id, name, scientific_name),
              fishing_locations:location_id (id, name, type, county)
            `)
            .eq('user_id', profileData.id)
            .or(isCurrentUserOwner ? 'is_public.eq.true,is_public.eq.false' : 'is_public.eq.true')
            .order('captured_at', { ascending: false });

          if (error) {
            console.error('Error loading catches:', error);
            return { data: [], error };
          }

          // Load likes and comments for each catch
          if (catchesData && catchesData.length > 0) {
            const catchIds = catchesData.map(c => c.id);

            // Get current user ID for like check
            let currentUserId: string | undefined;
            try {
              const { data: { user: authUser } } = await supabase.auth.getUser();
              currentUserId = authUser?.id;
            } catch (e) {
              // Ignore auth errors
            }

            // Load likes (with error handling)
            let likes: any[] = [];
            try {
              const { data: likesData, error: likesError } = await supabase
                .from('catch_likes')
                .select('catch_id, user_id')
                .in('catch_id', catchIds);

              if (!likesError && likesData) {
                likes = likesData;
              }
            } catch (e) {
              console.error('Error loading likes:', e);
            }

            // Load comments count (with error handling)
            let comments: any[] = [];
            try {
              const { data: commentsData, error: commentsError } = await supabase
                .from('catch_comments')
                .select('catch_id')
                .in('catch_id', catchIds)
                .is('parent_comment_id', null);

              if (!commentsError && commentsData) {
                comments = commentsData;
              }
            } catch (e) {
              console.error('Error loading comments:', e);
            }

            // Aggregate stats
            const likeCounts = new Map<string, number>();
            const commentCounts = new Map<string, number>();
            const userLikedIds = new Set<string>();

            (likes || []).forEach(like => {
              if (like?.catch_id) {
                likeCounts.set(like.catch_id, (likeCounts.get(like.catch_id) || 0) + 1);
                if (currentUserId && like.user_id === currentUserId) {
                  userLikedIds.add(like.catch_id);
                }
              }
            });

            (comments || []).forEach(comment => {
              if (comment?.catch_id) {
                commentCounts.set(comment.catch_id, (commentCounts.get(comment.catch_id) || 0) + 1);
              }
            });

            // Add stats to catches
            const catchesWithStats = catchesData.map(catchItem => ({
              ...catchItem,
              like_count: likeCounts.get(catchItem.id) || 0,
              comment_count: commentCounts.get(catchItem.id) || 0,
              is_liked_by_current_user: userLikedIds.has(catchItem.id),
              global_id: (catchItem as any).global_id || null
            }));

            return { data: catchesWithStats, error: null };
          }

          return { data: catchesData || [], error: null };
        } catch (error: any) {
          console.error('Error in catchesPromise:', error);
          return { data: [], error };
        }
      })();
      promises.push(catchesPromise);

      // B. Fetch Gear (if public or owner)
      if (profileData.show_gear_publicly || isCurrentUserOwner) {
        const gearPromise = supabase
          .from('user_gear')
          .select('*')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false });
        promises.push(gearPromise);
      } else {
        promises.push(Promise.resolve({ data: [], error: null }));
      }

      // C. Fetch County Name (if public and exists)
      if (profileData.show_county_publicly && profileData.county_id) {
        const countyPromise = supabase
          .from('counties')
          .select('name')
          .eq('id', profileData.county_id)
          .single();
        promises.push(countyPromise);
      } else {
        promises.push(Promise.resolve({ data: null, error: null }));
      }

      // D. Fetch City Name (if public and exists)
      if (profileData.show_city_publicly && profileData.city_id) {
        const cityPromise = supabase
          .from('cities')
          .select('name')
          .eq('id', profileData.city_id)
          .single();
        promises.push(cityPromise);
      } else {
        promises.push(Promise.resolve({ data: null, error: null }));
      }

      // Wait for all requests to complete
      const [recordsResult, catchesResult, gearResult, countyResult, cityResult] = await Promise.all(promises);

      // Handle Records
      if (recordsResult.error) console.error('Error loading records:', recordsResult.error);
      setUserRecords((recordsResult.data as UserRecord[]) || []);

      // Handle Catches
      if (catchesResult.error) console.error('Error loading catches:', catchesResult.error);
      setUserCatches((catchesResult.data as UserCatch[]) || []);

      // Handle Gear
      if (gearResult.data) {
        setUserGear(gearResult.data as UserGear[]);
      }

      // Handle Location Names
      if (countyResult.data) setCountyName(countyResult.data.name);
      if (cityResult.data) setCityName(cityResult.data.name);

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

        {/* Main Profile Card - Cover + Avatar + Info + Buttons */}
        <div className="bg-white rounded-2xl shadow-xl overflow-visible border border-gray-100 relative">
          {/* Cover Photo */}
          <div className="h-48 md:h-64 lg:h-80 bg-gray-900 relative group z-0 overflow-hidden rounded-t-2xl">
            {showCoverEditor && userProfile?.cover_photo_url ? (
              <InlineCoverEditor
                coverUrl={userProfile.cover_photo_url}
                initialPosition={coverPosition}
                onSave={async (position) => {
                  // Optimistic Update: Update local state immediately
                  setCoverPosition(position);
                  setShowCoverEditor(false);

                  // Background Save - save to device-specific column
                  if (userProfile?.id) {
                    try {
                      // Determine device type
                      const isMobileDevice = window.innerWidth < 768;
                      const updateData: any = {};

                      // Update the appropriate column based on device
                      if (isMobileDevice) {
                        updateData.cover_position_mobile = position;
                        if (userProfile) {
                          setUserProfile({ ...userProfile, cover_position_mobile: position });
                        }
                      } else {
                        updateData.cover_position = position;
                        if (userProfile) {
                          setUserProfile({ ...userProfile, cover_position: position });
                        }
                      }

                      // Save to database
                      const { error } = await supabase
                        .from('profiles')
                        .update(updateData)
                        .eq('id', userProfile.id);

                      if (error) throw error;
                      toast.success(`Poziția cover-ului pentru ${isMobileDevice ? 'mobil' : 'desktop'} a fost salvată!`);
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />

                {/* Edit Cover Button */}
                {isOwner && (
                  <div className="absolute top-4 right-4 z-[100] cover-menu-container">
                    <button
                      ref={coverButtonRef}
                      onClick={() => {
                        if (!showCoverMenu && coverButtonRef.current) {
                          const rect = coverButtonRef.current.getBoundingClientRect();
                          setCoverMenuPos({
                            top: rect.bottom + 8,
                            left: rect.right
                          });
                        }
                        setShowCoverMenu(!showCoverMenu);
                      }}
                      className="bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 border border-white/10 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    {showCoverMenu && createPortal(
                      <div
                        className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 w-48 cover-menu-portal"
                        style={{
                          top: coverMenuPos.top,
                          left: coverMenuPos.left,
                          transform: 'translateX(-100%)'
                        }}
                      >
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
                      </div>,
                      document.body
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Profile Header Content - Info + Buttons (positioned to the right of avatar) */}
          <div className="px-4 pb-6 pt-6 md:px-6 md:pl-56 lg:pl-60 relative z-20 bg-white rounded-b-2xl">
            {/* Avatar Container - Positioned absolutely overlapping cover */}
            <div
              ref={avatarContainerRef}
              className="absolute left-1/2 -translate-x-1/2 md:left-8 md:translate-x-0 -top-[60px] md:-top-[90px] z-50 avatar-menu-container w-[120px] h-[120px] md:w-[180px] md:h-[180px]"
            >
              {/* Avatar with Border - Circular */}
              <div
                className="relative w-full h-full bg-white group/avatar cursor-pointer"
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
                  {userProfile?.photo_url && userProfile.photo_url.trim() !== '' ? (
                    <img
                      src={userProfile.photo_url}
                      alt={userProfile?.display_name || 'Avatar'}
                      className="w-full h-full object-cover"
                      style={{ borderRadius: '50%' }}
                      crossOrigin="anonymous"
                      onError={(e) => {
                        // Hide image on error, show fallback
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      className="w-full h-full bg-slate-100 text-slate-400 font-bold text-5xl flex items-center justify-center"
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
                    {userProfile?.photo_url && (
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3 pt-14 md:pt-0">
              <div className="min-w-0 text-center md:text-left">
                {userProfile?.username ? (
                  <Link
                    to={`/profile/${userProfile.username}`}
                    className="text-xl md:text-2xl font-bold text-gray-900 leading-tight hover:text-blue-600 transition-colors cursor-pointer inline-block"
                  >
                    {userProfile?.display_name || 'Utilizator'}
                  </Link>
                ) : (
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                    {userProfile?.display_name || 'Utilizator'}
                  </h1>
                )}
                <p className="text-gray-500 font-medium text-xs md:text-sm mt-1 flex items-center gap-2 justify-center md:justify-start">
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

                {/* Bio */}
                {userProfile?.bio && (
                  <p className="text-gray-600 mt-2 text-sm leading-relaxed max-w-2xl mx-auto md:mx-0">
                    {userProfile.bio}
                  </p>
                )}
              </div>

              {/* Actions - Right Side */}
              <div className="flex flex-row gap-2 shrink-0 justify-center md:justify-start w-full md:w-auto">
                {isOwner ? (
                  <>
                    <Link
                      to="/messages?context=site"
                      className="relative px-3 py-1.5 bg-gray-100 text-gray-900 text-xs md:text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Inbox className="w-3.5 h-3.5" />
                      Inbox
                      {unreadMessagesCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-white shadow-lg">
                          {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                        </span>
                      )}
                    </Link>
                    <a
                      href="/profile"
                      className="px-3 py-1.5 bg-gray-900 text-white text-xs md:text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                    >
                      Editează profilul
                    </a>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        if (user) {
                          navigate(`/messages?context=site&to=${userProfile?.username || ''}`);
                        } else {
                          setShowAuthRequiredModal(true);
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs md:text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Mesaj privat
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Card - Stats + Trophies + Gear */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 relative">
          <div className="px-4 md:px-6 py-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Trophy Showcase */}
              <div className="lg:col-span-2 space-y-6">
                {topThree.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      Sala Trofeelor
                    </h2>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      {topThree.map((record, index) => {
                        const medals = ['🥇', '🥈', '🥉'];
                        const bgs = ['bg-amber-50 border-amber-100', 'bg-slate-50 border-slate-100', 'bg-orange-50 border-orange-100'];

                        return (
                          <div
                            key={record.id}
                            className={`rounded-lg sm:rounded-xl border ${bgs[index]} p-2 sm:p-3 cursor-pointer hover:-translate-y-1 transition-transform`}
                            onClick={() => openRecordModal(record)}
                          >
                            <div className="aspect-square rounded-md sm:rounded-lg overflow-hidden bg-white mb-2 sm:mb-3 relative shadow-sm">
                              {(record.image_url || record.photo_url) ? (
                                <img
                                  src={getR2ImageUrlProxy(record.image_url || record.photo_url!)}
                                  className="w-full h-full object-cover"
                                  alt={record.fish_species?.name || 'Record'}
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                  <Fish className="w-8 h-8" />
                                </div>
                              )}
                              <div className="absolute top-1 left-1 sm:top-2 sm:left-2 text-lg sm:text-2xl drop-shadow-sm">{medals[index]}</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-gray-900 truncate text-xs sm:text-sm">{record.fish_species?.name}</div>
                              <div className="text-xs sm:text-sm font-semibold text-blue-600">{record.weight} kg</div>
                              <div className="text-[10px] sm:text-xs text-gray-500 truncate">{record.fishing_locations?.name}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Activity / All Catches */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Fish className="w-5 h-5 text-blue-600" />
                    Jurnal de Capturi
                  </h2>

                  {userCatches.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      Nu există capturi înregistrate.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {userCatches.map((catchItem) => (
                        <CatchCard
                          key={catchItem.id}
                          catchItem={catchItem}
                          onCatchClick={() => {
                            setSelectedCatch(catchItem);
                            setShowCatchDetailModal(true);
                          }}
                        />
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
        </div>
      </div>

      <RecordDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        record={selectedRecord}
      />

      {/* Catch Detail Modal */}
      {selectedCatch && (
        <CatchDetailModal
          catchItem={selectedCatch as any}
          isOpen={showCatchDetailModal}
          onClose={() => {
            setShowCatchDetailModal(false);
            setSelectedCatch(null);
          }}
          onCatchUpdated={() => {
            // Don't reload entire page, just update the catch in the list
            // The modal handles its own state updates
          }}
          isOwner={isOwner}
          onEdit={undefined}
        />
      )}


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
    </div >
  );
};

export default PublicProfile;
