import { useState, useEffect } from 'react';
import { Trophy, Target, Calendar, Users, Fish, Scale, Ruler, MapPin, Search, X, RotateCcw, Eye, Edit, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import RecordDetailsModal from '@/components/RecordDetailsModal';

interface Record {
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
  // Real data states
  const [records, setRecords] = useState<Record[]>([]);
  const [species, setSpecies] = useState<{id: string; name: string}[]>([]);
  const [locations, setLocations] = useState<{id: string; name: string; type: string; county: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('overall');
  
  // Modal states
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
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
      // First load records
      const { data: recordsData, error: recordsError } = await supabase
        .from('records')
        .select(`
          *,
          fish_species:species_id(name),
          fishing_locations:location_id(name, type, county)
        `)
        .in('status', ['verified', 'pending'])
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

      // Get unique user IDs
      const userIds = [...new Set(recordsData.map(record => record.user_id))];
      console.log('User IDs for profiles:', userIds);

      // Load profiles separately - try with public access first
      console.log('Attempting to load profiles for user IDs:', userIds);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        // If profiles fail, still show records but without names
        const recordsWithoutProfiles = recordsData.map(record => ({
          ...record,
          profiles: null
        }));
        setRecords(recordsWithoutProfiles);
        return;
      }

      console.log('Profiles loaded:', profilesData);

      // Merge records with profiles
      const recordsWithProfiles = recordsData.map(record => ({
        ...record,
        profiles: profilesData?.find(profile => profile.id === record.user_id) || null
      }));

      console.log('Records with profiles:', recordsWithProfiles);
      setRecords(recordsWithProfiles);
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

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        // Load data sequentially to avoid overwhelming the database
        await loadSpecies();
        await loadLocations();
        await loadRecords();
        // Removed debug profiles to avoid extra requests
      } catch (error) {
        console.error('Error loading records data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

  const getFilteredRecords = () => {
    let filtered = records;

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(record => 
        record.fish_species?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.fishing_locations?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.profiles?.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const openRecordModal = (record: Record) => {
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
        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-full text-white font-bold text-2xl shadow-2xl border-4 border-yellow-300 transform rotate-12 hover:scale-110 transition-all duration-300">
          <div className="text-4xl">🏆</div>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 rounded-full text-white font-bold text-2xl shadow-2xl border-4 border-gray-200 transform rotate-12 hover:scale-110 transition-all duration-300">
          <div className="text-4xl">🥈</div>
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-full text-white font-bold text-2xl shadow-2xl border-4 border-amber-300 transform rotate-12 hover:scale-110 transition-all duration-300">
          <div className="text-4xl">🥉</div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg text-white font-bold text-lg shadow-lg">
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
        {/* Header - Compact */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="w-12 h-12 text-yellow-500" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Recorduri & Clasamente
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Urmărește cele mai mari capturi din România
          </p>
        </div>

        {/* Search and Filters - Compact */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Caută recorduri, specii, locații, pescari..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filters Row - Compact */}
            <div className="flex flex-wrap justify-center gap-3">
              {/* Species Filter with Search */}
              <div className="relative">
                <div className="flex items-center space-x-2">
                  <Fish className="w-4 h-4 text-gray-600" />
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Caută specie..."
                      value={speciesSearchTerm}
                      onChange={(e) => {
                        setSpeciesSearchTerm(e.target.value);
                        setShowSpeciesDropdown(true);
                      }}
                      onFocus={() => setShowSpeciesDropdown(true)}
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[150px]"
                    />
                    {showSpeciesDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        <div 
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => {
                            setSelectedSpecies('all');
                            setSpeciesSearchTerm('');
                            setShowSpeciesDropdown(false);
                          }}
                        >
                          Toate speciile
                        </div>
                        {getFilteredSpecies().map(s => (
                          <div
                            key={s.id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => selectSpecies(s.id, s.name)}
                          >
                            {s.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Location Filter with Search */}
              <div className="relative">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Caută locație..."
                      value={locationSearchTerm}
                      onChange={(e) => {
                        setLocationSearchTerm(e.target.value);
                        setShowLocationDropdown(true);
                      }}
                      onFocus={() => setShowLocationDropdown(true)}
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[150px]"
                    />
                    {showLocationDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        <div 
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => {
                            setSelectedLocation('all');
                            setLocationSearchTerm('');
                            setShowLocationDropdown(false);
                          }}
                        >
                          Toate locațiile
                        </div>
                        {getFilteredLocations().map(l => (
                          <div
                            key={l.id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => selectLocation(l.id, l.name)}
                          >
                            <div className="font-medium">{l.name.replace(/_/g, ' ')}</div>
                            <div className="text-xs text-gray-500 capitalize">
                              {l.type.replace(/_/g, ' ')} • {l.county}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Advanced Filters Toggle */}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                <span>Filtre avansate</span>
              </button>

              {/* Reset Filters */}
              <button
                onClick={resetFilters}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Resetează</span>
              </button>
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

            {/* Results Count */}
            {getFilteredRecords().length > 0 && (
              <div className="text-center">
                <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {getFilteredRecords().length} recorduri găsite
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Category Tabs - Compact */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-1 shadow-lg border border-white/20">
            <div className="flex space-x-1">
              {[
                { id: 'overall', label: 'General', icon: Trophy },
                { id: 'monthly', label: 'Lunar', icon: Calendar },
                { id: 'species', label: 'Pe Specii', icon: Target },
                { id: 'teams', label: 'Echipe', icon: Users }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboard Content - Compact */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">🏆 Clasament General</h2>
              <p className="text-blue-100 text-sm">Cele mai bune performanțe</p>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Se încarcă recordurile...</h3>
              </div>
            ) : getFilteredRecords().length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {searchTerm || selectedSpecies !== 'all' || selectedLocation !== 'all' || selectedStatus !== 'all'
                    ? 'Nu s-au găsit recorduri' 
                    : 'Nu există recorduri încă'
                  }
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || selectedSpecies !== 'all' || selectedLocation !== 'all' || selectedStatus !== 'all'
                    ? 'Încearcă să modifici criteriile de căutare.' 
                    : 'Fii primul care adaugă un record!'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {getFilteredRecords().slice(0, 15).map((record, index) => (
                  <div key={record.id} className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-200 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Rank */}
                        {getRankIcon(index + 1)}

                        {/* Record Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 
                              className="text-lg font-bold text-gray-900 truncate cursor-pointer hover:text-blue-600 hover:underline transition-colors"
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

                      {/* Weight and Length */}
                      <div className="text-right">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="text-center">
                            <div className="flex items-center text-2xl font-bold text-blue-600">
                              <Scale className="w-5 h-5 mr-1" />
                              {record.weight || 'N/A'} kg
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center text-lg font-bold text-gray-600">
                              <Ruler className="w-4 h-4 mr-1" />
                              {record.length_cm || 'N/A'} cm
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => openRecordModal(record)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex items-center"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Vezi
                          </button>
                          {(record.status === 'pending' || record.status === 'verified') && (
                            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors flex items-center">
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