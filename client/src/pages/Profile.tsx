import { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Wrench, User, Settings, Fish } from 'lucide-react';
import { toast } from 'sonner';

// Modular Components
import { ProfileSidebar } from '@/components/profile/ProfileSidebar';
import { RecordsTab } from '@/components/profile/tabs/RecordsTab';
import { GearTab } from '@/components/profile/tabs/GearTab';
import { ProfileEditTab } from '@/components/profile/tabs/ProfileEditTab';
import { SettingsTab } from '@/components/profile/tabs/SettingsTab';

// Custom Hooks
import { useRecords } from '@/components/profile/hooks/useRecords';
import { useProfileData } from '@/components/profile/hooks/useProfileData';
import { useGear } from '@/components/profile/hooks/useGear';
import { usePhotoUpload } from '@/components/profile/hooks/usePhotoUpload';

// Modals
import RecordSubmissionModal from '@/components/RecordSubmissionModal';
import EditRecordModal from '@/components/EditRecordModal';
import { RecordDetailsModal } from '@/components/modals/RecordDetailsModal';

const Profile = () => {
  const { user, logout } = useAuth();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = user?.email === adminEmail;

  // Hooks
  const { records, loadingRecords, loadUserRecords } = useRecords(user?.id);
  const {
    profileData, setProfileData,
    selectedCounty, setSelectedCounty,
    selectedCity, setSelectedCity,
    counties, cities,
    isUpdatingProfile,
    loadCounties, loadCities, loadProfile, updateProfile
  } = useProfileData(user?.id);
  const { userGear, isLoadingGear, loadUserGear } = useGear(user?.id);

  // Photo Upload Hook - Smart reload without page refresh
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (user?.user_metadata?.avatar_url) {
      setAvatarUrl(user.user_metadata.avatar_url);
    } else if (user?.id) {
      // Load from profile
      supabase
        .from('profiles')
        .select('photo_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.photo_url) {
            setAvatarUrl(data.photo_url);
          }
        });
    }
  }, [user?.user_metadata?.avatar_url, user?.id]);

  const handleProfileReload = useCallback(() => {
    loadProfile();
    // Refresh user session to get updated avatar
    supabase.auth.getUser().then(({ data: { user: updatedUser } }) => {
      if (updatedUser?.user_metadata?.avatar_url) {
        setAvatarUrl(updatedUser.user_metadata.avatar_url);
      } else {
        // Fallback to profile photo_url
        supabase
          .from('profiles')
          .select('photo_url')
          .eq('id', updatedUser?.id)
          .single()
          .then(({ data }) => {
            if (data?.photo_url) {
              setAvatarUrl(data.photo_url);
            } else {
              setAvatarUrl(null);
            }
          });
      }
    });
  }, [loadProfile]);

  const { isUploadingAvatar, uploadPhoto, deletePhoto } = usePhotoUpload(user?.id, handleProfileReload);

  // Handle avatar upload
  const handleProfileImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) {
      toast.error('Fișierul nu a fost selectat sau utilizatorul nu este autentificat');
      return;
    }
    await uploadPhoto(file, 'avatar');
  };

  // Handle avatar delete
  const handleAvatarDelete = async () => {
    if (!user?.id) return;
    await deletePhoto('avatar');
  };

  // Google Auth Status
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);

  const checkGoogleAuthStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      const hasGoogleProvider = user.app_metadata?.provider === 'google' ||
                               user.app_metadata?.providers?.includes('google') ||
                               user.identities?.some((identity: { provider: string }) => identity.provider === 'google');

      setIsGoogleUser(hasGoogleProvider);
      
      // For Google OAuth users, check if password is set by checking profile_completed flag
      if (hasGoogleProvider) {
        // If profile_completed is true, password is already set
        const profileCompleted = user.user_metadata?.profile_completed === true;
        setNeedsPassword(!profileCompleted);
      } else {
        // For non-Google users, check if they have email provider (password auth)
        setNeedsPassword(!user.app_metadata?.providers?.includes('email'));
      }
    } catch (error) {
      console.error('Error checking Google Auth status:', error);
    }
  }, [user]);

  // Modal States
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Prevent double loading
  const hasLoadedRef = useRef(false);
  const loadedUserIdRef = useRef<string | null>(null);

  // Initial Data Load
  useEffect(() => {
    if (user?.id) {
      // Skip if already loaded for this user
      if (hasLoadedRef.current && loadedUserIdRef.current === user.id) {
        return;
      }

      console.log('Profile: Loading initial data for user', user.id);
      hasLoadedRef.current = true;
      loadedUserIdRef.current = user.id;

      const loadDataSequentially = async () => {
        await loadCounties();
        await loadProfile();
        await checkGoogleAuthStatus();
        await loadUserGear();
        await loadUserRecords();
      };
      loadDataSequentially();
    } else {
      // Reset when user logs out
      hasLoadedRef.current = false;
      loadedUserIdRef.current = null;
    }
  }, [user?.id, loadCounties, loadProfile, checkGoogleAuthStatus, loadUserGear, loadUserRecords]);

  const handleViewRecord = (record: any) => {
    setSelectedRecord(record);
    setIsDetailsModalOpen(true);
  };

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setIsEditModalOpen(true);
  };

  const handleRecordAdded = () => {
    loadUserRecords();
    setShowRecordModal(false);
    toast.success('Record adăugat cu succes!');
  };

  const handleRecordEdited = () => {
    loadUserRecords();
    setIsEditModalOpen(false);
    setEditingRecord(null);
    toast.success('Record actualizat cu succes!');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Trebuie să fii autentificat</h1>
          <p className="text-gray-600">Conectează-te pentru a-ți vedea profilul</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Setări</h1>
          <p className="text-gray-600">Gestionează-ți contul și recordurile</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Cu upload avatar */}
          <ProfileSidebar
            user={user}
            profileData={profileData}
            recordsCount={records.length}
            onLogout={logout}
            onAvatarUpload={handleProfileImageUpload}
            onAvatarDelete={handleAvatarDelete}
            isUploadingAvatar={isUploadingAvatar}
            avatarUrl={avatarUrl}
          />

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="records" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="records" className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4" />
                  <span className="hidden sm:inline">Recorduri</span>
                </TabsTrigger>
                <TabsTrigger value="catches" className="flex items-center space-x-2">
                  <Fish className="w-4 h-4" />
                  <span className="hidden sm:inline">Capturi</span>
                </TabsTrigger>
                <TabsTrigger value="gear" className="flex items-center space-x-2">
                  <Wrench className="w-4 h-4" />
                  <span className="hidden sm:inline">Echipamente</span>
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Profil</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Setări</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="records" className="space-y-6">
                <RecordsTab
                  userId={user.id}
                  isAdmin={isAdmin}
                  records={records}
                  loadingRecords={loadingRecords}
                  onShowRecordModal={() => setShowRecordModal(true)}
                  onViewRecord={handleViewRecord}
                  onEditRecord={handleEditRecord}
                  onRecordAdded={handleRecordAdded}
                />
              </TabsContent>

              <TabsContent value="catches" className="space-y-6">
                <div className="text-center py-12 text-gray-500">
                  <Fish className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Jurnal de Capturi - În curând</p>
                  <p className="text-sm mt-2">Funcționalitatea este în dezvoltare</p>
                </div>
              </TabsContent>

              <TabsContent value="gear" className="space-y-6">
                <GearTab
                  userId={user.id}
                  userGear={userGear}
                  isLoadingGear={isLoadingGear}
                  onGearReload={loadUserGear}
                  showGearPublicly={profileData.show_gear_publicly || false}
                  onShowGearPubliclyChange={(value) => {
                    setProfileData({ ...profileData, show_gear_publicly: value });
                    // Auto-save when toggled
                    setTimeout(() => {
                      updateProfile();
                    }, 100);
                  }}
                  isUpdatingProfile={isUpdatingProfile}
                />
              </TabsContent>

              <TabsContent value="profile" className="space-y-6">
                <ProfileEditTab
                  profileData={profileData}
                  setProfileData={setProfileData}
                  selectedCounty={selectedCounty}
                  setSelectedCounty={setSelectedCounty}
                  selectedCity={selectedCity}
                  setSelectedCity={setSelectedCity}
                  counties={counties}
                  cities={cities}
                  isUpdatingProfile={isUpdatingProfile}
                  userId={user.id}
                  username={profileData.username}
                  onLoadCities={loadCities}
                  onUpdateProfile={updateProfile}
                />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <SettingsTab
                  user={user}
                  isGoogleUser={isGoogleUser}
                  needsPassword={needsPassword}
                  username={profileData.username}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Modals */}
      <RecordSubmissionModal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
      />

      {editingRecord && (
        <EditRecordModal
          record={editingRecord}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingRecord(null);
          }}
          onSuccess={handleRecordEdited}
        />
      )}

      <RecordDetailsModal
        record={selectedRecord}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedRecord(null);
        }}
      />
    </div>
  );
};

export default Profile;
