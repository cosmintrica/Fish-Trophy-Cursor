import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Fish, MapPin, Navigation, X } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { loadFishingLocations } from '@/services/fishingLocations';

import { geocodingService } from '@/services/geocoding';
import { useAuth } from '@/lib/auth-supabase';
import SEOHead from '@/components/SEOHead';
import { useStructuredData } from '@/hooks/useStructuredData';

// Mapbox token - from environment variables
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

// CRITICAL: Mobile-specific CSS optimizations
const mobileCSS = `
  .mapboxgl-container {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  
  .mapboxgl-canvas {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }
  
  .custom-marker {
    pointer-events: auto !important;
  }
  
  @media (max-width: 768px) {
    .mapboxgl-popup-content {
      margin: 8px !important;
    }
    
    .mapboxgl-popup-tip {
      width: 12px !important;
      height: 12px !important;
    }
  }
`;

// Inject mobile CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = mobileCSS;
  document.head.appendChild(style);
}

export default function Home() {
  const { user } = useAuth();
  const { websiteData, organizationData } = useStructuredData();
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showShopPopup, setShowShopPopup] = useState(false);
  const [showLocationRequest, setShowLocationRequest] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [databaseLocations, setDatabaseLocations] = useState<any[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Încarcă locațiile din baza de date
  useEffect(() => {
    const loadLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const locations = await loadFishingLocations();
        setDatabaseLocations(locations);
        console.log(`✅ Loaded ${locations.length} locations from database`);
      } catch (error) {
        console.error('❌ Error loading locations:', error);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    loadLocations();
  }, []);

  // Reîncarcă markerele când se actualizează locațiile din baza de date
  useEffect(() => {
    if (mapInstanceRef.current && databaseLocations.length > 0) {
      console.log('🔄 Reloading markers with database locations...');
      addLocationsToMap(mapInstanceRef.current, activeFilter);
    }
  }, [databaseLocations, activeFilter]);

  // Funcția pentru normalizarea textului (elimină diacriticele)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Elimină diacriticele
      .replace(/ă/g, 'a')
      .replace(/â/g, 'a')
      .replace(/î/g, 'i')
      .replace(/ș/g, 's')
      .replace(/ț/g, 't');
  };

  // Funcția pentru emoji-ul tipului de apă
  const getWaterTypeEmoji = (type: string) => {
    switch (type) {
      case 'river':
        return '🌊';
      case 'lake':
        return '🏞️';
      case 'balti_salbatic':
        return '🌿';
      case 'private_pond':
        return '🏡';
      default:
        return '💧';
    }
  };

  // Funcția de căutare
  const handleSearch = (query: string) => {
    console.log('🔍 Searching for:', query);
    setSearchQuery(query);
    if (query.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const normalizedQuery = normalizeText(query);
    
    // Creează rezultate cu scor de prioritate
    const resultsWithScore = databaseLocations.map(location => {
      let score = 0;
      
      // Prioritate maximă pentru nume (exact match)
      if (normalizeText(location.name).toLowerCase() === normalizedQuery.toLowerCase()) {
        score += 1000;
      }
      // Prioritate foarte mare pentru nume (starts with) - pentru râuri
      else if (normalizeText(location.name).toLowerCase().startsWith(normalizedQuery.toLowerCase())) {
        score += 800;
      }
      // Prioritate mare pentru nume (contains) - pentru râuri
      else if (normalizeText(location.name).toLowerCase().includes(normalizedQuery.toLowerCase())) {
        score += 600;
      }
      // Prioritate medie pentru nume (partial match)
      else if (normalizeText(location.name).includes(normalizedQuery)) {
        score += 300;
      }
      
      // Prioritate pentru subtitle
      if (location.subtitle && normalizeText(location.subtitle).includes(normalizedQuery)) {
        score += 200;
      }
      
      // Prioritate pentru județ
      if (normalizeText(location.county).includes(normalizedQuery)) {
        score += 150;
      }
      
      // Prioritate pentru administrare
      if (location.administrare && normalizeText(location.administrare).includes(normalizedQuery)) {
        score += 100;
      }
      
      // Prioritate pentru regiune
      if (normalizeText(location.region).includes(normalizedQuery)) {
        score += 50;
      }
      
      // Prioritate pentru tip
      if (normalizeText(location.type).includes(normalizedQuery)) {
        score += 25;
      }
      
      return { ...location, score };
    }).filter(location => location.score > 0)
      .sort((a, b) => b.score - a.score); // Sortează după scor descrescător

    console.log('🔍 Found results:', resultsWithScore.length);
    console.log('🔍 Top 5 results:', resultsWithScore.slice(0, 5).map(loc => ({ name: loc.name, score: loc.score })));
    setSearchResults(resultsWithScore.slice(0, 10)); // Limitează la 10 rezultate
    setShowSearchResults(true);

    // Dacă se caută un județ, fac zoom pe județ
    if (normalizedQuery.length >= 3) {
      console.log('🔍 Searching for county:', normalizedQuery);
      console.log('🔍 Sample locations county:', resultsWithScore.slice(0, 3).map(loc => ({ name: loc.name, county: loc.county })));
      
      const countyResults = resultsWithScore.filter(loc => 
        normalizeText(loc.county).includes(normalizedQuery)
      );
      
      console.log('🏛️ County results:', countyResults.length);
      console.log('🏛️ Map instance for county zoom:', mapInstanceRef.current);
      
      if (countyResults.length > 0 && mapInstanceRef.current && mapInstanceRef.current.getContainer()) {
        // Calculează centrul județului
        const validResults = countyResults.filter(loc => {
          const lat = loc.coords ? loc.coords[1] : loc.latitude;
          const lng = loc.coords ? loc.coords[0] : loc.longitude;
          return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        });
        
        if (validResults.length === 0) {
          console.error('❌ No valid coordinates found for county');
          return;
        }
        
        const avgLat = validResults.reduce((sum, loc) => {
          const lat = loc.coords ? loc.coords[1] : loc.latitude;
          return sum + lat;
        }, 0) / validResults.length;
        const avgLng = validResults.reduce((sum, loc) => {
          const lng = loc.coords ? loc.coords[0] : loc.longitude;
          return sum + lng;
        }, 0) / validResults.length;
        
        console.log('🎯 Flying to county center:', avgLat, avgLng);
        
        // Verifică dacă coordonatele sunt valide
        if (!isNaN(avgLat) && !isNaN(avgLng) && avgLat !== 0 && avgLng !== 0) {
          mapInstanceRef.current.flyTo({
            center: [avgLng, avgLat],
            zoom: 10,
            duration: 1000
          });
          console.log('✅ County zoom completed');
        } else {
          console.error('❌ Invalid county coordinates:', avgLat, avgLng);
        }
      } else {
        console.log('❌ County zoom failed - no results or map not ready');
      }
    }
  };

  // Funcția pentru Enter în căutare
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      console.log('⌨️ Enter pressed, searching for:', searchQuery);
      handleSearch(searchQuery);
    }
  };

  // Funcția pentru a selecta o locație din căutare
  const selectLocation = (location: any) => {
    console.log('🎯 Selecting location:', location);
    console.log('🎯 Map instance:', mapInstanceRef.current);
    
    // Verifică dacă coordonatele sunt valide
    const lng = location.coords ? location.coords[0] : location.longitude;
    const lat = location.coords ? location.coords[1] : location.latitude;
    
    if (!lng || !lat || isNaN(lng) || isNaN(lat)) {
      console.error('❌ Invalid coordinates:', lng, lat);
      return;
    }
    
    if (mapInstanceRef.current && mapInstanceRef.current.getContainer()) {
      // Centrează harta pe locația selectată
      mapInstanceRef.current.flyTo({
        center: [lng, lat],
        zoom: 14,
        duration: 1000
      });
      
      // Găsește markerul corespunzător și deschide popup-ul
      setTimeout(() => {
        const markers = markersRef.current;
        console.log('🔍 Looking for marker among', markers.length, 'markers');
        
        const targetMarker = markers.find(marker => {
          const markerLngLat = marker.getLngLat();
          const distance = Math.sqrt(
            Math.pow(markerLngLat.lng - lng, 2) + 
            Math.pow(markerLngLat.lat - lat, 2)
          );
          return distance < 0.01; // Toleranță mai mare
        });
        
        console.log('🎯 Found target marker:', targetMarker);
        
        if (targetMarker) {
          const popup = targetMarker.getPopup();
          if (popup && mapInstanceRef.current && mapInstanceRef.current.getContainer()) {
            popup.addTo(mapInstanceRef.current);
            console.log('✅ Popup opened');
          }
        } else {
          console.log('❌ No marker found for location, creating temp popup');
          // Creează un popup temporar dacă nu găsește markerul
          const tempPopup = new mapboxgl.Popup({
            maxWidth: 300,
            closeButton: true,
            className: 'custom-popup'
          }).setHTML(`
            <div class="p-4 bg-white rounded-xl shadow-lg border border-gray-100">
              <h3 class="font-bold text-lg text-gray-800 mb-2">${location.name}</h3>
              <p class="text-sm text-gray-600">${location.subtitle || ''}</p>
              <p class="text-sm text-gray-500">${location.county}, ${location.region.charAt(0).toUpperCase() + location.region.slice(1)}</p>
              <div class="mt-3 flex gap-2">
                <button class="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600">
                  Vezi recorduri
                </button>
                <button class="px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600">
                  Adaugă record
                </button>
                </div>
              </div>
          `);
          
          if (mapInstanceRef.current && mapInstanceRef.current.getContainer()) {
            tempPopup.setLngLat([lng, lat])
              .addTo(mapInstanceRef.current);
            console.log('✅ Temp popup created');
          }
        }
      }, 1200); // După ce se termină animația
    } else {
      console.error('❌ Map not ready for location selection');
    }
    setShowSearchResults(false);
    setSearchQuery('');
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return; // Previne reîncărcarea

    // Previne reîncărcarea la focus change - COMPLET DEZACTIVAT
    const handleVisibilityChange = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    const handleFocus = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Previne reîncărcarea la resize
    const handleResize = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    const handleBlur = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    // Adaugă event listeners cu capture: true pentru a preveni propagarea
    document.addEventListener('visibilitychange', handleVisibilityChange, { capture: true, passive: false });
    window.addEventListener('focus', handleFocus, { capture: true, passive: false });
    window.addEventListener('blur', handleBlur, { capture: true, passive: false });
    window.addEventListener('resize', handleResize, { capture: true, passive: false });

    // Detect if mobile device - more accurate detection
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    console.log(`🗺️ Initializing map - Mobile: ${isMobile}, Screen: ${window.innerWidth}x${window.innerHeight}`);
    
    // CRITICAL: Simplified config to prevent reload issues and white boxes
    const mapConfig: mapboxgl.MapboxOptions = {
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [25.0094, 45.9432] as [number, number], // Centru România
      zoom: 6,
      minZoom: 3,
      maxZoom: 18,
      pitch: 0,
      bearing: 0,
      antialias: !isMobile,
      renderWorldCopies: false,
      // Optimizări pentru stabilitate și sincronizare
      preferCanvas: isMobile,
      zoomAnimation: true, // Activat pentru sincronizare cu markerele
      detectRetina: false, // Dezactivat pentru stabilitate
      updateWhenZooming: true, // Activat pentru sincronizare
      keepBuffer: 2, // Mărit pentru sincronizare
      // Previne chenarele albe și reîncărcarea
      preserveDrawingBuffer: false,
      refreshExpiredTiles: false,
      fadeDuration: 200, // Animație smooth pentru sincronizare
      crossSourceCollisions: false,
      // Optimizări pentru stabilitate
      maxTileCacheSize: 50, // Mărit pentru sincronizare
      localIdeographFontFamily: false,
      // Previne reîncărcarea
      attributionControl: false,
      logoPosition: 'bottom-right'
    };

    const map = new mapboxgl.Map(mapConfig);
    mapInstanceRef.current = map;

    // Adaugă error handling pentru harta
    map.on('error', (e) => {
      console.error('Map error:', e);
      setMapError(true);
    });

    // Custom navigation controls (no native controls)
    // map.addControl(new mapboxgl.NavigationControl({
    //   showCompass: !isMobile,
    //   showZoom: true,
    //   visualizePitch: false
    // }), 'top-right');

    // Custom geolocation control (no native controls)
    // map.addControl(new mapboxgl.GeolocateControl({
    //   positionOptions: {
    //     enableHighAccuracy: true
    //   },
    //   trackUserLocation: true,
    //   showUserHeading: true,
    //   showUserLocation: true
    // }), 'top-right');

    // Load locations after map is ready - UNIFIED STRATEGY
    setTimeout(() => {
      console.log('🔄 Loading locations after map ready...');
      if (databaseLocations.length > 0) {
        addLocationsToMap(map, 'all');
      }
    }, 200); // Single delay for stability

    // CRITICAL: Optimized event listeners to prevent reload issues
      map.on('click', () => {
        setShowShopPopup(false);
        setShowLocationRequest(false);
      setShowSearchResults(false);
    });
    
    // Previne reîncărcarea la focus change
    map.on('blur', () => {
      // Nu face nimic - previne reîncărcarea
    });
    
    map.on('focus', () => {
      // Nu face nimic - previne reîncărcarea
    });

    // Nu mai cerem geolocația automat - doar când userul apasă pe săgeată
    // const locationAccepted = localStorage.getItem('locationAccepted');
    // if (locationAccepted === 'true' && navigator.geolocation) {
    // navigator.geolocation.getCurrentPosition(...) - comentat pentru a nu cere automat
    // }

    return () => {
      // Cleanup event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange, { capture: true });
      window.removeEventListener('focus', handleFocus, { capture: true });
      window.removeEventListener('blur', handleBlur, { capture: true });
      window.removeEventListener('resize', handleResize, { capture: true });
      
      // Cleanup doar dacă componenta se unmount complet
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      // Cleanup markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
    };
  }, [user]);

  // Funcție pentru adăugarea locațiilor pe hartă - OPTIMIZATĂ PENTRU MOBIL
  const addLocationsToMap = (_map: mapboxgl.Map, filterType: string) => {
    if (!_map || !_map.getContainer()) {
      console.error('❌ Map instance is null or not ready');
      return;
    }
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Detect if mobile device - more accurate detection
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Adaugă locațiile filtrate din baza de date
    const allLocations = filterType === 'all' ? databaseLocations : 
      databaseLocations.filter(loc => loc.type === filterType);
    
    // Show all locations - performance is handled by smaller markers and simplified popups
    const locationsToShow = allLocations;
    
    console.log(`📍 Adding ${locationsToShow.length} locations (Mobile: ${isMobile})`);

    // Adaugă markerii în batch pentru performanță mai bună
    const markers: mapboxgl.Marker[] = [];
    
    locationsToShow.forEach(location => {
      // Determină culoarea în funcție de tipul locației
      let markerColor = '#6B7280'; // default pentru 'all'
      
      switch (location.type) {
        case 'river':
          markerColor = '#10B981';
          break;
        case 'lake':
          markerColor = '#3B82F6';
          break;
        case 'pond':
          markerColor = '#EF4444';
          break;
        case 'private_pond':
          markerColor = '#8B5CF6';
          break;
        case 'balti_salbatic':
          markerColor = '#EF4444';
          break;
        case 'maritime':
          markerColor = '#6366F1';
          break;
      }

      // CRITICAL: Optimized markers for mobile performance
      const markerEl = document.createElement('div');
      markerEl.className = 'custom-marker';
      
      if (isMobile) {
        // Mobile: Simple circle marker
        markerEl.style.cssText = `
          width: 16px;
          height: 16px;
          background-color: ${markerColor};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
        `;
      } else {
        // Desktop: Use divIcon for better visual appeal
        markerEl.style.cssText = `
          width: 24px;
          height: 24px;
          background-color: ${markerColor};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
          font-weight: bold;
          transition: transform 0.2s ease;
          transform-origin: center center;
        `;
        // markerEl.innerHTML = '🎣'; // Removed emoji as requested
        
        // Hover effects for desktop - disabled to prevent position shift
        // markerEl.addEventListener('mouseenter', () => {
        //   markerEl.style.transform = 'scale(1.2)';
        //   markerEl.style.transformOrigin = 'center center';
        // });
        
        // markerEl.addEventListener('mouseleave', () => {
        //   markerEl.style.transform = 'scale(1)';
        //   markerEl.style.transformOrigin = 'center center';
        // });
      }

      let marker: mapboxgl.Marker | null = null;
      
      if (_map && _map.getContainer()) {
        marker = new mapboxgl.Marker(markerEl)
          .setLngLat(location.coords)
          .addTo(_map);
        
      markers.push(marker);
      
      // CRITICAL: Ultra-simplified popup for mobile performance
      const popupContent = isMobile ? `
        <div class="p-4 min-w-[200px] max-w-[240px] bg-white rounded-xl shadow-lg border border-gray-100 relative">
          <button class="absolute top-2 right-2 w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors" onclick="this.closest('.mapboxgl-popup').remove()">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          
          <div class="mb-3">
            <h3 class="font-bold text-sm text-gray-800 mb-1 flex items-center gap-2">
              <span class="text-lg">${getWaterTypeEmoji(location.type)}</span>
              ${location.name}
            </h3>
            ${location.subtitle ? `<p class="text-xs text-gray-600 mb-1">${location.subtitle}</p>` : ''}
            <p class="text-xs text-gray-500">${location.county}, ${location.region.charAt(0).toUpperCase() + location.region.slice(1)}</p>
          </div>
          
          ${location.administrare ? `
          <div class="mb-3 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <p class="text-xs text-blue-700 leading-relaxed">${location.administrare}</p>
          </div>
          ` : ''}
          
          <div class="mb-3">
            <p class="text-xs font-semibold text-gray-700">Recorduri: <span class="text-blue-600 font-bold">${location.recordCount}</span></p>
          </div>
          
          <div class="flex gap-2">
            <button class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1.5 rounded-lg text-xs font-medium transition-colors">
              Vezi recorduri
            </button>
            <button class="flex-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1.5 rounded-lg text-xs font-medium transition-colors">
              Adaugă record
            </button>
          </div>
        </div>
      ` : `
        <div class="p-5 min-w-[320px] max-w-[380px] bg-white rounded-2xl shadow-xl border border-gray-100 relative">
          <button class="absolute top-3 right-3 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors" onclick="this.closest('.mapboxgl-popup').remove()">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          <div class="mb-4">
            <h3 class="font-bold text-xl text-gray-800 mb-2 flex items-center gap-2">
              <span class="text-2xl">${getWaterTypeEmoji(location.type)}</span>
              ${location.name}
            </h3>
            ${location.subtitle ? `<p class="text-sm text-gray-600 mb-1">${location.subtitle}</p>` : ''}
            <p class="text-sm text-gray-500">${location.county}, ${location.region.charAt(0).toUpperCase() + location.region.slice(1)}</p>
          </div>
          
          ${location.administrare ? `
          <div class="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <p class="text-sm text-blue-700 leading-relaxed">${location.administrare}</p>
          </div>
          ` : ''}
          
          <div class="mb-4">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-gray-700">Recorduri:</span>
              <div class="flex items-center gap-1">
                ${location.recordCount >= 1 ? '<span class="text-yellow-500">🥇</span>' : ''}
                ${location.recordCount >= 2 ? '<span class="text-gray-400">🥈</span>' : ''}
                ${location.recordCount >= 3 ? '<span class="text-amber-600">🥉</span>' : ''}
                <span class="text-sm font-bold text-gray-800">${location.recordCount}</span>
              </div>
            </div>
          </div>
          
          <div class="flex gap-3">
            <button class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
              Vezi recorduri
            </button>
            <button class="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
              Adaugă record
            </button>
          </div>
        </div>
      `;

        const popup = new mapboxgl.Popup({
          maxWidth: isMobile ? 240 : 400,
          closeButton: false, // Custom close button
          className: 'custom-popup'
        }).setHTML(popupContent);

        marker.setPopup(popup);
      } else {
        console.error('Map not ready for marker creation');
      }
    });
    
    // CRITICAL: High-performance marker adding
    if (markers.length > 0) {
      try {
        if (isMobile) {
          // Mobile: Add markers in batches to prevent blocking
          const batchSize = 50;
          for (let i = 0; i < markers.length; i += batchSize) {
            const batch = markers.slice(i, i + batchSize);
            setTimeout(() => {
              batch.forEach(marker => {
                if (marker) {
                  markersRef.current.push(marker);
                }
              });
            }, (i / batchSize) * 50); // 50ms delay between batches
          }
        } else {
          // Desktop: Add all markers immediately
          markers.forEach(marker => {
            if (marker) {
              markersRef.current.push(marker);
            }
          });
        }
        console.log(`✅ Added ${markers.length} markers (Mobile: ${isMobile})`);
      } catch (error) {
        console.error('Error adding markers to map:', error);
      }
    }
  };

  // Funcție pentru filtrarea locațiilor
  const filterLocations = (type: string) => {
    setActiveFilter(type);
    
    if (mapInstanceRef.current) {
      // Resetează zoom-ul la România
      mapInstanceRef.current.flyTo({
        center: [25.0094, 45.9432],
        zoom: 6,
        duration: 800
      });
      
      // Adaugă locațiile filtrate după animație
      setTimeout(() => {
        if (databaseLocations.length > 0) {
          addLocationsToMap(mapInstanceRef.current, type);
        }
      }, 900);
    }
  };

  // Funcție pentru centrarea pe locația utilizatorului cu watchPosition
  const centerOnUserLocation = async () => {
    try {
      setIsLocating(true);
      
      // Verifică dacă geolocation este disponibil
      if (!navigator.geolocation) {
        alert('Geolocation nu este suportat de acest browser.');
        setIsLocating(false);
        return;
      }

      // Verifică dacă utilizatorul a dat deja permisiunea
      const locationAccepted = localStorage.getItem('locationAccepted') === 'true';
      
      if (locationAccepted) {
        // Dacă a dat deja permisiunea, centrează direct pe locația sa
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            console.log('📍 GPS coordinates:', latitude, longitude);
            
            if (mapInstanceRef.current) {
              mapInstanceRef.current.flyTo({
                center: [longitude, latitude],
                zoom: 15,
                duration: 1000
              });
              
              // Adaugă marker pentru locația userului
              addUserLocationMarker(latitude, longitude);
            }
            setIsLocating(false);
          },
          (error) => {
            console.error('Eroare la obținerea locației:', error);
            let errorMessage = 'Nu s-a putut obține locația.';
            
            switch(error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Permisiunea pentru locație a fost refuzată. Te rugăm să activezi locația în setările browser-ului.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Locația nu este disponibilă. Verifică dacă GPS-ul este activat.';
                break;
              case error.TIMEOUT:
                errorMessage = 'Timeout la obținerea locației. Încearcă din nou.';
                break;
            }
            
            alert(errorMessage);
            setShowLocationRequest(true);
            setIsLocating(false);
          },
          { 
            maximumAge: 0, // Nu folosește cache
            timeout: 30000, // Timeout și mai mare pentru mobil
            enableHighAccuracy: true, // Precizie maximă
            watchPosition: false // Nu urmări poziția
          }
        );
      } else {
        // Dacă nu a dat permisiunea, afișează popup-ul
        setShowLocationRequest(true);
        setIsLocating(false);
      }
    } catch (error) {
      console.error('Eroare la obținerea locației:', error);
      setIsLocating(false);
    }
  };

  // Funcție pentru adăugarea markerului pentru locația userului
  const addUserLocationMarker = async (latitude: number, longitude: number) => {
    if (!mapInstanceRef.current) return;

    // Șterge markerul anterior dacă există
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove();
    }

    // Creează markerul pentru locația userului - MEREU MARE
    const userMarkerEl = document.createElement('div');
    userMarkerEl.className = 'user-location-marker';
    userMarkerEl.style.cssText = `
      width: 40px;
      height: 40px;
      background: white;
      border: 4px solid #3B82F6;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      z-index: 1000;
      position: relative;
    `;
    userMarkerEl.innerHTML = '🎣';

        if (mapInstanceRef.current && mapInstanceRef.current.getContainer()) {
      const userMarker = new mapboxgl.Marker(userMarkerEl)
        .setLngLat([longitude, latitude])
        .addTo(mapInstanceRef.current);

      userLocationMarkerRef.current = userMarker;

      // Adaugă popup cu informații despre locația userului
      const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Utilizator';
      const userPhoto = user?.user_metadata?.avatar_url || '';
      
      // Obține adresa prin reverse geocoding
      try {
        const address = await geocodingService.reverseGeocode(latitude, longitude);
        
        const popup = new mapboxgl.Popup({
          maxWidth: 250,
          closeButton: false,
          closeOnClick: false,
          className: 'custom-popup'
        }).setHTML(`
          <div class="p-4 min-w-[200px] max-w-[250px] bg-white rounded-2xl shadow-xl border border-gray-100 relative">
            <button class="absolute top-3 right-3 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors" onclick="this.closest('.mapboxgl-popup').remove()">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
            
            <div class="text-center mb-3">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white rounded-full flex items-center justify-center overflow-hidden shadow-lg mx-auto mb-2">
                ${userPhoto ? 
                  `<img src="${userPhoto}" alt="${userName}" class="w-full h-full object-cover rounded-full" />` :
                  `<span class="text-white font-bold text-lg">${userName.charAt(0).toUpperCase()}</span>`
                }
              </div>
              <h3 class="font-bold text-lg text-gray-800 mb-1">${userName}</h3>
              <p class="text-sm text-blue-600 font-medium">📍 Locația ta curentă</p>
            </div>
            
            <div class="space-y-2 p-3 bg-gray-50 rounded-xl">
              <div class="text-center">
                <p class="text-xs font-semibold text-gray-700 mb-1">Coordonate GPS</p>
              <p class="text-xs text-gray-600 font-mono">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</p>
            </div>
              <div class="text-center">
                <p class="text-xs font-semibold text-gray-700 mb-1">Adresă</p>
                <p class="text-xs text-gray-600 leading-relaxed">${address}</p>
              </div>
            </div>
          </div>
        `);

        userMarker.setPopup(popup);
      } catch (error) {
        console.error('Eroare la reverse geocoding:', error);
      }
    } else {
      console.error('Map not ready for user marker');
    }
  };

  // Funcție pentru gestionarea permisiunii de locație
  const handleLocationPermission = async (granted: boolean) => {
    setShowLocationRequest(false);
    
    if (!granted) {
      return;
    }

    try {
      // Șterge markerul anterior dacă există
      if (userLocationMarkerRef.current && mapInstanceRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }

      // Folosește getCurrentPosition pentru mobil (mai stabil)
      const isMobile = window.innerWidth <= 768;
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log('📍 Geolocation position:', { latitude, longitude, accuracy: position.coords.accuracy });
          
          if (mapInstanceRef.current && mapInstanceRef.current.getContainer()) {
            // Centrează harta pe locația utilizatorului cu animație smooth
            mapInstanceRef.current.flyTo({
              center: [longitude, latitude],
              zoom: 12,
              duration: 1000
            });
            
            // Obține adresa prin reverse geocoding
            const address = await geocodingService.reverseGeocode(latitude, longitude);
            
            // Creează marker cu fundal alb și design îmbunătățit
            const userMarkerEl = document.createElement('div');
            userMarkerEl.className = 'user-location-marker';
            userMarkerEl.innerHTML = `<div class="w-12 h-12 bg-white border-3 border-blue-500 rounded-full shadow-xl flex items-center justify-center text-2xl ${!isMobile ? 'transform hover:scale-110 transition-transform duration-200' : ''}">🎣</div>`;

            let userMarker: mapboxgl.Marker | null = null;
            
            userMarker = new mapboxgl.Marker(userMarkerEl)
              .setLngLat([longitude, latitude])
              .addTo(mapInstanceRef.current);
            userLocationMarkerRef.current = userMarker;

            // Adaugă popup cu design îmbunătățit
            const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Utilizator';
            const userPhoto = user?.user_metadata?.avatar_url || '';
            
            const popup = new mapboxgl.Popup({
              maxWidth: 250,
              closeButton: false,
              closeOnClick: false,
              className: 'custom-popup',
              offset: [0, -10] // Popup deasupra markerului
            }).setHTML(`
              <div class="p-4 min-w-[200px] max-w-[250px] bg-white rounded-2xl shadow-xl border border-gray-100 relative">
                <button class="absolute top-3 right-3 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors" onclick="this.closest('.mapboxgl-popup').remove()">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
                
                <div class="text-center mb-3">
                  <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white rounded-full flex items-center justify-center overflow-hidden shadow-lg mx-auto mb-2">
                    ${userPhoto ? 
                      `<img src="${userPhoto}" alt="${userName}" class="w-full h-full object-cover rounded-full" />` :
                      `<span class="text-white font-bold text-lg">${userName.charAt(0).toUpperCase()}</span>`
                    }
                  </div>
                  <h3 class="font-bold text-lg text-gray-800 mb-1">${userName}</h3>
                  <p class="text-sm text-blue-600 font-medium">📍 Locația ta curentă</p>
                </div>
                
                <div class="space-y-2 p-3 bg-gray-50 rounded-xl">
                  <div class="text-center">
                    <p class="text-xs font-semibold text-gray-700 mb-1">Coordonate GPS</p>
                  <p class="text-xs text-gray-600 font-mono">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</p>
                </div>
                  <div class="text-center">
                    <p class="text-xs font-semibold text-gray-700 mb-1">Adresă</p>
                    <p class="text-xs text-gray-600 leading-relaxed">${address}</p>
              </div>
                </div>
              </div>
            `);

            if (userMarker) {
              userMarker.setPopup(popup);
              // Deschide popup-ul automat
              setTimeout(() => {
                if (userMarker) {
                  userMarker.togglePopup();
                }
              }, 500);
            }

            // Salvează că utilizatorul a acceptat locația
            localStorage.setItem('locationAccepted', 'true');
          }
        },
        (error) => {
          console.error('Eroare la obținerea locației:', error);
          
          if (error.code === 1) {
            console.error('❌ Permission denied - user denied location access');
            alert('Permisiunea de locație a fost refuzată. Te rog să activezi locația în setările browser-ului și să reîmprospătezi pagina.');
          } else if (error.code === 2) {
            console.error('❌ Position unavailable - location could not be determined');
            alert('Locația nu poate fi determinată. Verifică dacă GPS-ul este activat și că ai semnal bun.');
          } else if (error.code === 3) {
            console.error('❌ Timeout - location request timed out');
            alert('Cererea de locație a expirat. Încearcă din nou sau verifică conexiunea la internet.');
          } else {
            console.error('❌ Unknown geolocation error:', error);
            alert('Nu s-a putut obține locația. Verifică că ai activat locația în browser și că ai semnal bun.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: isMobile ? 30000 : 15000, // Timeout mai mare pentru mobil
          maximumAge: isMobile ? 300000 : 60000 // Cache mai mare pentru mobil
        }
      );
    } catch (error) {
      console.error('Eroare la obținerea locației:', error);
      alert('Eroare la obținerea locației.');
    }
  };



  // Funcție pentru deschiderea popup-ului magazin
  const openShopPopup = () => {
    setShowShopPopup(true);
  };

  return (
    <>
      <SEOHead
        title="Fish Trophy - Platforma Pescarilor din România"
        description="Descoperă cele mai bune locații de pescuit din România, urmărește recordurile și concurează cu alții pescari pasionați. Hărți interactive, ghiduri complete și comunitate activă."
        keywords="pescuit, romania, locatii pescuit, recorduri pescuit, harta pescuit, marea neagra, rauri romania, lacuri romania, balti pescuit, specii pesti, tehnici pescuit, echipament pescuit, platforma pescarilor, comunitate pescuit"
        image="https://fishtrophy.ro/api/og?title=Fish%20Trophy&subtitle=Platforma%20Pescarilor%20din%20Rom%C3%A2nia&domain=fishtrophy.ro"
        url="https://fishtrophy.ro"
        type="website"
        structuredData={[websiteData, organizationData] as unknown as Record<string, unknown>[]}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
          <div className="fixed right-0 top-0 h-full w-64 bg-white shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Meniu</h2>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="space-y-4">
              <Link
                to="/"
                className="block text-gray-700 hover:text-blue-600 py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Acasă
              </Link>
              <Link
                to="/submission-guide"
                className="block text-gray-700 hover:text-blue-600 py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Ghid Submisie
              </Link>
              <Link
                to="/profile"
                className="block text-gray-700 hover:text-blue-600 py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Profilul meu
              </Link>
            </nav>
          </div>
        </div>
      )}

      {/* Hero Section - Small Banner */}
      <section className="relative py-4 md:py-6 px-4 md:px-6 lg:px-8 mt-2 md:-mt-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-xl p-4 md:p-6 text-center shadow-lg">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2">
              Descoperă cele mai bune locuri de pescuit din România
            </h1>
            <p className="text-sm md:text-base text-white">
              Explorează harta interactivă, înregistrează recordurile tale și concurează în clasamentele naționale!
            </p>
          </div>
        </div>
      </section>

      {/* Map Section - Mobile Optimized */}
      <section className="px-4 md:px-6 lg:px-8 mb-16">
        <div className="max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="relative mb-6 max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Caută locații, județe, râuri, lacuri..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-full px-4 py-3 pl-12 pr-4 bg-white border border-gray-200 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearchResults(false);
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
                {searchResults.map((location, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      console.log('🖱️ Clicked on search result:', location);
                      selectLocation(location);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-lg">
                        {getWaterTypeEmoji(location.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{location.name}</p>
                        <p className="text-sm text-gray-600 truncate">
                          {location.subtitle && `${location.subtitle} • `}
                          {location.county}, {location.region.charAt(0).toUpperCase() + location.region.slice(1)}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {location.type === 'river' ? 'Râu' : 
                         location.type === 'lake' ? 'Lac' :
                         location.type === 'balti_salbatic' ? 'Bălți Sălbatice' :
                         location.type === 'private_pond' ? 'Bălți Private' : location.type}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {showSearchResults && searchResults.length === 0 && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-4 text-center text-gray-500">
                Nu s-au găsit locații pentru "{searchQuery}"
              </div>
            )}
          </div>

          {/* Map Controls - Mobile Optimized */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
              {[
                { type: 'all', label: 'Toate', icon: MapPin, color: 'bg-gray-500 hover:bg-gray-600' },
                { type: 'river', label: 'Râuri', icon: MapPin, color: 'bg-emerald-500 hover:bg-emerald-600' },
                { type: 'lake', label: 'Lacuri', icon: MapPin, color: 'bg-blue-500 hover:bg-blue-600' },
                { type: 'balti_salbatic', label: 'Bălți Sălbatice', icon: MapPin, color: 'bg-red-500 hover:bg-red-600' },
                { type: 'private_pond', label: 'Bălți Private', icon: MapPin, color: 'bg-purple-500 hover:bg-purple-600' }
              ].map(({ type, label, icon: Icon, color }) => {
                const count = type === 'all' 
                  ? databaseLocations.length 
                  : databaseLocations.filter(loc => loc.type === type).length;
                
                return (
                <button
                  key={type}
                  onClick={() => filterLocations(type)}
                  className={`${color} text-white px-4 py-2 md:px-6 md:py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 ${
                    activeFilter === type ? 'ring-4 ring-blue-200' : ''
                  }`}
                >
                  <Icon className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-sm md:text-base">
                    {label} {isLoadingLocations ? '...' : `(${count})`}
                  </span>
                </button>
                );
              })}
              
              <button
                onClick={openShopPopup}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base">Magazine de Pescuit</span>
              </button>
            </div>
          </div>

          {/* Map Container - Mobile Optimized */}
          <div className="relative">
            {mapError ? (
              <div className="w-full h-96 md:h-[500px] lg:h-[600px] rounded-2xl shadow-2xl border-4 border-white overflow-hidden bg-gray-100 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Eroare la încărcarea hărții</h3>
                  <p className="text-gray-600 mb-4">Harta nu a putut fi încărcată. Te rugăm să reîmprospătezi pagina.</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Reîmprospătează pagina
                  </button>
                </div>
              </div>
            ) : (
            <div 
              ref={mapContainerRef} 
              className="w-full h-96 md:h-[500px] lg:h-[600px] rounded-2xl shadow-2xl border-4 border-white overflow-hidden"
              style={{ zIndex: 1 }}
            />
            )}
            
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
                disabled={isLocating}
                className={`bg-white hover:bg-gray-50 text-gray-700 p-3 rounded-xl shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl ${
                  isLocating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="Centrare pe locația mea"
              >
                {isLocating ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                <Navigation className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Mobile Optimized */}
      <section className="px-4 md:px-6 lg:px-8 mb-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-12">
            De ce Fish Trophy?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: MapPin,
                title: "Locații Verificate",
                description: "Toate locațiile sunt verificate și cu coordonate precise"
              },
              {
                icon: Fish,
                title: "Recorduri Reale",
                description: "Sistem de verificare pentru toate recordurile"
              },
              {
                icon: Navigation,
                title: "Geolocație",
                description: "Găsește locațiile cele mai apropiate de tine"
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <feature.icon className="w-8 h-10 md:w-10 md:h-12 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 text-center">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-center leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Mobile Optimized */}
      <section className="px-4 md:px-6 lg:px-8 mb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 md:p-12 shadow-2xl">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-6">
              Începe să pescuiți cu Fish Trophy!
            </h2>
            <p className="text-lg md:text-xl text-blue-100 mb-8 leading-relaxed">
              Înregistrează-te acum și accesează toate funcționalitățile platformei
            </p>
            <Link
              to="/submission-guide"
              className="inline-block bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-gray-50"
            >
              Ghidul Complet
            </Link>
          </div>
        </div>
      </section>

      {/* Location Request Overlay */}
      {showLocationRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Navigation className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Permite accesul la locație
            </h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Pentru a-ți arăta locațiile de pescuit cele mai apropiate și pentru a-ți oferi o experiență personalizată
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleLocationPermission(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 transition-colors"
              >
                Nu acum
              </button>
              <button
                onClick={() => handleLocationPermission(true)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Permite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shop Popup Modal */}
      {showShopPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              În Curând!
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Funcționalitatea pentru magazinele de pescuit va fi disponibilă în curând.
            </p>
            <p className="text-gray-700 mb-8 leading-relaxed font-medium">
              Vrei să-ți adaugi magazinul pe hartă? 
              <br />
              <span className="text-blue-600">Trimite-ne un email cu detaliile tale!</span>
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowShopPopup(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 transition-colors"
              >
                Închide
              </button>
              <Link
                to="/fishing-shops"
                onClick={() => setShowShopPopup(false)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Trimite Detalii
              </Link>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
