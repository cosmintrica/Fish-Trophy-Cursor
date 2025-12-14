import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Trophy, Calendar, Users, Fish, Scale, Ruler, MapPin, Search, X, RotateCcw, Eye, Edit, ChevronDown, Video, User } from 'lucide-react';
import { supabase, getR2ImageUrlProxy } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAllRecords, useSpecies, useLocations } from '@/hooks/useRecordsPage';
import { usePrefetch } from '@/hooks/usePrefetch';
import RecordDetailsModal from '@/components/RecordDetailsModal';
import FishingEntryModal from '@/components/FishingEntryModal';
import RecordCard from '@/components/RecordCard';
import SEOHead from '@/components/SEOHead';
import { useStructuredData } from '@/hooks/useStructuredData';
import ShareButton from '@/components/ShareButton';
import { createSlug, findSpeciesBySlug, findLocationBySlug } from '@/utils/slug';
import { toast } from 'sonner';

interface FishRecord {
  id: string;
  user_id: string;
  species_id: string;
  location_id: string;
  weight: number;
  length_cm: number;
  captured_at: string;
  notes?: string;
  photo_url?: string;
  image_url?: string; // Alias pentru photo_url
  date_caught?: string;
  video_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
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
  profiles?: {
    id: string;
    display_name: string;
    email: string;
    username?: string;
  };
}

// Helper component for Member Avatar with "Accordion" animation
const MemberAvatar = ({ member, index }: { member: any, index: number }) => {
  const [imgError, setImgError] = useState(false);

  // We rely on the parent group-hover state for the accordion effect
  return (
    <a
      href={`/profile/${member.username || member.id}`}
      className="relative block w-10 h-10 rounded-full ring-2 ring-white dark:ring-slate-800 transition-all duration-200 ease-out origin-center transform hover:scale-110 hover:z-30 shadow-sm hover:shadow-md hover:ring-blue-400 dark:hover:ring-blue-500 will-change-transform"
      style={{
        zIndex: 20 - index, // Stack order
      }}
      title={member.displayName}
    >
      {!imgError && member.avatarUrl ? (
        <img
          src={getR2ImageUrlProxy(member.avatarUrl)}
          alt={member.displayName}
          className="w-full h-full rounded-full object-cover bg-slate-200 dark:bg-slate-700 pointer-events-none"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
          {member.displayName.charAt(0).toUpperCase()}
        </div>
      )}
    </a>
  );
};

// Helper function to group records by month
const groupRecordsByMonth = (records: FishRecord[]) => {
  const groups: { [key: string]: { title: string, date: Date, records: FishRecord[] } } = {};

  records.forEach(record => {
    // Handle potential invalid dates, fallback to date_caught if captured_at is missing
    const dateStr = record.captured_at || record.date_caught;
    if (!dateStr) return;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return; // Skip invalid dates

    // Create a sortable key (YYYY-MM)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // Format: "Ianuarie 2024"
    let monthName = '';
    try {
      monthName = date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
    } catch (e) {
      // Fallback if locale fails
      monthName = `${date.getMonth() + 1}/${date.getFullYear()}`;
    }

    // Capitalize first letter
    const formattedTitle = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    if (!groups[key]) {
      groups[key] = {
        title: formattedTitle,
        date: new Date(date.getFullYear(), date.getMonth(), 1),
        records: []
      };
    }
    groups[key].records.push(record);
  });

  // Return array sorted by date descending (newest first)
  return Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime());
};

const Records = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { trackSearch } = useAnalytics();
  const { prefetchProfile } = usePrefetch();
  const [searchParams, setSearchParams] = useSearchParams();

  // Use React Query hooks for data fetching
  const { records: allRecords, loading: recordsLoading } = useAllRecords();
  const { species, loading: speciesLoading } = useSpecies();
  const { locations, loading: locationsLoading } = useLocations();

  // Use records from React Query
  const [records, setRecords] = useState<FishRecord[]>([]);
  const loading = recordsLoading || speciesLoading || locationsLoading;
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize filters from URL params (support both slug and ID)
  const getInitialSpecies = () => {
    const speciesParam = searchParams.get('species');
    if (!speciesParam) return 'all';

    // Try to find by slug first (when species data is loaded)
    if (species.length > 0) {
      const found = findSpeciesBySlug(species, speciesParam);
      if (found) return found.id;
    }

    // Fallback to ID if slug not found (for backward compatibility)
    return speciesParam;
  };

  const getInitialLocation = () => {
    const locationParam = searchParams.get('location') || searchParams.get('location_id');
    if (!locationParam) return 'all';

    // Try to find by slug first (when locations data is loaded)
    if (locations.length > 0) {
      const found = findLocationBySlug(locations, locationParam);
      if (found) return found.id;
    }

    // Fallback to ID if slug not found (for backward compatibility)
    return locationParam;
  };

  const getInitialUser = () => {
    const userParam = searchParams.get('user');
    if (!userParam) return 'all';
    return userParam; // Username or user ID
  };

  const [selectedSpecies, setSelectedSpecies] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');

  // Track if we're initializing from URL to prevent loops
  const isInitializingRef = useRef(true);

  // Sync filters with URL params when data loads (only once on mount)
  useEffect(() => {
    if (!loading && species.length > 0 && locations.length > 0 && isInitializingRef.current) {
      const speciesFromUrl = getInitialSpecies();
      const locationFromUrl = getInitialLocation();
      const userFromUrl = getInitialUser();

      if (speciesFromUrl !== 'all') {
        setSelectedSpecies(speciesFromUrl);
        const foundSpecies = species.find(s => s.id === speciesFromUrl);
        if (foundSpecies) {
          setSpeciesSearchTerm(foundSpecies.name);
        }
      }

      if (locationFromUrl !== 'all') {
        setSelectedLocation(locationFromUrl);
        const foundLocation = locations.find(l => l.id === locationFromUrl);
        if (foundLocation) {
          setLocationSearchTerm(foundLocation.name);
        }
      }

      if (userFromUrl !== 'all') {
        setSelectedUser(userFromUrl);
      }

      isInitializingRef.current = false;
    }
  }, [loading, species, locations]);

  // Update URL when filters change manually (use slugs, not IDs)
  useEffect(() => {
    // Skip if we're still initializing
    if (isInitializingRef.current || loading || species.length === 0 || locations.length === 0) {
      return;
    }

    const params = new URLSearchParams();

    if (selectedSpecies !== 'all') {
      const foundSpecies = species.find(s => s.id === selectedSpecies);
      if (foundSpecies) {
        params.set('species', createSlug(foundSpecies.name));
      }
    }

    if (selectedLocation !== 'all') {
      const foundLocation = locations.find(l => l.id === selectedLocation);
      if (foundLocation) {
        params.set('location', createSlug(foundLocation.name));
      }
    }

    if (selectedUser !== 'all') {
      params.set('user', selectedUser);
    }

    // Only update URL if params changed
    const currentParams = searchParams.toString();
    const newParams = params.toString();

    if (currentParams !== newParams) {
      setSearchParams(params, { replace: true });
    }
  }, [selectedSpecies, selectedLocation, species, locations, setSearchParams, loading, searchParams]);
  const [activeTab, setActiveTab] = useState('overall');
  const [teamStats, setTeamStats] = useState<{
    [key: string]: {
      locationName: string;
      locationType: string;
      county: string;
      totalWeight: number;
      totalRecords: number;
      members: { id: string; username: string; displayName: string; avatarUrl: string | null }[];
      species: { id: string; name: string }[];
      memberCount: number;
      speciesCount: number;
      records: any[];
    }
  }>({});

  // Modal states
  const [selectedRecord, setSelectedRecord] = useState<FishRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FishRecord | null>(null);

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [minWeight, setMinWeight] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Search filters
  const [speciesSearchTerm, setSpeciesSearchTerm] = useState('');
  const [locationSearchTerm, setLocationSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Update records when React Query data changes (compare by length and first ID to prevent loops)
  const prevRecordsLengthRef = useRef<number>(0);
  useEffect(() => {
    const newLength = allRecords?.length || 0;
    const prevLength = prevRecordsLengthRef.current;
    if (allRecords && (newLength !== prevLength || (newLength > 0 && allRecords[0]?.id !== records[0]?.id))) {
      setRecords(allRecords as FishRecord[]);
      prevRecordsLengthRef.current = newLength;
    }
  }, [allRecords, records]);




  const loadTeamStats = async () => {
    try {
      // Get team statistics for each location - include all records, not just verified
      const { data: teamData, error } = await supabase
        .from('records')
        .select(`
          location_id,
          user_id,
          species_id,
          weight,
          status,
          fishing_locations:location_id(name, type, county),
          profiles!records_user_id_fkey(id, display_name, username, photo_url),
          fish_species:species_id(name)
        `)
        .eq('status', 'verified');

      if (error) {
        console.error('Error fetching team data:', error);
        throw error;
      }


      // Group by location and calculate stats
      const stats: {
        [key: string]: {
          locationName: string;
          locationType: string;
          county: string;
          totalWeight: number;
          totalRecords: number;
          members: Map<string, { id: string; username: string; displayName: string; avatarUrl: string | null }>;
          species: Map<string, { id: string; name: string }>;
          records: any[];
        }
      } = {};

      teamData?.forEach(record => {
        const locationId = record.location_id;
        const locationName = (record.fishing_locations as any)?.name;

        // User data
        const userId = record.user_id;
        const userName = (record.profiles as any)?.username;
        const displayName = (record.profiles as any)?.display_name;

        // Species data
        const speciesId = record.species_id;
        const speciesName = (record.fish_species as any)?.name;

        if (!stats[locationId]) {
          stats[locationId] = {
            locationName: locationName || `Locația ${locationId}`,
            locationType: (record.fishing_locations as any)?.type || 'unknown',
            county: (record.fishing_locations as any)?.county || 'Unknown',
            totalWeight: 0,
            totalRecords: 0,
            members: new Map(),
            species: new Map(),
            records: []
          };
        }

        stats[locationId].totalWeight += record.weight || 0;
        stats[locationId].totalRecords += 1;

        // Add member if we have display name
        if (displayName) {
          const key = userName || userId;
          if (!stats[locationId].members.has(key)) {
            stats[locationId].members.set(key, {
              id: userId,
              username: userName,
              displayName: displayName,
              avatarUrl: (record.profiles as any)?.photo_url
            });
          }
        }

        // Add species if present
        if (speciesName) {
          if (!stats[locationId].species.has(speciesId)) {
            stats[locationId].species.set(speciesId, {
              id: speciesId,
              name: speciesName
            });
          }
        }

        stats[locationId].records.push(record);
      });

      // Convert Maps to Arrays and add counts
      const finalStats: {
        [key: string]: {
          locationName: string;
          locationType: string;
          county: string;
          totalWeight: number;
          totalRecords: number;
          members: { id: string; username: string; displayName: string; avatarUrl: string | null }[];
          species: { id: string; name: string }[];
          memberCount: number;
          speciesCount: number;
          records: any[];
        }
      } = {};

      Object.keys(stats).forEach(locationId => {
        const stat = stats[locationId];
        finalStats[locationId] = {
          ...stat,
          members: Array.from(stat.members.values()),
          species: Array.from(stat.species.values()),
          memberCount: stat.members.size,
          speciesCount: stat.species.size
        };
      });

      setTeamStats(finalStats);
    } catch (error) {
      console.error('Error loading team stats:', error);
    }
  };

  // Load team stats when records change (from React Query)
  useEffect(() => {
    if (records.length > 0) {
      loadTeamStats();
    }
  }, [records]);

  // Remove diacritics for better search
  const removeDiacritics = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  const safeLower = (v?: string | null) => removeDiacritics((v || '').toLowerCase());

  const filteredRecords = useMemo(() => {
    let filtered = records;

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = safeLower(searchTerm);
      filtered = filtered.filter(record =>
        safeLower(record.fish_species?.name).includes(searchLower) ||
        safeLower(record.fishing_locations?.name).includes(searchLower) ||
        safeLower(record.profiles?.display_name).includes(searchLower)
      );
    }

    // Filter by species
    if (selectedSpecies !== 'all') {
      filtered = filtered.filter(record => record.species_id === selectedSpecies);
    }

    // Filter by location
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(record => record.location_id === selectedLocation);
    }

    // Filter by user (username or user_id)
    if (selectedUser !== 'all') {
      filtered = filtered.filter(record => {
        const username = record.profiles?.username?.toLowerCase();
        const userId = record.user_id;
        const userParam = selectedUser.toLowerCase();
        return username === userParam || userId === selectedUser;
      });
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(record => record.status === selectedStatus);
    }

    // Advanced filters
    if (minWeight) {
      filtered = filtered.filter(record => record.weight >= parseFloat(minWeight));
    }
    if (maxWeight) {
      filtered = filtered.filter(record => record.weight <= parseFloat(maxWeight));
    }
    if (dateFrom) {
      filtered = filtered.filter(record => new Date(record.captured_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(record => new Date(record.captured_at) <= new Date(dateTo));
    }

    return filtered;
  }, [records, searchTerm, selectedSpecies, selectedLocation, selectedUser, selectedStatus, minWeight, maxWeight, dateFrom, dateTo]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedSpecies('all');
    setSelectedLocation('all');
    setSelectedStatus('all');
    setSelectedUser('all');
    setMinWeight('');
    setMaxWeight('');
    setDateFrom('');
    setDateTo('');
    setSpeciesSearchTerm('');
    setLocationSearchTerm('');
    setUserSearchTerm('');
    setShowSpeciesDropdown(false);
    setShowLocationDropdown(false);
    setShowUserDropdown(false);
  };

  const openRecordModal = (record: FishRecord) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const openUserProfile = (record: FishRecord) => {
    // Navigate to user profile page using username if available, otherwise use userId
    const username = record.profiles?.username;
    if (username) {
      window.location.href = `/profile/${username}`;
    } else {
      // Fallback to userId if username is not available
      window.location.href = `/profile/${record.user_id}`;
    }
  };

  const handleProfileHover = (username?: string, userId?: string) => {
    if (username) {
      prefetchProfile(username);
    } else if (userId) {
      prefetchProfile(userId);
    }
  };

  const closeRecordModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
    // Remove hash from URL to prevent reopening modal
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  const handleEditRecord = (record: FishRecord) => {
    setEditingRecord(record);
    setIsEditModalOpen(true);
  };

  const filteredSpecies = useMemo(() => {
    if (!speciesSearchTerm.trim()) return species;
    return species.filter(s =>
      s.name.toLowerCase().includes(speciesSearchTerm.toLowerCase())
    );
  }, [species, speciesSearchTerm]);

  const getFilteredLocations = () => {
    if (!locationSearchTerm.trim()) return locations;
    return locations.filter(l =>
      l.name.toLowerCase().includes(locationSearchTerm.toLowerCase()) ||
      l.type.toLowerCase().includes(locationSearchTerm.toLowerCase()) ||
      l.county.toLowerCase().includes(locationSearchTerm.toLowerCase())
    );
  };

  const selectSpecies = (speciesId: string, speciesName: string) => {
    setSelectedSpecies(speciesId);
    setSpeciesSearchTerm(speciesName);
    setShowSpeciesDropdown(false);
  };

  const selectLocation = (locationId: string, locationName: string) => {
    setSelectedLocation(locationId);
    setLocationSearchTerm(locationName);
    setShowLocationDropdown(false);
  };

  // Get unique users from records
  const getUniqueUsers = () => {
    const userMap = new Map<string, { id: string; username?: string; display_name: string }>();
    records.forEach(record => {
      if (record.profiles) {
        const key = record.profiles.username || record.user_id;
        if (!userMap.has(key)) {
          userMap.set(key, {
            id: record.user_id,
            username: record.profiles.username,
            display_name: record.profiles.display_name || 'Utilizator'
          });
        }
      }
    });
    return Array.from(userMap.values()).sort((a, b) =>
      a.display_name.localeCompare(b.display_name)
    );
  };

  const getFilteredUsers = () => {
    const users = getUniqueUsers();
    if (!userSearchTerm.trim()) return users;
    const normalizedTerm = removeDiacritics(userSearchTerm.toLowerCase());
    return users.filter(u => {
      const normalizedDisplayName = removeDiacritics((u.display_name || '').toLowerCase());
      const normalizedUsername = u.username ? removeDiacritics(u.username.toLowerCase()) : '';
      return normalizedDisplayName.includes(normalizedTerm) || normalizedUsername.includes(normalizedTerm);
    });
  };

  const selectUser = (userId: string, username: string | undefined, displayName: string) => {
    // Use username if available, otherwise use user_id
    setSelectedUser(username || userId);
    setUserSearchTerm(displayName);
    setShowUserDropdown(false);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-full text-white font-bold text-lg sm:text-xl md:text-2xl shadow-2xl border-2 sm:border-4 border-yellow-300 transform rotate-12 hover:scale-110 transition-all duration-300">
          <div className="text-xl sm:text-2xl md:text-4xl">🏆</div>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 rounded-full text-white font-bold text-lg sm:text-xl md:text-2xl shadow-2xl border-2 sm:border-4 border-gray-200 transform rotate-12 hover:scale-110 transition-all duration-300">
          <div className="text-xl sm:text-2xl md:text-4xl">🥈</div>
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-full text-white font-bold text-lg sm:text-xl md:text-2xl shadow-2xl border-2 sm:border-4 border-amber-300 transform rotate-12 hover:scale-110 transition-all duration-300">
          <div className="text-xl sm:text-2xl md:text-4xl">🥉</div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg text-white font-bold text-sm sm:text-base md:text-lg shadow-lg">
        {rank}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'verified') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
          ✅ Verificat
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
        ⏳ În așteptare
      </span>
    );
  };

  // Handle URL hash to open record modal (e.g., /records#record-2)
  useEffect(() => {
    // Don't check hash while loading
    if (loading) return;

    const handleHashChange = () => {
      // Only run if we have records loaded and not loading
      if (loading || allRecords.length === 0) return;

      const hash = window.location.hash;
      if (hash && hash.startsWith('#record-')) {
        const recordId = hash.replace('#record-', '');
        // Try to find record by global_id first, then by id
        const record = allRecords.find(r =>
          (r as any).global_id?.toString() === recordId || r.id === recordId
        );
        if (record && !isModalOpen) {
          openRecordModal(record);
          // Scroll to top to show modal
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };

    // Check hash immediately when records are loaded and not loading
    handleHashChange();

    // Listen for hash changes (e.g., when user navigates with back/forward)
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [allRecords, isModalOpen, loading]);

  const { websiteData, organizationData, createBreadcrumbData } = useStructuredData();
  // const filteredRecords = getFilteredRecords(); // Already calculated above
  const recordCount = filteredRecords.length;
  const verifiedCount = filteredRecords.filter(r => r.status === 'verified').length;

  return (
    <>
      <SEOHead
        title="Recorduri Pescuit România - Top Capturi | Fish Trophy"
        description={`Descoperă ${recordCount}+ recorduri de pescuit din România. ${verifiedCount} recorduri verificate pentru ${species.length} specii de pești. Caută după specie, locație sau pescar. Trofee, capturi și statistici complete.`}
        keywords="recorduri pescuit, capturi pescuit, trofee pescuit, recorduri romania, specii pesti romania, pescuit romania, recorduri verificate, statistici pescuit, cea mai mare peste, recorduri pe specii, recorduri pe locatii, pescari romania, competiții pescuit"
        image="https://fishtrophy.ro/social-media-banner-v2.jpg"
        url="https://fishtrophy.ro/records"
        type="website"
        structuredData={[websiteData, organizationData] as unknown as Record<string, unknown>[]}
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header - Mobile Optimized */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              Recorduri & Clasamente
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto px-4 font-medium">
              Urmărește cele mai mari capturi din România
            </p>
          </div>

          {/* Search and Filters - Mobile Friendly */}
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 dark:border-slate-700 p-3 sm:p-4 mb-4 sm:mb-6 relative z-30">
            {/* Main Search Bar */}
            <div className="mb-4">
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Caută recorduri, specii, locații..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (e.target.value.length > 2) {
                      trackSearch(e.target.value, records.length);
                    }
                  }}
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-gray-50/50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700 dark:text-white dark:placeholder-gray-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap justify-center gap-2 mb-3">
              {/* Species Filter */}
              <div className="relative group">
                <div
                  className="flex items-center bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-lg px-3 py-2 transition-all cursor-pointer min-w-[160px]"
                  onClick={() => setShowSpeciesDropdown(!showSpeciesDropdown)}
                >
                  <Fish className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-blue-900 dark:text-blue-100">Specie</div>
                    <div className="text-xs text-blue-700 dark:text-blue-300 truncate">
                      {selectedSpecies === 'all' ? 'Toate' : species.find(s => s.id === selectedSpecies)?.name?.substring(0, 15) || 'Selectează'}
                    </div>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-blue-600 dark:text-blue-400 transition-transform ${showSpeciesDropdown ? 'rotate-180' : ''}`} />
                </div>

                {showSpeciesDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-[9999] max-h-64 overflow-y-auto">
                    <div className="p-2">
                      <input
                        type="text"
                        placeholder="Caută specie..."
                        value={speciesSearchTerm}
                        onChange={(e) => setSpeciesSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white dark:placeholder-gray-400"
                      />
                      <div
                        className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer text-sm rounded-lg font-medium text-blue-700 dark:text-blue-300"
                        onClick={() => {
                          setSelectedSpecies('all');
                          setSpeciesSearchTerm('');
                          setShowSpeciesDropdown(false);
                        }}
                      >
                        🐟 Toate speciile
                      </div>
                      {filteredSpecies.map(s => (
                        <div
                          key={s.id}
                          className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer text-sm rounded-lg text-gray-700 dark:text-slate-200"
                          onClick={() => selectSpecies(s.id, s.name)}
                        >
                          {s.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Location Filter */}
              <div className="relative group">
                <div
                  className="flex items-center bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-800/50 rounded-lg px-3 py-2 transition-all cursor-pointer min-w-[160px]"
                  onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                >
                  <MapPin className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-green-900 dark:text-green-100">Locație</div>
                    <div className="text-xs text-green-700 dark:text-green-300 truncate">
                      {selectedLocation === 'all' ? 'Toate' : locations.find(l => l.id === selectedLocation)?.name?.replace(/_/g, ' ').substring(0, 15) || 'Selectează'}
                    </div>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-green-600 dark:text-green-400 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
                </div>

                {showLocationDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-[9999] max-h-64 overflow-y-auto">
                    <div className="p-2">
                      <input
                        type="text"
                        placeholder="Caută locație..."
                        value={locationSearchTerm}
                        onChange={(e) => setLocationSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white dark:placeholder-gray-400"
                      />
                      <div
                        className="px-3 py-2 hover:bg-green-50 dark:hover:bg-slate-700 cursor-pointer text-sm rounded-lg font-medium text-green-700 dark:text-green-300"
                        onClick={() => {
                          setSelectedLocation('all');
                          setLocationSearchTerm('');
                          setShowLocationDropdown(false);
                        }}
                      >
                        📍 Toate locațiile
                      </div>
                      {getFilteredLocations().map(l => (
                        <div
                          key={l.id}
                          className="px-3 py-2 hover:bg-green-50 dark:hover:bg-slate-700 cursor-pointer text-sm rounded-lg text-gray-700 dark:text-slate-200"
                          onClick={() => selectLocation(l.id, l.name)}
                        >
                          <div className="font-medium">{l.name.replace(/_/g, ' ')}</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                            {l.type.replace(/_/g, ' ')} • {l.county}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Filter */}
              <div className="relative group">
                <div
                  className="flex items-center bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-800/50 rounded-lg px-3 py-2 transition-all cursor-pointer min-w-[160px]"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                >
                  <User className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-purple-900 dark:text-purple-100">Pescar</div>
                    <div className="text-xs text-purple-700 dark:text-purple-300 truncate">
                      {selectedUser === 'all' ? 'Toți' : getUniqueUsers().find(u => (u.username || u.id) === selectedUser)?.display_name?.substring(0, 15) || 'Selectează'}
                    </div>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-purple-600 dark:text-purple-400 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                </div>

                {showUserDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-[9999] max-h-64 overflow-y-auto">
                    <div className="p-2">
                      <input
                        type="text"
                        placeholder="Caută pescar..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 mb-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white dark:placeholder-gray-400"
                      />
                      <div
                        className="px-3 py-2 hover:bg-purple-50 dark:hover:bg-slate-700 cursor-pointer text-sm rounded-lg font-medium text-purple-700 dark:text-purple-300"
                        onClick={() => {
                          setSelectedUser('all');
                          setUserSearchTerm('');
                          setShowUserDropdown(false);
                        }}
                      >
                        👤 Toți pescarii
                      </div>
                      {getFilteredUsers().map(u => (
                        <div
                          key={u.id}
                          className="px-3 py-2 hover:bg-purple-50 dark:hover:bg-slate-700 cursor-pointer text-sm rounded-lg text-gray-700 dark:text-slate-200"
                          onClick={() => selectUser(u.id, u.username, u.display_name)}
                        >
                          <div className="font-medium">{u.display_name}</div>
                          {u.username && (
                            <div className="text-xs text-gray-500 dark:text-slate-400">
                              @{u.username}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-lg transition-all font-medium text-xs"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                  <span className="hidden sm:inline">Filtre avansate</span>
                  <span className="sm:hidden">Filtre</span>
                </button>

                <button
                  onClick={resetFilters}
                  className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-800/50 text-red-700 dark:text-red-300 rounded-lg transition-all font-medium text-xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Resetează</span>
                  <span className="sm:hidden">Reset</span>
                </button>
              </div>
            </div>

            {/* Category Tabs - Beautiful centered buttons */}
            <div className="flex justify-center mb-3">
              <div className="flex gap-2">
                {[
                  { id: 'overall', label: 'General', icon: Trophy, shortLabel: 'Gen' },
                  { id: 'monthly', label: 'Lunar', icon: Calendar, shortLabel: 'Lun' },
                  { id: 'species', label: 'Pe Specii', icon: Fish, shortLabel: 'Specii' },
                  { id: 'teams', label: 'Echipe', icon: Users, shortLabel: 'Ech' }
                ].map(({ id, label, icon: Icon, shortLabel }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'bg-white/80 dark:bg-slate-700/80 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600'
                      }`}
                  >
                    <Icon className="w-3 h-3 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Results Counter - Added Spacing */}
            <div className="flex justify-center items-center gap-2 text-xs text-gray-600 dark:text-slate-400 mb-2">
              <Trophy className="w-3 h-3 text-yellow-500" />
              <span className="font-medium">
                {filteredRecords.length} recorduri găsite
              </span>
              {(selectedSpecies !== 'all' || selectedLocation !== 'all' || selectedUser !== 'all' || searchTerm) && (
                <button
                  onClick={resetFilters}
                  className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  (Resetează)
                </button>
              )}
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100 dark:border-slate-700/50 mt-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">Greutate min (kg)</label>
                  <input
                    type="number"
                    value={minWeight}
                    onChange={(e) => setMinWeight(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white dark:placeholder-gray-500 transition-all"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">Greutate max (kg)</label>
                  <input
                    type="number"
                    value={maxWeight}
                    onChange={(e) => setMaxWeight(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white dark:placeholder-gray-500 transition-all"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">De la data</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    onClick={(e) => {
                      // Deschide calendarul când se apasă oriunde în input
                      (e.target as HTMLInputElement).showPicker?.();
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white transition-all scheme-light dark:scheme-dark cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">Până la data</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    onClick={(e) => {
                      // Deschide calendarul când se apasă oriunde în input
                      (e.target as HTMLInputElement).showPicker?.();
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white transition-all scheme-light dark:scheme-dark cursor-pointer"
                  />
                </div>
              </div>
            )}

          </div>


          {/* Leaderboard Content - Mobile Optimized - Clean Minimal Header */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-white/10 overflow-hidden">
            <div className="px-5 pt-6 pb-4 border-b border-gray-100 dark:border-slate-700/50">
              <div className="flex flex-col items-center justify-center text-center gap-2">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center justify-center gap-2 mb-1">
                    {activeTab === 'overall' && (
                      <>
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        Clasament General
                      </>
                    )}
                    {activeTab === 'monthly' && (
                      <>
                        <Calendar className="w-6 h-6 text-blue-500" />
                        Clasament Lunar
                      </>
                    )}
                    {activeTab === 'species' && (
                      <>
                        <Fish className="w-6 h-6 text-emerald-500" />
                        Clasament pe Specii
                      </>
                    )}
                    {activeTab === 'teams' && (
                      <>
                        <Users className="w-6 h-6 text-purple-500" />
                        Statistici Echipe
                      </>
                    )}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">
                    {activeTab === 'overall' && 'Top performanțe înregistrate'}
                    {activeTab === 'monthly' && 'Istoric capturi pe luni'}
                    {activeTab === 'species' && 'Toate speciile înregistrate'}
                    {activeTab === 'teams' && 'Top locații după activitate'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 md:p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Se încarcă recordurile...</h3>
                </div>


              ) : activeTab === 'teams' ? (
                // Team Statistics View - Beautiful Design
                <div className="space-y-6">
                  {/* ... existing team stats code ... */}
                  {Object.keys(teamStats).length === 0 ? (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-full mb-6">
                        <Users className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Nu există echipe încă</h3>
                      <p className="text-gray-600 dark:text-slate-300 text-lg max-w-md mx-auto">
                        Echipele se formează automat pe baza locațiilor de pescuit. Adaugă primul record pentru a forma o echipă!
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-5 sm:gap-6">
                      {Object.values(teamStats)
                        .sort((a, b) => b.totalWeight - a.totalWeight)
                        .map((team, index: number) => (
                          <div
                            key={team.locationName}
                            className="group relative bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 rounded-xl overflow-hidden hover:border-blue-300 dark:hover:border-blue-500/50 transition-all duration-300 ease-out hover:shadow-lg dark:hover:shadow-blue-900/20"
                          >
                            <div className="relative p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-6">

                              {/* Left: Rank & Location */}
                              <div className="flex items-center gap-4 min-w-[240px]">
                                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                                  {index === 0 ? (
                                    <div className="relative flex items-center justify-center">
                                      <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full"></div>
                                      <Trophy className="w-8 h-8 text-yellow-500 drop-shadow-[0_2px_4px_rgba(234,179,8,0.5)]" />
                                    </div>
                                  ) : index === 1 ? (
                                    <div className="relative flex items-center justify-center">
                                      <div className="absolute inset-0 bg-slate-400/20 blur-xl rounded-full"></div>
                                      <Trophy className="w-7 h-7 text-slate-400 drop-shadow-[0_2px_4px_rgba(148,163,184,0.5)]" />
                                    </div>
                                  ) : index === 2 ? (
                                    <div className="relative flex items-center justify-center">
                                      <div className="absolute inset-0 bg-orange-700/20 blur-xl rounded-full"></div>
                                      <Trophy className="w-7 h-7 text-orange-600 drop-shadow-[0_2px_4px_rgba(194,65,12,0.5)]" />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-sm">
                                      {index + 1}
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <h3
                                    onClick={() => selectLocation(team.records[0]?.location_id, team.locationName)}
                                    className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate transition-colors"
                                  >
                                    {team.locationName?.replace(/_/g, ' ')}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-slate-400">
                                    <span className="capitalize px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-md text-xs font-medium">{team.locationType?.replace(/_/g, ' ')}</span>
                                    <span className="opacity-50">•</span>
                                    <span>{team.county}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Middle: Stats Row */}
                              <div className="flex items-center justify-between md:justify-center gap-8 flex-1 border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-700/50 pt-4 md:pt-0 md:pl-6">
                                <div className="flex flex-col items-center">
                                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                                    {team.totalWeight.toFixed(1)}
                                  </span>
                                  <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Kg Total</span>
                                </div>

                                <div className="flex flex-col items-center hidden sm:flex">
                                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {(team.totalWeight / team.memberCount).toFixed(1)}
                                  </span>
                                  <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Kg/Pescar</span>
                                </div>

                                <div className="flex flex-col items-center">
                                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                                    {team.totalRecords}
                                  </span>
                                  <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Capturi</span>
                                </div>

                                <div className="flex flex-col items-center">
                                  <span className="text-lg font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                    {team.memberCount}
                                  </span>
                                  <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Membri</span>
                                </div>
                              </div>

                              {/* Right: Members & Species */}
                              <div className="flex flex-row items-center justify-between md:justify-end gap-3 flex-1 md:border-l border-gray-100 dark:border-slate-700/50 md:pl-6 pt-2 md:pt-0 min-w-0">

                                {/* Avatar Stack - Accordion Style */}
                                <div className="flex items-center pl-2 group/avatars">
                                  {team.members.slice(0, 5).map((member, mIndex) => (
                                    <div
                                      key={member.id}
                                      className="transition-transform duration-300 ease-out group-hover/avatars:translate-x-1 hover:!translate-x-0 !ml-0 first:!ml-0"
                                      style={{
                                        marginLeft: mIndex === 0 ? 0 : '-12px'
                                      }}
                                    >
                                      <MemberAvatar member={member} index={mIndex} />
                                    </div>
                                  ))}
                                  {team.members.length > 5 && (
                                    <div
                                      className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 ring-2 ring-white dark:ring-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 shadow-sm ml-2 transition-transform duration-300 group-hover/avatars:translate-x-2"
                                    >
                                      +{team.members.length - 5}
                                    </div>
                                  )}
                                </div>

                                {/* Species Scroll - Clean List Style */}
                                <div className="relative w-auto min-w-[100px] h-11 overflow-hidden">
                                  {/* Top Fade */}
                                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-white dark:from-slate-800 to-transparent z-10 pointer-events-none" />

                                  {/* Scrollable List */}
                                  <div className="h-full overflow-y-auto hide-scrollbar scroll-smooth py-1.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                    {team.species.map((specie) => (
                                      <div
                                        key={specie.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          selectSpecies(specie.id, specie.name);
                                        }}
                                        className="h-6 flex items-center justify-end px-1 cursor-pointer group/specie active:opacity-70 transition-opacity"
                                      >
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover/specie:text-blue-500 dark:group-hover/specie:text-blue-400 transition-colors text-right w-full">
                                          {specie.name}
                                        </span>
                                      </div>
                                    ))}
                                    {team.species.length === 0 && (
                                      <div className="h-full flex items-center justify-center text-[10px] text-slate-400 italic">
                                        -
                                      </div>
                                    )}
                                  </div>

                                  {/* Bottom Fade */}
                                  <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-white dark:from-slate-800 to-transparent z-10 pointer-events-none" />
                                </div>

                              </div>

                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

              ) : activeTab === 'monthly' ? (
                // Monthly View
                <div className="space-y-8">
                  {groupRecordsByMonth(filteredRecords).map((group) => (
                    <div key={group.title}>
                      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md py-3 px-4 mb-4 border-b border-gray-100 dark:border-slate-700/50 shadow-sm flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{group.title}</h3>
                        <span className="text-sm text-gray-500 font-medium px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-full">{group.records.length} capturi</span>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {group.records.map((record, index) => (
                          <RecordCard
                            key={record.id}
                            record={record}
                            rank={index + 1}
                            onOpenModal={openRecordModal}
                            onOpenProfile={openUserProfile}
                            onPrefetchProfile={handleProfileHover}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredRecords.length === 0 && (
                    <div className="text-center py-12">
                      <Trophy className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nu există recorduri în această perioadă</h3>
                    </div>
                  )}
                </div>

              ) : activeTab === 'species' ? (
                // Species Grid View - Polished Premium Design
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {filteredSpecies.map(specie => {
                    // Count records for this species
                    const count = records.filter(r => r.species_id === specie.id).length;
                    if (count === 0 && searchTerm) return null;
                    if (count === 0 && !speciesSearchTerm) return null;

                    return (
                      <div
                        key={specie.id}
                        onClick={() => {
                          selectSpecies(specie.id, specie.name);
                          setActiveTab('overall');
                        }}
                        className="group relative flex flex-col items-center p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                      >
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150 duration-500" />

                        <div className="relative z-10 w-14 h-14 mb-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner group-hover:scale-110 transition-transform duration-300 ring-4 ring-white dark:ring-slate-800">
                          <Fish className="w-7 h-7" />
                        </div>

                        <h3 className="relative z-10 font-bold text-gray-900 dark:text-white text-center mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {specie.name}
                        </h3>

                        <span className="relative z-10 text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-gray-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                          <Trophy className="w-3 h-3" />
                          {count} recorduri
                        </span>
                      </div>
                    );
                  })}
                  {filteredSpecies.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <p className="text-gray-500">Nu s-au găsit specii.</p>
                    </div>
                  )}
                </div>

              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {searchTerm || selectedSpecies !== 'all' || selectedLocation !== 'all'
                      ? 'Nu s-au găsit recorduri'
                      : 'Nu există recorduri încă'
                    }
                  </h3>
                  <p className="text-gray-600 dark:text-slate-400 mb-6">
                    {searchTerm || selectedSpecies !== 'all' || selectedLocation !== 'all'
                      ? 'Încearcă să modifici criteriile de căutare.'
                      : 'Fii primul care adaugă un record!'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredRecords.slice(0, 15).map((record, index) => (
                    <RecordCard
                      key={record.id}
                      record={record}
                      rank={index + 1}
                      onOpenModal={openRecordModal}
                      onOpenProfile={openUserProfile}
                      onPrefetchProfile={handleProfileHover}
                      variant="list"
                    />
                  ))}

                  {/* Load More Button */}
                  {filteredRecords.length > 15 && (
                    <div className="col-span-1 lg:col-span-2 text-center pt-8 pb-4">
                      <button className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-300">
                        Vezi mai multe ({filteredRecords.length - 15} rămase)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Record Details Modal */}

          <RecordDetailsModal
            record={selectedRecord}
            isOpen={isModalOpen}
            onClose={closeRecordModal}
            isAdmin={isAdmin}
            isOwner={selectedRecord ? user?.id === selectedRecord.user_id : false}
            onEdit={handleEditRecord}
            onDelete={async (recordId: string) => {
              // Delete functionality for admin
              if (window.confirm('Ești sigur că vrei să ștergi acest record?')) {
                try {
                  const { error } = await supabase
                    .from('records')
                    .delete()
                    .eq('id', recordId);

                  if (error) throw error;

                  toast.success('Record șters cu succes');
                  closeRecordModal();
                  // Refresh records
                  window.location.reload();
                } catch (error: any) {
                  toast.error('Eroare la ștergere: ' + (error.message || 'Eroare necunoscută'));
                }
              }
            }}
          />

          {/* Edit Record Modal */}
          {editingRecord && (
            <FishingEntryModal
              type="record"
              mode="edit"
              isOpen={isEditModalOpen}
              onClose={() => {
                setIsEditModalOpen(false);
                setEditingRecord(null);
              }}
              entry={editingRecord}
              onSuccess={() => {
                setIsEditModalOpen(false);
                setEditingRecord(null);
                // Reload records
                window.location.reload();
              }}
              isAdmin={isAdmin}
            />
          )}

        </div >
      </div >
    </>
  );
};

export default Records;
