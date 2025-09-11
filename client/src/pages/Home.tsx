import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, X } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { loadFishingLocations, FishingLocation } from '@/services/fishingLocations';

import { geocodingService } from '@/services/geocoding';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import SEOHead from '@/components/SEOHead';
import { useStructuredData } from '@/hooks/useStructuredData';
import RecordSubmissionModal from '@/components/RecordSubmissionModal';

// FAQ Component with animations
function FAQItem({ question, answer, index, isOpen, onToggle }: {
  question: string;
  answer: string;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-white/20 overflow-hidden hover:shadow-lg" style={{ willChange: 'transform, opacity, box-shadow' }}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50/50 transition-colors"
        style={{ willChange: 'background-color' }}
      >
        <h3 className="text-base md:text-lg font-semibold text-gray-900 flex items-start gap-2">
          <span className="text-blue-600 font-bold text-base">Q{index + 1}.</span>
          <span className="flex-1">{question}</span>
        </h3>
        <div
          className="ml-2 transition-transform duration-200 ease-out"
          style={{
            transform: isOpen ? 'translateZ(0) rotate(180deg)' : 'translateZ(0) rotate(0deg)',
            willChange: 'transform'
          }}
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div
        className="overflow-hidden"
        style={{
          maxHeight: isOpen ? '400px' : '0px',
          opacity: isOpen ? 1 : 0,
          transition: 'max-height 0.2s ease-out, opacity 0.2s ease-out',
          willChange: 'max-height, opacity'
        }}
      >
        <div className="px-4 pb-3">
          <p className="text-base text-gray-700 leading-relaxed pl-6">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

// MapLibre doesn't need access token

// CRITICAL: Mobile-specific CSS optimizations + Anti-flicker
const mobileCSS = `
  .maplibregl-container {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    will-change: auto;
    transform: translateZ(0);
    backface-visibility: hidden;
    perspective: 1000px;
  }

  .maplibregl-canvas {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    will-change: auto;
    transform: translateZ(0);
    backface-visibility: hidden;
  }

  .custom-marker {
    pointer-events: auto !important;
    will-change: transform;
    transform: translateZ(0);
  }

  /* Prevent size changes during loading - 4:3 aspect ratio */
  .maplibregl-map {
    width: 100% !important;
    height: 100% !important;
    min-height: 450px;
    max-height: 650px;
    aspect-ratio: 4/3;
  }

  @media (max-width: 768px) {
    .maplibregl-popup-content {
      margin: 8px !important;
    }

    .maplibregl-popup-tip {
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
  const { trackMapInteraction } = useAnalytics();
  const { websiteData, organizationData } = useStructuredData();
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const markerIndexRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const userLocationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showShopPopup, setShowShopPopup] = useState(false);
  const [showLocationRequest, setShowLocationRequest] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedLocationForRecord, setSelectedLocationForRecord] = useState<{id: string, name: string} | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [databaseLocations, setDatabaseLocations] = useState<FishingLocation[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<FishingLocation & { score: number }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);
  const [isAddingMarkers, setIsAddingMarkers] = useState(false);

  // Funcție pentru adăugarea locațiilor pe hartă - OPTIMIZATĂ PENTRU MOBIL
  const addLocationsToMap = (_map: maplibregl.Map, filterType: string) => {
    if (!_map || !_map.getContainer()) {
      console.error('❌ Map instance is null or not ready');
      return;
    }

    if (isAddingMarkers) {
      console.log('⏳ Already adding markers, skipping...');
      return;
    }

    setIsAddingMarkers(true);

    try {

    // Clear existing markers with better performance
    const markersToRemove = [...markersRef.current];
    markersRef.current = [];
    markerIndexRef.current.clear();

    // Remove markers in batches to prevent flickering
    markersToRemove.forEach(marker => {
      try {
        marker.remove();
      } catch (e) {
        // Ignore errors when removing markers
      }
    });

    // Detect if mobile device - more accurate detection
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Adaugă locațiile filtrate din baza de date
    const allLocations = filterType === 'all' ? databaseLocations :
      databaseLocations.filter(loc => {
        if (filterType === 'river') {
          // Include both 'river' and 'fluviu' types for rivers
          return loc.type === 'river' || loc.type === 'fluviu';
        }
        return loc.type === filterType;
      });

    // Show all locations - performance is handled by smaller markers and simplified popups
    const locationsToShow = allLocations;


    // Adaugă markerii în batch pentru performanță mai bună
    const markers: maplibregl.Marker[] = [];

    locationsToShow.forEach(location => {
      // Debug: log location type for Dunărea - REMOVED TO PREVENT SPAM

      // Determină culoarea în funcție de tipul locației
      let markerColor = '#6B7280'; // default pentru 'all'

      switch (location.type) {
        case 'river':
        case 'fluviu':
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
          width: 18px;
          height: 18px;
          background-color: ${markerColor};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
        `;
      } else {
        // Desktop: Simple circle marker
        markerEl.style.cssText = `
          width: 24px;
          height: 24px;
          background-color: ${markerColor};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
        `;

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

      let marker: maplibregl.Marker | null = null;

      // Use coords [lng, lat] coming from service; validate before adding
      const [lng, lat] = location.coords || [0, 0];
      if (
        _map &&
        _map.getContainer() &&
        typeof lng === 'number' &&
        typeof lat === 'number' &&
        !Number.isNaN(lng) &&
        !Number.isNaN(lat)
      ) {
        // marker ca în designul anterior: cerc colorat cu border alb
        marker = new maplibregl.Marker({ element: markerEl, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(_map);

        markers.push(marker);

        // Add to index for quick access
        const locationKey = `${location.name}:${lng}:${lat}`;
        markerIndexRef.current.set(locationKey, marker);

      // CRITICAL: Ultra-simplified popup for mobile performance
      const popupContent = isMobile ? `
        <div class="p-4 min-w-[200px] max-w-[240px] bg-white rounded-xl shadow-lg border border-gray-100 relative">
          <button class="absolute top-3 right-3 w-6 h-6 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shadow-sm border border-gray-200" onclick="this.closest('.maplibregl-popup').remove()">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>

          <div class="mb-3">
            <h3 class="font-bold text-sm text-gray-800 mb-1 flex items-center gap-2">
              <span class="text-lg">${location.type === 'river' || location.type === 'fluviu' ? '🌊' : location.type === 'lake' ? '🏞️' : location.type === 'balti_salbatic' ? '🌿' : location.type === 'private_pond' ? '🏡' : '💧'}</span>
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
            <button class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1.5 rounded-lg text-xs font-medium transition-colors" data-action="view-records" data-location-id="${location.id}" data-location-name="${location.name}">
              Vezi recorduri
            </button>
            <button class="flex-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1.5 rounded-lg text-xs font-medium transition-colors" data-action="add-record" data-location-id="${location.id}" data-location-name="${location.name}">
              Adaugă record
            </button>
          </div>
        </div>
      ` : `
        <div class="p-5 min-w-[320px] max-w-[380px] bg-white rounded-2xl shadow-xl border border-gray-100 relative">
          <button class="absolute top-3 right-3 w-6 h-6 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shadow-sm border border-gray-200" onclick="this.closest('.maplibregl-popup').remove()">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          <div class="mb-4">
            <h3 class="font-bold text-xl text-gray-800 mb-2 flex items-center gap-2">
              <span class="text-2xl">${location.type === 'river' || location.type === 'fluviu' ? '🌊' : location.type === 'lake' ? '🏞️' : location.type === 'balti_salbatic' ? '🌿' : location.type === 'private_pond' ? '🏡' : '💧'}</span>
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
            <button class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg" data-action="view-records" data-location-id="${location.id}" data-location-name="${location.name}">
              Vezi recorduri
            </button>
            <button class="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg" data-action="add-record" data-location-id="${location.id}" data-location-name="${location.name}">
              Adaugă record
            </button>
          </div>
        </div>
      `;

        const popup = new maplibregl.Popup({
          maxWidth: isMobile ? '240px' : '400px',
          closeButton: false, // Custom close button
          className: 'custom-popup'
        }).setHTML(popupContent);

        marker.setPopup(popup);

        // Add event listeners for popup buttons
        popup.on('open', () => {
          setTimeout(() => {
            // Add record button
            const addRecordButtons = document.querySelectorAll('[data-action="add-record"]');
            addRecordButtons.forEach(button => {
              button.addEventListener('click', (e) => {
                e.preventDefault();
                const locationId = button.getAttribute('data-location-id');
                const locationName = button.getAttribute('data-location-name');
                if (locationId && locationName) {
                  setSelectedLocationForRecord({ id: locationId, name: locationName });
                  setShowRecordModal(true);
                }
              });
            });

            // View records button
            const viewRecordsButtons = document.querySelectorAll('[data-action="view-records"]');
            viewRecordsButtons.forEach(button => {
              button.addEventListener('click', (e) => {
                e.preventDefault();
                const locationId = button.getAttribute('data-location-id');
                const locationName = button.getAttribute('data-location-name');
                if (locationId && locationName) {
                  // Navigate to records page with location filter
                  window.location.href = `/records?location=${encodeURIComponent(locationId)}`;
                }
              });
            });
          }, 100);
        });

        // Add event listener to center popup when opened
        marker.getElement().addEventListener('click', () => {
          // Track marker click
          trackMapInteraction('marker_click', {
            location_id: location.id,
            location_name: location.name,
            location_type: location.type
          });

          setTimeout(() => {
            if (mapInstanceRef.current) {
              const map = mapInstanceRef.current;
              const offsetPx = 120; // deplasează centrul în sus pentru a vedea popupul
              const center = map.project([lng, lat]);
              const adjusted = { x: center.x, y: center.y - offsetPx };
              const adjustedLngLat = map.unproject(adjusted as unknown as [number, number]);
              map.easeTo({
                center: [adjustedLngLat.lng, adjustedLngLat.lat],
                duration: 800,
                essential: true
              });
            }
          }, 100); // Small delay to ensure popup is rendered
        });
      } else {
        console.error('Map not ready for marker creation');
      }
    });

    // Add markers directly - no batching needed
    markersRef.current = markers.filter(marker => marker !== null);
  } finally {
    setIsAddingMarkers(false);
  }
  };

  // Încarcă locațiile din baza de date
  useEffect(() => {
    const loadLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const locations = await loadFishingLocations();
        setDatabaseLocations(locations);
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
    if (mapInstanceRef.current && databaseLocations.length > 0 && !isLoadingLocations) {
      // Use double requestAnimationFrame for smoother transitions
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (mapInstanceRef.current) {
            addLocationsToMap(mapInstanceRef.current, activeFilter);
          }
        });
      });
    }
  }, [databaseLocations.length, isLoadingLocations, activeFilter]);

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


  // Funcția de căutare
  const handleSearch = useCallback((query: string) => {
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

    setSearchResults(resultsWithScore.slice(0, 10)); // Limitează la 10 rezultate
    setShowSearchResults(true);

    // Dacă se caută un județ, fac zoom pe județ
    if (normalizedQuery.length >= 3) {
      const countyResults = resultsWithScore.filter(loc =>
        normalizeText(loc.county).includes(normalizedQuery)
      );

      if (countyResults.length > 0 && mapInstanceRef.current && mapInstanceRef.current.getContainer()) {
        // Calculează centrul județului
        const validResults = countyResults.filter(loc => {
          const lat = loc.coords[1];
          const lng = loc.coords[0];
          return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        });

        if (validResults.length === 0) {
          console.error('❌ No valid coordinates found for county');
          return;
        }

        const avgLat = validResults.reduce((sum, loc) => {
          return sum + loc.coords[1];
        }, 0) / validResults.length;
        const avgLng = validResults.reduce((sum, loc) => {
          return sum + loc.coords[0];
        }, 0) / validResults.length;


        // Verifică dacă coordonatele sunt valide
        if (!isNaN(avgLat) && !isNaN(avgLng) && avgLat !== 0 && avgLng !== 0) {
          mapInstanceRef.current.flyTo({
            center: [avgLng, avgLat],
            zoom: 10,
            duration: 1000
          });
        } else {
          console.error('❌ Invalid county coordinates:', avgLat, avgLng);
        }
      } else {
        console.log('No valid coordinates found for county');
      }
    }
  }, [databaseLocations, trackMapInteraction]);

  // Debounce pentru căutare – mai fluid și fără „salturi”
  useEffect(() => {
    const id = setTimeout(() => {
      if (searchQuery.trim() === '') {
        setSearchResults([]);
        setShowSearchResults(false);
      } else {
        handleSearch(searchQuery);
      }
    }, 150);
    return () => clearTimeout(id);
  }, [searchQuery, handleSearch]);

  // Funcția pentru Enter în căutare
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  // Funcția pentru a selecta o locație din căutare
  const selectLocation = (location: FishingLocation & { score: number }) => {

    // Verifică dacă coordonatele sunt valide
    const lng = location.coords[0];
    const lat = location.coords[1];

    if (!lng || !lat || isNaN(lng) || isNaN(lat)) {
      console.error('❌ Invalid coordinates:', lng, lat);
      return;
    }

    if (mapInstanceRef.current && mapInstanceRef.current.getContainer()) {
      const map = mapInstanceRef.current;

      // Fly to location first
      map.flyTo({
        center: [lng, lat],
        zoom: 14,
        duration: 800
      });

      // Open popup after moveend
      map.once('moveend', () => {
        // Try to find marker using index first
        const locationKey = `${location.name}:${lng}:${lat}`;
        let targetMarker = markerIndexRef.current.get(locationKey);

        // Fallback to distance-based search
        if (!targetMarker) {
          targetMarker = markersRef.current.find(marker => {
            const markerLngLat = marker.getLngLat();
            const distance = Math.sqrt(
              Math.pow(markerLngLat.lng - lng, 2) +
              Math.pow(markerLngLat.lat - lat, 2)
            );
            return distance < 0.01;
          });
        }

        if (targetMarker) {
          targetMarker.togglePopup();

          // Center with offset for better visibility
          const c = map.project([lng, lat]);
          const adj = map.unproject([c.x, c.y - 120]);
          map.easeTo({ center: [adj.lng, adj.lat], duration: 400 });
        } else {
          // Create temp popup if no marker found
          const tempPopup = new maplibregl.Popup({
            maxWidth: '300px',
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
                <button class="px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600" data-action="add-record" data-location-id="${location.id}" data-location-name="${location.name}">
                  Adaugă record
                </button>
                </div>
              </div>
          `);

          tempPopup.setLngLat([lng, lat]).addTo(map);
        }
      });
    } else {
      console.error('❌ Map not ready for location selection');
    }

    // Close search dropdown
    setSearchQuery('');
    setShowSearchResults(false);
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


          // CRITICAL: Optimized config to prevent flicker and size changes
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
        center: [25.0094, 45.9432] as [number, number], // Centru România
        zoom: isMobile ? 5.5 : 6,
        minZoom: 3,
        maxZoom: 18,
        pitch: 0,
        bearing: 0,
        renderWorldCopies: false,
        // Anti-flicker optimizations
        refreshExpiredTiles: false, // Disabled to prevent flicker
        fadeDuration: 0,
        crossSourceCollisions: false,
        attributionControl: false,
        localIdeographFontFamily: false,
        // Prevent size changes during loading
        transformRequest: (url, resourceType) => {
          if (resourceType === 'Tile' && url.includes('openstreetmap.org')) {
            return {
              url,
              headers: {
                'Cache-Control': 'max-age=31536000'
              }
            };
          }
          return { url };
        },
        logoPosition: 'bottom-right'
      };

    const map = new maplibregl.Map(mapConfig);
    mapInstanceRef.current = map;

    // Prevent flicker and size changes
    const mapContainer = map.getContainer();
    mapContainer.style.background = '#f8fafc';
    mapContainer.style.willChange = 'auto';
    mapContainer.style.transform = 'translateZ(0)';
    mapContainer.style.backfaceVisibility = 'hidden';
    mapContainer.style.perspective = '1000px';

    // Adaugă error handling pentru harta
    map.on('error', (e: Error) => {
      console.error('Map error:', e);
      setMapError(true);
    });

    // Custom navigation controls (no native controls)
    // map.addControl(new maplibregl.NavigationControl({
    //   showCompass: !isMobile,
    //   showZoom: true,
    //   visualizePitch: false
    // }), 'top-right');

    // Custom geolocation control (no native controls)
    // map.addControl(new maplibregl.GeolocateControl({
    //   positionOptions: {
    //     enableHighAccuracy: true
    //   },
    //   trackUserLocation: true,
    //   showUserHeading: true,
    //   showUserLocation: true
    // }), 'top-right');

    // Load locations after map is ready
    map.once('load', () => {
      if (databaseLocations.length > 0) {
        addLocationsToMap(map, activeFilter);
      }
    });

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
  }, [user, activeFilter, databaseLocations.length]);

  // Funcție pentru filtrarea locațiilor
  const filterLocations = (type: string) => {
    setActiveFilter(type);

    // Track filter interaction
    trackMapInteraction('filter', { filter_type: type });

    if (mapInstanceRef.current && databaseLocations.length > 0) {
      const map = mapInstanceRef.current;

      // Use double requestAnimationFrame for smoother transitions
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          addLocationsToMap(map, type);
        });
      });
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
            // watchPosition: false // Nu urmări poziția - not a valid option
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
        width: 50px !important;
        height: 50px !important;
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
        border: 3px solid #3B82F6 !important;
        border-radius: 50% !important;
        box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0,0,0,0.15) !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 24px !important;
        z-index: 1000 !important;
        position: relative !important;
        will-change: transform !important;
      `;
      userMarkerEl.innerHTML = '🎣';


      // Add hover effect
      userMarkerEl.addEventListener('mouseenter', () => {
        userMarkerEl.style.transform = 'scale(1.1)';
        userMarkerEl.style.boxShadow = '0 12px 35px rgba(59, 130, 246, 0.4), 0 6px 16px rgba(0,0,0,0.2)';
      });

      userMarkerEl.addEventListener('mouseleave', () => {
        userMarkerEl.style.transform = 'scale(1)';
        userMarkerEl.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0,0,0,0.15)';
      });

        if (mapInstanceRef.current && mapInstanceRef.current.getContainer()) {
      const userMarker = new maplibregl.Marker(userMarkerEl)
        .setLngLat([longitude, latitude])
        .addTo(mapInstanceRef.current);

      userLocationMarkerRef.current = userMarker;

      // Adaugă popup cu informații despre locația userului
      const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Utilizator';
      const userPhoto = user?.user_metadata?.avatar_url || '';

      // Obține adresa prin reverse geocoding
      try {
        const address = await geocodingService.reverseGeocode(latitude, longitude);

        const popup = new maplibregl.Popup({
          maxWidth: '250px',
          closeButton: false,
          closeOnClick: false,
          className: 'custom-popup'
        }).setHTML(`
          <div class="p-4 min-w-[200px] max-w-[250px] bg-white rounded-2xl shadow-xl border border-gray-100 relative">
            <button class="absolute top-3 right-3 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors" onclick="this.closest('.maplibregl-popup').remove()">
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
            userMarkerEl.style.cssText = `
              width: 50px !important;
              height: 50px !important;
              background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
              border: 3px solid #3B82F6 !important;
              border-radius: 50% !important;
              box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0,0,0,0.15) !important;
              cursor: pointer !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              font-size: 24px !important;
              z-index: 1000 !important;
              position: relative !important;
              will-change: transform !important;
            `;
            userMarkerEl.innerHTML = '🎣';


            let userMarker: maplibregl.Marker | null = null;

            userMarker = new maplibregl.Marker(userMarkerEl)
              .setLngLat([longitude, latitude])
              .addTo(mapInstanceRef.current);
            userLocationMarkerRef.current = userMarker;


            // Adaugă popup cu design îmbunătățit
            const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Utilizator';
            const userPhoto = user?.user_metadata?.avatar_url || '';

            const popup = new maplibregl.Popup({
              maxWidth: '250px',
              closeButton: false,
              closeOnClick: false,
              className: 'custom-popup',
              offset: [0, -10] // Popup deasupra markerului
            }).setHTML(`
              <div class="p-4 min-w-[200px] max-w-[250px] bg-white rounded-2xl shadow-xl border border-gray-100 relative">
                <button class="absolute top-3 right-3 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors" onclick="this.closest('.maplibregl-popup').remove()">
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
        description="Fish Trophy - Platforma pentru recorduri de pescuit din România. Urmărește recordurile, concurează cu alții pescari pasionați și contribuie la protejarea naturii. Hărți interactive și comunitate activă."
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
              Fish Trophy - Platforma pentru Recorduri de Pescuit
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
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-full px-4 py-3 pl-12 pr-4 bg-white border border-gray-200 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                style={{ willChange: 'box-shadow, border-color' }}
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
                      selectLocation(location);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-lg">
                        {location.type === 'river' || location.type === 'fluviu' ? '🌊' : location.type === 'lake' ? '🏞️' : location.type === 'balti_salbatic' ? '🌿' : location.type === 'private_pond' ? '🏡' : '💧'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{location.name}</p>
                        <p className="text-sm text-gray-600 truncate">
                          {location.subtitle && `${location.subtitle} • `}
                          {location.county}, {location.region.charAt(0).toUpperCase() + location.region.slice(1)}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {location.type === 'river' || location.type === 'fluviu' ? 'Ape curgătoare' :
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
            <div className="flex flex-wrap gap-1.5 md:gap-2 justify-center">
              {[
                { type: 'all', label: 'Toate', icon: MapPin, color: 'bg-gray-500 hover:bg-gray-600' },
                { type: 'river', label: 'Ape curgătoare', icon: MapPin, color: 'bg-emerald-500 hover:bg-emerald-600' },
                { type: 'lake', label: 'Lacuri', icon: MapPin, color: 'bg-blue-500 hover:bg-blue-600' },
                { type: 'balti_salbatic', label: 'Bălți Sălbatice', icon: MapPin, color: 'bg-red-500 hover:bg-red-600' },
                { type: 'private_pond', label: 'Bălți Private', icon: MapPin, color: 'bg-purple-500 hover:bg-purple-600' }
              ].map(({ type, label, icon: Icon, color }) => {
                const count = type === 'all'
                  ? databaseLocations.length
                  : databaseLocations.filter(loc => {
                    if (type === 'river') {
                      return loc.type === 'river' || loc.type === 'fluviu';
                    }
                    return loc.type === type;
                  }).length;

                return (
                <button
                  key={type}
                  onClick={() => filterLocations(type)}
                  className={`${color} text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-1.5 hover:scale-105 ${
                    activeFilter === type ? 'ring-2 ring-blue-200' : ''
                  }`}
                  style={{ willChange: 'transform, box-shadow, background-color' }}
                >
                  <Icon className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="text-xs md:text-sm">
                    {label} {isLoadingLocations ? '...' : `(${count})`}
                  </span>
                </button>
                );
              })}

              <button
                onClick={openShopPopup}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-1.5 hover:scale-105"
                style={{ willChange: 'transform, box-shadow, background-color' }}
              >
                <MapPin className="w-3 h-3 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm">Magazine de Pescuit</span>
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

      {/* FAQ Section - Mobile Optimized */}
      <section className="px-4 md:px-6 lg:px-8 mb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-10">
            Întrebări Frecvente
          </h2>

          <div className="space-y-3">
            {[
              {
                question: "Ce este Fish Trophy și pentru cine este destinat?",
                answer: "Fish Trophy este platforma națională pentru pescari pasionați din România. Este destinată tuturor celor care iubesc pescuitul și doresc să înregistreze, urmărească și concureze cu recordurile lor."
              },
              {
                question: "De ce nu promovați locațiile exacte de pescuit?",
                answer: "Fish Trophy nu promovează locațiile exacte de pescuit din respect față de natură și pentru a preveni supraexploatarea zonelor sensibile. Ne concentrăm pe zonele de pescuit, păstrând echilibrul natural al ecosistemelor acvatice."
              },
              {
                question: "Care sunt scopurile Fish Trophy?",
                answer: "Scopul nostru principal este să facem din pescuit un sport național frumos și respectat. Promovăm respectul față de natură, contribuim la amenajarea spațiilor de pescuit și facem presiune asupra autorităților pentru protejarea zonelor acvatice."
              },
              {
                question: "Cum funcționează sistemul de recorduri?",
                answer: "Sistemul nostru de recorduri este transparent și verificat. Pescarii pot înregistra prinderea cu dovezi fotografice, informații despre locație (zonă generală), dimensiuni și greutate. Toate recordurile sunt verificate de comunitate."
              },
              {
                question: "Cum contribuiți la protejarea naturii?",
                answer: "Promovăm pescuitul responsabil prin educarea comunității despre tehnici durabile, respectarea perioadelor de reproducere și limitelor de prindere. Fiecare pescar din comunitatea noastră devine un gardian al naturii."
              },
              {
                question: "Ce planuri aveți pentru dezvoltarea platformei?",
                answer: "Planificăm să dezvoltăm funcționalități pentru competiții locale și naționale, un sistem de mentorat pentru pescarii începători și parteneriate cu autoritățile locale pentru amenajarea zonelor de pescuit."
              }
            ].map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                index={index}
                isOpen={openFAQIndex === index}
                onToggle={() => setOpenFAQIndex(openFAQIndex === index ? null : index)}
              />
            ))}
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

      {/* Record Submission Modal */}
      <RecordSubmissionModal
        isOpen={showRecordModal}
        onClose={() => {
          setShowRecordModal(false);
          setSelectedLocationForRecord(null);
        }}
        locationId={selectedLocationForRecord?.id}
        locationName={selectedLocationForRecord?.name}
      />
      </div>
    </>
  );
}
