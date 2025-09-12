import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, MapPin, Fish, X, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { geocodingService } from '@/services/geocoding';
import RecordSubmissionModal from '@/components/RecordSubmissionModal';

// Define FishingLocation interface locally
interface FishingLocation {
  id: string;
  name: string;
  subtitle?: string;
  type: string;
  county: string;
  city: string;
  region?: string;
  administrare?: string;
  latitude: number;
  longitude: number;
  coords?: [number, number];
}

// OpenLayers imports
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Cluster from 'ol/source/Cluster';
import { fromLonLat } from 'ol/proj';
import { Point } from 'ol/geom';
import Feature from 'ol/Feature';
import { Style, Icon } from 'ol/style';
import { Overlay } from 'ol';
import 'ol/ol.css';

const MapTest: React.FC = () => {
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const [locations, setLocations] = useState<FishingLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<FishingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedLocationForRecord, setSelectedLocationForRecord] = useState<{id: string, name: string} | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<FishingLocation & { score: number }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAllIndividual, setShowAllIndividual] = useState(false);

  // Load fishing locations from database
  const loadFishingLocations = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fishing_locations')
        .select('*')
        .order('name');

      if (error) throw error;

      const locationsData = data?.map(loc => ({
        ...loc,
        county: loc.county || 'Necunoscut',
        city: loc.city || 'Necunoscut'
      })) || [];

      setLocations(locationsData);
      setFilteredLocations(locationsData);
    } catch (error) {
      console.error('Error loading fishing locations:', error);
      toast.error('Eroare la încărcarea locațiilor de pescuit');
    } finally {
      setLoading(false);
    }
  }, []);

  // Normalize text for search (identical to Home.tsx)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/ă/g, 'a').replace(/â/g, 'a').replace(/î/g, 'i')
      .replace(/ș/g, 's').replace(/ț/g, 't');
  };

  // Search function (identical to Home.tsx)
  const handleSearch = useCallback((query: string) => {
    if (!query.trim() || locations.length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const normalizedQuery = normalizeText(query);

    const resultsWithScore = locations.map(location => {
      let score = 0;

      // Prioritate maximă pentru nume exact (startsWith) - pentru râuri
      if (normalizeText(location.name).toLowerCase().startsWith(normalizedQuery.toLowerCase())) {
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
      if (location.region && normalizeText(location.region).includes(normalizedQuery)) {
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

      if (countyResults.length > 0 && mapInstanceRef.current) {
        // Calculează centrul județului
        const validResults = countyResults.filter(loc => {
          const lat = loc.latitude;
          const lng = loc.longitude;
          return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        });

        if (validResults.length > 0) {
          const avgLat = validResults.reduce((sum, loc) => sum + loc.latitude, 0) / validResults.length;
          const avgLng = validResults.reduce((sum, loc) => sum + loc.longitude, 0) / validResults.length;

          // Verifică dacă coordonatele sunt valide
          if (!isNaN(avgLat) && !isNaN(avgLng) && avgLat !== 0 && avgLng !== 0) {
            mapInstanceRef.current.getView().animate({
              center: fromLonLat([avgLng, avgLat]),
              zoom: 10,
              duration: 1000
            });
          }
        }
      }
    }
  }, [locations]);

  // Select location from search results
  const selectLocation = useCallback((location: FishingLocation) => {
    if (mapInstanceRef.current) {
      // Center map on location with proper centering
      mapInstanceRef.current.getView().animate({
        center: fromLonLat([location.longitude, location.latitude]),
        zoom: 14,
        duration: 1000
      });

      // After animation, show popup directly
      setTimeout(() => {
        if (mapInstanceRef.current) {
          // Show popup directly with the location data
          showLocationPopup(location, fromLonLat([location.longitude, location.latitude]));
        }
      }, 1200);
    }
    setSearchQuery('');
    setShowSearchResults(false);
  }, []);

  // Get user location
  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Nu s-a putut obține locația ta');
        }
      );
    } else {
      toast.error('Geolocation nu este suportat de browser');
    }
  }, []);

  // Filter locations function (identical to Home.tsx)
  const filterLocations = useCallback((type: string) => {
    setActiveFilter(type);

    if (mapInstanceRef.current && locations.length > 0) {
      const map = mapInstanceRef.current;

      // Reset zoom to Romania view
      map.getView().animate({
        center: fromLonLat([25.0094, 45.9432]), // Centru România
        zoom: isMobile ? 5.5 : 6,
        duration: 1000
      });

      // Update filtered locations
      const filtered = type === 'all' ? locations :
        locations.filter(loc => {
          if (type === 'river') {
            return loc.type === 'river' || loc.type === 'fluviu';
          }
          return loc.type === type;
        });

      setFilteredLocations(filtered);
    }
  }, [locations, isMobile]);

  // Center on user location (identical to Home.tsx)
  const centerOnUserLocation = useCallback(async () => {
    try {
      setIsLocating(true);

      if (!navigator.geolocation) {
        toast.error('Geolocation nu este suportat de acest browser.');
        setIsLocating(false);
        return;
      }

      const locationAccepted = localStorage.getItem('locationAccepted') === 'true';

      if (locationAccepted) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;

            if (mapInstanceRef.current) {
              mapInstanceRef.current.getView().animate({
                center: fromLonLat([longitude, latitude]),
                zoom: 15,
                duration: 1000
              });

              // Add user location marker
              setUserLocation({ lat: latitude, lng: longitude });
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

            toast.error(errorMessage);
            setIsLocating(false);
          },
          {
            maximumAge: 0,
            timeout: 30000,
            enableHighAccuracy: true
          }
        );
      } else {
        toast.error('Te rugăm să accepți permisiunea de locație.');
        setIsLocating(false);
      }
    } catch (error) {
      console.error('Eroare la obținerea locației:', error);
      toast.error('Eroare la obținerea locației.');
      setIsLocating(false);
    }
  }, []);

  // Handle search key press
  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        selectLocation(searchResults[0]);
      }
    }
  }, [searchResults, selectLocation]);

  // Force show all individual locations
  const toggleShowAllIndividual = useCallback(() => {
    const newShowAllIndividual = !showAllIndividual;
    setShowAllIndividual(newShowAllIndividual);

    if (mapInstanceRef.current) {
      // Find cluster source and update distance
      const layers = mapInstanceRef.current.getLayers().getArray();
      const clusterLayer = layers.find(layer =>
        layer instanceof VectorLayer &&
        layer.getSource() instanceof Cluster
      ) as VectorLayer<Cluster>;

      if (clusterLayer) {
        const clusterSource = clusterLayer.getSource() as Cluster;
        if (newShowAllIndividual) {
          // Force individual display
          clusterSource.setDistance(1); // Very small distance = almost no clustering
          // Don't change zoom, just update clustering
        } else {
          // Restore normal clustering
          clusterSource.setDistance(40);
        }
      }
    }
  }, [showAllIndividual]);

  // Initialize OpenLayers map
  const initializeMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create vector source for locations
    const vectorSource = new VectorSource();

    // Create cluster source with dynamic distance
    const clusterSource = new Cluster({
      source: vectorSource,
      distance: 40 // Will be updated dynamically based on zoom
    });

    // Create cluster layer with custom styling
    const clusterLayer = new VectorLayer({
      source: clusterSource,
      style: (feature) => {
        const features = feature.get('features');
        const size = features.length;

        if (size === 1) {
          // Single location - show circle marker exactly like in Home.tsx
          const location = features[0].get('location');

          // Determine color based on location type (same as Home.tsx)
          let markerColor = '#6B7280'; // default
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

          // Create marker exactly like Home.tsx - simple circle
          return new Style({
            image: new Icon({
              src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
                <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="${markerColor}" stroke="#fff" stroke-width="2"/>
                </svg>
              `),
              scale: 1,
              anchor: [0.5, 0.5]
            })
          });
        } else {
          // Cluster - show circle with count
          return new Style({
            image: new Icon({
              src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
                <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" fill="#3b82f6" stroke="#fff" stroke-width="3"/>
                  <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold">${size}</text>
                </svg>
              `),
              scale: 1,
              anchor: [0.5, 0.5]
            })
          });
        }
      }
    });

    // Create map
    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        clusterLayer
      ],
      view: new View({
        center: fromLonLat([25.0, 45.5]), // Center on Romania
        zoom: 7,
        maxZoom: 18
      })
    });

    // Add click handler for clusters with smart unclustering
    map.on('click', (event) => {
      // Remove any existing popups first
      if (mapInstanceRef.current) {
        const existingPopups = mapInstanceRef.current.getTargetElement().querySelectorAll('.custom-popup');
        existingPopups.forEach(popup => popup.remove());
      }

      const feature = map.forEachFeatureAtPixel(event.pixel, (feature) => feature);
      if (feature) {
        const features = feature.get('features');
        if (features && features.length === 1) {
          // Single location clicked - show popup
          const location = features[0].get('location');
          if (location) {
            showLocationPopup(location, event.coordinate);
          }
        } else if (features && features.length > 1) {
          // Cluster clicked - smart zoom to uncluster
          const extent = feature.getGeometry()?.getExtent();
          if (extent) {
            // Calculate optimal zoom level to uncluster
            const currentZoom = map.getView().getZoom() || 0;
            const targetZoom = Math.min(currentZoom + 3, 16); // Max zoom 16

            map.getView().animate({
              center: map.getView().getCenter(),
              zoom: targetZoom,
              duration: 800
            });

            // If still clustered after zoom, try to fit extent
            setTimeout(() => {
              if (map.getView().getZoom() && map.getView().getZoom()! < 14) {
                map.getView().fit(extent, {
                  duration: 500,
                  padding: [30, 30, 30, 30],
                  maxZoom: 16
                });
              }
            }, 100);
          }
        }
      }
    });

    // Add hover handler to show individual locations in clusters
    let hoveredFeature: any = null;
    map.on('pointermove', (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feature) => feature);

      if (feature !== hoveredFeature) {
        if (hoveredFeature) {
          // Reset previous hover - don't call setStyle on FeatureLike
          hoveredFeature = null;
        }

        if (feature) {
          const features = feature.get('features');
          if (features && features.length > 1) {
            // Show cluster with highlight
            feature.setStyle(new Style({
              image: new Icon({
                src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
                  <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="25" cy="25" r="22" fill="#1d4ed8" stroke="#fff" stroke-width="4"/>
                    <text x="25" y="32" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold">${features.length}</text>
                  </svg>
                `),
                scale: 1.2,
                anchor: [0.5, 0.5]
              })
            }));
          }
        }

        hoveredFeature = feature;
      }
    });

    // Add user location layer
    const userLocationSource = new VectorSource();
    const userLocationLayer = new VectorLayer({
      source: userLocationSource,
      style: new Style({
        image: new Icon({
          src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
            <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#10b981" stroke="#fff" stroke-width="3"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold">📍</text>
            </svg>
          `),
          scale: 1,
          anchor: [0.5, 0.5]
        })
      })
    });

    // Add user location layer to map
    map.addLayer(userLocationLayer);

    mapInstanceRef.current = map;
    setMapLoaded(true);

    // Dynamic clustering based on zoom level
    map.getView().on('change:resolution', () => {
      const zoom = map.getView().getZoom() || 0;
      let newDistance = 40;

      if (zoom >= 14) {
        newDistance = 10; // Very close clustering at high zoom
      } else if (zoom >= 12) {
        newDistance = 20; // Medium clustering
      } else if (zoom >= 10) {
        newDistance = 30; // Normal clustering
      } else {
        newDistance = 40; // Wide clustering at low zoom
      }

      // Update cluster distance
      clusterSource.setDistance(newDistance);
    });
  }, []);

  // Update map with filtered locations
  const updateMapLocations = useCallback(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    // Get the cluster layer (second layer in the map)
    const clusterLayer = mapInstanceRef.current.getLayers().getArray()[1] as VectorLayer;
    const clusterSource = clusterLayer.getSource() as Cluster;
    const vectorSource = clusterSource.getSource() as VectorSource;

    // Clear existing features
    vectorSource.clear();

    // Add new features
    filteredLocations.forEach(location => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([location.longitude, location.latitude])),
        location: location
      });
      vectorSource.addFeature(feature);
    });

    // Force refresh of the cluster layer
    clusterSource.refresh();
  }, [filteredLocations, mapLoaded]);

  // Update user location on map
  const updateUserLocation = useCallback(async () => {
    if (!mapInstanceRef.current || !mapLoaded || !userLocation) return;

    // Remove existing user location overlay
    if (mapInstanceRef.current) {
      const existingOverlays = mapInstanceRef.current.getOverlays().getArray();
      existingOverlays.forEach(overlay => {
        if (overlay.getElement()?.classList.contains('user-location-marker')) {
          mapInstanceRef.current?.removeOverlay(overlay);
        }
      });
    }

    // Create custom marker element exactly like in Home.tsx
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
        z-index: 999999 !important;
        will-change: transform;
      ">
        <div style="
          font-size: 20px;
          line-height: 1;
        ">🎣</div>
      </div>
    `;

    // Add click handler for user marker
    userMarkerEl.addEventListener('click', async (e) => {
      e.stopPropagation();
      // Remove any existing popups first
      if (mapInstanceRef.current) {
        const existingPopups = mapInstanceRef.current.getTargetElement().querySelectorAll('.custom-popup');
        existingPopups.forEach(popup => popup.remove());
      }

      // Show user location popup with real user info
      const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Utilizator';
      const userPhoto = user?.user_metadata?.avatar_url || '';

      // Get address through reverse geocoding (simplified for now)
      let address = `Locația ta (${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)})`;
      try {
        // Use geocoding service asynchronously
        geocodingService.reverseGeocode(userLocation.lat, userLocation.lng).then(result => {
          // Update popup with real address if available
          const popupElement = document.querySelector('.custom-popup');
          if (popupElement) {
            const addressElement = popupElement.querySelector('.text-xs.text-gray-600.leading-relaxed');
            if (addressElement) {
              addressElement.textContent = result;
            }
          }
        }).catch(error => {
          console.error('Eroare la reverse geocoding:', error);
        });
      } catch (error) {
        console.error('Eroare la reverse geocoding:', error);
      }

      if (!mapInstanceRef.current) return;
      
      const pixel = mapInstanceRef.current.getPixelFromCoordinate(fromLonLat([userLocation.lng, userLocation.lat]));
      const popupEl = document.createElement('div');
      popupEl.className = 'custom-popup';
      popupEl.innerHTML = `
        <div class="p-4 min-w-[200px] max-w-[250px] bg-white rounded-2xl shadow-xl border border-gray-100 relative">
          <button class="absolute top-3 right-3 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors" onclick="this.closest('.custom-popup').remove()">
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
              <p class="text-xs text-gray-600 font-mono">${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}</p>
            </div>
            <div class="text-center">
              <p class="text-xs font-semibold text-gray-700 mb-1">Adresă</p>
              <p class="text-xs text-gray-600 leading-relaxed">${address}</p>
            </div>
          </div>
        </div>
      `;

      // Position popup
      popupEl.style.position = 'absolute';
      popupEl.style.zIndex = '1000';
      popupEl.style.pointerEvents = 'auto';
      popupEl.style.left = (pixel[0] - 125) + 'px';
      popupEl.style.top = (pixel[1] - 200) + 'px';

      // Add to map container
      if (mapInstanceRef.current) {
        mapInstanceRef.current.getTargetElement().appendChild(popupEl);
      }
    });

    // Add hover effect like in Home.tsx
    userMarkerEl.addEventListener('mouseenter', () => {
      userMarkerEl.style.transform = 'scale(1.1)';
      userMarkerEl.style.boxShadow = '0 12px 35px rgba(59, 130, 246, 0.4), 0 6px 16px rgba(0,0,0,0.2)';
    });

    userMarkerEl.addEventListener('mouseleave', () => {
      userMarkerEl.style.transform = 'scale(1)';
      userMarkerEl.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0,0,0,0.15)';
    });

    // Create overlay for user marker
    const userOverlay = new Overlay({
      element: userMarkerEl,
      position: fromLonLat([userLocation.lng, userLocation.lat]),
      positioning: 'center-center'
    });

    mapInstanceRef.current.addOverlay(userOverlay);

    // Create popup with user info like in Home.tsx
    const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Utilizator';
    const userPhoto = user?.user_metadata?.avatar_url || '';

    // Get address through reverse geocoding (simplified for now)
    let address = `Locația ta (${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)})`;
    try {
      // Use geocoding service asynchronously
      geocodingService.reverseGeocode(userLocation.lat, userLocation.lng).then(result => {
        // Update popup with real address if available
        const popupElement = document.querySelector('.custom-popup');
        if (popupElement) {
          const addressElement = popupElement.querySelector('.text-xs.text-gray-600.leading-relaxed');
          if (addressElement) {
            addressElement.textContent = result;
          }
        }
      }).catch(error => {
        console.error('Eroare la reverse geocoding:', error);
      });
    } catch (error) {
      console.error('Eroare la reverse geocoding:', error);
    }

    // Create popup element
    const popupEl = document.createElement('div');
    popupEl.className = 'custom-popup';
    popupEl.innerHTML = `
      <div class="p-4 min-w-[200px] max-w-[250px] bg-white rounded-2xl shadow-xl border border-gray-100 relative">
        <button class="absolute top-3 right-3 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors" onclick="this.closest('.custom-popup').remove()">
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
            <p class="text-xs text-gray-600 font-mono">${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}</p>
          </div>
          <div class="text-center">
            <p class="text-xs font-semibold text-gray-700 mb-1">Adresă</p>
            <p class="text-xs text-gray-600 leading-relaxed">${address}</p>
          </div>
        </div>
      </div>
    `;

    // Position popup
    const pixel = mapInstanceRef.current.getPixelFromCoordinate(fromLonLat([userLocation.lng, userLocation.lat]));
    popupEl.style.position = 'absolute';
    popupEl.style.zIndex = '1000';
    popupEl.style.pointerEvents = 'auto';
    popupEl.style.left = (pixel[0] - 125) + 'px';
    popupEl.style.top = (pixel[1] - 200) + 'px';

    // Add to map container
    mapInstanceRef.current.getTargetElement().appendChild(popupEl);

    // Center map on user location with animation
    mapInstanceRef.current.getView().animate({
      center: fromLonLat([userLocation.lng, userLocation.lat]),
      zoom: 15,
      duration: 1000
    });
  }, [userLocation, mapLoaded]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadFishingLocations();
    getUserLocation();
  }, [loadFishingLocations, getUserLocation]);

  // Initialize map when component mounts
  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  // Update map when filtered locations change
  useEffect(() => {
    updateMapLocations();
  }, [updateMapLocations]);

  // Update user location when it changes
  useEffect(() => {
    updateUserLocation();
  }, [updateUserLocation]);

  // Debounce pentru căutare (identical to Home.tsx)
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

  // Show location popup (identical to Home.tsx)
  const showLocationPopup = useCallback((location: FishingLocation, coordinate: number[]) => {
    if (!mapInstanceRef.current) return;

    // Remove existing popup
    const existingPopup = document.querySelector('.custom-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Create popup content (identical to Home.tsx)
    const popupContent = isMobile ? `
      <div class="p-4 min-w-[240px] max-w-[280px] bg-white rounded-xl shadow-lg border border-gray-100 relative">
        <button class="absolute top-2 right-2 w-5 h-5 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shadow-sm border border-gray-200" onclick="this.closest('.custom-popup').remove()">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        <div class="mb-3">
          <h3 class="font-bold text-lg text-gray-800 mb-1 flex items-center gap-2">
            <span class="text-xl">${location.type === 'river' || location.type === 'fluviu' ? '🌊' : location.type === 'lake' ? '🏞️' : location.type === 'balti_salbatic' ? '🌿' : location.type === 'private_pond' ? '🏡' : '💧'}</span>
            ${location.name}
          </h3>
          ${location.subtitle ? `<p class="text-xs text-gray-600 mb-1">${location.subtitle}</p>` : ''}
          <p class="text-xs text-gray-500">${location.county}, ${location.region ? location.region.charAt(0).toUpperCase() + location.region.slice(1) : 'România'}</p>
        </div>

        ${location.administrare ? `
        <div class="mb-3 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <p class="text-xs text-blue-700 leading-relaxed">${location.administrare}</p>
        </div>
        ` : ''}

        <div class="mb-3">
          <p class="text-xs font-semibold text-gray-700">Recorduri: <span class="text-blue-600 font-bold">${location.recordCount || 0}</span></p>
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
        <button class="absolute top-3 right-3 w-6 h-6 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shadow-sm border border-gray-200" onclick="this.closest('.custom-popup').remove()">
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
          <p class="text-sm text-gray-500">${location.county}, ${location.region ? location.region.charAt(0).toUpperCase() + location.region.slice(1) : 'România'}</p>
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
              ${(location.recordCount || 0) >= 1 ? '<span class="text-yellow-500">🥇</span>' : ''}
              ${(location.recordCount || 0) >= 2 ? '<span class="text-gray-400">🥈</span>' : ''}
              ${(location.recordCount || 0) >= 3 ? '<span class="text-amber-600">🥉</span>' : ''}
              <span class="text-sm font-bold text-gray-800">${location.recordCount || 0}</span>
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

    // Create popup element
    const popupEl = document.createElement('div');
    popupEl.className = 'custom-popup';
    popupEl.innerHTML = popupContent;
    popupEl.style.position = 'absolute';
    popupEl.style.zIndex = '1000';
    popupEl.style.pointerEvents = 'auto';

    // Position popup with proper centering
    const pixel = mapInstanceRef.current.getPixelFromCoordinate(coordinate);
    const mapContainer = mapInstanceRef.current.getTargetElement();
    const mapRect = mapContainer.getBoundingClientRect();

    // Center popup relative to map container
    popupEl.style.left = (pixel[0] - 160) + 'px';
    popupEl.style.top = (pixel[1] - 200) + 'px'; // Higher to account for popup height

      // Ensure popup stays within map bounds
      if (pixel[0] - 160 < 0) {
        popupEl.style.left = '10px';
      }
      if (pixel[0] + 160 > mapRect.width) {
        popupEl.style.left = (mapRect.width - 320) + 'px';
      }
      if (pixel[1] - 200 < 0) {
        popupEl.style.top = '10px';
      }

    // Add to map container
    mapInstanceRef.current.getTargetElement().appendChild(popupEl);

    // Add event listeners for popup buttons
    setTimeout(() => {
      // Add record button
      const addRecordButtons = popupEl.querySelectorAll('[data-action="add-record"]');
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
      const viewRecordsButtons = popupEl.querySelectorAll('[data-action="view-records"]');
      viewRecordsButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          const locationId = button.getAttribute('data-location-id');
          if (locationId) {
            // Navigate to records page with location filter
            window.location.href = `/records?location=${locationId}`;
          }
        });
      });
    }, 100);
  }, [isMobile]);


  return (
    <>
      <Helmet>
        <title>Test Harta OpenLayers - Fish Trophy</title>
        <meta name="description" content="Test performanță OpenLayers cu clustering pentru locațiile de pescuit" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <MapPin className="w-8 h-8 text-blue-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Test Harta OpenLayers
                </h1>
              </div>
              <div className="text-sm text-gray-500">
                {filteredLocations.length} locații afișate
                {showAllIndividual && (
                  <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                    Individual
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 md:px-6 lg:px-8 mb-6">
          <div className="max-w-7xl mx-auto">
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
                  <Search className="w-5 h-5 text-gray-400" />
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
                            {location.county}, {location.region ? location.region.charAt(0).toUpperCase() + location.region.slice(1) : 'România'}
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
                    ? filteredLocations.length
                    : filteredLocations.filter(loc => {
                        if (type === 'river') {
                          return loc.type === 'river' || loc.type === 'fluviu';
                        }
                        return loc.type === type;
                      }).length;

                  return (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedType(type);
                        setActiveFilter(type);

                        // Filter locations like in Home.tsx
                        let filtered = locations;

                        if (type !== 'all') {
                          if (type === 'river') {
                            filtered = filtered.filter(loc => loc.type === 'river' || loc.type === 'fluviu');
                          } else {
                            filtered = filtered.filter(loc => loc.type === type);
                          }
                        }

                        setFilteredLocations(filtered);

                        // Reset zoom to Romania view like in Home.tsx
                        if (mapInstanceRef.current) {
                          const isMobile = window.innerWidth <= 768;
                          mapInstanceRef.current.getView().animate({
                            center: fromLonLat([25.0094, 45.9432]), // Centru România
                            zoom: isMobile ? 5.5 : 6,
                            duration: 1000
                          });
                        }
                      }}
                      className={`${color} text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-1.5 hover:scale-105 ${
                        activeFilter === type ? 'ring-2 ring-blue-200' : ''
                      }`}
                      style={{ willChange: 'transform, box-shadow, background-color' }}
                    >
                      <Icon className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="text-xs md:text-sm">
                        {label} {loading ? '...' : `(${count})`}
                      </span>
                    </button>
                  );
                })}

                <button
                  onClick={getUserLocation}
                  disabled={isLocating}
                  className={`bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-1.5 hover:scale-105 ${
                    isLocating ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={{ willChange: 'transform, box-shadow, background-color' }}
                >
                  {isLocating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Navigation className="w-3 h-3 md:w-4 md:h-4" />
                  )}
                  <span className="text-xs md:text-sm">Locația mea</span>
                </button>

                <button
                  onClick={toggleShowAllIndividual}
                  className={`${showAllIndividual ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-500 hover:bg-indigo-600'} text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-1.5 hover:scale-105`}
                  style={{ willChange: 'transform, box-shadow, background-color' }}
                >
                  <Fish className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="text-xs md:text-sm">
                    {showAllIndividual ? 'Clustere' : 'Toate Individual'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative mx-4 mb-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div
              ref={mapRef}
              className="w-full h-[calc(100vh-250px)]"
              style={{ minHeight: '500px' }}
            />
          </div>

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-2xl">
              <div className="text-center bg-white p-6 rounded-xl shadow-lg">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Se încarcă locațiile...</p>
              </div>
            </div>
          )}

          {/* Map Info */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3">
            <div className="text-sm text-gray-600">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Clustere</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Locații individuale</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Info */}
        <div className="bg-white border-t p-4">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Informații Performanță OpenLayers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="font-medium text-blue-900">Total Locații</div>
                <div className="text-blue-700">{locations.length}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="font-medium text-green-900">Locații Afișate</div>
                <div className="text-green-700">{filteredLocations.length}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="font-medium text-purple-900">Status Harta</div>
                <div className="text-purple-700">{mapLoaded ? 'Încărcată' : 'Se încarcă...'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record Submission Modal */}
      {showRecordModal && selectedLocationForRecord && (
        <RecordSubmissionModal
          isOpen={showRecordModal}
          onClose={() => {
            setShowRecordModal(false);
            setSelectedLocationForRecord(null);
          }}
          locationId={selectedLocationForRecord.id}
          locationName={selectedLocationForRecord.name}
        />
      )}
    </>
  );
};

export default MapTest;
