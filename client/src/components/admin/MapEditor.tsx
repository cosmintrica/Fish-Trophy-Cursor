import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { DatabaseFishingLocation } from '@/services/fishingLocations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        <h3 className="font-semibold text-sm">Selectează locație</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
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
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [locations, setLocations] = useState<DatabaseFishingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<DatabaseFishingLocation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draggedMarkerId, setDraggedMarkerId] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, { lat: number; lng: number }>>(new Map());
  const [hoverTooltip, setHoverTooltip] = useState<{ id: string; name: string; county: string; x: number; y: number } | null>(null);
  const [mapClickPosition, setMapClickPosition] = useState<{ lat: number; lng: number; x: number; y: number } | null>(null);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [mapClickHoldTimer, setMapClickHoldTimer] = useState<NodeJS.Timeout | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const tempMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);
  const [isLoadingGoogleMaps, setIsLoadingGoogleMaps] = useState(false);
  const [counties, setCounties] = useState<{ id: string; name: string }[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'lac' as DatabaseFishingLocation['type'],
    county: '',
    region: 'muntenia' as DatabaseFishingLocation['region'],
    latitude: 0,
    longitude: 0,
    description: '',
    website: '',
    phone: '',
    youtube_channel: '',
    administrare: '',
    administrare_url: '',
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

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
      center: [25.0094, 45.9432] as [number, number],
      zoom: 6,
      minZoom: 3,
      maxZoom: 18,
      // GPU acceleration optimizations
      fadeDuration: 0,
      refreshExpiredTiles: false,
    };

    const map = new maplibregl.Map(mapConfig);
    mapInstanceRef.current = map;

    // Enable GPU acceleration
    if (map.getCanvas()) {
      const canvas = map.getCanvas();
      canvas.style.willChange = 'transform';
      canvas.style.transform = 'translateZ(0)';
    }

    map.on('load', () => {
      loadLocations();
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle map click & hold for smart location placement - separate effect that depends on isEditMode
  useEffect(() => {
    if (!mapInstanceRef.current || !isEditMode) return;

    const map = mapInstanceRef.current;
    let holdTimer: NodeJS.Timeout | null = null;
    let holdingIndicatorTimer: NodeJS.Timeout | null = null;
    let mouseDownTime = 0;
    let mouseDownPosition: { x: number; y: number } | null = null;
    let hasMoved = false;
    
    const handleMouseDown = (e: maplibregl.MapMouseEvent) => {
      // Prevent if clicking on a marker element
      const clickedElement = (e.originalEvent.target as HTMLElement)?.closest('.location-marker-editor');
      if (clickedElement) return;
      
      // Prevent if clicking on dialog or menu
      const clickedDialog = (e.originalEvent.target as HTMLElement)?.closest('[role="dialog"]');
      if (clickedDialog) return;
      
      mouseDownTime = Date.now();
      mouseDownPosition = { x: e.point.x, y: e.point.y };
      hasMoved = false;
      
      // Show holding indicator only after 300ms to avoid flickering
      holdingIndicatorTimer = setTimeout(() => {
        if (!hasMoved) {
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
        if (!hasMoved && isEditMode) {
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
          // Remove temp marker if moved
          if (tempMarkerRef.current) {
            tempMarkerRef.current.remove();
            tempMarkerRef.current = null;
          }
        }
        setIsHolding(false);
      }, 500); // 500ms hold
    };

    const handleMouseUp = () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      if (holdingIndicatorTimer) {
        clearTimeout(holdingIndicatorTimer);
        holdingIndicatorTimer = null;
      }
      setIsHolding(false);
      hasMoved = false;
      mouseDownPosition = null;
      
      // Remove temp marker if it exists
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
    };

    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      // Check if mouse has moved significantly (more than 5px)
      if (mouseDownPosition) {
        const moveDistance = Math.sqrt(
          Math.pow(e.point.x - mouseDownPosition.x, 2) + 
          Math.pow(e.point.y - mouseDownPosition.y, 2)
        );
        
        if (moveDistance > 5) {
          hasMoved = true;
          if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
          }
          if (holdingIndicatorTimer) {
            clearTimeout(holdingIndicatorTimer);
            holdingIndicatorTimer = null;
          }
          setIsHolding(false);
          
          // Remove temp marker if moved
          if (tempMarkerRef.current) {
            tempMarkerRef.current.remove();
            tempMarkerRef.current = null;
          }
        }
      }
    };

    const handleMouseLeave = () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      if (holdingIndicatorTimer) {
        clearTimeout(holdingIndicatorTimer);
        holdingIndicatorTimer = null;
      }
      setIsHolding(false);
      hasMoved = false;
      mouseDownPosition = null;
      
      // Remove temp marker if it exists
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
    };

    map.on('mousedown', handleMouseDown);
    map.on('mouseup', handleMouseUp);
    map.on('mousemove', handleMouseMove);
    map.on('mouseleave', handleMouseLeave);

    return () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
      }
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
      map.off('mousedown', handleMouseDown);
      map.off('mouseup', handleMouseUp);
      map.off('mousemove', handleMouseMove);
      map.off('mouseleave', handleMouseLeave);
    };
  }, [isEditMode]);

  // Map county codes to full names (for backward compatibility)
  const countyCodeMap: Record<string, string> = {
    'DJ': 'Dolj',
    'OT': 'Olt',
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

  // Load locations from database
  const loadLocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fishing_locations')
        .select('*')
        .order('name');

      if (error) throw error;

      // Normalize county names (convert codes to full names)
      const normalizedData = (data || []).map(loc => ({
        ...loc,
        county: normalizeCountyName(loc.county),
      }));

      setLocations(normalizedData);
      if (mapInstanceRef.current) {
        addMarkersToMap(normalizedData);
      }
    } catch (error: any) {
      console.error('Error loading locations:', error);
      toast.error('Eroare la încărcarea locațiilor: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add markers to map
  const addMarkersToMap = (locationsData: DatabaseFishingLocation[]) => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    locationsData.forEach((location) => {
      const lat = Number(location.latitude);
      const lng = Number(location.longitude);

      if (isNaN(lat) || isNaN(lng)) return;

      // Create marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'location-marker-editor';
      markerEl.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          background: ${isEditMode ? '#3B82F6' : '#10B981'};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: ${isEditMode ? 'move' : 'pointer'};
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          outline: none;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      `;

      // Create marker
      const marker = new maplibregl.Marker({
        element: markerEl,
        draggable: isEditMode,
      })
        .setLngLat([lng, lat])
        .addTo(mapInstanceRef.current!);

      // Hover tooltip - show in both modes, but hide during drag
      markerEl.addEventListener('mouseenter', (e) => {
        if (!isDraggingMarker) {
          const rect = markerEl.getBoundingClientRect();
          setHoverTooltip({
            id: location.id,
            name: location.name,
            county: location.county,
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
          });
        }
      });

      markerEl.addEventListener('mouseleave', () => {
        if (!isDraggingMarker) {
          setHoverTooltip(null);
        }
      });

      // Click handler - only open dialog if not in edit mode
      markerEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isEditMode) {
          handleLocationClick(location);
        }
      });

      // Drag handlers
      if (isEditMode) {
        marker.on('dragstart', () => {
          setIsDraggingMarker(true);
          setDraggedMarkerId(location.id);
          markerEl.style.opacity = '0.6';
          setHoverTooltip(null); // Hide hover tooltip when dragging
        });

        marker.on('drag', (e) => {
          const lngLat = marker.getLngLat();
          setPendingUpdates(prev => {
            const newMap = new Map(prev);
            newMap.set(location.id, { lat: lngLat.lat, lng: lngLat.lng });
            return newMap;
          });
        });

        marker.on('dragend', () => {
          setIsDraggingMarker(false);
          setDraggedMarkerId(null);
          markerEl.style.opacity = '1';
          const lngLat = marker.getLngLat();
          handleLocationDragEnd(location.id, lngLat.lat, lngLat.lng);
        });
      }

      markersRef.current.set(location.id, marker);
    });
  };

  // Load counties on mount
  useEffect(() => {
    loadCounties();
  }, []);

  // Update markers when edit mode or locations change
  useEffect(() => {
    if (mapInstanceRef.current && locations.length > 0) {
      addMarkersToMap(locations);
    }
  }, [isEditMode, locations.length]);

  // Handle location click
  const handleLocationClick = (location: DatabaseFishingLocation) => {
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

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (selectedLocation) {
        // Update existing location
        const { error } = await supabase
          .from('fishing_locations')
          .update({
            name: formData.name,
            type: formData.type,
            county: normalizeCountyName(formData.county),
            region: formData.region,
            latitude: Number(formData.latitude),
            longitude: Number(formData.longitude),
            description: formData.description,
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
        // Create new location
        const { error } = await supabase
          .from('fishing_locations')
          .insert({
            name: formData.name,
            type: formData.type,
            county: normalizeCountyName(formData.county),
            region: formData.region,
            latitude: Number(formData.latitude),
            longitude: Number(formData.longitude),
            description: formData.description,
            website: formData.website || null,
            phone: formData.phone || null,
            youtube_channel: formData.youtube_channel || null,
            administrare: formData.administrare || null,
            administrare_url: formData.administrare_url || null,
          });

        if (error) throw error;

        toast.success('Locația a fost creată!');
      }

      setIsDialogOpen(false);
      setSelectedLocation(null);
      loadLocations();
      onLocationUpdate?.();
    } catch (error: any) {
      console.error('Error saving location:', error);
      toast.error('Eroare la salvarea locației: ' + error.message);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedLocation) return;

    if (!confirm(`Ești sigur că vrei să ștergi locația "${selectedLocation.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('fishing_locations')
        .delete()
        .eq('id', selectedLocation.id);

      if (error) throw error;

      toast.success('Locația a fost ștearsă!');
      setIsDialogOpen(false);
      setSelectedLocation(null);
      loadLocations();
      onLocationUpdate?.();
    } catch (error: any) {
      console.error('Error deleting location:', error);
      toast.error('Eroare la ștergerea locației: ' + error.message);
    }
  };

  // Handle new location
  const handleNewLocation = () => {
    setSelectedLocation(null);
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Editor Locații
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={isEditMode ? 'default' : 'outline'}
                onClick={() => setIsEditMode(!isEditMode)}
                size="sm"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {isEditMode ? 'Oprește Editarea' : 'Activează Editarea'}
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleNewLocation} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Adaugă Locație
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedLocation ? 'Editează Locație' : 'Adaugă Locație Nouă'}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedLocation
                        ? 'Modifică detaliile locației'
                        : 'Completează informațiile pentru noua locație'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
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
                    </div>
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
                    <div>
                      <Label htmlFor="youtube_channel">Canal YouTube</Label>
                      <Input
                        id="youtube_channel"
                        type="url"
                        value={formData.youtube_channel}
                        onChange={(e) => setFormData({ ...formData, youtube_channel: e.target.value })}
                        placeholder="https://youtube.com/@channel"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="administrare">Administrat de</Label>
                        <Input
                          id="administrare"
                          value={formData.administrare}
                          onChange={(e) => setFormData({ ...formData, administrare: e.target.value })}
                          placeholder="Numele entității"
                        />
                      </div>
                      <div>
                        <Label htmlFor="administrare_url">Link Administrat de</Label>
                        <Input
                          id="administrare_url"
                          type="url"
                          value={formData.administrare_url}
                          onChange={(e) => setFormData({ ...formData, administrare_url: e.target.value })}
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      {selectedLocation && (
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
              className="w-full h-[600px] rounded-lg border border-gray-200"
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
                  top: `${hoverTooltip.y}px`,
                  transform: 'translate(-50%, -100%)',
                  willChange: 'transform',
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
                onClose={() => {
                  setShowLocationMenu(false);
                  setMapClickPosition(null);
                }}
              />
            )}
          </div>
          {isEditMode && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Mod Editare Activ:</strong> Poți muta markerii pe hartă pentru a actualiza coordonatele.
                Coordonatele se salvează automat când termini de mutat un marker.
              </p>
              <p className="text-sm text-blue-800 mt-2">
                <strong>Click & Hold:</strong> Ține apăsat 500ms pe hartă (în loc gol) pentru a muta o locație existentă.
              </p>
            </div>
          )}
          {isHolding && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[9998] rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
                <p className="text-sm font-medium">Ține apăsat pentru a muta locația...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

