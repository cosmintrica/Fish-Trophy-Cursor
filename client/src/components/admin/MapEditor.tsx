import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { DatabaseFishingLocation, loadFishingMarkers, FishingMarker } from '@/services/fishingLocations';
import { loadAJVPSOfficeMarkers, getAJVPSOfficeDetails, AJVPSOfficeMarker } from '@/services/ajvpsOffices';
import { loadAccommodationMarkers, getAccommodationDetails, AccommodationMarker } from '@/services/accommodations';
import { MapLocationType, loadShopMarkers } from '@/services/mapLocations';
import type * as GeoJSON from 'geojson';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Save, X, Edit2, Trash2, Plus, MapPin, ExternalLink, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import SearchableSelect from '@/components/SearchableSelect';
import { Search } from 'lucide-react';

interface MapEditorProps {
  onLocationUpdate?: () => void;
}

interface LocationSelectMenuProps {
  locations: DatabaseFishingLocation[];
  mapClickPosition: { lat: number; lng: number; x: number; y: number };
  onSelect: (locationId: string) => void;
  onNewLocation: (locationType: 'fishing_location' | 'shop' | 'ajvps_office' | 'accommodation') => void;
  onClose: () => void;
}

// Helper function to normalize text (remove diacritics)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const LocationSelectMenu: React.FC<LocationSelectMenuProps> = ({
  locations,
  mapClickPosition,
  onSelect,
  onNewLocation,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLocations = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return locations;
    }

    const normalizedQuery = normalizeText(searchQuery);

    return locations
      .map((loc) => {
        let score = 0;

        // Exact match on name
        if (normalizeText(loc.name).toLowerCase() === normalizedQuery) {
          score += 1000;
        }
        // Starts with
        else if (normalizeText(loc.name).toLowerCase().startsWith(normalizedQuery)) {
          score += 800;
        }
        // Contains
        else if (normalizeText(loc.name).toLowerCase().includes(normalizedQuery)) {
          score += 600;
        }

        // County match
        if (normalizeText(loc.county).includes(normalizedQuery)) {
          score += 150;
        }

        return { ...loc, score };
      })
      .filter((loc) => loc.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [locations, searchQuery]);

  return (
    <div
      className="fixed bg-white rounded-lg shadow-xl border border-gray-200 max-w-xs w-full max-h-96 flex flex-col"
      style={{
        left: `${mapClickPosition.x}px`,
        top: `${mapClickPosition.y}px`,
        transform: 'translate(-50%, 10px)',
        zIndex: 10000,
      }}
    >
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Acțiune</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-2 border-b border-gray-200 bg-blue-50">
        <p className="text-xs font-semibold text-blue-800 mb-2">Creează locație nouă:</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { onNewLocation('fishing_location'); onClose(); }}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-xs font-medium transition-colors"
          >
            🎣 Locație Pescuit
          </button>
          <button
            onClick={() => { onNewLocation('shop'); onClose(); }}
            className="px-3 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-md text-xs font-medium transition-colors"
          >
            🏪 Magazin
          </button>
          <button
            onClick={() => { onNewLocation('ajvps_office'); onClose(); }}
            className="px-3 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-md text-xs font-medium transition-colors"
          >
            🏛️ Birou AJVPS
          </button>
          <button
            onClick={() => { onNewLocation('accommodation'); onClose(); }}
            className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-xs font-medium transition-colors"
          >
            🏨 Cazare
          </button>
        </div>
      </div>
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <p className="text-xs font-semibold text-gray-700 mb-2">Sau mută locație existentă:</p>
      </div>
      <div className="p-2 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Caută locație..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-sm"
            autoFocus
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {filteredLocations.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">
            Nu s-au găsit locații
          </div>
        ) : (
          filteredLocations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => onSelect(loc.id)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md transition-colors mb-1"
            >
              <div className="font-medium text-sm">{loc.name}</div>
              <div className="text-xs text-gray-500">{loc.county}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export const MapEditor: React.FC<MapEditorProps> = ({ onLocationUpdate }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map()); // Keep for temp markers only
  const [locations, setLocations] = useState<DatabaseFishingLocation[]>([]);
  const [fishingMarkers, setFishingMarkers] = useState<FishingMarker[]>([]);
  const [shopMarkers, setShopMarkers] = useState<any[]>([]);
  const [ajvpsMarkers, setAjvpsMarkers] = useState<AJVPSOfficeMarker[]>([]);
  const [accommodationMarkers, setAccommodationMarkers] = useState<AccommodationMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<DatabaseFishingLocation | null>(null);
  const [selectedLocationType, setSelectedLocationType] = useState<MapLocationType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [_draggedMarkerId, _setDraggedMarkerId] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, { lat: number; lng: number }>>(new Map());
  const [hoverTooltip, setHoverTooltip] = useState<{ id: string; name: string; county: string; x: number; y: number } | null>(null);
  const [mapClickPosition, setMapClickPosition] = useState<{ lat: number; lng: number; x: number; y: number } | null>(null);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [_mapClickHoldTimer, _setMapClickHoldTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const tempMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [_isDraggingMarker, _setIsDraggingMarker] = useState(false);
  const [isLoadingGoogleMaps, setIsLoadingGoogleMaps] = useState(false);
  const [counties, setCounties] = useState<{ id: string; name: string }[]>([]);
  const [activeLocationType, setActiveLocationType] = useState<MapLocationType | 'all' | 'river' | 'lake' | 'balti_salbatic' | 'private_pond'>('all');
  const [mapStyle, setMapStyle] = useState<'osm' | 'satellite' | 'hybrid'>('osm');
  const [_showMapStyleDropdown, _setShowMapStyleDropdown] = useState(false);
  const isDraggingRef = useRef(false);
  const draggedFeatureIdRef = useRef<string | null>(null);
  const draggedFeatureTypeRef = useRef<MapLocationType | null>(null);
  const dragStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const _layersWithListenersRef = useRef<Set<string>>(new Set()); // Track layers with listeners
  const hasDraggedRef = useRef(false); // Track if a drag actually occurred


  // Keep a ref to the latest state to avoid re-binding event listeners
  const latestStateRef = useRef({
    isEditMode,
    locations,
    fishingMarkers,
    shopMarkers,
    ajvpsMarkers,
    accommodationMarkers,
    activeLocationType
  });

  useEffect(() => {
    latestStateRef.current = {
      isEditMode,
      locations,
      fishingMarkers,
      shopMarkers,
      ajvpsMarkers,
      accommodationMarkers,
      activeLocationType
    };
  }, [isEditMode, locations, fishingMarkers, shopMarkers, ajvpsMarkers, accommodationMarkers, activeLocationType]);

  // Form state - unified for all location types
  const [formData, setFormData] = useState<any>({
    // Common fields
    name: '',
    address: '',
    city: '',
    county: '',
    region: 'muntenia',
    latitude: 0,
    longitude: 0,
    description: '',
    website: '',
    phone: '',
    email: '',
    image_url: '',
    // Fishing location specific
    type: 'lac' as DatabaseFishingLocation['type'],
    youtube_channel: '',
    administrare: '',
    administrare_url: '',
    // Shop specific
    opening_hours: '',
    services: [] as string[],
    // AJVPS specific
    office_type: 'ajvps' as 'ajvps' | 'primarie' | 'agentie' | 'institutie',
    // Accommodation specific
    accommodation_type: 'pensiune' as 'pensiune' | 'complex' | 'cazare' | 'hotel' | 'vila',
    has_fishing_pond: false,
    fishing_pond_details: null as any,
    fishing_location_id: null as string | null,
    facilities: [] as string[],
  });

  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [selectedAJVPS, setSelectedAJVPS] = useState<any>(null);
  const [selectedAccommodation, setSelectedAccommodation] = useState<any>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const mapConfig: maplibregl.MapOptions = {
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'satellite': {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256
          },
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
            id: 'satellite',
            type: 'raster',
            source: 'satellite',
            layout: { visibility: 'none' }
          },
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            layout: { visibility: 'visible' }
          }
        ]
      },
      center: [25.0094, 45.9432] as [number, number],
      zoom: 6,
      minZoom: 3,
      maxZoom: 18,
      // GPU acceleration optimizations
      fadeDuration: 0,
      refreshExpiredTiles: false,
      attributionControl: false, // Disable attribution control completely
    };

    const map = new maplibregl.Map(mapConfig);
    mapInstanceRef.current = map;

    // Add navigation control
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Remove any existing attribution controls
    map.on('load', () => {
      // Remove attribution control if it exists
      const attributionControl = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
      if (attributionControl) {
        attributionControl.remove();
      }
    });

    // Remove any existing attribution controls on load
    map.on('load', () => {
      const attributionControl = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
      if (attributionControl) {
        attributionControl.remove();
      }
    });

    // Enable GPU acceleration
    if (map.getCanvas()) {
      const canvas = map.getCanvas();
      canvas.style.willChange = 'transform';
      canvas.style.transform = 'translateZ(0)';
    }

    map.on('load', () => {
      loadLocations();

      // Global drag handlers removed - handled by unified useEffect

      // Global mouseup handler removed - handled by unified useEffect
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Unified Map Interaction Handler
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let holdingIndicatorTimer: ReturnType<typeof setTimeout> | null = null;
    let mouseDownTime = 0;
    let mouseDownPosition: { x: number; y: number } | null = null;
    let hasMoved = false;

    const INTERACTIVE_LAYERS = [
      'admin-fishing-circles',
      'admin-shop-circles',
      'admin-ajvps-circles',
      'admin-accommodation-circles'
    ];

    // Helper to find feature under cursor
    const getFeatureUnderCursor = (point: { x: number, y: number }) => {
      // Check layers that are actually visible
      const visibleLayers = INTERACTIVE_LAYERS.filter(id => map.getLayer(id));
      if (visibleLayers.length === 0) return null;

      // Use a small bounding box for easier clicking (5px buffer)
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [point.x - 5, point.y - 5],
        [point.x + 5, point.y + 5]
      ];

      const features = map.queryRenderedFeatures(bbox, { layers: visibleLayers });
      return features.length > 0 ? features[0] : null;
    };

    const handleMouseDown = (e: maplibregl.MapMouseEvent) => {
      const state = latestStateRef.current;

      // Prevent if clicking on a marker element (DOM markers)
      const clickedElement = (e.originalEvent.target as HTMLElement)?.closest('.location-marker-editor');
      if (clickedElement) return;

      // Prevent if clicking on dialog or menu
      const clickedDialog = (e.originalEvent.target as HTMLElement)?.closest('[role="dialog"]');
      if (clickedDialog) return;

      // 1. Check for Marker Click (for Dragging)
      const feature = getFeatureUnderCursor(e.point);

      if (feature) {
        // If in Edit Mode, DO NOT START DRAG.
        // Just return, so the click event can propagate to handleMouseUp (which handles the click-to-edit).
        if (state.isEditMode) {
          return;
        }

        // START DRAGGING MARKER - Only allowed if NOT in Edit Mode

        isDraggingRef.current = true;
        hasDraggedRef.current = false; // Reset drag flag
        draggedFeatureIdRef.current = feature.properties?.id || null;
        draggedFeatureTypeRef.current = feature.properties?.locationType as MapLocationType || null;
        dragStartPointRef.current = e.point;

        // Disable map pan immediately
        if (map.dragPan && map.dragPan.isEnabled()) {
          map.dragPan.disable();
        }

        // Stop propagation to prevent map click and map drag
        e.preventDefault();

        map.getCanvas().style.cursor = 'grabbing';
        setHoverTooltip(null);
        return;
      }


      // 2. If NO marker, start Click & Hold logic (if in Edit Mode)
      // Only allow creating new locations if we are in a "management" context,
      // but since user wants drag & drop always, maybe click & hold should also be always?
      // For now, keeping isEditMode check for CREATION to avoid accidental creations,
      // but Drag & Drop is now enabled always as requested.
      if (state.isEditMode) {
        mouseDownTime = Date.now();
        mouseDownPosition = { x: e.point.x, y: e.point.y };
        hasMoved = false;

        // Show holding indicator only after 300ms
        holdingIndicatorTimer = setTimeout(() => {
          if (!hasMoved && !isDraggingRef.current) {
            setIsHolding(true);
          }
        }, 300);

        // Create temporary marker immediately
        const tempMarkerEl = document.createElement('div');
        tempMarkerEl.className = 'temp-location-marker';
        tempMarkerEl.innerHTML = `
          <div style="
            width: 32px;
            height: 32px;
            background: #EF4444;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        `;

        const tempMarkerInstance = new maplibregl.Marker({
          element: tempMarkerEl,
          draggable: false,
        })
          .setLngLat([e.lngLat.lng, e.lngLat.lat])
          .addTo(map);

        tempMarkerRef.current = tempMarkerInstance;

        holdTimer = setTimeout(() => {
          if (!hasMoved && state.isEditMode && !isDraggingRef.current) {
            const container = map.getContainer();
            const rect = container.getBoundingClientRect();
            setMapClickPosition({
              lat: e.lngLat.lat,
              lng: e.lngLat.lng,
              x: e.point.x + rect.left,
              y: e.point.y + rect.top,
            });
            setShowLocationMenu(true);
          } else {
            if (tempMarkerRef.current) {
              tempMarkerRef.current.remove();
              tempMarkerRef.current = null;
            }
          }
          setIsHolding(false);
        }, 500);
      }
    };

    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      const state = latestStateRef.current;

      // 1. Handle Marker Dragging
      if (isDraggingRef.current && draggedFeatureIdRef.current) {
        // Disable map panning (redundant check but safe)
        if (map.dragPan && map.dragPan.isEnabled()) {
          map.dragPan.disable();
        }

        // Check if we actually moved enough to consider it a drag
        if (dragStartPointRef.current) {
          const dist = Math.sqrt(
            Math.pow(e.point.x - dragStartPointRef.current.x, 2) +
            Math.pow(e.point.y - dragStartPointRef.current.y, 2)
          );
          if (dist > 3) {
            hasDraggedRef.current = true;
          }
        }

        // Only update visual position if we are actually dragging
        if (hasDraggedRef.current && draggedFeatureIdRef.current && draggedFeatureTypeRef.current) {
          const type = draggedFeatureTypeRef.current;
          let sourceId = '';
          let markersList: any[] = [];

          // Determine source and data based on type
          if (type === 'fishing_location') {
            sourceId = 'admin-fishing-locations';
            // Filter fishing markers if needed (reuse logic from addAllMarkersToMap or just use all for simplicity in drag)
            // For drag visual, it's safer to use the current filtered list if possible, or just all.
            // Let's use the logic that matches addAllMarkersToMap's filtering to avoid markers popping in/out
            const activeType = state.activeLocationType;
            if (activeType === 'river' || activeType === 'lake' || activeType === 'balti_salbatic' || activeType === 'private_pond') {
              markersList = state.fishingMarkers.filter(marker => {
                const markerType = marker.type?.toLowerCase();
                if (activeType === 'river') return markerType === 'river' || markerType === 'fluviu';
                if (activeType === 'lake') return markerType === 'lake' || markerType === 'lac';
                if (activeType === 'balti_salbatic') return markerType === 'balti_salbatic' || markerType === 'pond';
                if (activeType === 'private_pond') return markerType === 'private_pond';
                return false;
              });
            } else if (activeType !== 'all' && activeType !== 'fishing_location') {
              markersList = [];
            } else {
              markersList = state.fishingMarkers;
            }
          } else if (type === 'shop') {
            sourceId = 'admin-shops';
            markersList = state.shopMarkers;
          } else if (type === 'ajvps_office') {
            sourceId = 'admin-ajvps';
            markersList = state.ajvpsMarkers;
          } else if (type === 'accommodation') {
            sourceId = 'admin-accommodations';
            markersList = state.accommodationMarkers;
          }

          if (sourceId && map.getSource(sourceId)) {
            const geojson: GeoJSON.FeatureCollection = {
              type: 'FeatureCollection',
              features: markersList.map(marker => {
                // If this is the dragged marker, use new coordinates
                const isDragged = marker.id === draggedFeatureIdRef.current;
                const coords = isDragged ? [e.lngLat.lng, e.lngLat.lat] : marker.coords;

                return {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: coords
                  },
                  properties: {
                    id: marker.id,
                    name: marker.name,
                    locationType: type,
                    // Add other props if needed for styling
                    type: marker.type,
                    county: marker.county,
                    region: marker.region
                  }
                };
              })
            };

            (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
          }
        }
        return; // Don't do other hover effects while dragging
      }
      // Re-enable map panning if not dragging
      else if (map.dragPan && !map.dragPan.isEnabled()) {
        map.dragPan.enable();
      }

      // 2. Handle Click & Hold Movement Check
      if (mouseDownPosition) {
        const moveDistance = Math.sqrt(
          Math.pow(e.point.x - mouseDownPosition.x, 2) +
          Math.pow(e.point.y - mouseDownPosition.y, 2)
        );

        if (moveDistance > 5) {
          hasMoved = true;
          if (holdTimer) clearTimeout(holdTimer);
          if (holdingIndicatorTimer) clearTimeout(holdingIndicatorTimer);
          setIsHolding(false);
          if (tempMarkerRef.current) {
            tempMarkerRef.current.remove();
            tempMarkerRef.current = null;
          }
        }
      }

      // 3. Handle Hover Tooltip & Cursor
      const feature = getFeatureUnderCursor(e.point);
      if (feature) {
        map.getCanvas().style.cursor = 'grab'; // Always grab cursor for markers

        if (!isDraggingRef.current) {
          const properties = feature.properties;
          const container = map.getContainer();
          const rect = container.getBoundingClientRect();

          // Use feature coordinates for tooltip position if available, otherwise mouse position
          // Using mouse position is smoother for hover
          setHoverTooltip({
            id: properties?.id,
            name: properties?.name,
            county: properties?.county,
            x: e.point.x + rect.left,
            y: e.point.y + rect.top
          });
        }
      } else {
        map.getCanvas().style.cursor = '';
        if (!isDraggingRef.current) {
          setHoverTooltip(null);
        }
      }
    };

    const handleMouseUp = async (e: maplibregl.MapMouseEvent) => {
      const state = latestStateRef.current;

      // 1. Handle Drag End
      if (isDraggingRef.current && draggedFeatureIdRef.current) {
        // Only save if we actually dragged
        if (hasDraggedRef.current && draggedFeatureTypeRef.current) {
          const lat = e.lngLat.lat;
          const lng = e.lngLat.lng;
          const locationType = draggedFeatureTypeRef.current;
          const locationId = draggedFeatureIdRef.current;

          // Call the update function
          if (locationType === 'fishing_location') {
            handleLocationDragEnd(locationId, lat, lng);
          } else {
            // For other types, we need to manually update supabase here or call a helper
            try {
              let table = '';
              if (locationType === 'shop') table = 'fishing_shops';
              else if (locationType === 'ajvps_office') table = 'ajvps_offices';
              else if (locationType === 'accommodation') table = 'accommodations';

              if (table) {
                const { error } = await supabase
                  .from(table)
                  .update({ latitude: lat, longitude: lng, updated_at: new Date().toISOString() })
                  .eq('id', locationId);
                if (error) throw error;
                toast.success('Coordonate actualizate!');

                // Update local state to reflect change immediately
                if (locationType === 'shop') {
                  state.shopMarkers = state.shopMarkers.map(m => m.id === locationId ? { ...m, coords: [lng, lat] } : m);
                  setShopMarkers([...state.shopMarkers]);
                } else if (locationType === 'ajvps_office') {
                  state.ajvpsMarkers = state.ajvpsMarkers.map(m => m.id === locationId ? { ...m, coords: [lng, lat] } : m);
                  setAjvpsMarkers([...state.ajvpsMarkers]);
                } else if (locationType === 'accommodation') {
                  state.accommodationMarkers = state.accommodationMarkers.map(m => m.id === locationId ? { ...m, coords: [lng, lat] } : m);
                  setAccommodationMarkers([...state.accommodationMarkers]);
                }

                // Force map update
                addAllMarkersToMap();
              }
            } catch (err: any) {
              toast.error('Eroare update: ' + err.message);
              // Revert map
              addAllMarkersToMap();
            }
          }
        } else {
          // If we didn't drag (just clicked), we should treat it as a click
          // We can manually trigger the click logic here or let the click event fire?
          // Since we prevented default on mousedown, click might not fire reliably.
          // Let's manually trigger the edit dialog here if it was just a click on a marker
          // ONLY IF IN EDIT MODE
          if (state.isEditMode) {
            const feature = getFeatureUnderCursor(e.point);
            if (feature) {
              const properties = feature.properties;
              const locationType = properties?.locationType as MapLocationType;
              const locationId = properties?.id;

              if (locationId) {
                if (locationType === 'fishing_location') {
                  // Fetch raw database data to preserve correct types (lac/rau vs lake/river)
                  const { data } = await supabase.from('fishing_locations').select('*').eq('id', locationId).single();
                  if (data) {
                    setSelectedLocation(data);
                    setSelectedLocationType('fishing_location');
                    setSelectedShop(null);
                    setSelectedAJVPS(null);
                    setSelectedAccommodation(null);
                    setFormData({
                      name: data.name || '',
                      type: data.type || 'lac',
                      county: normalizeCountyName(data.county || ''),
                      region: data.region || 'muntenia',
                      latitude: Number(data.latitude) || 0,
                      longitude: Number(data.longitude) || 0,
                      description: data.description || '',
                      website: data.website || '',
                      phone: data.phone || '',
                      youtube_channel: data.youtube_channel || '',
                      administrare: data.administrare || '',
                      administrare_url: data.administrare_url || '',
                    });
                    setIsDialogOpen(true);
                  }
                } else if (locationType === 'shop') {
                  const { data } = await supabase.from('fishing_shops').select('*').eq('id', locationId).single();
                  if (data) {
                    setSelectedShop(data);
                    setSelectedLocation(null);
                    setSelectedAJVPS(null);
                    setSelectedAccommodation(null);
                    setSelectedLocationType('shop');
                    setFormData({
                      name: data.name || '',
                      address: data.address || '',
                      city: data.city || '',
                      county: normalizeCountyName(data.county || ''),
                      region: data.region || 'muntenia',
                      latitude: Number(data.latitude) || 0,
                      longitude: Number(data.longitude) || 0,
                      description: data.description || '',
                      website: data.website || '',
                      phone: data.phone || '',
                      email: data.email || '',
                      opening_hours: data.opening_hours || '',
                      services: data.services || [],
                      image_url: data.image_url || '',
                    });
                    setIsDialogOpen(true);
                  }
                } else if (locationType === 'ajvps_office') {
                  const details = await getAJVPSOfficeDetails(locationId);
                  if (details) {
                    setSelectedAJVPS(details);
                    setSelectedLocation(null);
                    setSelectedShop(null);
                    setSelectedAccommodation(null);
                    setSelectedLocationType('ajvps_office');
                    setFormData({
                      name: details.name || '',
                      address: details.address || '',
                      city: details.city || '',
                      county: normalizeCountyName(details.county || ''),
                      region: details.region || 'muntenia',
                      latitude: Number(details.latitude) || 0,
                      longitude: Number(details.longitude) || 0,
                      description: details.description || '',
                      website: details.website || '',
                      phone: details.phone || '',
                      email: details.email || '',
                      office_type: details.office_type || 'ajvps',
                      opening_hours: details.opening_hours || '',
                      services: details.services || [],
                      image_url: details.image_url || '',
                    });
                    setIsDialogOpen(true);
                  }
                } else if (locationType === 'accommodation') {
                  const details = await getAccommodationDetails(locationId);
                  if (details) {
                    setSelectedAccommodation(details);
                    setSelectedLocation(null);
                    setSelectedShop(null);
                    setSelectedAJVPS(null);
                    setSelectedLocationType('accommodation');
                    setFormData({
                      name: details.name || '',
                      address: details.address || '',
                      city: details.city || '',
                      county: normalizeCountyName(details.county || ''),
                      region: details.region || 'muntenia',
                      latitude: Number(details.latitude) || 0,
                      longitude: Number(details.longitude) || 0,
                      description: details.description || '',
                      website: details.website || '',
                      phone: details.phone || '',
                      email: details.email || '',
                      accommodation_type: details.accommodation_type || 'pensiune',
                      has_fishing_pond: details.has_fishing_pond || false,
                      fishing_pond_details: details.fishing_pond_details || null,
                      fishing_location_id: details.fishing_location_id || null,
                      facilities: details.facilities || [],
                      image_url: details.image_url || '',
                    });
                    setIsDialogOpen(true);
                  }
                }
              }
            }
          }
        }


        isDraggingRef.current = false;
        hasDraggedRef.current = false;
        draggedFeatureIdRef.current = null;
        draggedFeatureTypeRef.current = null;
        dragStartPointRef.current = null;
        map.getCanvas().style.cursor = '';

        // Re-enable pan
        if (map.dragPan && !map.dragPan.isEnabled()) {
          map.dragPan.enable();
        }
        return;
      }

      // 2. Handle Click & Hold End
      if (holdTimer) clearTimeout(holdTimer);
      if (holdingIndicatorTimer) clearTimeout(holdingIndicatorTimer);
      setIsHolding(false);
      hasMoved = false;
      mouseDownPosition = null;
      if (tempMarkerRef.current && !showLocationMenu) {
        // If menu didn't open, remove temp marker
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
    };

    const handleClick = async (_e: maplibregl.MapMouseEvent) => {
      // Click logic is now handled in handleMouseUp to correctly distinguish between drag and click
      // We keep this empty or remove it, but removing it requires updating the useEffect cleanup
      // So we just leave it empty or return
      return;
    };

    const handleMouseLeave = () => {
      if (holdTimer) clearTimeout(holdTimer);
      if (holdingIndicatorTimer) clearTimeout(holdingIndicatorTimer);
      setIsHolding(false);
      hasMoved = false;
      mouseDownPosition = null;
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
      map.getCanvas().style.cursor = '';
      setHoverTooltip(null);
    };

    map.on('mousedown', handleMouseDown);
    map.on('mouseup', handleMouseUp);
    map.on('mousemove', handleMouseMove);
    map.on('click', handleClick);
    map.on('mouseleave', handleMouseLeave);

    return () => {
      if (holdTimer) clearTimeout(holdTimer);
      if (holdingIndicatorTimer) clearTimeout(holdingIndicatorTimer);
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
      map.off('mousedown', handleMouseDown);
      map.off('mouseup', handleMouseUp);
      map.off('mousemove', handleMouseMove);
      map.off('click', handleClick);
      map.off('mouseleave', handleMouseLeave);
    };
  }, []); // Run once on mount (dependencies handled via ref)

  // Map county codes to full names (for backward compatibility)
  const countyCodeMap: Record<string, string> = {
    'AB': 'Alba',
    'AR': 'Arad',
    'AG': 'Argeș',
    'BC': 'Bacău',
    'BH': 'Bihor',
    'BN': 'Bistrița-Năsăud',
    'BT': 'Botoșani',
    'BR': 'Brăila',
    'BV': 'Brașov',
    'B': 'București',
    'BZ': 'Buzău',
    'CL': 'Călărași',
    'CS': 'Caraș-Severin',
    'CJ': 'Cluj',
    'CT': 'Constanța',
    'CV': 'Covasna',
    'DB': 'Dâmbovița',
    'DJ': 'Dolj',
    'GL': 'Galați',
    'GR': 'Giurgiu',
    'GJ': 'Gorj',
    'HR': 'Harghita',
    'HD': 'Hunedoara',
    'IL': 'Ialomița',
    'IS': 'Iași',
    'IF': 'Ilfov',
    'MM': 'Maramureș',
    'MH': 'Mehedinți',
    'MS': 'Mureș',
    'NT': 'Neamț',
    'OT': 'Olt',
    'PH': 'Prahova',
    'SJ': 'Sălaj',
    'SM': 'Satu Mare',
    'SB': 'Sibiu',
    'SV': 'Suceava',
    'TR': 'Teleorman',
    'TM': 'Timiș',
    'TL': 'Tulcea',
    'VL': 'Vâlcea',
    'VS': 'Vaslui',
    'VN': 'Vrancea',
  };

  // Normalize county name - convert code to full name if needed
  const normalizeCountyName = (county: string): string => {
    if (!county) return '';
    const trimmed = county.trim();
    // If it's a code (2-3 characters), convert to full name
    if (trimmed.length <= 3 && countyCodeMap[trimmed.toUpperCase()]) {
      return countyCodeMap[trimmed.toUpperCase()];
    }
    return trimmed;
  };

  // Load counties from database
  const loadCounties = async () => {
    try {
      const { data, error } = await supabase
        .from('counties')
        .select('id, name')
        .order('name');

      if (error) throw error;

      setCounties(data || []);
    } catch (error: any) {
      console.error('Error loading counties:', error);
      toast.error('Eroare la încărcarea județelor: ' + error.message);
    }
  };

  // Load all location types from database
  const loadLocations = async () => {
    try {
      setLoading(true);

      // Load all types in parallel
      const [fishingData, shopData, ajvpsData, accommodationData, fishingMarkersData, shopMarkersData, ajvpsMarkersData, accommodationMarkersData] = await Promise.all([
        supabase.from('fishing_locations').select('*').order('name'),
        supabase.from('fishing_shops').select('*').order('name'),
        supabase.from('ajvps_offices').select('*').order('name'),
        supabase.from('accommodations').select('*').order('name'),
        loadFishingMarkers(),
        loadShopMarkers(),
        loadAJVPSOfficeMarkers(),
        loadAccommodationMarkers()
      ]);

      if (fishingData.error) throw fishingData.error;
      if (shopData.error) throw shopData.error;
      if (ajvpsData.error) throw ajvpsData.error;
      if (accommodationData.error) throw accommodationData.error;

      // Normalize county names for fishing locations
      const normalizedFishingData = (fishingData.data || []).map(loc => ({
        ...loc,
        county: normalizeCountyName(loc.county),
      }));

      setLocations(normalizedFishingData);
      setFishingMarkers(fishingMarkersData);
      setShopMarkers(shopMarkersData);
      setAjvpsMarkers(ajvpsMarkersData);
      setAccommodationMarkers(accommodationMarkersData);

      if (mapInstanceRef.current) {
        addAllMarkersToMap();
      }
    } catch (error: any) {
      console.error('Error loading locations:', error);
      toast.error('Eroare la încărcarea locațiilor: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add all markers to map using GeoJSON layers (GPU-accelerated)
  const addAllMarkersToMap = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Helper to add a layer for a specific type
    const addLayerForType = (
      sourceId: string,
      layerId: string,
      markers: any[],
      color: string,
      locationType: MapLocationType
    ) => {
      if (markers.length === 0) {
        // Remove layer if no markers
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
        return;
      }

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: markers.map(marker => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: marker.coords
          },
          properties: {
            id: marker.id,
            name: marker.name,
            locationType,
            county: marker.county,
            region: marker.region
          }
        }))
      };

      // Add or update source
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
        // IMPORTANT: Set visibility to 'visible' when updating existing layer
        // This ensures the layer is shown when its filter is selected
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'visible');
        }
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson
        });
      }

      // Add or update layer
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-color': color,
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              5, 10,
              10, 14,
              15, 18
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.95
          }
        });
      } else {
        // Layer exists, ensure it's visible
        map.setLayoutProperty(layerId, 'visibility', 'visible');
      }
    };

    // Add fishing locations - filter by type if specific subtype is selected
    const state = latestStateRef.current;
    let fishingData = state.fishingMarkers;
    const activeType = state.activeLocationType;

    if (activeType === 'river' || activeType === 'lake' || activeType === 'balti_salbatic' || activeType === 'private_pond') {
      // Filter by specific type
      fishingData = state.fishingMarkers.filter(marker => {
        const markerType = marker.type?.toLowerCase();
        if (activeType === 'river') {
          return markerType === 'river' || markerType === 'fluviu';
        } else if (activeType === 'lake') {
          return markerType === 'lake' || markerType === 'lac';
        } else if (activeType === 'balti_salbatic') {
          return markerType === 'balti_salbatic' || markerType === 'pond';
        } else if (activeType === 'private_pond') {
          return markerType === 'private_pond';
        }
        return false;
      });
    } else if (activeType !== 'all' && activeType !== 'fishing_location') {
      // Hide fishing locations if other type is selected
      fishingData = [];
    }

    if (fishingData.length > 0 || activeType === 'all' || activeType === 'fishing_location' || activeType === 'river' || activeType === 'lake' || activeType === 'balti_salbatic' || activeType === 'private_pond') {
      const fishingGeojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: fishingData.map(marker => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: marker.coords
          },
          properties: {
            id: marker.id,
            name: marker.name,
            type: marker.type,
            locationType: 'fishing_location' as MapLocationType,
            county: marker.county,
            region: marker.region
          }
        }))
      };

      const sourceId = 'admin-fishing-locations';
      const layerId = 'admin-fishing-circles';

      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(fishingGeojson);
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'visible');
        }
      } else {
        map.addSource(sourceId, { type: 'geojson', data: fishingGeojson });
        map.addLayer({
          id: layerId,
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
              5, 10,
              10, 14,
              15, 18
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.95
          }
        });


      }
    } else {
      if (map.getLayer('admin-fishing-circles')) {
        map.setLayoutProperty('admin-fishing-circles', 'visibility', 'none');
      }
    }

    // Add shops
    if (activeType === 'all' || activeType === 'shop') {
      addLayerForType('admin-shops', 'admin-shop-circles', state.shopMarkers, '#8b5cf6', 'shop');
    } else {
      if (map.getLayer('admin-shop-circles')) {
        map.setLayoutProperty('admin-shop-circles', 'visibility', 'none');
      }
    }

    // Add AJVPS offices
    if (activeType === 'all' || activeType === 'ajvps_office') {
      addLayerForType('admin-ajvps', 'admin-ajvps-circles', state.ajvpsMarkers, '#ec4899', 'ajvps_office');
    } else {
      if (map.getLayer('admin-ajvps-circles')) {
        map.setLayoutProperty('admin-ajvps-circles', 'visibility', 'none');
      }
    }

    // Add accommodations
    if (activeType === 'all' || activeType === 'accommodation') {
      addLayerForType('admin-accommodations', 'admin-accommodation-circles', state.accommodationMarkers, '#f97316', 'accommodation');
    } else {
      if (map.getLayer('admin-accommodation-circles')) {
        map.setLayoutProperty('admin-accommodation-circles', 'visibility', 'none');
      }
    }
  };

  // Change map style function - seamless switching
  const changeMapStyle = useCallback((style: 'osm' | 'satellite' | 'hybrid') => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    setMapStyle(style);

    if (style === 'satellite') {
      if (map.getLayer('satellite')) map.setLayoutProperty('satellite', 'visibility', 'visible');
      if (map.getLayer('osm')) map.setLayoutProperty('osm', 'visibility', 'none');
    } else if (style === 'hybrid') {
      if (map.getLayer('satellite')) map.setLayoutProperty('satellite', 'visibility', 'visible');
      if (map.getLayer('osm')) {
        map.setLayoutProperty('osm', 'visibility', 'visible');
        map.setPaintProperty('osm', 'raster-opacity', 0.5);
      }
    } else { // osm
      if (map.getLayer('satellite')) map.setLayoutProperty('satellite', 'visibility', 'none');
      if (map.getLayer('osm')) {
        map.setLayoutProperty('osm', 'visibility', 'visible');
        map.setPaintProperty('osm', 'raster-opacity', 1);
      }
    }
  }, []);

  // Load counties on mount
  useEffect(() => {
    loadCounties();
  }, []);

  // Update markers when edit mode, locations, or active type change
  useEffect(() => {
    if (mapInstanceRef.current && (fishingMarkers.length > 0 || shopMarkers.length > 0 || ajvpsMarkers.length > 0 || accommodationMarkers.length > 0)) {
      addAllMarkersToMap();
    }
  }, [isEditMode, fishingMarkers.length, shopMarkers.length, ajvpsMarkers.length, accommodationMarkers.length, activeLocationType]);

  // Handle location click
  const _handleLocationClick = (location: DatabaseFishingLocation) => {
    setSelectedLocation(location);
    setFormData({
      name: location.name,
      type: location.type,
      county: normalizeCountyName(location.county), // Normalize county name
      region: location.region as any,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      description: location.description || '',
      website: location.website || '',
      phone: location.phone || '',
      youtube_channel: location.youtube_channel || '',
      administrare: location.administrare || '',
      administrare_url: location.administrare_url || '',
    });
    setIsDialogOpen(true);

    // Center map on location
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [Number(location.longitude), Number(location.latitude)],
        zoom: 12,
        duration: 1000,
      });
    }
  };

  // Handle move location to clicked position
  const handleMoveLocationToClick = async (locationId: string, lat: number, lng: number) => {
    const location = locations.find(l => l.id === locationId);
    if (!location) return;

    // Update marker position immediately
    const marker = markersRef.current.get(locationId);
    if (marker) {
      marker.setLngLat([lng, lat]);
    }

    // Update form data and open dialog
    setSelectedLocation(location);
    setFormData({
      name: location.name,
      type: location.type,
      county: normalizeCountyName(location.county), // Normalize county name
      region: location.region as any,
      latitude: lat,
      longitude: lng,
      description: location.description || '',
      website: location.website || '',
      phone: location.phone || '',
      youtube_channel: location.youtube_channel || '',
      administrare: location.administrare || '',
      administrare_url: location.administrare_url || '',
    });
    setIsDialogOpen(true);

    // Center map on new position
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [lng, lat],
        zoom: 14,
        duration: 1000,
      });
    }
  };

  // Handle drag end
  const handleLocationDragEnd = async (locationId: string, lat: number, lng: number) => {
    try {
      const { error } = await supabase
        .from('fishing_locations')
        .update({
          latitude: lat,
          longitude: lng,
          updated_at: new Date().toISOString(),
        })
        .eq('id', locationId);

      if (error) throw error;

      toast.success('Coordonatele au fost actualizate!');

      // Update local state
      setLocations(prev => prev.map(loc =>
        loc.id === locationId
          ? { ...loc, latitude: lat, longitude: lng }
          : loc
      ));

      // Clear pending update
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(locationId);
        return newMap;
      });

      onLocationUpdate?.();
    } catch (error: any) {
      console.error('Error updating location:', error);
      toast.error('Eroare la actualizarea coordonatelor: ' + error.message);

      // Revert marker position
      const location = locations.find(l => l.id === locationId);
      if (location && mapInstanceRef.current) {
        const marker = markersRef.current.get(locationId);
        if (marker) {
          marker.setLngLat([Number(location.longitude), Number(location.latitude)]);
        }
      }
    }
  };

  // Handle form submit - unified for all location types
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const lat = Number(formData.latitude);
      const lng = Number(formData.longitude);

      if (selectedLocationType === 'fishing_location') {
        if (selectedLocation) {
          // Update existing fishing location
          const { error } = await supabase
            .from('fishing_locations')
            .update({
              name: formData.name,
              type: formData.type,
              county: normalizeCountyName(formData.county),
              region: formData.region,
              latitude: lat,
              longitude: lng,
              description: formData.description || null,
              website: formData.website || null,
              phone: formData.phone || null,
              youtube_channel: formData.youtube_channel || null,
              administrare: formData.administrare || null,
              administrare_url: formData.administrare_url || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', selectedLocation.id);

          if (error) throw error;
          toast.success('Locația a fost actualizată!');
        } else {
          // Create new fishing location
          const { error } = await supabase
            .from('fishing_locations')
            .insert({
              name: formData.name,
              type: formData.type,
              county: normalizeCountyName(formData.county),
              region: formData.region,
              latitude: lat,
              longitude: lng,
              description: formData.description || null,
              website: formData.website || null,
              phone: formData.phone || null,
              youtube_channel: formData.youtube_channel || null,
              administrare: formData.administrare || null,
              administrare_url: formData.administrare_url || null,
            });

          if (error) throw error;
          toast.success('Locația a fost creată!');
        }
      } else if (selectedLocationType === 'shop') {
        if (selectedShop) {
          // Update existing shop
          const { error } = await supabase
            .from('fishing_shops')
            .update({
              name: formData.name,
              address: formData.address,
              city: formData.city,
              county: normalizeCountyName(formData.county),
              region: formData.region,
              latitude: lat,
              longitude: lng,
              description: formData.description || null,
              website: formData.website || null,
              phone: formData.phone || null,
              email: formData.email || null,
              opening_hours: formData.opening_hours || null,
              services: formData.services || null,
              image_url: formData.image_url || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', selectedShop.id);

          if (error) throw error;
          toast.success('Magazinul a fost actualizat!');
        } else {
          // Create new shop
          const { error } = await supabase
            .from('fishing_shops')
            .insert({
              name: formData.name,
              address: formData.address,
              city: formData.city,
              county: normalizeCountyName(formData.county),
              region: formData.region,
              latitude: lat,
              longitude: lng,
              description: formData.description || null,
              website: formData.website || null,
              phone: formData.phone || null,
              email: formData.email || null,
              opening_hours: formData.opening_hours || null,
              services: formData.services || null,
              image_url: formData.image_url || null,
            });

          if (error) throw error;
          toast.success('Magazinul a fost creat!');
        }
      } else if (selectedLocationType === 'ajvps_office') {
        if (selectedAJVPS) {
          // Update existing AJVPS office
          const { error } = await supabase
            .from('ajvps_offices')
            .update({
              name: formData.name,
              office_type: formData.office_type,
              address: formData.address,
              city: formData.city,
              county: normalizeCountyName(formData.county),
              region: formData.region,
              latitude: lat,
              longitude: lng,
              description: formData.description || null,
              website: formData.website || null,
              phone: formData.phone || null,
              email: formData.email || null,
              opening_hours: formData.opening_hours || null,
              services: formData.services || null,
              image_url: formData.image_url || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', selectedAJVPS.id);

          if (error) throw error;
          toast.success('Biroul AJVPS a fost actualizat!');
        } else {
          // Create new AJVPS office
          const { error } = await supabase
            .from('ajvps_offices')
            .insert({
              name: formData.name,
              office_type: formData.office_type,
              address: formData.address,
              city: formData.city,
              county: normalizeCountyName(formData.county),
              region: formData.region,
              latitude: lat,
              longitude: lng,
              description: formData.description || null,
              website: formData.website || null,
              phone: formData.phone || null,
              email: formData.email || null,
              opening_hours: formData.opening_hours || null,
              services: formData.services || null,
              image_url: formData.image_url || null,
            });

          if (error) throw error;
          toast.success('Biroul AJVPS a fost creat!');
        }
      } else if (selectedLocationType === 'accommodation') {
        if (selectedAccommodation) {
          // Update existing accommodation
          const { error } = await supabase
            .from('accommodations')
            .update({
              name: formData.name,
              accommodation_type: formData.accommodation_type,
              address: formData.address,
              city: formData.city,
              county: normalizeCountyName(formData.county),
              region: formData.region,
              latitude: lat,
              longitude: lng,
              description: formData.description || null,
              website: formData.website || null,
              phone: formData.phone || null,
              email: formData.email || null,
              has_fishing_pond: formData.has_fishing_pond || false,
              fishing_pond_details: formData.fishing_pond_details || null,
              fishing_location_id: formData.fishing_location_id || null,
              facilities: formData.facilities || null,
              image_url: formData.image_url || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', selectedAccommodation.id);

          if (error) throw error;
          toast.success('Cazarea a fost actualizată!');
        } else {
          // Create new accommodation
          const { error } = await supabase
            .from('accommodations')
            .insert({
              name: formData.name,
              accommodation_type: formData.accommodation_type,
              address: formData.address,
              city: formData.city,
              county: normalizeCountyName(formData.county),
              region: formData.region,
              latitude: lat,
              longitude: lng,
              description: formData.description || null,
              website: formData.website || null,
              phone: formData.phone || null,
              email: formData.email || null,
              has_fishing_pond: formData.has_fishing_pond || false,
              fishing_pond_details: formData.fishing_pond_details || null,
              fishing_location_id: formData.fishing_location_id || null,
              facilities: formData.facilities || null,
              image_url: formData.image_url || null,
            });

          if (error) throw error;
          toast.success('Cazarea a fost creată!');
        }
      }

      setIsDialogOpen(false);
      setSelectedLocation(null);
      setSelectedShop(null);
      setSelectedAJVPS(null);
      setSelectedAccommodation(null);
      setSelectedLocationType(null);
      loadLocations();
      onLocationUpdate?.();
    } catch (error: any) {
      console.error('Error saving location:', error);
      toast.error('Eroare la salvarea locației: ' + error.message);
    }
  };

  // Handle delete - unified for all location types
  const handleDelete = async () => {
    let itemName = '';
    let tableName = '';
    let itemId = '';

    if (selectedLocation) {
      itemName = selectedLocation.name;
      tableName = 'fishing_locations';
      itemId = selectedLocation.id;
    } else if (selectedShop) {
      itemName = selectedShop.name;
      tableName = 'fishing_shops';
      itemId = selectedShop.id;
    } else if (selectedAJVPS) {
      itemName = selectedAJVPS.name;
      tableName = 'ajvps_offices';
      itemId = selectedAJVPS.id;
    } else if (selectedAccommodation) {
      itemName = selectedAccommodation.name;
      tableName = 'accommodations';
      itemId = selectedAccommodation.id;
    } else {
      return;
    }

    if (!confirm(`Ești sigur că vrei să ștergi "${itemName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Item-ul a fost șters!');
      setIsDialogOpen(false);
      setSelectedLocation(null);
      setSelectedShop(null);
      setSelectedAJVPS(null);
      setSelectedAccommodation(null);
      setSelectedLocationType(null);
      loadLocations();
      onLocationUpdate?.();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast.error('Eroare la ștergere: ' + error.message);
    }
  };

  // Handle new location
  const handleNewLocation = () => {
    setSelectedLocation(null);
    setSelectedLocationType('fishing_location');
    setFormData({
      name: '',
      type: 'lac',
      county: '',
      region: 'muntenia',
      latitude: 45.9432,
      longitude: 25.0094,
      description: '',
      website: '',
      phone: '',
      youtube_channel: '',
      administrare: '',
      administrare_url: '',
    });
    setIsDialogOpen(true);
  };

  // Handle new location at specific position (from click & hold)
  const handleNewLocationAtPosition = (locationType: MapLocationType, lat: number, lng: number) => {
    setSelectedLocation(null);
    setSelectedShop(null);
    setSelectedAJVPS(null);
    setSelectedAccommodation(null);
    setSelectedLocationType(locationType);

    const baseFormData = {
      name: '',
      address: '',
      city: '',
      county: '',
      region: 'muntenia',
      latitude: lat,
      longitude: lng,
      description: '',
      website: '',
      phone: '',
      email: '',
      image_url: '',
    };

    if (locationType === 'fishing_location') {
      setFormData({
        ...baseFormData,
        type: 'lac',
        youtube_channel: '',
        administrare: '',
        administrare_url: '',
      });
    } else if (locationType === 'shop') {
      setFormData({
        ...baseFormData,
        opening_hours: '',
        services: [],
      });
    } else if (locationType === 'ajvps_office') {
      setFormData({
        ...baseFormData,
        office_type: 'ajvps',
        opening_hours: '',
        services: [],
      });
    } else if (locationType === 'accommodation') {
      setFormData({
        ...baseFormData,
        accommodation_type: 'pensiune',
        has_fishing_pond: false,
        fishing_pond_details: null,
        fishing_location_id: null,
        facilities: [],
      });
    }

    setIsDialogOpen(true);
  };

  // Save all pending updates
  const handleSaveAll = async () => {
    if (pendingUpdates.size === 0) {
      toast.info('Nu există modificări de salvat');
      return;
    }

    try {
      const updates = Array.from(pendingUpdates.entries()).map(([id, coords]) => ({
        id,
        latitude: coords.lat,
        longitude: coords.lng,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('fishing_locations')
          .update({
            latitude: update.latitude,
            longitude: update.longitude,
            updated_at: new Date().toISOString(),
          })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success(`${updates.length} locații au fost actualizate!`);
      setPendingUpdates(new Map());
      loadLocations();
      onLocationUpdate?.();
    } catch (error: any) {
      console.error('Error saving all updates:', error);
      toast.error('Eroare la salvarea modificărilor: ' + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div></div>
            <div className="flex gap-2 flex-wrap">
              {/* Location Type Filter */}
              <div className="flex flex-wrap gap-2">
                <div className="flex gap-1 border border-gray-200 rounded-lg p-1">
                  {[
                    { type: 'all' as const, label: 'Toate', color: 'bg-gray-500' },
                    { type: 'fishing_location' as const, label: 'Locații', color: 'bg-blue-500' },
                    { type: 'shop' as const, label: 'Magazine', color: 'bg-violet-500' },
                    { type: 'ajvps_office' as const, label: 'AJVPS', color: 'bg-pink-500' },
                    { type: 'accommodation' as const, label: 'Cazări', color: 'bg-orange-500' }
                  ].map(({ type, label, color }) => (
                    <button
                      key={type}
                      onClick={() => {
                        setActiveLocationType(type);
                        // Keep filters visible when switching types
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${activeLocationType === type
                        ? `${color} text-white`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {(activeLocationType === 'fishing_location' || activeLocationType === 'river' || activeLocationType === 'lake' || activeLocationType === 'balti_salbatic' || activeLocationType === 'private_pond') && (
                  <div className="flex gap-1 border border-gray-200 rounded-lg p-1">
                    {[
                      { type: 'river' as const, label: 'Ape curgătoare', color: 'bg-emerald-500' },
                      { type: 'lake' as const, label: 'Lacuri', color: 'bg-blue-500' },
                      { type: 'balti_salbatic' as const, label: 'Bălți Sălbatice', color: 'bg-red-500' },
                      { type: 'private_pond' as const, label: 'Bălți Private', color: 'bg-purple-500' }
                    ].map(({ type, label, color }) => (
                      <button
                        key={type}
                        onClick={() => setActiveLocationType(type as any)}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${(activeLocationType as string) === type
                          ? `${color} text-white`
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant={isEditMode ? 'default' : 'outline'}
                onClick={() => setIsEditMode(!isEditMode)}
                size="sm"
                className="px-3 py-1.5"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                <span className="text-xs font-medium">{isEditMode ? 'Oprește Editarea' : 'Activează Editarea'}</span>
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleNewLocation} size="sm" className="px-3 py-1.5">
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="text-xs font-medium">Adaugă Locație</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4">
                  <DialogHeader className="pb-2">
                    <DialogTitle>
                      {selectedLocationType === 'fishing_location' && (selectedLocation ? 'Editează Locație de Pescuit' : 'Adaugă Locație de Pescuit Nouă')}
                      {selectedLocationType === 'shop' && (selectedShop ? 'Editează Magazin' : 'Adaugă Magazin Nou')}
                      {selectedLocationType === 'ajvps_office' && (selectedAJVPS ? 'Editează Birou AJVPS' : 'Adaugă Birou AJVPS Nou')}
                      {selectedLocationType === 'accommodation' && (selectedAccommodation ? 'Editează Cazare' : 'Adaugă Cazare Nouă')}
                    </DialogTitle>
                    <DialogDescription>
                      {(selectedLocation || selectedShop || selectedAJVPS || selectedAccommodation)
                        ? 'Modifică detaliile'
                        : 'Completează informațiile'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nume *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      {selectedLocationType === 'fishing_location' && (
                        <div>
                          <Label htmlFor="type">Tip *</Label>
                          <Select
                            value={formData.type}
                            onValueChange={(value) => setFormData({ ...formData, type: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lac">Lac</SelectItem>
                              <SelectItem value="rau">Râu</SelectItem>
                              <SelectItem value="fluviu">Fluviu</SelectItem>
                              <SelectItem value="balti_private">Bălți Private</SelectItem>
                              <SelectItem value="balti_salbatic">Bălți Sălbatice</SelectItem>
                              <SelectItem value="delta">Delta</SelectItem>
                              <SelectItem value="mare">Mare</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {selectedLocationType === 'shop' && (
                        <div>
                          <Label htmlFor="opening_hours">Program</Label>
                          <Input
                            id="opening_hours"
                            value={formData.opening_hours || ''}
                            onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
                            placeholder="L-V: 9:00-18:00"
                          />
                        </div>
                      )}
                      {selectedLocationType === 'ajvps_office' && (
                        <div>
                          <Label htmlFor="office_type">Tip Birou *</Label>
                          <Select
                            value={formData.office_type}
                            onValueChange={(value) => setFormData({ ...formData, office_type: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ajvps">AJVPS</SelectItem>
                              <SelectItem value="primarie">Primărie</SelectItem>
                              <SelectItem value="agentie">Agenție</SelectItem>
                              <SelectItem value="institutie">Instituție</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {selectedLocationType === 'accommodation' && (
                        <div>
                          <Label htmlFor="accommodation_type">Tip Cazare *</Label>
                          <Select
                            value={formData.accommodation_type}
                            onValueChange={(value) => setFormData({ ...formData, accommodation_type: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pensiune">Pensiune</SelectItem>
                              <SelectItem value="complex">Complex</SelectItem>
                              <SelectItem value="cazare">Cazare</SelectItem>
                              <SelectItem value="hotel">Hotel</SelectItem>
                              <SelectItem value="vila">Vilă</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* Address fields for shops, AJVPS, accommodations */}
                    {(selectedLocationType === 'shop' || selectedLocationType === 'ajvps_office' || selectedLocationType === 'accommodation') && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="address">Adresă *</Label>
                          <Input
                            id="address"
                            value={formData.address || ''}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            required
                            placeholder="Strada, număr"
                          />
                        </div>
                        <div>
                          <Label htmlFor="city">Oraș *</Label>
                          <Input
                            id="city"
                            value={formData.city || ''}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            required
                            placeholder="Numele orașului"
                          />
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="county">Județ *</Label>
                        <SearchableSelect
                          options={counties.map(c => ({ value: c.name, label: c.name }))}
                          value={formData.county}
                          onChange={(value) => setFormData({ ...formData, county: value })}
                          placeholder="Selectează județul"
                          searchPlaceholder="Caută județ..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="region">Regiune *</Label>
                        <Select
                          value={formData.region}
                          onValueChange={(value) => setFormData({ ...formData, region: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="muntenia">Muntenia</SelectItem>
                            <SelectItem value="moldova">Moldova</SelectItem>
                            <SelectItem value="oltenia">Oltenia</SelectItem>
                            <SelectItem value="transilvania">Transilvania</SelectItem>
                            <SelectItem value="banat">Banat</SelectItem>
                            <SelectItem value="crisana">Crișana</SelectItem>
                            <SelectItem value="maramures">Maramureș</SelectItem>
                            <SelectItem value="dobrogea">Dobrogea</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="latitude">Latitudine *</Label>
                        <div className="flex gap-2">
                          <Input
                            id="latitude"
                            type="number"
                            step="any"
                            value={formData.latitude}
                            onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                            required
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              if (mapInstanceRef.current && selectedLocation) {
                                const center = mapInstanceRef.current.getCenter();
                                setFormData({
                                  ...formData,
                                  latitude: center.lat,
                                  longitude: center.lng,
                                });
                              }
                            }}
                            title="Folosește centrul hărții"
                          >
                            <MapPin className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="longitude">Longitudine *</Label>
                        <div className="flex gap-2">
                          <Input
                            id="longitude"
                            type="number"
                            step="any"
                            value={formData.longitude}
                            onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                            required
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              // Google Maps uses lat,lng format (not lng,lat like MapLibre)
                              const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${formData.latitude},${formData.longitude}`;
                              window.open(googleMapsUrl, '_blank');
                            }}
                            title="Deschide în Google Maps"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800 mb-2">
                        <strong>Tip:</strong> Poți modifica coordonatele manual sau folosi butonul <MapPin className="w-3 h-3 inline" /> pentru a folosi centrul hărții.
                        Butonul <ExternalLink className="w-3 h-3 inline" /> deschide locația în Google Maps.
                      </p>
                      <div className="mt-2">
                        <Label htmlFor="google_maps_link" className="text-xs font-semibold">Importă din Google Maps</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            id="google_maps_link"
                            type="url"
                            placeholder="https://maps.app.goo.gl/..."
                            className="flex-1 text-sm"
                            onBlur={async (e) => {
                              const url = e.target.value.trim();
                              if (!url) return;

                              // Check if it's a Google Maps URL
                              if (!url.includes('google.com/maps') && !url.includes('goo.gl') && !url.includes('maps.app.goo.gl')) {
                                return;
                              }

                              setIsLoadingGoogleMaps(true);
                              try {
                                const { importLocationFromGoogleMaps } = await import('@/services/googleMapsImport');
                                const locationData = await importLocationFromGoogleMaps(url);

                                if (locationData) {
                                  setFormData(prev => ({
                                    ...prev,
                                    name: locationData.name || prev.name,
                                    latitude: locationData.latitude || prev.latitude,
                                    longitude: locationData.longitude || prev.longitude,
                                    county: normalizeCountyName(locationData.county || prev.county),
                                    region: (locationData.region as any) || prev.region,
                                    website: locationData.website || prev.website,
                                    phone: locationData.phone || prev.phone,
                                  }));

                                  // Center map on location
                                  if (mapInstanceRef.current && locationData.latitude && locationData.longitude) {
                                    mapInstanceRef.current.flyTo({
                                      center: [locationData.longitude, locationData.latitude],
                                      zoom: 14,
                                      duration: 1000,
                                    });
                                  }

                                  toast.success('Locația a fost importată cu succes!');
                                  e.target.value = ''; // Clear input
                                }
                              } catch (error: any) {
                                console.error('Error importing from Google Maps:', error);
                                toast.error('Eroare la importarea locației: ' + (error.message || 'Necunoscută'));
                              } finally {
                                setIsLoadingGoogleMaps(false);
                              }
                            }}
                            disabled={isLoadingGoogleMaps}
                          />
                          {isLoadingGoogleMaps && (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          )}
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                          Lipește link-ul Google Maps și apasă Tab sau click în afara câmpului pentru a importa automat
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="description">Descriere</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          placeholder="https://example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Telefon</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+40 123 456 789"
                        />
                      </div>
                    </div>
                    {/* Fishing location specific fields */}
                    {selectedLocationType === 'fishing_location' && (
                      <>
                        <div>
                          <Label htmlFor="youtube_channel">Canal YouTube</Label>
                          <Input
                            id="youtube_channel"
                            type="url"
                            value={formData.youtube_channel || ''}
                            onChange={(e) => setFormData({ ...formData, youtube_channel: e.target.value })}
                            placeholder="https://youtube.com/@channel"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="administrare">Administrat de</Label>
                            <Input
                              id="administrare"
                              value={formData.administrare || ''}
                              onChange={(e) => setFormData({ ...formData, administrare: e.target.value })}
                              placeholder="Numele entității"
                            />
                          </div>
                          <div>
                            <Label htmlFor="administrare_url">Link Administrat de</Label>
                            <Input
                              id="administrare_url"
                              type="url"
                              value={formData.administrare_url || ''}
                              onChange={(e) => setFormData({ ...formData, administrare_url: e.target.value })}
                              placeholder="https://example.com"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Email field for shops, AJVPS, accommodations */}
                    {(selectedLocationType === 'shop' || selectedLocationType === 'ajvps_office' || selectedLocationType === 'accommodation') && (
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="contact@example.com"
                        />
                      </div>
                    )}

                    {/* Opening hours for AJVPS */}
                    {selectedLocationType === 'ajvps_office' && (
                      <div>
                        <Label htmlFor="opening_hours_ajvps">Program</Label>
                        <Input
                          id="opening_hours_ajvps"
                          value={formData.opening_hours || ''}
                          onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
                          placeholder="L-V: 8:00-16:00"
                        />
                      </div>
                    )}

                    {/* Shop specific - fishing location selector (note: field doesn't exist in DB yet) */}
                    {selectedLocationType === 'shop' && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800 mb-2">
                          <strong>Notă:</strong> Câmpul pentru asocierea cu o locație de pescuit nu există încă în baza de date pentru magazine.
                          Pentru a-l activa, trebuie adăugat câmpul <code className="bg-yellow-100 px-1 rounded">fishing_location_id</code> în tabelul <code className="bg-yellow-100 px-1 rounded">fishing_shops</code>.
                        </p>
                      </div>
                    )}

                    {/* Services for shops and AJVPS */}
                    {(selectedLocationType === 'shop' || selectedLocationType === 'ajvps_office') && (
                      <div>
                        <Label htmlFor="services">Servicii (separate prin virgulă)</Label>
                        <Input
                          id="services"
                          value={Array.isArray(formData.services) ? formData.services.join(', ') : (formData.services || '')}
                          onChange={(e) => {
                            const services = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                            setFormData({ ...formData, services });
                          }}
                          placeholder="vanzare_echipamente, reparatii, cursuri"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedLocationType === 'shop' && 'Ex: vanzare_echipamente, reparatii, cursuri, chirii, ghidaj'}
                          {selectedLocationType === 'ajvps_office' && 'Ex: permise_pescuit, informatii, consultanta, recomandari'}
                        </p>
                      </div>
                    )}

                    {/* Accommodation specific fields */}
                    {selectedLocationType === 'accommodation' && (
                      <>
                        <div>
                          <Label htmlFor="accommodation_fishing_location">Locație de pescuit asociată (opțional)</Label>
                          <Select
                            value={formData.fishing_location_id || 'none'}
                            onValueChange={(value) => setFormData({ ...formData, fishing_location_id: value === 'none' ? null : value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selectează o locație de pescuit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Niciuna</SelectItem>
                              {locations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.id}>
                                  {loc.name} ({loc.county})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">
                            Selectează o locație de pescuit dacă cazarea este lângă sau are acces la aceasta
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="has_fishing_pond"
                            checked={formData.has_fishing_pond || false}
                            onChange={(e) => setFormData({ ...formData, has_fishing_pond: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="has_fishing_pond" className="cursor-pointer">
                            Are baltă de pescuit proprie
                          </Label>
                        </div>
                        <div>
                          <Label htmlFor="facilities">Facilități (bifează toate care se aplică)</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {[
                              { value: 'cazare', label: 'Cazare' },
                              { value: 'restaurant', label: 'Restaurant' },
                              { value: 'parcare', label: 'Parcare' },
                              { value: 'baltă_pescuit', label: 'Baltă de pescuit' },
                              { value: 'chirie_barcă', label: 'Chirie barcă' },
                              { value: 'wc', label: 'WC' },
                              { value: 'duș', label: 'Duș' },
                              { value: 'wifi', label: 'WiFi' },
                              { value: 'tv', label: 'TV' },
                              { value: 'aer_condiționat', label: 'Aer condiționat' },
                              { value: 'încălzire', label: 'Încălzire' },
                              { value: 'bucătărie', label: 'Bucătărie' },
                            ].map((facility) => (
                              <div key={facility.value} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`facility_${facility.value}`}
                                  checked={Array.isArray(formData.facilities) && formData.facilities.includes(facility.value)}
                                  onChange={(e) => {
                                    const currentFacilities = Array.isArray(formData.facilities) ? formData.facilities : [];
                                    if (e.target.checked) {
                                      setFormData({ ...formData, facilities: [...currentFacilities, facility.value] });
                                    } else {
                                      setFormData({ ...formData, facilities: currentFacilities.filter(f => f !== facility.value) });
                                    }
                                  }}
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`facility_${facility.value}`} className="cursor-pointer text-sm">
                                  {facility.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      {(selectedLocation || selectedShop || selectedAJVPS || selectedAccommodation) && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleDelete}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Șterge
                        </Button>
                      )}
                      <div className="flex gap-2 ml-auto">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Anulează
                        </Button>
                        <Button type="submit">
                          <Save className="w-4 h-4 mr-2" />
                          Salvează
                        </Button>
                      </div>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pendingUpdates.size > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
              <span className="text-sm text-yellow-800">
                {pendingUpdates.size} modificări ne salvate
              </span>
              <Button size="sm" onClick={handleSaveAll}>
                <Save className="w-4 h-4 mr-2" />
                Salvează Toate
              </Button>
            </div>
          )}
          <div className="relative">
            <div
              ref={mapContainerRef}
              className="w-full h-[400px] sm:h-[500px] md:h-[600px] rounded-lg border border-gray-200"
              style={{
                willChange: 'transform',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
              }}
            />
            {/* Hover tooltip */}
            {hoverTooltip && (
              <div
                className="fixed z-[9999] pointer-events-none bg-gray-900 text-white px-3 py-1.5 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap"
                style={{
                  left: `${hoverTooltip.x}px`,
                  top: `${hoverTooltip.y - 10}px`,
                  transform: 'translate(-50%, -100%)',
                  willChange: 'transform',
                  marginTop: '-8px',
                }}
              >
                <div className="font-semibold">{hoverTooltip.name}</div>
                <div className="text-xs text-gray-300">{hoverTooltip.county}</div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Se încarcă harta...</p>
                </div>
              </div>
            )}

            {/* Location selection menu on map click */}
            {showLocationMenu && mapClickPosition && (
              <LocationSelectMenu
                locations={locations}
                mapClickPosition={mapClickPosition}
                onSelect={(locationId) => {
                  handleMoveLocationToClick(locationId, mapClickPosition.lat, mapClickPosition.lng);
                  setShowLocationMenu(false);
                  setMapClickPosition(null);
                }}
                onNewLocation={(locationType) => {
                  handleNewLocationAtPosition(locationType, mapClickPosition.lat, mapClickPosition.lng);
                  setShowLocationMenu(false);
                  setMapClickPosition(null);
                }}
                onClose={() => {
                  setShowLocationMenu(false);
                  setMapClickPosition(null);
                }}
              />
            )}

            {/* Map Style Selector - Bottom Left, icon only, hover for options */}
            <div className="absolute bottom-4 left-4 z-10">
              <div className="relative group">
                <button
                  className="bg-white hover:bg-gray-50 text-gray-700 p-2.5 rounded-lg shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl w-10 h-10 flex items-center justify-center"
                  title="Schimbă stilul hărții"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                  </svg>
                </button>
                <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden min-w-[120px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
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
              </div>
            </div>
          </div>
          {isEditMode && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Mod Editare Activ:</strong> Poți muta markerii pe hartă pentru a actualiza coordonatele.
                Coordonatele se salvează automat când termini de mutat un marker.
              </p>
              <p className="text-sm text-blue-800 mt-2">
                <strong>Click & Hold:</strong> Ține apăsat 500ms pe hartă (în loc gol) pentru a crea o locație nouă sau a muta o locație existentă.
              </p>
            </div>
          )}
          {isHolding && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[9998] rounded-lg">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
                <p className="text-sm font-medium">Ține apăsat pentru a crea/muta locația...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

