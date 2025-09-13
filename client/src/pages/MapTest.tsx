import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import RecordSubmissionModal from '@/components/RecordSubmissionModal';
import MapHeader from '@/components/MapHeader';
import MapControls from '@/components/MapControls';
// import LocationPopup from '@/components/LocationPopup';

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
  recordCount?: number;
  description?: string;
}

// OpenLayers imports
import OlMap from 'ol/Map';
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
import 'ol/ol.css';

const MapTest: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<OlMap | null>(null);
  const [locations, setLocations] = useState<FishingLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<FishingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedLocationForRecord, setSelectedLocationForRecord] = useState<FishingLocation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClustered, setIsClustered] = useState(true);
  const [clusterDistance, setClusterDistance] = useState(40);

  // Create vector source and layer with useMemo
  const vectorSource = useMemo(() => new VectorSource(), []);
  const clusterSource = useMemo(() => new Cluster({
    source: vectorSource,
    distance: clusterDistance
  }), [vectorSource, clusterDistance]);
  const vectorLayer = useMemo(() => new VectorLayer({
    source: clusterSource
  }), [clusterSource]);

  // Show location popup
  const showLocationPopup = useCallback((location: FishingLocation) => {
    if (!mapInstanceRef.current) return;

    // Remove existing popups
    const existingPopups = document.querySelectorAll('.location-popup');
    existingPopups.forEach((popup: Element) => popup.remove());

    // Create popup element
    const popupEl = document.createElement('div');
    popupEl.className = 'location-popup';
    popupEl.innerHTML = `
      <div class="bg-white rounded-lg shadow-lg p-4 max-w-sm">
        <div class="flex items-start justify-between mb-2">
          <h3 class="text-lg font-semibold text-gray-900">${location.name}</h3>
          <button class="text-gray-400 hover:text-gray-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="space-y-2">
          <p class="text-sm text-gray-600">${location.city}, ${location.county}</p>
          <p class="text-sm text-gray-500">${location.type}</p>
          ${location.description ? `<p class="text-sm text-gray-700">${location.description}</p>` : ''}
          <div class="flex space-x-2 mt-3">
            <button class="add-record-btn px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
              Adaugă Record
            </button>
            <button class="view-records-btn px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700">
              Vezi Recorduri
            </button>
          </div>
        </div>
      </div>
    `;

    // Position popup
    const pixel = mapInstanceRef.current.getPixelFromCoordinate(fromLonLat([location.longitude, location.latitude]));
    popupEl.style.position = 'absolute';
    popupEl.style.left = `${pixel[0] - 150}px`;
    popupEl.style.top = `${pixel[1] - 10}px`;
    popupEl.style.zIndex = '1000';
    popupEl.style.pointerEvents = 'auto';

    // Add to map container
    const mapContainer = mapInstanceRef.current?.getTargetElement();
    if (mapContainer) {
      mapContainer.appendChild(popupEl);
    }

    // Center map on location
    const view = mapInstanceRef.current.getView();
    if (view) {
      view.animate({
        center: fromLonLat([location.longitude, location.latitude]),
        zoom: 15,
        duration: 1000
      });
    }

    // Add event listeners
    const addRecordBtn = popupEl.querySelector('.add-record-btn');
    const viewRecordsBtn = popupEl.querySelector('.view-records-btn');
    const closeBtn = popupEl.querySelector('button');

    if (addRecordBtn) {
      addRecordBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        setSelectedLocationForRecord(location);
        setShowRecordModal(true);
        popupEl.remove();
      });
    }

    if (viewRecordsBtn) {
      viewRecordsBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        // View records functionality will be implemented
        toast.info('Funcționalitatea de vizualizare recorduri va fi implementată');
        popupEl.remove();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        popupEl.remove();
      });
    }

    // Close on outside click
    const closePopup = (e: Event) => {
      if (popupEl && !popupEl.contains(e.target as Node)) {
        popupEl.remove();
        document.removeEventListener('click', closePopup);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closePopup);
    }, 100);
  }, []);


  // Update map locations
  const updateMapLocations = useCallback(() => {
    if (!mapInstanceRef.current || !vectorSource) return;

    // Clear existing features
    vectorSource.clear();

    // Add location features
    filteredLocations.forEach((location) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([location.longitude, location.latitude])),
        location: location,
        type: 'location'
      });

      // Set style based on location type
      const typeColors: { [key: string]: string } = {
        'rivers': '#3b82f6',
        'lakes': '#10b981',
        'private_ponds': '#f59e0b',
        'wild_ponds': '#8b5cf6'
      };

      const color = typeColors[location.type] || '#6b7280';

      feature.setStyle(new Style({
        image: new Icon({
          src: `data:image/svg+xml;base64,${btoa(`
            <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="8" fill="${color}" stroke="white" stroke-width="2"/>
            </svg>
          `)}`,
          scale: 1,
          anchor: [0.5, 0.5]
        })
      }));

      vectorSource.addFeature(feature);
    });
  }, [filteredLocations, vectorSource]);

  // Load fishing locations
  const loadFishingLocations = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fishing_locations')
        .select('*')
        .order('name');

      if (error) throw error;

      setLocations(data || []);
      setFilteredLocations(data || []);
    } catch (error) {
      // Error loading fishing locations
    } finally {
      setLoading(false);
    }
  }, []);

  // Get user location
  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // User location is not used in this simplified version
        },
        () => {
          // Error getting location
        }
      );
    }
  }, []);

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!mapRef.current) return;

    const map = new OlMap({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        vectorLayer
      ],
      view: new View({
        center: fromLonLat([25.0, 45.0]),
        zoom: 6
      })
    });

    mapInstanceRef.current = map;

    // Add click handler
    map.on('click', (event: { pixel: number[] }) => {
      const features = map.getFeaturesAtPixel(event.pixel);
      if (features.length > 0) {
        const feature = features[0];
        const location = feature.get('location');
        if (location) {
          showLocationPopup(location);
        }
      }
    });

    // Add pointer move handler for hover effects
    let hoveredFeature: unknown = null;
    map.on('pointermove', (event: { pixel: number[] }) => {
      const feature = map.getFeaturesAtPixel(event.pixel)[0];

      if (hoveredFeature && hoveredFeature !== feature) {
        if (hoveredFeature && typeof hoveredFeature === 'object' && 'setStyle' in hoveredFeature) {
          (hoveredFeature as { setStyle: (style: unknown) => void }).setStyle(undefined);
        }
        hoveredFeature = null;
      }

      if (feature) {
        hoveredFeature = feature;
        if (feature && typeof feature === 'object' && 'setStyle' in feature) {
          (feature as { setStyle: (style: unknown) => void }).setStyle(new Style({
            image: new Icon({
              src: `data:image/svg+xml;base64,${btoa(`
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#fbbf24" stroke="white" stroke-width="3"/>
                </svg>
              `)}`,
              scale: 1.2,
              anchor: [0.5, 0.5]
            })
          }));
        }
      }
    });

    setMapLoaded(true);
  }, [showLocationPopup, vectorLayer]);

  // Handle search
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);

    if (term.trim() === '') {
      setFilteredLocations(locations);
      return;
    }

    const filtered = locations.filter(location =>
      location.name.toLowerCase().includes(term.toLowerCase()) ||
      location.city.toLowerCase().includes(term.toLowerCase()) ||
      location.county.toLowerCase().includes(term.toLowerCase())
    );

    setFilteredLocations(filtered);

    // Center map on first result
    if (filtered.length > 0) {
      const firstLocation = filtered[0];
      const view = mapInstanceRef.current?.getView();
      if (view) {
        view.animate({
          center: fromLonLat([firstLocation.longitude, firstLocation.latitude]),
          zoom: 12,
          duration: 1000
        });
      }
    }
  }, [locations]);

  // Handle filter
  const handleFilter = useCallback((type: string) => {
    if (type === 'all') {
      setFilteredLocations(locations);
    } else {
      const filtered = locations.filter(location => location.type === type);
      setFilteredLocations(filtered);
    }

    // Reset zoom to Romania
    const view = mapInstanceRef.current?.getView();
    if (view) {
      view.animate({
        center: fromLonLat([25.0, 45.0]),
        zoom: 6,
        duration: 1000
      });
    }
  }, [locations]);

  // Handle cluster toggle
  const handleClusterToggle = useCallback(() => {
    if (!vectorSource) return;

    if (isClustered) {
      // Switch to individual display
      setClusterDistance(0);
      setIsClustered(false);
    } else {
      // Switch to clustered display
      setClusterDistance(40);
      setIsClustered(true);
    }
  }, [isClustered, vectorSource]);


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
    if (mapLoaded) {
      updateMapLocations();
    }
  }, [updateMapLocations, mapLoaded]);

  // Set map loaded when vector source is ready
  useEffect(() => {
    if (vectorSource) {
      setMapLoaded(true);
    }
  }, [vectorSource]);

  return (
    <>
      <Helmet>
        <title>Test Harta - Fish Trophy</title>
        <meta name="description" content="Test page for OpenLayers map implementation" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <MapHeader
          onClusterToggle={handleClusterToggle}
          isClustered={isClustered}
        />

        {/* Search and Filters */}
        <MapControls
          searchTerm={searchTerm}
          onSearchChange={handleSearch}
          onFilterChange={handleFilter}
        />

        {/* Map Container */}
        <div className="relative">
          <div
            ref={mapRef}
            className="w-full h-screen"
            style={{ height: 'calc(100vh - 200px)' }}
          />

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Se încarcă harta...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Submission Modal */}
      {showRecordModal && selectedLocationForRecord && (
        <RecordSubmissionModal
          isOpen={showRecordModal}
          onClose={() => setShowRecordModal(false)}
          locationId={selectedLocationForRecord.id}
          locationName={selectedLocationForRecord.name}
        />
      )}
    </>
  );
};

export default MapTest;
