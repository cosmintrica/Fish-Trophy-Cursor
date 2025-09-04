import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Fish, Waves, Ship, Compass, Navigation } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { loadFishingLocations } from '@/services/fishingLocations';
import { geocodingService } from '@/services/geocoding';
import { useAuth } from '@/hooks/useAuth';

// MapLibre doesn't need access token

export default function BlackSea() {
  const { user } = useAuth();
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userLocationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [fishingLocations, setFishingLocations] = useState<Array<{
    id: string;
    name: string;
    type: string;
    county: string;
    description: string;
    coords: [number, number];
    species: string[];
    facilities: string[];
    recordCount: number;
    parking: boolean;
    camping: boolean;
  }>>([]);

  // Funcție pentru adăugarea locațiilor maritime pe hartă
  const addMaritimeLocationsToMap = useCallback((_map: maplibregl.Map, filterType: string) => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Verifică dacă locațiile sunt încărcate
    if (fishingLocations.length === 0) {
      console.log('⚠️ No fishing locations loaded yet');
      return;
    }

    // Filtrează doar locațiile maritime
    const maritimeLocations = fishingLocations.filter(loc => loc.type === 'maritime');
    const locationsToShow = filterType === 'all' ? maritimeLocations : 
      maritimeLocations.filter(loc => loc.type === filterType);

    locationsToShow.forEach(location => {
      // Marker mai mare pentru Marea Neagră
      const markerEl = document.createElement('div');
      markerEl.className = 'custom-marker-maritime';
      markerEl.style.cssText = `
        width: 45px;
        height: 45px;
        background: linear-gradient(135deg, #06B6D4, #3B82F6);
        border: 4px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: transform 0.2s ease;
      `;
      
      // Hover effect
      markerEl.addEventListener('mouseenter', () => {
        markerEl.style.transform = 'scale(1.1)';
      });
      
      markerEl.addEventListener('mouseleave', () => {
        markerEl.style.transform = 'scale(1)';
      });

      const marker = new maplibregl.Marker(markerEl)
        .setLngLat(location.coords)
        .addTo(_map);
      
      markersRef.current.push(marker);
      
      // Mapbox GL doesn't have bindPopup - using popup on click instead
      marker.getElement().addEventListener('click', () => {
        const popup = new maplibregl.Popup({
          maxWidth: '350px',
          closeButton: true,
          closeOnClick: false
        }).setHTML(`
          <div class="p-4 min-w-[300px] max-w-[350px] bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                </svg>
              </div>
              <div>
                <h3 class="font-bold text-lg text-cyan-900">${location.name}</h3>
                <p class="text-sm text-cyan-700">${location.county}, Litoralul Românesc</p>
              </div>
            </div>
            
            <p class="text-cyan-800 mb-3">${location.description}</p>
            
            <div class="mb-3">
              <div class="flex flex-wrap gap-1 mb-2">
                ${location.species.map((species: string) => 
                  `<span class="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs rounded">${species}</span>`
                ).join('')}
              </div>
              <div class="flex flex-wrap gap-1">
                ${location.facilities.map((facility: string) => 
                  `<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">${facility}</span>`
                ).join('')}
              </div>
            </div>
            
            <div class="flex items-center justify-between text-sm text-cyan-700 mb-3">
              <span>📊 ${location.recordCount} recorduri</span>
              <span>🚗 ${location.parking ? 'Parcare' : 'Fără parcare'}</span>
              <span>🏕️ ${location.camping ? 'Camping' : 'Fără camping'}</span>
            </div>
            
            <div class="flex gap-2">
              <button class="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors">
                Vezi recorduri
              </button>
              <button class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors">
                Adaugă record
              </button>
            </div>
          </div>
        `);
        
        popup.setLngLat(location.coords).addTo(_map);
      });
    });
  }, [fishingLocations]);

  // Încarcă locațiile din baza de date
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const locations = await loadFishingLocations();
        setFishingLocations(locations);
        console.log('✅ Loaded fishing locations for BlackSea:', locations.length);
      } catch (error) {
        console.error('❌ Error loading fishing locations:', error);
      }
    };
    
    loadLocations();
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Detectează dacă este mobile
    const isMobile = window.innerWidth < 768;
    
    // Inițializează harta cu configurații optimizate pentru România
    const mapConfig: maplibregl.MapOptions = {
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm'
          }
        ]
      },
      center: [25.0, 45.5], // Centru România
      zoom: isMobile ? 6 : 7, // Zoom optimizat
      minZoom: 5,
      maxZoom: isMobile ? 14 : 16, // Limitat pentru performanță
      pitch: 0,
      bearing: 0,
      renderWorldCopies: false,
      refreshExpiredTiles: true,
      fadeDuration: 80,
      // Bounds strict pentru România
      maxBounds: [
        [20.0, 43.5], // Southwest
        [30.0, 48.5]  // Northeast
      ] as [[number, number], [number, number]],
      // Optimizări performanță
      // preferCanvas: isMobile, // Not supported in Mapbox GL
      // zoomAnimation: !isMobile, // Not supported in Mapbox GL
      // detectRetina: !isMobile, // Not supported in Mapbox GL
      // updateWhenZooming: false, // Not supported in Mapbox GL
      // keepBuffer: 1 // Not supported in Mapbox GL
    };

    const map = new maplibregl.Map(mapConfig);
    mapInstanceRef.current = map;

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl({
      showCompass: !isMobile,
      showZoom: true,
      visualizePitch: false
    }), 'top-right');

    // Add geolocation control
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserLocation: true
    }), 'top-right');

    // Adaugă locațiile maritime inițiale (doar dacă sunt încărcate)
    if (fishingLocations.length > 0) {
      addMaritimeLocationsToMap(map, 'all');
    }

    // Verifică dacă utilizatorul a acceptat deja locația și o afișează
    const locationAccepted = localStorage.getItem('locationAccepted');
    if (locationAccepted === 'true' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Obține adresa prin reverse geocoding
          const address = await geocodingService.reverseGeocode(latitude, longitude);
          
          // Creează marker cu fundal alb și design îmbunătățit
          const userMarkerEl = document.createElement('div');
          userMarkerEl.className = 'user-location-marker';
          userMarkerEl.innerHTML = `<div class="w-14 h-14 bg-white border-4 border-cyan-500 rounded-full shadow-2xl flex items-center justify-center text-3xl transform hover:scale-110 transition-transform duration-200">🎣</div>`;

          const userMarker = new maplibregl.Marker(userMarkerEl)
            .setLngLat([longitude, latitude])
            .addTo(map);
          userLocationMarkerRef.current = userMarker;

          // Adaugă popup cu design îmbunătățit
          const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Utilizator';
          const userPhoto = user?.user_metadata?.avatar_url || '';
          
          const popup = new maplibregl.Popup({
            maxWidth: '400px',
            closeButton: true,
            closeOnClick: false,
            className: 'custom-popup'
          }).setHTML(`
            <div class="p-6 min-w-[320px] bg-gradient-to-br from-white to-cyan-50 rounded-2xl shadow-2xl border border-cyan-200">
              <div class="flex items-center gap-4 mb-4">
                <div class="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 border-4 border-white rounded-full flex items-center justify-center overflow-hidden shadow-lg">
                  ${userPhoto ? 
                    `<img src="${userPhoto}" alt="${userName}" class="w-full h-full object-cover rounded-full" />` :
                    `<span class="text-white font-bold text-xl">${userName.charAt(0).toUpperCase()}</span>`
                  }
                </div>
                <div class="flex-1">
                  <h3 class="font-bold text-xl text-gray-800 mb-1">${userName}</h3>
                  <p class="text-sm text-gray-600">📍 Locația ta curentă</p>
                </div>
              </div>
              
              <div class="space-y-3">
                <div class="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                  <p class="text-sm font-medium text-gray-700 mb-1">Coordonate GPS</p>
                  <p class="text-sm text-gray-600 font-mono">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</p>
                </div>
                
                <div class="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                  <p class="text-sm font-medium text-gray-700 mb-1">Adresă</p>
                  <p class="text-sm text-gray-600">${address}</p>
                </div>
              </div>
              
              <div class="mt-4 pt-3 border-t border-gray-200">
                <p class="text-xs text-gray-500 text-center">🌊 Fish Trophy - Litoralul Românesc</p>
              </div>
            </div>
          `);

          userMarker.setPopup(popup);
        },
        (error) => {
          console.error('Eroare la obținerea locației:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minute cache
        }
      );
    }

    // Handler pentru resize pe mobile
    const handleResize = () => {
      if (mapInstanceRef.current) {
        setTimeout(() => {
          mapInstanceRef.current?.resize();
        }, 100);
      }
    };

    // Adaugă event listener pentru resize
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, [user, fishingLocations, addMaritimeLocationsToMap]);

  // Funcție pentru filtrarea locațiilor maritime
  const filterMaritimeLocations = (type: string) => {
    setActiveFilter(type);
    
    if (mapInstanceRef.current) {
      // Resetează harta la poziția inițială (Litoralul românesc)
      mapInstanceRef.current.setCenter([28.6383, 44.1733]);
      mapInstanceRef.current.setZoom(8);
      addMaritimeLocationsToMap(mapInstanceRef.current, type);
    }
  };

  // Funcție pentru centrarea pe locația utilizatorului cu watchPosition
  const centerOnUserLocation = async () => {
    try {
      // Verifică dacă geolocation este disponibil
      if (!navigator.geolocation) {
        alert('Geolocation nu este suportat de acest browser.');
        return;
      }

      // Verifică dacă utilizatorul a dat deja permisiunea
      const locationAccepted = localStorage.getItem('locationAccepted') === 'true';
      
      if (locationAccepted) {
        // Dacă a dat deja permisiunea, centrează direct pe locația sa
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setCenter([longitude, latitude]);
              mapInstanceRef.current.setZoom(12);
            }
          },
          (error) => {
            console.error('Eroare la obținerea locației:', error);
          },
          { maximumAge: 300000, timeout: 10000, enableHighAccuracy: true }
        );
      } else {
        // Dacă nu a dat permisiunea, nu face nimic
        console.log('Utilizatorul nu a dat permisiunea pentru locație');
      }
    } catch (error) {
      console.error('Eroare la obținerea locației:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
      {/* Hero Section - Maritime Theme */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl mr-8">
              <Waves className="w-14 h-14 text-white" />
            </div>
            <div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent leading-tight">
                Marea Neagră
              </h1>
              <p className="text-2xl md:text-3xl text-cyan-700 mt-4 font-medium">
                Destinația Pescarilor Maritimi din România
              </p>
            </div>
          </div>
          
          <p className="text-xl md:text-2xl text-cyan-800 max-w-4xl mx-auto leading-relaxed mb-8">
            Explorează apele Mării Negre și descoperă locațiile de pescuit maritime de pe litoralul românesc. 
            <br />
            <span className="font-semibold">Harta interactivă cu toate locațiile maritime!</span>
          </p>
        </div>
      </section>

      {/* Maritime Map Section */}
      <section className="px-4 sm:px-6 lg:px-8 mb-16">
        <div className="max-w-7xl mx-auto">
          {/* Maritime Map Controls */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                { type: 'all', label: 'Toate Locațiile', icon: Compass, color: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700' },
                { type: 'maritime', label: 'Locații Maritime', icon: Waves, color: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700' }
              ].map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  onClick={() => filterMaritimeLocations(type)}
                  className={`${color} text-white px-6 py-3 rounded-2xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-3 ${
                    activeFilter === type ? 'ring-4 ring-cyan-300 scale-105' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-base">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Maritime Map Container */}
          <div className="relative">
            <div 
              ref={mapContainerRef} 
              className="w-full h-[500px] md:h-[600px] lg:h-[700px] rounded-3xl shadow-2xl border-4 border-cyan-200 overflow-hidden"
              style={{ zIndex: 1 }}
            />
            
            {/* Maritime Info Overlay */}
            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-cyan-200">
              <h4 className="text-sm font-semibold text-cyan-900 mb-2">🌊 Litoralul Românesc</h4>
              <div className="text-xs text-cyan-700 space-y-1">
                <div>• Constanța - Portul Principal</div>
                <div>• Mamaia - Plaja Centrală</div>
                <div>• Eforie - Plaja Modern</div>
                <div>• Costinești - Plaja Tineretului</div>
              </div>
            </div>

            {/* Map Controls - Top Left (Zoom) */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
              <button
                onClick={() => mapInstanceRef.current?.zoomIn()}
                className="bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-lg shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl"
                title="Zoom in"
              >
                <span className="text-lg font-bold">+</span>
              </button>
              <button
                onClick={() => mapInstanceRef.current?.zoomOut()}
                className="bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-lg shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl"
                title="Zoom out"
              >
                <span className="text-lg font-bold">−</span>
              </button>
            </div>

            {/* Geolocation Button - Top Right */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={centerOnUserLocation}
                className="bg-white hover:bg-gray-50 text-gray-700 p-3 rounded-xl shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl"
                title="Centrare pe locația mea"
              >
                <Navigation className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Maritime Features */}
      <section className="px-4 sm:px-6 lg:px-8 mb-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-cyan-900 mb-12">
            Caracteristici Maritime
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-cyan-200">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                <Waves className="w-10 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-cyan-900 mb-4 text-center">
                Harta Interactivă
              </h3>
              <p className="text-cyan-700 text-center leading-relaxed">
                Explorează toate locațiile maritime cu o hartă interactivă specializată pentru Marea Neagră
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-cyan-200">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                <Ship className="w-10 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-cyan-900 mb-4 text-center">
                Locații Maritime
              </h3>
              <p className="text-cyan-700 text-center leading-relaxed">
                Porturi, plaje, zone protejate și toate locațiile de pescuit de pe litoralul românesc
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-cyan-200">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                <Fish className="w-10 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-cyan-900 mb-4 text-center">
                Specii Marine
              </h3>
              <p className="text-cyan-700 text-center leading-relaxed">
                Toate speciile marine din Marea Neagră cu informații detaliate și recorduri
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Maritime Theme */}
      <section className="px-4 sm:px-6 lg:px-8 mb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-3xl p-8 md:p-12 shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Pregătit pentru Aventura Maritimă?
            </h2>
            <p className="text-lg md:text-xl text-cyan-100 mb-8 leading-relaxed">
              Explorează locațiile maritime și descoperă pescuitul pe Marea Neagră
            </p>
            <Link
              to="/"
              className="inline-block bg-white text-cyan-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-gray-50"
            >
              Explorează Locațiile Terestre
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
