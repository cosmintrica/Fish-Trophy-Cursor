import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, X } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { loadFishingLocations, loadFishingMarkers, getLocationDetails, FishingLocation, FishingMarker } from '@/services/fishingLocations';
import type * as GeoJSON from 'geojson';
import { geocodingService } from '@/services/geocoding';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import SEOHead from '@/components/SEOHead';
import { useStructuredData } from '@/hooks/useStructuredData';
import RecordSubmissionModal from '@/components/RecordSubmissionModal';
import { AuthRequiredModal } from '@/components/AuthRequiredModal';
import AuthModal from '@/components/AuthModal';

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
          transform: isOpen ? 'scaleY(1)' : 'scaleY(0)',
          transformOrigin: 'top',
          opacity: isOpen ? 1 : 0,
          maxHeight: isOpen ? '400px' : '0px',
          transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
          willChange: 'transform, opacity'
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
  }

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
    
    .maplibregl-container {
      padding: 50px !important;
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
  const userLocationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  const [activeFilter, setActiveFilter] = useState('all');
  const [showShopPopup, setShowShopPopup] = useState(false);
  const [showLocationRequest, setShowLocationRequest] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedLocationForRecord, setSelectedLocationForRecord] = useState<{ id: string, name: string } | null>(null);
  const [showAuthRequiredModal, setShowAuthRequiredModal] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [databaseLocations, setDatabaseLocations] = useState<FishingLocation[]>([]);
  const [fishingMarkers, setFishingMarkers] = useState<FishingMarker[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<FishingLocation & { score: number }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);
  const [isAddingMarkers, setIsAddingMarkers] = useState(false);
  const [mapStyle, setMapStyle] = useState<'osm' | 'satellite' | 'hybrid'>('osm');
  const [showMapStyleDropdown, setShowMapStyleDropdown] = useState(false);

  // Funcție pentru adăugarea locațiilor pe hartă - OPTIMIZATĂ CU GEOJSON LAYERS
  const addLocationsToMap = (_map: maplibregl.Map, filterType: string) => {
    if (!_map || !_map.getContainer()) {
      return;
    }

    if (isAddingMarkers) {
      return;
    }

    setIsAddingMarkers(true);

    try {
      // Use fishingMarkers (minimal data) if available, fallback to full data
      const sourceData = fishingMarkers.length > 0 ? fishingMarkers : databaseLocations;
      
      // Filter by type
      const filtered = filterType === 'all' ? sourceData :
        sourceData.filter(loc => {
          if (filterType === 'river') {
            return loc.type === 'river' || loc.type === 'fluviu';
          }
          return loc.type === filterType;
        });

      // Create GeoJSON
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: filtered.map(marker => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: marker.coords
          },
          properties: {
            id: marker.id,
            name: marker.name,
            type: marker.type,
            county: marker.county,
            region: marker.region
          }
        }))
      };

      const sourceId = 'fishing-locations';

      // Update existing source or create new one
      if (_map.getSource(sourceId)) {
        (_map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
        setIsAddingMarkers(false);
        return;
      }

      // Progressive loading animation: add markers randomly over 4.5 seconds
      // TEMPORAR: ANIMAȚIE COMENTATĂ PENTRU TEST - ÎNCĂRCARE INSTANT
      // const totalMarkers = geojson.features.length;
      // const animationDuration = 4500; // 4.5 seconds
      // const batchSize = Math.max(1, Math.ceil(totalMarkers / 100)); // ~100 batches
      // const intervalTime = animationDuration / 100;

      // const shuffled = [...geojson.features].sort(() => Math.random() - 0.5);

      // Add source with ALL data instantly (TEST MODE)
      _map.addSource(sourceId, {
        type: 'geojson',
        data: geojson // Load all markers instantly
      });

      // Add circle layer with EXACT same colors as filter buttons
      _map.addLayer({
        id: 'location-circles',
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-color': [
            'match',
            ['get', 'type'],
            'river', '#10b981',
            'fluviu', '#10b981',
            'lake', '#3b82f6',
            'pond', '#ef4444',
            'balti_salbatic', '#ef4444',
            'private_pond', '#a855f7',
            'maritime', '#6366f1',
            '#6b7280'
          ],
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            5, 10,   // Zoom mic: 10px (mărit)
            10, 14,  // Zoom mediu: 14px (mărit)
            15, 18   // Zoom mare: 18px (mărit)
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.95
        }
      });

      // Detect if mobile device
      const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // Click handler - load full details on demand
      _map.on('click', 'location-circles', async (e) => {
        if (!e.features || !e.features[0]) return;
        const coordinates = (e.features[0].geometry as any).coordinates.slice();
        const properties = e.features[0].properties;

        // Adjust for world wrap
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        // Remove existing popups
        document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());

        // Calculate offset for one-shot animation (estimate at target zoom 14)
        const containerHeight = _map.getContainer().clientHeight;
        const offsetY = containerHeight * 0.10; // Position marker lower so card appears above
        
        // Estimate pixel-to-degree conversion at zoom 14
        // At zoom 14: 1 pixel ≈ 0.0001 degrees latitude
        const mapZoomForOffset = _map.getZoom();
        const targetZoom = 14;
        const pixelsAtTargetZoom = 256 * Math.pow(2, targetZoom);
        const degreesPerPixel = 360 / pixelsAtTargetZoom;
        const offsetLat = offsetY * degreesPerPixel;
        
        // Calculate adjusted center for one-shot animation
        // Add to latitude to move marker down in viewport (center moves up)
        const adjustedCenter: [number, number] = [
          coordinates[0],
          coordinates[1] + offsetLat
        ];

        // One-shot flyTo with smooth easing (more pronounced ease-out)
        _map.flyTo({
          center: adjustedCenter,
          zoom: targetZoom,
          duration: 1400, // Slightly slower
          easing: (t: number) => {
            // More pronounced ease-out: starts fast, slows down significantly at end
            return 1 - Math.pow(1 - t, 4);
          },
          essential: true
        });

        // Calculate marker radius at current zoom for proper popup positioning
        const currentZoom = _map.getZoom();
        const markerRadius = currentZoom <= 5 ? 10 : currentZoom <= 10 ? 14 : 18;
        const popupOffset = -(markerRadius + 5); // Position tip at marker edge + small gap
        
        // Show loading popup
        const loadingPopup = new maplibregl.Popup({
          maxWidth: isMobile ? '240px' : '400px',
          closeButton: false,
          className: 'custom-popup',
          closeOnClick: false,
          anchor: 'bottom', // Anchor at bottom so tip points to marker
          offset: [0, popupOffset] // Offset to position tip at marker edge
        })
          .setLngLat(coordinates)
          .setHTML(`
            <div class="p-4 bg-white rounded-xl shadow-md border border-gray-200 flex items-center justify-center min-h-[100px]">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          `)
          .addTo(_map);

        // Load full details
        getLocationDetails(properties.id).then(fullDetails => {
          if (fullDetails) {
            // Update popup with calculated offset
            loadingPopup.setOffset([0, popupOffset]);
              
              const popupHTML = isMobile ? `
            <div class="p-4 min-w-[200px] max-w-[240px] bg-white rounded-xl shadow-lg border border-gray-100 relative">
              <button class="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all duration-200 hover:rotate-90 z-20 cursor-pointer" onclick="this.closest('.maplibregl-popup').remove()">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>

              <div class="mb-3">
                <h3 class="font-bold text-sm text-gray-800 mb-1 flex items-start gap-2">
                  <span class="text-lg flex-shrink-0">${fullDetails.type === 'river' || fullDetails.type === 'fluviu' ? '🌊' : fullDetails.type === 'lake' ? '🏞️' : fullDetails.type === 'balti_salbatic' ? '🌿' : fullDetails.type === 'private_pond' ? '🏡' : '💧'}</span>
                  <span class="break-words">${fullDetails.name}</span>
                </h3>
                ${fullDetails.subtitle ? `<p class="text-xs text-gray-600 mb-1">${fullDetails.subtitle}</p>` : ''}
                <p class="text-xs text-gray-500">${fullDetails.county}, ${fullDetails.region.charAt(0).toUpperCase() + fullDetails.region.slice(1)}</p>
              </div>

              ${fullDetails.description ? `
              <div class="mb-3">
                <p class="text-xs text-gray-600 leading-relaxed line-clamp-2">${fullDetails.description}</p>
              </div>
              ` : ''}

              ${fullDetails.administrare ? `
              <div class="mb-3 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                ${fullDetails.administrare_url ? `<a href="${fullDetails.administrare_url}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-700 hover:text-blue-900 leading-relaxed underline">${fullDetails.administrare}</a>` : `<p class="text-xs text-blue-700 leading-relaxed">${fullDetails.administrare}</p>`}
              </div>
              ` : ''}

              ${fullDetails.website || fullDetails.phone ? `
              <div class="mb-3 space-y-1.5">
                ${fullDetails.website ? `
                <div class="flex items-center gap-1.5 text-xs">
                  <svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                  </svg>
                  <a href="${fullDetails.website && (fullDetails.website.startsWith('http') ? fullDetails.website : 'https://' + fullDetails.website)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 truncate">${fullDetails.website ? fullDetails.website.replace(/^https?:\/\//, '') : ''}</a>
                </div>
                ` : ''}
                ${fullDetails.phone ? `
                <div class="flex items-center gap-1.5 text-xs">
                  <svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  <a href="tel:${fullDetails.phone}" class="text-blue-600 hover:text-blue-800">${fullDetails.phone}</a>
                </div>
                ` : ''}
              </div>
              ` : ''}

              <div class="mb-3">
                <p class="text-xs font-semibold text-gray-700">Recorduri: <span class="text-blue-600 font-bold">${fullDetails.recordCount || 0}</span></p>
              </div>

              <div class="flex gap-2 mb-3">
                <button class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-lg text-xs font-medium transition-colors" data-action="view-records" data-location-id="${fullDetails.id}" data-location-name="${fullDetails.name}">
                  Vezi recorduri
                </button>
                <button class="flex-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg text-xs font-medium transition-colors" data-action="add-record" data-location-id="${fullDetails.id}" data-location-name="${fullDetails.name}">
                  Adaugă record
                </button>
              </div>
              <div class="flex gap-2 pt-2 border-t border-gray-100">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${fullDetails.coords[1]},${fullDetails.coords[0]}" target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border border-gray-200 shadow-sm hover:shadow">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Google Maps
                </a>
                <a href="https://maps.apple.com/?daddr=${fullDetails.coords[1]},${fullDetails.coords[0]}&dirflg=d" target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border border-gray-200 shadow-sm hover:shadow">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Apple Maps
                </a>
              </div>
            </div>
          ` : `
            <div class="p-5 min-w-[320px] max-w-[380px] bg-white rounded-2xl shadow-xl border border-gray-100 relative">
              <button class="absolute top-4 right-4 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all duration-200 hover:rotate-90 z-20 cursor-pointer" onclick="this.closest('.maplibregl-popup').remove()">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
              <div class="mb-4">
                <h3 class="font-bold text-xl text-gray-800 mb-2 flex items-start gap-2">
                  <span class="text-2xl flex-shrink-0">${fullDetails.type === 'river' || fullDetails.type === 'fluviu' ? '🌊' : fullDetails.type === 'lake' ? '🏞️' : fullDetails.type === 'balti_salbatic' ? '🌿' : fullDetails.type === 'private_pond' ? '🏡' : '💧'}</span>
                  <span class="break-words">${fullDetails.name}</span>
                </h3>
                ${fullDetails.subtitle ? `<p class="text-sm text-gray-600 mb-1">${fullDetails.subtitle}</p>` : ''}
                <p class="text-sm text-gray-500">${fullDetails.county}, ${fullDetails.region.charAt(0).toUpperCase() + fullDetails.region.slice(1)}</p>
              </div>

              ${fullDetails.description ? `
              <div class="mb-4">
                <p class="text-sm text-gray-600 leading-relaxed line-clamp-3">${fullDetails.description}</p>
              </div>
              ` : ''}

              ${fullDetails.administrare ? `
              <div class="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                ${fullDetails.administrare_url ? `<a href="${fullDetails.administrare_url}" target="_blank" rel="noopener noreferrer" class="text-sm text-blue-700 hover:text-blue-900 leading-relaxed underline">${fullDetails.administrare}</a>` : `<p class="text-sm text-blue-700 leading-relaxed">${fullDetails.administrare}</p>`}
              </div>
              ` : ''}

              ${fullDetails.website || fullDetails.phone ? `
              <div class="mb-4 space-y-2">
                ${fullDetails.website ? `
                <div class="flex items-center gap-2 text-sm">
                  <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                  </svg>
                  <a href="${fullDetails.website && (fullDetails.website.startsWith('http') ? fullDetails.website : 'https://' + fullDetails.website)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 truncate">${fullDetails.website ? fullDetails.website.replace(/^https?:\/\//, '') : ''}</a>
                </div>
                ` : ''}
                ${fullDetails.phone ? `
                <div class="flex items-center gap-2 text-sm">
                  <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  <a href="tel:${fullDetails.phone}" class="text-blue-600 hover:text-blue-800">${fullDetails.phone}</a>
                </div>
                ` : ''}
              </div>
              ` : ''}

              <div class="mb-4">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-gray-700">Recorduri:</span>
                  <div class="flex items-center gap-1">
                    ${(fullDetails.recordCount || 0) >= 1 ? '<span class="text-yellow-500">🥇</span>' : ''}
                    ${(fullDetails.recordCount || 0) >= 2 ? '<span class="text-gray-400">🥈</span>' : ''}
                    ${(fullDetails.recordCount || 0) >= 3 ? '<span class="text-amber-600">🥉</span>' : ''}
                    <span class="text-sm font-bold text-gray-800">${fullDetails.recordCount || 0}</span>
                  </div>
                </div>
              </div>

              <div class="flex gap-2 mb-3">
                <button class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" data-action="view-records" data-location-id="${fullDetails.id}" data-location-name="${fullDetails.name}">
                  Vezi recorduri
                </button>
                <button class="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" data-action="add-record" data-location-id="${fullDetails.id}" data-location-name="${fullDetails.name}">
                  Adaugă record
                </button>
              </div>
              <div class="flex gap-2 pt-3 border-t border-gray-100">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${fullDetails.coords[1]},${fullDetails.coords[0]}" target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-gray-200 shadow-sm hover:shadow">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Google Maps
                </a>
                <a href="https://maps.apple.com/?daddr=${fullDetails.coords[1]},${fullDetails.coords[0]}&dirflg=d" target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-gray-200 shadow-sm hover:shadow">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Apple Maps
                </a>
              </div>
            </div>
          `;
            loadingPopup.setHTML(popupHTML);
            
            setTimeout(() => {
              const popup = loadingPopup.getElement();
              if (!popup) return;
              popup.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                  const action = (e.currentTarget as HTMLElement).getAttribute('data-action');
                  const locationId = (e.currentTarget as HTMLElement).getAttribute('data-location-id');
                  
                  if (action === 'view-records') {
                    window.location.href = `/records?location_id=${encodeURIComponent(locationId || '')}`;
                  } else if (action === 'add-record') {
                    if (!user) {
                      setShowAuthRequiredModal(true);
                    } else {
                      setSelectedLocationForRecord({ id: locationId || '', name: fullDetails.name });
                      setShowRecordModal(true);
                    }
                  }
                });
              });
            }, 100);
          } else {
            loadingPopup.setHTML('<div class="p-4 text-red-500">Eroare la încărcare</div>');
          }
          
          // Track interaction
          trackMapInteraction({ action: 'marker_click', location_id: properties.id });
        });
      });

      // Hover effect
      _map.on('mouseenter', 'location-circles', () => {
        _map.getCanvas().style.cursor = 'pointer';
      });
      _map.on('mouseleave', 'location-circles', () => {
        _map.getCanvas().style.cursor = '';
      });

      // Progressive loading animation - TEMPORAR COMENTATĂ (TEST MODE)
      // let currentIndex = 0;
      // const loadInterval = setInterval(() => {
      //   currentIndex += batchSize;
      //   if (currentIndex >= totalMarkers) {
      //     currentIndex = totalMarkers;
      //     clearInterval(loadInterval);
      //     setIsAddingMarkers(false);
      //   }
      //   
      //   const currentFeatures = shuffled.slice(0, currentIndex);
      //   (_map.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
      //     type: 'FeatureCollection',
      //     features: currentFeatures
      //   });
      // }, intervalTime);
      
      // TEST MODE: All markers loaded instantly
      setIsAddingMarkers(false);
    } catch (error) {
      setIsAddingMarkers(false);
    }
  };

  // Prevent double loading
  const hasLoadedLocationsRef = useRef(false);

  // PERFORMANCE: Load data on component mount
  useEffect(() => {
    if (hasLoadedLocationsRef.current) return;

    const loadData = async () => {
      hasLoadedLocationsRef.current = true;
      setIsLoadingLocations(true);
      try {
        // Load minimal marker data first (FAST!)
        const markers = await loadFishingMarkers();
        setFishingMarkers(markers);
        
        // Load full details in background (for search/filters)
        const locations = await loadFishingLocations();
        setDatabaseLocations(locations);
      } catch (error) {
        hasLoadedLocationsRef.current = false; // Retry on error
      } finally {
        setIsLoadingLocations(false);
      }
    };

    loadData();
  }, []);

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
  const handleSearch = (query: string) => {
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
      // Prioritate foarte mare pentru nume (starts with)
      else if (normalizeText(location.name).toLowerCase().startsWith(normalizedQuery.toLowerCase())) {
        score += 800;
      }
      // Prioritate mare pentru nume (contains)
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

    // NO ZOOM when searching - only when selecting a location
  };

  // Debounce pentru căutare
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
  }, [searchQuery]);

  // Funcția pentru Enter în căutare
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  // Funcția pentru a selecta o locație din căutare
  const selectLocation = (location: FishingLocation & { score: number }) => {
    // Remove all existing popups first - CRITICAL: Do this immediately
    document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());
    
    // Also remove any popups that might be in the process of being created
    setTimeout(() => {
      document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());
    }, 10);

    // Verifică dacă coordonatele sunt valide
    const lng = location.coords[0];
    const lat = location.coords[1];

    if (!lng || !lat || isNaN(lng) || isNaN(lat)) {
      return;
    }

    if (mapInstanceRef.current && mapInstanceRef.current.getContainer()) {
      const map = mapInstanceRef.current;
      
      // Remove popups one more time right before animation
      document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());

      // Calculate offset for one-shot animation (estimate at target zoom 14)
      const containerHeight = map.getContainer().clientHeight;
      const offsetY = containerHeight * 0.10; // Position marker lower so card appears above
      
      // Estimate pixel-to-degree conversion at zoom 14
      // At zoom 14: 1 pixel ≈ 0.0001 degrees latitude
      const currentZoom = map.getZoom();
      const targetZoom = 14;
      const pixelsAtTargetZoom = 256 * Math.pow(2, targetZoom);
      const degreesPerPixel = 360 / pixelsAtTargetZoom;
      const offsetLat = offsetY * degreesPerPixel;
      
      // Calculate adjusted center for one-shot animation
      // Add to latitude to move marker down in viewport (center moves up)
      const adjustedCenter: [number, number] = [
        lng,
        lat + offsetLat
      ];

      // Remove all popups right before starting animation (critical fix for stuck popup)
      document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());

      // One-shot flyTo with smooth easing (more pronounced ease-out)
      map.flyTo({
        center: adjustedCenter,
        zoom: targetZoom,
        duration: 1400, // Slightly slower
        easing: (t: number) => {
          // More pronounced ease-out: starts fast, slows down significantly at end
          return 1 - Math.pow(1 - t, 4);
        }
      });

      // Open popup after moveend with small delay for smooth animation
      map.once('moveend', () => {
        // Remove all popups immediately when animation ends
        document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());
        
        // Small delay to ensure map is fully settled
        setTimeout(() => {
          // Remove all popups again before creating new one (double-check)
          document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());

          // Find location in databaseLocations for full details
          const fullLocation = databaseLocations.find(loc => loc.id === location.id);
          if (fullLocation) {
            const isMobile = window.innerWidth <= 768;
            
            // Calculate marker radius at current zoom for proper popup positioning
            const mapZoomForPopup = map.getZoom();
            const markerRadius = mapZoomForPopup <= 5 ? 10 : mapZoomForPopup <= 10 ? 14 : 18;
            
            // Detect if marker is in top part of viewport (would cut off popup above)
            const containerHeight = map.getContainer().clientHeight;
            const point = map.project([lng, lat]);
            const isInTopViewport = point.y < containerHeight * 0.35; // Top 35% of viewport
            
            // Adjust popup position: above marker (default) or below marker (if in top viewport)
            const popupAnchor = isInTopViewport ? 'top' : 'bottom';
            const popupOffset = isInTopViewport ? (markerRadius + 5) : -(markerRadius + 5);
            
            const popup = new maplibregl.Popup({
              maxWidth: isMobile ? '300px' : '400px',
              closeButton: false,
              className: 'custom-popup',
              anchor: popupAnchor, // Smart anchor based on viewport position
              offset: [0, popupOffset] // Offset to position tip at marker edge
            }).setHTML(isMobile ? `
            <div class="p-4 min-w-[200px] max-w-[240px] bg-white rounded-xl shadow-lg border border-gray-100 relative">
              <button class="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all duration-200 hover:rotate-90 z-20 cursor-pointer" onclick="this.closest('.maplibregl-popup').remove()">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
              <div class="mb-3">
                <h3 class="font-bold text-sm text-gray-800 mb-1 flex items-start gap-2">
                  <span class="text-lg flex-shrink-0">${fullLocation.type === 'river' || fullLocation.type === 'fluviu' ? '🌊' : fullLocation.type === 'lake' ? '🏞️' : fullLocation.type === 'balti_salbatic' ? '🌿' : fullLocation.type === 'private_pond' ? '🏡' : '💧'}</span>
                  <span class="break-words">${fullLocation.name}</span>
                </h3>
                ${fullLocation.subtitle ? `<p class="text-xs text-gray-600 mb-1">${fullLocation.subtitle}</p>` : ''}
                <p class="text-xs text-gray-500">${fullLocation.county}, ${fullLocation.region.charAt(0).toUpperCase() + fullLocation.region.slice(1)}</p>
              </div>
              ${fullLocation.description ? `
              <div class="mb-3">
                <p class="text-xs text-gray-600 leading-relaxed line-clamp-2">${fullLocation.description}</p>
              </div>
              ` : ''}
              ${fullLocation.administrare ? `
              <div class="mb-3 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                ${fullLocation.administrare_url ? `<a href="${fullLocation.administrare_url}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-700 hover:text-blue-900 leading-relaxed underline">${fullLocation.administrare}</a>` : `<p class="text-xs text-blue-700 leading-relaxed">${fullLocation.administrare}</p>`}
              </div>
              ` : ''}
              ${fullLocation.website || fullLocation.phone ? `
              <div class="mb-3 space-y-1.5">
                ${fullLocation.website ? `
                <div class="flex items-center gap-1.5 text-xs">
                  <svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                  </svg>
                  <a href="${fullLocation.website && (fullLocation.website.startsWith('http') ? fullLocation.website : 'https://' + fullLocation.website)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 truncate">${fullLocation.website ? fullLocation.website.replace(/^https?:\/\//, '') : ''}</a>
                </div>
                ` : ''}
                ${fullLocation.phone ? `
                <div class="flex items-center gap-1.5 text-xs">
                  <svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  <a href="tel:${fullLocation.phone}" class="text-blue-600 hover:text-blue-800">${fullLocation.phone}</a>
                </div>
                ` : ''}
              </div>
              ` : ''}
              <div class="mb-3">
                <p class="text-xs font-semibold text-gray-700">Recorduri: <span class="text-blue-600 font-bold">${fullLocation.recordCount || 0}</span></p>
              </div>
              <div class="flex gap-2 mb-3">
                <button class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-lg text-xs font-medium transition-colors" data-action="view-records" data-location-id="${fullLocation.id}" data-location-name="${fullLocation.name}">
                  Vezi recorduri
                </button>
                <button class="flex-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg text-xs font-medium transition-colors" data-action="add-record" data-location-id="${fullLocation.id}" data-location-name="${fullLocation.name}">
                  Adaugă record
                </button>
              </div>
              <div class="flex gap-2 pt-2 border-t border-gray-100">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border border-gray-200 shadow-sm hover:shadow">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Google Maps
                </a>
                <a href="https://maps.apple.com/?daddr=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border border-gray-200 shadow-sm hover:shadow">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Apple Maps
                </a>
              </div>
            </div>
          ` : `
            <div class="p-5 min-w-[320px] max-w-[380px] bg-white rounded-2xl shadow-xl border border-gray-100 relative">
              <button class="absolute top-4 right-4 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all duration-200 hover:rotate-90 z-20 cursor-pointer" onclick="this.closest('.maplibregl-popup').remove()">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
              <div class="mb-4">
                <h3 class="font-bold text-xl text-gray-800 mb-2 flex items-start gap-2">
                  <span class="text-2xl flex-shrink-0">${fullLocation.type === 'river' || fullLocation.type === 'fluviu' ? '🌊' : fullLocation.type === 'lake' ? '🏞️' : fullLocation.type === 'balti_salbatic' ? '🌿' : fullLocation.type === 'private_pond' ? '🏡' : '💧'}</span>
                  <span class="break-words">${fullLocation.name}</span>
                </h3>
                ${fullLocation.subtitle ? `<p class="text-sm text-gray-600 mb-1">${fullLocation.subtitle}</p>` : ''}
                <p class="text-sm text-gray-500">${fullLocation.county}, ${fullLocation.region.charAt(0).toUpperCase() + fullLocation.region.slice(1)}</p>
              </div>
              ${fullLocation.description ? `
              <div class="mb-4">
                <p class="text-sm text-gray-600 leading-relaxed line-clamp-3">${fullLocation.description}</p>
              </div>
              ` : ''}
              ${fullLocation.administrare ? `
              <div class="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                ${fullLocation.administrare_url ? `<a href="${fullLocation.administrare_url}" target="_blank" rel="noopener noreferrer" class="text-sm text-blue-700 hover:text-blue-900 leading-relaxed underline">${fullLocation.administrare}</a>` : `<p class="text-sm text-blue-700 leading-relaxed">${fullLocation.administrare}</p>`}
              </div>
              ` : ''}
              ${fullLocation.website || fullLocation.phone ? `
              <div class="mb-4 space-y-2">
                ${fullLocation.website ? `
                <div class="flex items-center gap-2 text-sm">
                  <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                  </svg>
                  <a href="${fullLocation.website && (fullLocation.website.startsWith('http') ? fullLocation.website : 'https://' + fullLocation.website)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 truncate">${fullLocation.website ? fullLocation.website.replace(/^https?:\/\//, '') : ''}</a>
                </div>
                ` : ''}
                ${fullLocation.phone ? `
                <div class="flex items-center gap-2 text-sm">
                  <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  <a href="tel:${fullLocation.phone}" class="text-blue-600 hover:text-blue-800">${fullLocation.phone}</a>
                </div>
                ` : ''}
              </div>
              ` : ''}
              <div class="mb-4">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-gray-700">Recorduri:</span>
                  <div class="flex items-center gap-1">
                    ${(fullLocation.recordCount || 0) >= 1 ? '<span class="text-yellow-500">🥇</span>' : ''}
                    ${(fullLocation.recordCount || 0) >= 2 ? '<span class="text-gray-400">🥈</span>' : ''}
                    ${(fullLocation.recordCount || 0) >= 3 ? '<span class="text-amber-600">🥉</span>' : ''}
                    <span class="text-sm font-bold text-gray-800">${fullLocation.recordCount || 0}</span>
                  </div>
                </div>
              </div>
              <div class="flex gap-2 mb-3">
                <button class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" data-action="view-records" data-location-id="${fullLocation.id}" data-location-name="${fullLocation.name}">
                  Vezi recorduri
                </button>
                <button class="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" data-action="add-record" data-location-id="${fullLocation.id}" data-location-name="${fullLocation.name}">
                  Adaugă record
                </button>
              </div>
              <div class="flex gap-2 pt-3 border-t border-gray-100">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-gray-200 shadow-sm hover:shadow">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Google Maps
                </a>
                <a href="https://maps.apple.com/?daddr=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-gray-200 shadow-sm hover:shadow">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Apple Maps
                </a>
              </div>
            </div>
          `);

          popup.setLngLat([lng, lat]).addTo(map);

          // Attach button event listeners
          setTimeout(() => {
            const popupEl = popup.getElement();
            if (!popupEl) return;
            popupEl.querySelectorAll('[data-action]').forEach(btn => {
              btn.addEventListener('click', (e) => {
                const action = (e.currentTarget as HTMLElement).getAttribute('data-action');
                const locationId = (e.currentTarget as HTMLElement).getAttribute('data-location-id');
                const locationName = (e.currentTarget as HTMLElement).getAttribute('data-location-name');
                
                if (action === 'view-records') {
                  window.location.href = `/records?location_id=${encodeURIComponent(locationId || '')}`;
                } else if (action === 'add-record') {
                  if (!user) {
                    setShowAuthRequiredModal(true);
                  } else {
                    setSelectedLocationForRecord({ id: locationId || '', name: locationName || fullLocation.name });
                    setShowRecordModal(true);
                  }
                }
              });
            });
          }, 100);
        }
        }, 150); // Small delay for smooth animation
      });
    } else {
      // Remove popups even if map not ready
      document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());
    }

    // Close search dropdown
    setSearchQuery('');
    setShowSearchResults(false);
  };

  // Map initialization - runs only once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Detect if mobile device - robust check
    const checkIsMobile = () => {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent;
      return width <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    };
    const isMobile = checkIsMobile();

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
      zoom: isMobile ? 4.6 : 6, // Different zoom for mobile vs desktop
      minZoom: 3,
      maxZoom: 18,
      pitch: 0,
      bearing: 0,
      renderWorldCopies: false,
      refreshExpiredTiles: false,
      fadeDuration: 0,
      crossSourceCollisions: false,
      attributionControl: false,
      localIdeographFontFamily: false,
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

    // Error handling
    map.on('error', (e: Error) => {
      setMapError(true);
    });

    // Load locations after map is ready - FIX 1: Use fishingMarkers, start instantly if already loaded
    map.once('load', () => {
      // If fishingMarkers are already loaded, start animation instantly
      if (fishingMarkers.length > 0) {
        addLocationsToMap(map, activeFilter);
      }
      // If not loaded yet, useEffect will handle it when fishingMarkers are ready
    });

    // CRITICAL: Close popups when clicking on map (FIX 9)
    map.on('click', (e) => {
      // Check if click is on a marker or popup
      const features = map.queryRenderedFeatures(e.point, { layers: ['location-circles'] });
      if (features.length === 0) {
        // Click is not on a marker, close all popups
        document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());
      }
      setShowShopPopup(false);
      setShowLocationRequest(false);
      setShowSearchResults(false);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
    };
  }, []); // Empty dependency array - initialize only once

  // Separate effect for updating markers when data changes - FIX 1: Use fishingMarkers.length, instant start
  useEffect(() => {
    if (mapInstanceRef.current && fishingMarkers.length > 0 && !isLoadingLocations) {
      // Start animation instantly when fishingMarkers are loaded
      if (mapInstanceRef.current.isStyleLoaded()) {
        addLocationsToMap(mapInstanceRef.current, activeFilter);
      } else {
        // Wait for style to load if not ready
        mapInstanceRef.current.once('styledata', () => {
          addLocationsToMap(mapInstanceRef.current!, activeFilter);
        });
      }
    }
  }, [fishingMarkers.length, isLoadingLocations, activeFilter]);

  // Funcție pentru filtrarea locațiilor - FIX 3: Debouncing + FIX 10: Reset zoom
  const filterLocations = (type: string) => {
    if (isAddingMarkers) return;

    // Remove all popups when filter changes
    document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());

    // Clear previous timeout
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current);
    }

    // Debounce filter change
    filterDebounceRef.current = setTimeout(() => {
      if (isAddingMarkers) return;

      setActiveFilter(type);
      trackMapInteraction('filter', { filter_type: type });

      if (mapInstanceRef.current && databaseLocations.length > 0) {
        const map = mapInstanceRef.current;
        const isMobile = window.innerWidth <= 768;

        // FIX 10: Reset zoom to Romania view (different zoom for mobile)
        map.flyTo({
          center: [25.0094, 45.9432] as [number, number],
          zoom: isMobile ? 4.6 : 6,
          duration: 1000
        });

        // Use double requestAnimationFrame for smoother transitions
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!isAddingMarkers) {
              addLocationsToMap(map, type);
            }
          });
        });
      }
    }, 150);
  };

  // Funcție pentru centrarea pe locația utilizatorului
  const centerOnUserLocation = async () => {
    try {
      setIsLocating(true);

      if (!navigator.geolocation) {
        alert('Geolocation nu este suportat de acest browser.');
        setIsLocating(false);
        return;
      }

      const locationAccepted = localStorage.getItem('locationAccepted') === 'true';

      if (locationAccepted) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;

            if (mapInstanceRef.current) {
              addUserLocationMarker(latitude, longitude, false);
            }
            setIsLocating(false);
          },
          (error) => {
            let errorMessage = 'Nu s-a putut obține locația.';

            switch (error.code) {
              case 1:
                errorMessage = 'Permisiunea pentru locație a fost refuzată. Te rugăm să activezi locația în setările browser-ului.';
                break;
              case 2:
                errorMessage = 'Locația nu este disponibilă. Verifică dacă GPS-ul este activat.';
                break;
              case 3:
                errorMessage = 'Timeout la obținerea locației. Încearcă din nou.';
                break;
            }

            alert(errorMessage);
            setShowLocationRequest(true);
            setIsLocating(false);
          },
          {
            maximumAge: 0,
            timeout: 30000,
            enableHighAccuracy: true
          }
        );
      } else {
        setShowLocationRequest(true);
        setIsLocating(false);
      }
    } catch (error) {
      setIsLocating(false);
    }
  };

  // Funcție pentru adăugarea markerului pentru locația userului
  const addUserLocationMarker = async (latitude: number, longitude: number, silent: boolean = false) => {
    if (!mapInstanceRef.current) return;

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove();
    }

    const userMarkerEl = document.createElement('div');
    userMarkerEl.className = 'user-location-marker';
    userMarkerEl.innerHTML = `
      <div style="
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        border: 3px solid #3B82F6;
        border-radius: 50%;
        box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 9999999 !important;
        opacity: 0;
        transform: scale(0);
        transition: opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      ">
        <div style="
          font-size: 20px;
          line-height: 1;
        ">🎣</div>
      </div>
    `;

    const userMarker = new maplibregl.Marker({
      element: userMarkerEl,
      anchor: 'center'
    })
      .setLngLat([longitude, latitude])
      .addTo(mapInstanceRef.current);

    // Animate marker appearance (same style as fishing location markers)
    setTimeout(() => {
      const markerDiv = userMarkerEl.querySelector('div');
      if (markerDiv) {
        markerDiv.style.opacity = '1';
        markerDiv.style.transform = 'scale(1)';
      }
    }, 100);

    userLocationMarkerRef.current = userMarker;

    const userName = user?.user_metadata?.display_name || 
                     user?.user_metadata?.full_name || 
                     'Utilizator';
    const userPhoto = user?.user_metadata?.avatar_url || '';

    let address = 'Adresa nu a putut fi determinată';
    try {
      address = await geocodingService.reverseGeocode(latitude, longitude);
    } catch (error) {
      // Silent fail
    }

    // Calculate marker radius for user location marker (50px / 2 = 25px radius)
    const userMarkerRadius = 25;
    const userPopupOffset = -(userMarkerRadius + 5); // Position tip at marker edge + small gap
    
    const popup = new maplibregl.Popup({
      maxWidth: '250px',
      closeButton: false,
      closeOnClick: false,
      className: 'custom-popup',
      anchor: 'bottom', // Anchor at bottom so tip points to marker
      offset: [0, userPopupOffset] // Offset to position tip at marker edge
    }).setHTML(`
      <div class="p-4 min-w-[200px] max-w-[250px] bg-white rounded-2xl shadow-xl border border-gray-100 relative">
        <button class="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all duration-200 hover:rotate-90 z-20 cursor-pointer" onclick="this.closest('.maplibregl-popup').remove()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
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

    localStorage.setItem('userLocation', JSON.stringify({ latitude, longitude }));

    if (!silent) {
      if (userMarker) {
        userMarker.togglePopup();
        if (mapInstanceRef.current) {
          const map = mapInstanceRef.current;
          
          // Calculate offset for one-shot animation (same logic as other markers)
          const containerHeight = map.getContainer().clientHeight;
          const offsetY = containerHeight * 0.10; // Position marker lower so card appears above
          
          // Estimate pixel-to-degree conversion at zoom 14
          const targetZoom = 14;
          const pixelsAtTargetZoom = 256 * Math.pow(2, targetZoom);
          const degreesPerPixel = 360 / pixelsAtTargetZoom;
          const offsetLat = offsetY * degreesPerPixel;
          
          // Calculate adjusted center for one-shot animation
          // Add to latitude to move marker down in viewport (center moves up)
          const adjustedCenter: [number, number] = [
            longitude,
            latitude + offsetLat
          ];

          // One-shot flyTo with smooth easing (same as other markers)
          map.flyTo({
            center: adjustedCenter,
            zoom: targetZoom,
            duration: 1400,
            easing: (t: number) => {
              return 1 - Math.pow(1 - t, 4);
            }
          });
        }
      }
    }
  };

  // Funcție pentru gestionarea permisiunii de locație
  const handleLocationPermission = async (granted: boolean) => {
    setShowLocationRequest(false);

    if (!granted) {
      return;
    }

    try {
      if (userLocationMarkerRef.current && mapInstanceRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }

      const isMobile = window.innerWidth <= 768;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          if (mapInstanceRef.current && mapInstanceRef.current.getContainer()) {
            addUserLocationMarker(latitude, longitude, false);
            localStorage.setItem('locationAccepted', 'true');
            localStorage.setItem('userLocation', JSON.stringify({ latitude, longitude }));
          }
        },
        (error) => {
          if (error.code === 1) {
            alert('Permisiunea de locație a fost refuzată. Te rog să activezi locația în setările browser-ului și să reîmprospătezi pagina.');
          } else if (error.code === 2) {
            alert('Locația nu poate fi determinată. Verifică dacă GPS-ul este activat și că ai semnal bun.');
          } else if (error.code === 3) {
            alert('Cererea de locație a expirat. Încearcă din nou sau verifică conexiunea la internet.');
          } else {
            alert('Nu s-a putut obține locația. Verifică că ai activat locația în browser și că ai semnal bun.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: isMobile ? 30000 : 15000,
          maximumAge: 0
        }
      );
    } catch (error) {
      alert('Eroare la obținerea locației.');
    }
  };

  const openShopPopup = () => {
    setShowShopPopup(true);
  };

  // Map style selector - FIX 2: Dropdown professional
  const getMapStyleIcon = () => {
    switch (mapStyle) {
      case 'satellite':
        return '🛰️';
      case 'hybrid':
        return '🌍';
      default:
        return '🗺️';
    }
  };

  const changeMapStyle = (style: 'osm' | 'satellite' | 'hybrid') => {
    if (!mapInstanceRef.current) return;

    setMapStyle(style);
    setShowMapStyleDropdown(false);

    const map = mapInstanceRef.current;
    const isMobile = window.innerWidth <= 768;

    // Change map style without reloading markers (GeoJSON persists automatically)
    if (style === 'satellite') {
      map.setStyle({
        version: 8,
        sources: {
          'satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256
          }
        },
        layers: [
          {
            id: 'satellite',
            type: 'raster',
            source: 'satellite'
          }
        ]
      });
    } else if (style === 'hybrid') {
      map.setStyle({
        version: 8,
        sources: {
          'satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256
          },
          'osm': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256
          }
        },
        layers: [
          {
            id: 'satellite',
            type: 'raster',
            source: 'satellite'
          },
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            paint: { 'raster-opacity': 0.5 }
          }
        ]
      });
    } else {
      map.setStyle({
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
      });
    }
  };

  return (
    <>
      <SEOHead
        title="Fish Trophy - Platforma Pescarilor din România"
        description="Fish Trophy - Platforma pentru recorduri de pescuit din România. Urmărește recordurile, concurează cu alții pescari pasionați și contribuie la protejarea naturii. Hărți interactive și comunitate activă."
        keywords="pescuit, romania, locatii pescuit, recorduri pescuit, harta pescuit, rauri romania, lacuri romania, balti pescuit, specii pesti, tehnici pescuit, echipament pescuit, platforma pescarilor, comunitate pescuit"
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

        {/* Hero Section */}
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

        {/* Map Section */}
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

            {/* Map Controls */}
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
                      className={`${color} text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-1.5 hover:scale-105 ${activeFilter === type ? 'ring-2 ring-blue-200' : ''
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

            {/* Map Container */}
            <div className="relative">
              {mapError ? (
                <div className="w-full h-96 md:h-[500px] lg:h-[600px] rounded-2xl shadow-2xl overflow-hidden bg-gray-100 flex items-center justify-center">
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

              {/* Map Style Selector - Bottom Left (FIX 2) */}
              <div className="absolute bottom-4 left-4 z-10">
                <div className="relative">
                  <button
                    onClick={() => setShowMapStyleDropdown(!showMapStyleDropdown)}
                    className="bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-lg shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl w-10 h-10 flex items-center justify-center"
                    title="Schimbă stilul hărții"
                  >
                    <span className="text-lg">{getMapStyleIcon()}</span>
                  </button>
                  {showMapStyleDropdown && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden min-w-[120px]">
                      <button
                        onClick={() => changeMapStyle('osm')}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${mapStyle === 'osm' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                      >
                        <span>🗺️</span>
                        <span className="text-sm">Standard</span>
                      </button>
                      <button
                        onClick={() => changeMapStyle('satellite')}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${mapStyle === 'satellite' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                      >
                        <span>🛰️</span>
                        <span className="text-sm">Satelit</span>
                      </button>
                      <button
                        onClick={() => changeMapStyle('hybrid')}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${mapStyle === 'hybrid' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                      >
                        <span>🌍</span>
                        <span className="text-sm">Hibrid</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Geolocation Button - Top Right */}
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={centerOnUserLocation}
                  disabled={isLocating}
                  className={`bg-white hover:bg-gray-50 text-gray-700 p-3 rounded-xl shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl ${isLocating ? 'opacity-50 cursor-not-allowed' : ''
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

        {/* FAQ Section */}
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

        {/* Auth Required Modal */}
        <AuthRequiredModal
          isOpen={showAuthRequiredModal}
          onClose={() => setShowAuthRequiredModal(false)}
          onLogin={() => {
            setShowAuthRequiredModal(false);
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
          }}
          onRegister={() => {
            setShowAuthRequiredModal(false);
            setAuthModalMode('register');
            setIsAuthModalOpen(true);
          }}
          title="Autentificare necesară"
          message="Trebuie să fii autentificat pentru a adăuga un record."
          actionName="adaugarea unui record"
        />

        {/* Auth Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
        />
      </div>
    </>
  );
}

