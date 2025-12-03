import { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Trophy, Loader2, Fish, Waves, Shield, Star, Zap, Target, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FishSpecies {
  id: string;
  name: string;
  scientific_name: string;
  category: 'dulce' | 'sarat' | 'amestec';
  water_type: 'lac' | 'rau' | 'baraj' | 'mare' | 'delta';
  fish_species_region: { region: string }[];
  min_weight: number;
  max_weight: number;
  min_length: number;
  max_length: number;
  description: string;
  habitat: string;
  feeding_habits: string;
  spawning_season: string;
  image_url: string;
  is_native: boolean;
  is_protected: boolean;
  fish_bait?: {
    id: string;
    name: string;
    kind: 'natural' | 'artificial' | 'traditional' | 'special';
    notes: string;
  }[];
  fish_method?: {
    id: string;
    code: string;
    name: string;
    description: string;
  }[];
}



const Species = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Toate');
  const [species, setSpecies] = useState<FishSpecies[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const [expandedBaits, setExpandedBaits] = useState<{ [key: string]: boolean }>({});
  const [expandedMethods, setExpandedMethods] = useState<{ [key: string]: boolean }>({});

  const categories = [
    'Toate',
    'Pești de apă dulce',
    'Pești de apă sărată',
    'Pești migratori',
    'Lacuri',
    'Râuri',
    'Delta Dunării'
  ];

  // Load species from Supabase cu cache
  useEffect(() => {
    const loadSpecies = async () => {
      // Cache cu sessionStorage pentru species (date statice)
      const CACHE_KEY = 'species_page_cache';
      const CACHE_DURATION = 10 * 60 * 1000; // 10 minute
      
      try {
        // Încearcă să încarce din cache
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setSpecies(data || []);
            setLoading(false); // Show cached data instantly
            // Load in background pentru update
          }
        } else {
          setLoading(true);
        }
        
        const { data, error } = await supabase
          .from('fish_species')
          .select(`
            *,
            fish_species_region(region),
            fish_bait!fish_species_bait(
              id,
              name,
              kind,
              notes
            ),
            fish_method!fish_species_method(
              id,
              code,
              name,
              description
            )
          `)
          .order('name');

        if (error) {
          console.error('Error loading species:', error);
          setError('Eroare la încărcarea speciilor');
          // Dacă e eroare dar avem cache, păstrăm cache-ul
          if (cached) {
            const { data: cachedData } = JSON.parse(cached);
            setSpecies(cachedData || []);
          }
          return;
        }

        const speciesData = data || [];
        setSpecies(speciesData);
        setLoading(false);
        
        // Cache result
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            data: speciesData,
            timestamp: Date.now()
          }));
        } catch (e) {
          // Ignoră erorile de storage
        }
      } catch (err) {
        console.error('Error loading species:', err);
        setError('Eroare la încărcarea speciilor');
        setLoading(false);
      }
    };

    loadSpecies();
  }, []);


  const getDifficultyLevel = (species: FishSpecies) => {
    if (species.is_protected) return 'Protejat';
    if (species.max_weight > 10) return 'Avansată';
    if (species.max_weight > 3) return 'Medie';
    return 'Ușoară';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Ușoară': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'Medie': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'Avansată': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'Protejat': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getDifficultyExplanation = (difficulty: string) => {
    switch (difficulty) {
      case 'Ușoară': return 'Pentru începători - pești mici, ușor de prins';
      case 'Medie': return 'Pentru pescari cu experiență - pești de dimensiuni medii';
      case 'Avansată': return 'Pentru pescari experimentați - pești mari, dificili de prins';
      case 'Protejat': return 'Specie protejată - nu poate fi pescuită';
      default: return '';
    }
  };

  const formatSpawningSeason = (season: string | null) => {
    if (!season) return 'N/A';

    const monthMap: { [key: string]: string } = {
      'ian': 'Ianuarie', 'feb': 'Februarie', 'mar': 'Martie', 'apr': 'Aprilie',
      'mai': 'Mai', 'iun': 'Iunie', 'iul': 'Iulie', 'aug': 'August',
      'sep': 'Septembrie', 'oct': 'Octombrie', 'noi': 'Noiembrie', 'dec': 'Decembrie'
    };

    // Handle ranges like "apr-iun" -> "Aprilie - Iunie"
    if (season.includes('-')) {
      const [start, end] = season.split('-');
      return `${monthMap[start] || start} - ${monthMap[end] || end}`;
    }

    // Handle single months
    return monthMap[season] || season;
  };

  // Remove diacritics for better search
  const removeDiacritics = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  const safeLower = (v?: string | null) => removeDiacritics((v || '').toLowerCase());

  // Category and water type mappings
  const categoryMap: { [key: string]: string } = {
    'Pești de apă dulce': 'dulce',
    'Pești de apă sărată': 'sarat',
    'Pești migratori': 'amestec'
  };

  const waterTypeMap: { [key: string]: string } = {
    'Lacuri': 'lac',
    'Râuri': 'rau',
    'Delta Dunării': 'delta'
  };

  const filteredSpecies = species.filter(speciesItem => {
    // Search filtering
    let matchesSearch = true;
    if (searchTerm) {
      const searchLower = safeLower(searchTerm);
      const nameMatch = safeLower(speciesItem.name).includes(searchLower);
      const scientificMatch = safeLower(speciesItem.scientific_name).includes(searchLower);
      const waterTypeMatch = safeLower(speciesItem.water_type).includes(searchLower);
      const categoryMatch = safeLower(speciesItem.category).includes(searchLower);
      const feedingMatch = safeLower(speciesItem.feeding_habits).includes(searchLower);
      const baitMatch = speciesItem.fish_bait?.some(bait =>
        safeLower(bait.name).includes(searchLower)
      ) || false;
      const methodMatch = speciesItem.fish_method?.some(method =>
        safeLower(method.name).includes(searchLower)
      ) || false;

      matchesSearch = nameMatch || scientificMatch || waterTypeMatch ||
                     categoryMatch || feedingMatch || baitMatch || methodMatch;
    }

    // Category filtering
    let matchesCategory = true;
    if (selectedCategory !== 'Toate') {
      if (categoryMap[selectedCategory]) {
        matchesCategory = speciesItem.category === categoryMap[selectedCategory];
      } else if (waterTypeMap[selectedCategory]) {
        matchesCategory = speciesItem.water_type === waterTypeMap[selectedCategory];
      }
    }

    return matchesSearch && matchesCategory;
  });

  // Sort search results by priority
  const sortedSpecies = [...filteredSpecies].sort((a, b) => {
    if (!searchTerm) return 0; // No sorting when no search term

    const searchLower = safeLower(searchTerm);

    // Priority scoring
    const getScore = (species: FishSpecies) => {
      let score = 0;
      if (safeLower(species.name).includes(searchLower)) score += 100;
      if (safeLower(species.scientific_name).includes(searchLower)) score += 90;
      if (safeLower(species.water_type).includes(searchLower)) score += 30;
      if (safeLower(species.category).includes(searchLower)) score += 30;
      if (safeLower(species.feeding_habits).includes(searchLower)) score += 20;
      if (species.fish_bait?.some(bait => safeLower(bait.name).includes(searchLower))) score += 10;
      if (species.fish_method?.some(method => safeLower(method.name).includes(searchLower))) score += 10;
      return score;
    };

    return getScore(b) - getScore(a);
  });

  // Get species to display (show all or limited)
  const displayedSpecies = showAllSpecies ? sortedSpecies : sortedSpecies.slice(0, 20);
  const hasMoreSpecies = !searchTerm && !showAllSpecies && sortedSpecies.length > 20;

  // Debug selectedCategory changes
  useEffect(() => {
    // console.log('🎯 selectedCategory changed to:', selectedCategory);
    // console.log('🎯 Filtered species count:', filteredSpecies.length);
    // console.log('🎯 Displayed species count:', displayedSpecies.length);
  }, [selectedCategory, filteredSpecies.length, displayedSpecies.length]);

  // Functions for expanding baits and methods
  const toggleBaitExpansion = (speciesId: string) => {
    setExpandedBaits(prev => ({
      ...prev,
      [speciesId]: !prev[speciesId]
    }));
  };

  const toggleMethodExpansion = (speciesId: string) => {
    setExpandedMethods(prev => ({
      ...prev,
      [speciesId]: !prev[speciesId]
    }));
  };

  const loadAllSpecies = () => {
    setShowAllSpecies(true);
  };

  return (
    <div className="min-h-screen py-4 sm:py-6 md:py-12">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            Catalog de Specii
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-4xl mx-auto px-2 mb-3">
            Descoperă toate speciile de pești din România cu informații detaliate despre habitat și tehnici de pescuit.
          </p>

          {/* Species Count and Search - Close Together */}
          {!loading && !error && (
            <div className="flex flex-col items-center justify-center gap-2 mb-3">
              {/* Species Count */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                <Fish className="w-4 h-4" />
                <span>
                  {filteredSpecies.length === species.length
                    ? `${species.length} specii`
                    : `${filteredSpecies.length} din ${species.length} specii`
                  }
                </span>
              </div>

              {/* Search Input */}
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Caută specii..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 sm:py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filter Buttons - Mobile Optimized */}
        <div className="mb-6">

          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 relative z-10">
            {categories.map((category, index) => (
              <button
                key={`category-${index}-${category}`}
                onClick={() => {
                  // console.log('🔥 BUTTON CLICKED:', category);
                  setSelectedCategory(category);
                }}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-colors cursor-pointer pointer-events-auto select-none ${
                  selectedCategory === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                style={{ willChange: 'background-color, color', zIndex: 10, position: 'relative' }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Se încarcă speciile...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg max-w-md mx-auto">
              {error}
            </div>
          </div>
        )}

        {/* Species Grid - Mobile Optimized */}
        {!loading && !error && (
          <div className="flex justify-center">
            <div className={`grid gap-4 sm:gap-6 justify-items-center ${
              displayedSpecies.length === 1
                ? 'grid-cols-1 max-w-sm'
                : displayedSpecies.length <= 2
                  ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl'
                  : displayedSpecies.length <= 4
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}>
            {displayedSpecies.map(speciesItem => {
              const difficulty = getDifficultyLevel(speciesItem);
              const difficultyColor = getDifficultyColor(difficulty);

              return (
                <div key={speciesItem.id} className="group relative bg-gradient-to-br from-card via-card to-card/95 border border-border/50 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-2 hover:border-primary/30 hover:scale-[1.02]" style={{ willChange: 'transform, box-shadow' }}>
                  {/* Image Header with Gradient Overlay */}
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={speciesItem.image_url || '/icon_free.png'}
                      alt={speciesItem.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                      style={{ willChange: 'transform' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Floating Info */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      {speciesItem.is_native && (
                        <div className="bg-blue-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Nativ
                        </div>
                      )}
                      {speciesItem.is_protected && (
                        <div className="bg-red-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Protejat
                        </div>
                      )}
                    </div>

                    {/* Title Overlay */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-primary-foreground transition-colors">
                        {speciesItem.name}
                      </h3>
                      <p className="text-sm text-white/90 italic line-clamp-1">
                        {speciesItem.scientific_name}
                      </p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col justify-between min-h-[320px]">
                    <div className="space-y-4 flex-1 flex flex-col justify-center">
                      {/* Key Stats with Icons */}
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                          <Waves className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-muted-foreground mb-1">Tip apă</div>
                            <div className="text-sm font-semibold capitalize leading-tight">{speciesItem.water_type}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                          <Calendar className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-muted-foreground mb-1">Reproducere</div>
                            <div className="text-sm font-semibold leading-tight">{formatSpawningSeason(speciesItem.spawning_season)}</div>
                          </div>
                        </div>
                      </div>

                    {/* Dimensions - Beautiful Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
                        <Fish className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Dimensiune</div>
                        <div className="text-sm font-bold text-blue-800 dark:text-blue-200">
                          {speciesItem.min_length && speciesItem.max_length
                            ? `${speciesItem.min_length}-${speciesItem.max_length} cm`
                            : 'N/A'
                          }
                        </div>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200/50 dark:border-green-700/50">
                        <Target className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                        <div className="text-xs text-green-600 dark:text-green-400 font-medium">Greutate</div>
                        <div className="text-sm font-bold text-green-800 dark:text-green-200">
                          {speciesItem.min_weight && speciesItem.max_weight
                            ? `${speciesItem.min_weight}-${speciesItem.max_weight} kg`
                            : 'N/A'
                          }
                        </div>
                      </div>
                    </div>

                    {/* Feeding Habits - Beautiful */}
                    {speciesItem.feeding_habits && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200/50 dark:border-amber-700/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <div className="text-sm font-semibold text-amber-800 dark:text-amber-200">Alimentație</div>
                        </div>
                        <div className="text-sm text-amber-700 dark:text-amber-300 line-clamp-2">{speciesItem.feeding_habits}</div>
                      </div>
                    )}

                    {/* Baits - Beautiful Tags */}
                    {speciesItem.fish_bait && speciesItem.fish_bait.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <div className="text-sm font-semibold text-foreground">Momeli recomandate</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const isExpanded = expandedBaits[speciesItem.id];
                            const displayBaits = isExpanded ? speciesItem.fish_bait : speciesItem.fish_bait.slice(0, 3);
                            const hasMore = speciesItem.fish_bait.length > 3;

                            return (
                              <>
                                {displayBaits.map((bait) => {
                                  const getBaitStyle = (kind: string) => {
                                    switch (kind) {
                                      case 'natural':
                                        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-300 border border-green-200 dark:border-green-700';
                                      case 'artificial':
                                        return 'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 dark:from-purple-900/30 dark:to-violet-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-700';
                                      case 'traditional':
                                        return 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 dark:from-amber-900/30 dark:to-orange-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700';
                                      case 'special':
                                        return 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 dark:from-red-900/30 dark:to-pink-900/30 dark:text-red-300 border border-red-200 dark:border-red-700';
                                      default:
                                        return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 dark:from-gray-900/30 dark:to-slate-900/30 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
                                    }
                                  };

                                  return (
                                    <span
                                      key={bait.id}
                                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium shadow-sm ${getBaitStyle(bait.kind)}`}
                                      title={bait.kind === 'traditional' ? 'Momeală tradițională' : bait.kind === 'special' ? 'Momeală specială' : ''}
                                    >
                                      {bait.name}
                                      {bait.kind === 'traditional' && <span className="ml-1 text-xs">🏺</span>}
                                      {bait.kind === 'special' && <span className="ml-1 text-xs">⭐</span>}
                                    </span>
                                  );
                                })}
                                {hasMore && (
                                  <button
                                    onClick={() => toggleBaitExpansion(speciesItem.id)}
                                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                                    style={{ willChange: 'background-color' }}
                                  >
                                    {isExpanded ? 'Mai puține' : `+${speciesItem.fish_bait.length - 3} mai multe`}
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Methods - Beautiful Tags */}
                    {speciesItem.fish_method && speciesItem.fish_method.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <div className="text-sm font-semibold text-foreground">Metode de pescuit</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const isExpanded = expandedMethods[speciesItem.id];
                            const displayMethods = isExpanded ? speciesItem.fish_method : speciesItem.fish_method.slice(0, 3);
                            const hasMore = speciesItem.fish_method.length > 3;

                            return (
                              <>
                                {displayMethods.map((method) => (
                                  <span
                                    key={method.id}
                                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 dark:from-blue-900/30 dark:to-cyan-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-sm"
                                  >
                                    {method.name}
                                  </span>
                                ))}
                                {hasMore && (
                                  <button
                                    onClick={() => toggleMethodExpansion(speciesItem.id)}
                                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                                    style={{ willChange: 'background-color' }}
                                  >
                                    {isExpanded ? 'Mai puține' : `+${speciesItem.fish_method.length - 3} mai multe`}
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    </div>

                    {/* Difficulty Badge - Clear Explanation */}
                    <div className="flex items-center justify-center mt-auto pt-4">
                      <div
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg ${difficultyColor} border-2 border-current/20`}
                        title={getDifficultyExplanation(difficulty)}
                      >
                        {difficulty === 'Ușoară' && <Zap className="w-4 h-4" />}
                        {difficulty === 'Medie' && <Target className="w-4 h-4" />}
                        {difficulty === 'Avansată' && <Trophy className="w-4 h-4" />}
                        {difficulty === 'Protejat' && <Shield className="w-4 h-4" />}
                        {difficulty}
                        <span className="text-xs opacity-75">• {getDifficultyExplanation(difficulty)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* Load All/Show Less Button - Mobile Optimized */}
        {!loading && !error && (
          <div className="flex justify-center mt-8 sm:mt-12">
            {hasMoreSpecies ? (
              <button
                onClick={loadAllSpecies}
                className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl text-sm sm:text-base"
                style={{ willChange: 'transform, box-shadow, background-color' }}
              >
                <Fish className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Vezi toate speciile ({species.length})</span>
                <span className="sm:hidden">Toate ({species.length})</span>
              </button>
            ) : showAllSpecies && sortedSpecies.length > 20 ? (
            <button
                onClick={() => setShowAllSpecies(false)}
                className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-muted text-muted-foreground rounded-full font-semibold hover:bg-muted/80 transition-colors shadow-lg hover:shadow-xl text-sm sm:text-base"
              style={{ willChange: 'transform, box-shadow, background-color' }}
            >
                <Fish className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Arată primele 20</span>
                <span className="sm:hidden">Primele 20</span>
            </button>
            ) : null}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredSpecies.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-muted/50 p-6 rounded-2xl max-w-md mx-auto">
              <h3 className="text-lg font-bold mb-2">Nu s-au găsit specii</h3>
              <p className="text-muted-foreground text-sm">
                Încearcă să modifici termenii de căutare sau filtrele.
              </p>
            </div>
          </div>
        )}

        {/* Development Note - Mobile Optimized */}
        <div className="mt-12 sm:mt-16 text-center">
          <div className="bg-muted/50 p-4 sm:p-6 rounded-2xl max-w-2xl mx-auto">
            <h3 className="text-base sm:text-lg font-bold mb-2">🚧 Schiță de Dezvoltare</h3>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Această pagină este o schiță funcțională care demonstrează design-ul și structura
              pentru catalogul de specii și recorduri. Funcționalitatea completă va fi implementată
              în următoarele faze de dezvoltare.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Species;
