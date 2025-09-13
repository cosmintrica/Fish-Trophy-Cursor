import { useState, useEffect } from 'react';
import { Trophy, Calendar, Users, Fish, Scale, Ruler, MapPin, Search, X, RotateCcw, Eye, Edit, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import RecordDetailsModal from '@/components/RecordDetailsModal';

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
  profiles?: {
    display_name: string;
    email: string;
  };
}

const Records = () => {
  const { user } = useAuth();
  const { trackSearch } = useAnalytics();
  // Real data states
  const [records, setRecords] = useState<FishRecord[]>([]);
  const [species, setSpecies] = useState<{id: string; name: string}[]>([]);
  const [locations, setLocations] = useState<{id: string; name: string; type: string; county: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('overall');
  const [teamStats, setTeamStats] = useState<{[key: string]: {
    locationName: string;
    locationType: string;
    county: string;
    totalWeight: number;
    totalRecords: number;
    members: string[];
    species: string[];
    memberCount: number;
    speciesCount: number;
    records: any[];
  }}>({});

  // Modal states
  const [selectedRecord, setSelectedRecord] = useState<FishRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [minWeight, setMinWeight] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Search filters
  const [speciesSearchTerm, setSpeciesSearchTerm] = useState('');
  const [locationSearchTerm, setLocationSearchTerm] = useState('');
  const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Load real data from database
  const loadRecords = async () => {
    try {
      // First load records with profiles
      const { data: recordsData, error: recordsError } = await supabase
        .from('records')
        .select(`
          *,
          fish_species:species_id(name),
          fishing_locations:location_id(name, type, county),
          profiles!records_user_id_fkey(id, display_name, email)
        `)
        .eq('status', 'verified')
        .order('weight', { ascending: false });

      if (recordsError) {
        console.error('Error loading records:', recordsError);
        setRecords([]);
        return;
      }


      if (!recordsData || recordsData.length === 0) {
        setRecords([]);
        return;
      }

      setRecords(recordsData);
    } catch (error) {
      console.error('Error loading records:', error);
      setRecords([]);
    }
  };

  const loadSpecies = async () => {
    try {
      const { data, error } = await supabase
        .from('fish_species')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSpecies(data || []);
    } catch (error) {
      console.error('Error loading species:', error);
    }
  };

  // Debug function to check profiles
  // Removed debug functions to avoid extra database requests

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('fishing_locations')
        .select('id, name, type, county')
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

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
          profiles:user_id(display_name),
          fish_species:species_id(name)
        `)
        .eq('status', 'verified');

      if (error) {
        console.error('Error fetching team data:', error);
        throw error;
      }


      // Group by location and calculate stats
      const stats: {[key: string]: {
        locationName: string;
        locationType: string;
        county: string;
        totalWeight: number;
        totalRecords: number;
        members: Set<string>;
        species: Set<string>;
        records: any[];
      }} = {};

      teamData?.forEach(record => {
        const locationId = record.location_id;
        const locationName = (record.fishing_locations as any)?.name;
        const userName = (record.profiles as any)?.display_name;
        const speciesName = (record.fish_species as any)?.name;

        if (!stats[locationId]) {
          stats[locationId] = {
            locationName: locationName || `Locația ${locationId}`,
            locationType: (record.fishing_locations as any)?.type || 'unknown',
            county: (record.fishing_locations as any)?.county || 'Unknown',
            totalWeight: 0,
            totalRecords: 0,
            members: new Set(),
            species: new Set(),
            records: []
          };
        }

        stats[locationId].totalWeight += record.weight || 0;
        stats[locationId].totalRecords += 1;
        if (userName) stats[locationId].members.add(userName);
        if (speciesName) stats[locationId].species.add(speciesName);
        stats[locationId].records.push(record);
      });

      // Convert Sets to Arrays and add counts
      const finalStats: {[key: string]: {
        locationName: string;
        locationType: string;
        county: string;
        totalWeight: number;
        totalRecords: number;
        members: string[];
        species: string[];
        memberCount: number;
        speciesCount: number;
        records: any[];
      }} = {};

      Object.keys(stats).forEach(locationId => {
        const stat = stats[locationId];
        finalStats[locationId] = {
          ...stat,
          members: Array.from(stat.members),
          species: Array.from(stat.species),
          memberCount: stat.members.size,
          speciesCount: stat.species.size
        };
      });

      setTeamStats(finalStats);
    } catch (error) {
      console.error('Error loading team stats:', error);
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        // Load data sequentially to avoid overwhelming the database
        await loadSpecies();
        await loadLocations();
        await loadRecords();
        await loadTeamStats();
        // Removed debug profiles to avoid extra requests
      } catch (error) {
        console.error('Error loading records data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

  // Reload team stats when records change
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

  const getFilteredRecords = () => {
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
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedSpecies('all');
    setSelectedLocation('all');
    setSelectedStatus('all');
    setMinWeight('');
    setMaxWeight('');
    setDateFrom('');
    setDateTo('');
    setSpeciesSearchTerm('');
    setLocationSearchTerm('');
    setShowSpeciesDropdown(false);
    setShowLocationDropdown(false);
  };

  const openRecordModal = (record: FishRecord) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const openUserProfile = (userId: string) => {
    // Navigate to user profile page using React Router
    window.location.href = `/profile/${userId}`;
  };

  const closeRecordModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
  };

  const handleEditRecord = (record: FishRecord) => {
    // For now, just open the record details modal
    // In the future, this could open an edit modal
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const getFilteredSpecies = () => {
    if (!speciesSearchTerm.trim()) return species;
    return species.filter(s =>
      s.name.toLowerCase().includes(speciesSearchTerm.toLowerCase())
    );
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header - Mobile Optimized */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Recorduri & Clasamente
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-4">
            Urmărește cele mai mari capturi din România
          </p>
        </div>

        {/* Search and Filters - Mobile Friendly */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-3 sm:p-4 mb-4 sm:mb-6">
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
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-gray-50/50 hover:bg-white"
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
                className="flex items-center bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-2 transition-all cursor-pointer min-w-[160px]"
                onClick={() => setShowSpeciesDropdown(!showSpeciesDropdown)}
              >
                <Fish className="w-4 h-4 text-blue-600 mr-2" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-blue-900">Specie</div>
                  <div className="text-xs text-blue-700 truncate">
                    {selectedSpecies === 'all' ? 'Toate' : species.find(s => s.id === selectedSpecies)?.name?.substring(0, 15) || 'Selectează'}
                  </div>
                </div>
                <ChevronDown className={`w-3 h-3 text-blue-600 transition-transform ${showSpeciesDropdown ? 'rotate-180' : ''}`} />
              </div>

              {showSpeciesDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] max-h-64 overflow-y-auto">
                  <div className="p-2">
                    <input
                      type="text"
                      placeholder="Caută specie..."
                      value={speciesSearchTerm}
                      onChange={(e) => setSpeciesSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
                    />
                    <div
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm rounded-lg font-medium text-blue-700"
                      onClick={() => {
                        setSelectedSpecies('all');
                        setSpeciesSearchTerm('');
                        setShowSpeciesDropdown(false);
                      }}
                    >
                      🐟 Toate speciile
                    </div>
                    {getFilteredSpecies().map(s => (
                      <div
                        key={s.id}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm rounded-lg"
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
                className="flex items-center bg-green-50 hover:bg-green-100 rounded-lg px-3 py-2 transition-all cursor-pointer min-w-[160px]"
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
              >
                <MapPin className="w-4 h-4 text-green-600 mr-2" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-green-900">Locație</div>
                  <div className="text-xs text-green-700 truncate">
                    {selectedLocation === 'all' ? 'Toate' : locations.find(l => l.id === selectedLocation)?.name?.replace(/_/g, ' ').substring(0, 15) || 'Selectează'}
                  </div>
                </div>
                <ChevronDown className={`w-3 h-3 text-green-600 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
              </div>

              {showLocationDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] max-h-64 overflow-y-auto">
                  <div className="p-2">
                    <input
                      type="text"
                      placeholder="Caută locație..."
                      value={locationSearchTerm}
                      onChange={(e) => setLocationSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-2"
                    />
                    <div
                      className="px-3 py-2 hover:bg-green-50 cursor-pointer text-sm rounded-lg font-medium text-green-700"
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
                        className="px-3 py-2 hover:bg-green-50 cursor-pointer text-sm rounded-lg"
                        onClick={() => selectLocation(l.id, l.name)}
                      >
                        <div className="font-medium">{l.name.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-gray-500 capitalize">
                          {l.type.replace(/_/g, ' ')} • {l.county}
                        </div>
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
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all font-medium text-xs"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                <span className="hidden sm:inline">Filtre avansate</span>
                <span className="sm:hidden">Filtre</span>
              </button>

              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all font-medium text-xs"
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
                  className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'bg-white/80 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Icon className="w-3 h-3 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{shortLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Results Counter */}
          <div className="flex justify-center items-center gap-2 text-xs text-gray-600">
            <Trophy className="w-3 h-3 text-yellow-500" />
            <span className="font-medium">
              {getFilteredRecords().length} recorduri găsite
            </span>
            {(selectedSpecies !== 'all' || selectedLocation !== 'all' || searchTerm) && (
              <button
                onClick={resetFilters}
                className="ml-2 text-blue-600 hover:text-blue-800 font-medium"
              >
                (Resetează)
              </button>
            )}
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Greutate min (kg)</label>
                  <input
                    type="number"
                    value={minWeight}
                    onChange={(e) => setMinWeight(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Greutate max (kg)</label>
                  <input
                    type="number"
                    value={maxWeight}
                    onChange={(e) => setMaxWeight(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">De la data</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Până la data</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

        </div>


        {/* Leaderboard Content - Mobile Optimized */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-6 py-3 sm:py-4">
            <div className="text-center">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                {activeTab === 'overall' && '🏆 Clasament General'}
                {activeTab === 'monthly' && '📅 Clasament Lunar'}
                {activeTab === 'species' && '🐟 Clasament pe Specii'}
                {activeTab === 'teams' && '👥 Statistici Echipe'}
              </h2>
              <p className="text-blue-100 text-xs sm:text-sm">
                {activeTab === 'overall' && 'Cele mai bune performanțe'}
                {activeTab === 'monthly' && 'Performanțe din luna curentă'}
                {activeTab === 'species' && 'Clasament pe fiecare specie'}
                {activeTab === 'teams' && 'Statistici pe locații de pescuit'}
              </p>
            </div>
          </div>

          <div className="p-3 sm:p-4 md:p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Se încarcă recordurile...</h3>
              </div>
            ) : activeTab === 'teams' ? (
              // Team Statistics View - Beautiful Design
              <div className="space-y-6">
                {Object.keys(teamStats).length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full mb-6">
                      <Users className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Nu există echipe încă</h3>
                    <p className="text-gray-600 text-lg max-w-md mx-auto">
                      Echipele se formează automat pe baza locațiilor de pescuit. Adaugă primul record pentru a forma o echipă!
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {Object.values(teamStats)
                      .sort((a, b) => b.totalWeight - a.totalWeight)
                      .map((team, index: number) => (
                        <div key={team.locationName} className="group bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1">
                          {/* Header with rank and location info */}
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center space-x-4">
                              <div className="relative">
                                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl text-white font-bold text-lg shadow-lg">
                                  {index + 1}
                                </div>
                                {index === 0 && (
                                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                                    <Trophy className="w-3 h-3 text-yellow-800" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">
                                  {team.locationName?.replace(/_/g, ' ')}
                                </h3>
                                <div className="flex items-center space-x-2 text-sm text-gray-500">
                                  <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                                    {team.locationType?.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-gray-400">•</span>
                                  <span>{team.county}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-3xl font-bold text-blue-600 mb-1">
                                {team.totalWeight.toFixed(1)} kg
                              </div>
                              <div className="text-sm text-gray-500 font-medium">
                                {team.totalRecords} recorduri
                              </div>
                            </div>
                          </div>

                          {/* Statistics Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white rounded-xl p-4 text-center border border-gray-100 hover:shadow-md transition-shadow">
                              <div className="text-2xl font-bold text-gray-900 mb-1">{team.memberCount}</div>
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Membri</div>
                            </div>
                            <div className="bg-white rounded-xl p-4 text-center border border-gray-100 hover:shadow-md transition-shadow">
                              <div className="text-2xl font-bold text-gray-900 mb-1">{team.speciesCount}</div>
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Specii</div>
                            </div>
                            <div className="bg-white rounded-xl p-4 text-center border border-gray-100 hover:shadow-md transition-shadow">
                              <div className="text-2xl font-bold text-green-600 mb-1">
                                {(team.totalWeight / team.memberCount).toFixed(1)}
                              </div>
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">kg/membru</div>
                            </div>
                            <div className="bg-white rounded-xl p-4 text-center border border-gray-100 hover:shadow-md transition-shadow">
                              <div className="text-2xl font-bold text-purple-600 mb-1">
                                {(team.totalRecords / team.memberCount).toFixed(1)}
                              </div>
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">recorduri/membru</div>
                            </div>
                          </div>

                          {/* Members Section */}
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                            <div className="flex items-center mb-3">
                              <Users className="w-4 h-4 text-blue-600 mr-2" />
                              <span className="text-sm font-semibold text-blue-900">Membrii echipei</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {team.members.slice(0, 6).map((member: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center px-3 py-1.5 bg-white text-blue-800 text-sm rounded-full border border-blue-200 hover:bg-blue-100 transition-colors">
                                  {member}
                                </span>
                              ))}
                              {team.members.length > 6 && (
                                <span className="inline-flex items-center px-3 py-1.5 bg-blue-200 text-blue-800 text-sm rounded-full font-medium">
                                  +{team.members.length - 6} alții
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Species Section */}
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100 mt-3">
                            <div className="flex items-center mb-3">
                              <Fish className="w-4 h-4 text-green-600 mr-2" />
                              <span className="text-sm font-semibold text-green-900">Specii pescuite</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {team.species.slice(0, 6).map((species: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center px-3 py-1.5 bg-white text-green-800 text-sm rounded-full border border-green-200 hover:bg-green-100 transition-colors">
                                  {species}
                                </span>
                              ))}
                              {team.species.length > 6 && (
                                <span className="inline-flex items-center px-3 py-1.5 bg-green-200 text-green-800 text-sm rounded-full font-medium">
                                  +{team.species.length - 6} altele
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : getFilteredRecords().length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {searchTerm || selectedSpecies !== 'all' || selectedLocation !== 'all'
                    ? 'Nu s-au găsit recorduri'
                    : 'Nu există recorduri încă'
                  }
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || selectedSpecies !== 'all' || selectedLocation !== 'all'
                    ? 'Încearcă să modifici criteriile de căutare.'
                    : 'Fii primul care adaugă un record!'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {getFilteredRecords().slice(0, 15).map((record, index) => (
                  <div key={record.id} className="group bg-white border border-gray-200 rounded-xl p-3 sm:p-4 hover:shadow-lg hover:border-blue-200 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      {/* Left side - Rank and Info */}
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {/* Rank */}
                        <div className="flex-shrink-0">
                          {getRankIcon(index + 1)}
                        </div>

                        {/* Record Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className="text-base sm:text-lg font-bold text-gray-900 truncate cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                              onClick={() => openUserProfile(record.user_id)}
                              title="Vezi profilul utilizatorului"
                            >
                              {record.profiles?.display_name || 'Utilizator'}
                            </h3>
                            {getStatusBadge(record.status)}
                          </div>
                          <p className="text-sm text-gray-700 font-medium">{record.fish_species?.name}</p>
                          <p className="text-xs text-gray-500 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {record.fishing_locations?.name}
                          </p>
                        </div>
                      </div>

                      {/* Right side - Weight, Length and Actions */}
                      <div className="flex items-center space-x-4">
                        {/* Weight and Length */}
                        <div className="flex items-center space-x-4 text-right">
                          <div className="text-center">
                            <div className="flex items-center text-lg sm:text-xl font-bold text-blue-600">
                              <Scale className="w-4 h-4 mr-1" />
                              <span>{record.weight || 'N/A'} kg</span>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center text-sm sm:text-lg font-bold text-gray-600">
                              <Ruler className="w-3 h-3 mr-1" />
                              <span>{record.length_cm || 'N/A'} cm</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => openRecordModal(record)}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex items-center"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Vezi
                          </button>
                          {user?.email === 'cosmin.trica@outlook.com' && record.status === 'verified' && (
                            <button
                              onClick={() => handleEditRecord(record)}
                              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors flex items-center"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Editează
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Load More Button */}
                {getFilteredRecords().length > 15 && (
                  <div className="text-center pt-4">
                    <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-300">
                      Vezi mai multe ({getFilteredRecords().length - 15} rămase)
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
          isAdmin={false}
          canEdit={false}
        />
      </div>
    </div>
  );
};

export default Records;
