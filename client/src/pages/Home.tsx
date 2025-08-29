
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Fish, Users, Map, Search, Filter, X } from 'lucide-react';
import L from 'leaflet';
import { fishingLocations, fishingZones, FishingLocation } from '@/services/locations';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

const Home: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Initialize Leaflet map
      const map = L.map(mapRef.current).setView([45.9432, 24.9668], 7); // Romania center
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Custom icon for fishing locations
      const fishingIcon = L.divIcon({
        className: 'custom-fishing-icon',
        html: '🎣',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      // Add markers for each location
      fishingLocations.forEach(location => {
        L.marker(location.coords, { icon: fishingIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-3 max-w-xs">
              <h3 class="font-bold text-lg mb-2">${location.name}</h3>
              <p class="text-sm text-gray-600 mb-2">${location.county}, ${location.region}</p>
              <p class="text-sm text-gray-700 mb-3">${location.description}</p>
              <div class="flex flex-wrap gap-1 mb-3">
                ${location.species.slice(0, 3).map(species => 
                  `<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">${species}</span>`
                ).join('')}
              </div>
              <div class="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>🎯 ${location.recordCount} recorduri</span>
                <span>${location.parking ? '🅿️' : ''} ${location.camping ? '🏕️' : ''}</span>
              </div>
              <button class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                Vezi recorduri
              </button>
            </div>
          `);
      });

      // Add fishing zones
      fishingZones.forEach(zone => {
        L.polygon(zone.coords, {
          color: zone.color,
          weight: 2,
          fillColor: zone.color,
          fillOpacity: 0.1
        }).addTo(map).bindTooltip(zone.name);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Filter locations based on search and type
  const filteredLocations = fishingLocations.filter(location => {
    const matchesSearch = location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         location.county.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || location.type === selectedType;
    return matchesSearch && matchesType;
  });

  const locationTypes = [
    { value: 'all', label: 'Toate tipurile' },
    { value: 'maritim', label: 'Maritim' },
    { value: 'delta', label: 'Delta' },
    { value: 'lac', label: 'Lacuri' },
    { value: 'lac_munte', label: 'Lacuri de munte' },
    { value: 'rau_munte', label: 'Râuri de munte' },
    { value: 'rau_plan', label: 'Râuri de câmpie' },
    { value: 'balta', label: 'Bălți' },
    { value: 'lac_artificial', label: 'Lacuri artificiale' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section - Mic și elegant */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 text-center">
          <div className="mb-6 md:mb-8">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-4 md:mb-6">
              <img src="/icon_free.png" alt="Fish Trophy" className="w-12 h-12 md:w-16 md:h-16" onError={(e) => {
                console.error('Failed to load hero icon:', e);
                e.currentTarget.style.display = 'none';
              }} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 md:mb-4 tracking-tight">
              Fish Trophy
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed px-4">
              Platforma completă pentru pescarii din România. Înregistrează-ți trofeele, 
              urmărește recordurile și explorează locațiile de pescuit.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4">
            <Link
              to="/leaderboards"
              className="inline-flex items-center justify-center px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <Trophy className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Vezi Recordurile
            </Link>
            <Link
              to="/submission-guide"
              className="inline-flex items-center justify-center px-6 md:px-8 py-3 md:py-4 bg-white text-slate-700 font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border border-slate-200"
            >
              <Map className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Ghid Submisie
            </Link>
          </div>
        </div>
      </section>

      {/* Harta cu Locații - Elementul Principal */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 md:mb-4 tracking-tight">
              Harta Locațiilor de Pescuit
            </h2>
            <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto px-4">
              Explorează cele mai bune locații de pescuit din România. 
              Vezi unde au fost prinse trofeele record și descoperă noi locații.
            </p>
          </div>
          
          {/* Filtre și căutare - Mobile-friendly */}
          <div className="mb-6 space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Caută locații, județe, specii..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter Toggle Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>Filtrează</span>
              </button>
              
              <div className="text-sm text-slate-600">
                {filteredLocations.length} locații găsite
              </div>
            </div>
            
            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-700">Tipul de apă</h3>
                  <button
                    onClick={() => setSelectedType('all')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Resetează
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {locationTypes.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        selectedType === type.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Harta Leaflet Interactivă */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 md:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
                <h3 className="text-lg md:text-xl font-semibold text-slate-800">
                  🗺️ Harta Interactivă
                </h3>
                <div className="flex items-center space-x-4 text-sm text-slate-600">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    <span className="hidden sm:inline">Zone de pescuit</span>
                    <span className="sm:hidden">Zone</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🎣</span>
                    <span className="hidden sm:inline">Locații</span>
                    <span className="sm:hidden">Locații</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div 
              ref={mapRef} 
              className="w-full h-80 md:h-96 bg-slate-100"
              style={{ minHeight: '320px' }}
            ></div>
            
            <div className="p-4 md:p-6 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <span className="text-lg">🌊</span>
                  <p className="font-medium text-slate-700">Marea Neagră</p>
                  <p className="text-slate-500">Pescuit maritim</p>
                </div>
                <div className="text-center">
                  <span className="text-lg">🏞️</span>
                  <p className="font-medium text-slate-700">Lacuri</p>
                  <p className="text-slate-500">Pescuit de pește dulce</p>
                </div>
                <div className="text-center">
                  <span className="text-lg">🏔️</span>
                  <p className="font-medium text-slate-700">Râuri de munte</p>
                  <p className="text-slate-500">Pescuit de păstrăv</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 md:mb-4 tracking-tight">
              De ce Fish Trophy?
            </h2>
            <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto px-4">
              Platforma ta completă pentru înregistrarea și gestionarea trofeelor de pescuit
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                <Trophy className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-3 md:mb-4">Recorduri Oficiale</h3>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                Înregistrează-ți trofeele și urmărește recordurile oficiale din România. 
                Fiecare captură este verificată și documentată.
              </p>
            </div>
            
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                <Fish className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-3 md:mb-4">Specii Complete</h3>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                Baza de date completă cu toate speciile de pești din România. 
                Informații detaliate despre fiecare specie și habitatul său.
              </p>
            </div>
            
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                <Users className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-3 md:mb-4">Comunitate</h3>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                Conectează-te cu alți pescari din România. 
                Împărtășește experiențele și descoperă noi locații de pescuit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 md:mb-6 tracking-tight">
            Începe să înregistrezi trofeele tale
          </h2>
          <p className="text-lg md:text-xl text-blue-100 mb-6 md:mb-8 leading-relaxed px-4">
            Alătură-te comunității Fish Trophy și fii parte din istoria pescuitului din România
          </p>
          <Link
            to="/leaderboards"
            className="inline-flex items-center justify-center px-8 md:px-10 py-4 md:py-5 bg-white text-blue-600 font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            <Trophy className="w-5 h-5 md:w-6 md:h-6 mr-3" />
            Vezi Recordurile
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
