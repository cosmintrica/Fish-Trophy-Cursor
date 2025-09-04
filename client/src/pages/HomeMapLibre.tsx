// pages/HomeMapLibre.tsx
import React, { useState, useCallback } from 'react';
import { Fish, Navigation, X, Search } from 'lucide-react';
import MapLibreMap from '@/components/MapLibreMap';
import SEOHead from '@/components/SEOHead';

export default function HomeMapLibre() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleLocationClick = useCallback((location: any) => {
    console.log('Location clicked:', location);
    // Aici poți adăuga logica pentru afișarea detaliilor locației
  }, []);

  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    
    console.log('Searching for:', query);
    // Aici poți adăuga logica de căutare
  }, []);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  return (
    <>
      <SEOHead 
        title="Fish Trophy - Descoperă cele mai bune locații de pescuit din România"
        description="Platforma completă pentru pescari din România. Descoperă locații de pescuit, urmărește recordurile și concurează cu alții pescari pasionați."
        keywords="pescuit, România, locații pescuit, recorduri, pești, lacuri, râuri, bălți"
        image="/social-preview.html"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Header cu căutare */}
        <div className="sticky top-16 z-30 bg-white/90 backdrop-blur-md border-b border-blue-200/50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="flex-1 max-w-2xl">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Caută locații de pescuit, județe, orașe..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSearch('lacuri')}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                >
                  Lacuri
                </button>
                <button
                  onClick={() => handleSearch('râuri')}
                  className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition-colors text-sm font-medium"
                >
                  Râuri
                </button>
                <button
                  onClick={() => handleSearch('bălți')}
                  className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium"
                >
                  Bălți
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Harta MapLibre */}
        <div className="relative">
          <MapLibreMap 
            className="w-full h-[calc(100vh-200px)]"
            onLocationClick={handleLocationClick}
          />
          
          {/* Overlay cu informații */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg max-w-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Fish className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Fish Trophy</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Descoperă cele mai bune locații de pescuit din România
            </p>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Lacuri</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                <span>Râuri</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Bălți</span>
              </div>
            </div>
          </div>

          {/* Buton pentru geolocație */}
          <div className="absolute bottom-4 right-4">
            <button
              onClick={() => {
                // Logica pentru geolocație
                console.log('Geolocation requested');
              }}
              className="bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 p-3 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              <Navigation className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Statistici rapide */}
        <div className="bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">600+</div>
                <div className="text-sm text-gray-600">Locații</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">150+</div>
                <div className="text-sm text-gray-600">Recorduri</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">2.5K+</div>
                <div className="text-sm text-gray-600">Pescari</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">41</div>
                <div className="text-sm text-gray-600">Județe</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
