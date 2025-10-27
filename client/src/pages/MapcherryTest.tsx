import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Navigation, Search, X } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import type { Geometry, GeometryCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import SEOHead from '@/components/SEOHead';

// Mapcherry configuration
const MAPCHERRY_CONFIG = {
  mapToken: '0004a01ba144c2917782fd536f245345',
  username: 'cosmintrica',
  datasetKey: 'abp-ct-all'
};

// Mobile-specific CSS optimizations
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

  /* Customize popup close button */
  .maplibregl-popup-close-button {
    width: 24px !important;
    height: 24px !important;
    font-size: 20px !important;
    line-height: 24px !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    color: #666 !important;
    opacity: 1 !important;
    background: transparent !important;
    border: none !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
  }

  .maplibregl-popup-close-button:hover {
    color: #000 !important;
    background: rgba(0, 0, 0, 0.05) !important;
  }

  .maplibregl-popup-close-button:active {
    background: rgba(0, 0, 0, 0.1) !important;
  }
`;

export default function MapcherryTest() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const currentPopup = useRef<maplibregl.Popup | null>(null);
  const previousSelectedId = useRef<string | number | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  type MapFeature = maplibregl.MapGeoJSONFeature;

  interface SearchResult {
    feature: MapFeature;
    geometry?: Geometry;
    properties: Record<string, unknown>;
    sourceLayer?: string;
    id?: string | number;
    score: number;
  }

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [, setUserLocation] = useState<[number, number] | null>(null);
  const [userMarker, setUserMarker] = useState<maplibregl.Marker | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<MapFeature | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | number | null>(null);

  // Helper function to close previous popup and clear previous selection
  const closePreviousPopupAndClearSelection = () => {
    // Close current popup
    if (currentPopup.current) {
      currentPopup.current.remove();
      currentPopup.current = null;
    }

    // Clear previous selection state
    if (previousSelectedId.current !== null && map.current) {
      try {
        map.current.removeFeatureState(
          { source: 'abp-locuri', sourceLayer: 'locuri', id: previousSelectedId.current },
          'selected'
        );
      } catch (error) {
        console.error('Error clearing feature state:', error);
      }
      previousSelectedId.current = null;
    }
  };

  const sanitizeValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).replace(/[&<>"']/g, (char) => {
      switch (char) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case '\'':
          return '&#39;';
        default:
          return char;
      }
    });
  };

  const toLngLatTuple = (lngLatLike: maplibregl.LngLatLike): [number, number] => {
    const lngLat = maplibregl.LngLat.convert(lngLatLike);
    return [lngLat.lng, lngLat.lat];
  };

  const getFeatureId = (feature: MapFeature | null | undefined, fallback?: string | number | null): string | number | null => {
    if (!feature) {
      return fallback ?? null;
    }
    if (feature.id !== undefined && feature.id !== null) {
      return feature.id as string | number;
    }
    const rawId = (feature.properties as Record<string, unknown> | undefined)?.id;
    if (typeof rawId === 'string' || typeof rawId === 'number') {
      return rawId;
    }
    return fallback ?? null;
  };

  const flattenPositions = (coords: unknown): [number, number][] => {
    if (!Array.isArray(coords)) {
      return [];
    }

    if (coords.length === 0) {
      return [];
    }

    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      return [[coords[0] as number, coords[1] as number]];
    }

    let result: [number, number][] = [];
    for (const item of coords as unknown[]) {
      result = result.concat(flattenPositions(item));
    }
    return result;
  };

  const deriveGeometryFromFeature = (feature: MapFeature): Geometry | undefined => {
    const directGeometry = feature.geometry as Geometry | undefined;
    if (directGeometry && 'type' in directGeometry) {
      return directGeometry;
    }

    const maybeVector = feature as unknown as { toGeoJSON?: () => { geometry?: Geometry } };
    if (typeof maybeVector.toGeoJSON === 'function') {
      try {
        const geojson = maybeVector.toGeoJSON();
        if (geojson?.geometry) {
          return geojson.geometry as Geometry;
        }
      } catch (error) {
        console.warn('Unable to derive geometry via toGeoJSON', error);
      }
    }

    return undefined;
  };

  const computeGeometryInfo = (geometry?: Geometry | null) => {
    if (!geometry) {
      return null;
    }

    if (geometry.type === 'GeometryCollection') {
      const collection = geometry as GeometryCollection;
      const coords = collection.geometries.flatMap((geom) => {
        if (!geom) return [];
        if ('coordinates' in geom) {
          return flattenPositions((geom as unknown as { coordinates: unknown }).coordinates);
        }
        return [];
      });

      if (!coords.length) {
        return null;
      }

      const bounds = coords.reduce(
        (acc, coord) => acc.extend(coord),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      const [sumLng, sumLat] = coords.reduce(
        (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat],
        [0, 0]
      );
      const center: [number, number] = [sumLng / coords.length, sumLat / coords.length];

      return { center, bounds, type: geometry.type as Geometry['type'] };
    }

    if (!('coordinates' in geometry)) {
      return null;
    }

    const coords = flattenPositions((geometry as unknown as { coordinates: unknown }).coordinates);
    if (!coords.length) {
      return null;
    }

    const bounds = coords.reduce(
      (acc, coord) => acc.extend(coord),
      new maplibregl.LngLatBounds(coords[0], coords[0])
    );

    const [sumLng, sumLat] = coords.reduce(
      (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat],
      [0, 0]
    );

    const center: [number, number] = [sumLng / coords.length, sumLat / coords.length];

    return {
      center,
      bounds,
      type: geometry.type
    };
  };

  const scheduleFeatureHighlight = (featureId: string | number | null) => {
    if (featureId === null || !map.current) {
      return;
    }

    const apply = (attempt = 0) => {
      if (!map.current) {
        return;
      }

      try {
        map.current.setFeatureState(
          { source: 'abp-locuri', sourceLayer: 'locuri', id: featureId },
          { selected: true }
        );
        previousSelectedId.current = featureId;
      } catch (error) {
        if (attempt < 3) {
          map.current.once('idle', () => apply(attempt + 1));
        } else {
          console.warn('Unable to highlight feature', { featureId, error });
        }
      }
    };

    apply();
  };

  const focusCameraOnGeometry = (params: {
    center: [number, number];
    geometryInfo: ReturnType<typeof computeGeometryInfo>;
    isPoint: boolean;
    zoom?: number;
    padding?: number;
  }) => {
    if (!map.current) {
      return;
    }

    const { center, geometryInfo, isPoint, zoom, padding } = params;
    const duration = 1200;

    if (!isPoint && geometryInfo?.bounds && !geometryInfo.bounds.isEmpty()) {
      map.current.fitBounds(geometryInfo.bounds, {
        padding: padding ?? 80,
        duration,
        maxZoom: Math.max(zoom ?? 14, 14)
      });
    } else {
      map.current.flyTo({
        center,
        zoom: zoom ?? 14,
        duration,
        essential: true
      });
    }
  };

  const buildNormalizedPropertyMap = (properties: Record<string, unknown>) => {
    const normalized = new Map<string, unknown>();
    Object.entries(properties || {}).forEach(([key, value]) => {
      normalized.set(key.toLowerCase(), value);
    });
    return normalized;
  };

  const getFromPropertyMap = (propertyMap: Map<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const value = propertyMap.get(key.toLowerCase());
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }
    return null;
  };

  const parseBoolean = (value: unknown): boolean | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'da', 'yes', 'y'].includes(normalized)) return true;
      if (['false', '0', 'nu', 'no', 'n'].includes(normalized)) return false;
    }
    return null;
  };

  const buildPopupContent = (
    feature: MapFeature,
    center: [number, number],
    geometryType?: Geometry['type']
  ) => {
    const properties = (feature.properties || {}) as Record<string, unknown>;
    const normalized = buildNormalizedPropertyMap(properties);

    const rawName =
      getFromPropertyMap(normalized, ['nume', 'name', 'denumire', 'title']) ?? 'Locație de pescuit';
    const typeValue = String(
      getFromPropertyMap(normalized, ['tip', 'type', 'categorie']) ?? 'necunoscut'
    ).toLowerCase();

    const visuals = (() => {
      switch (typeValue) {
        case 'magazin':
          return {
            titlePrefix: 'Magazin',
            accentClass: 'text-orange-600',
            badgeClass: 'bg-orange-100 text-orange-800'
          };
        case 'balta':
          return {
            titlePrefix: 'Baltă',
            accentClass: 'text-blue-600',
            badgeClass: 'bg-blue-100 text-blue-800'
          };
        case 'apa':
          return {
            titlePrefix: 'Apă',
            accentClass: 'text-blue-600',
            badgeClass: 'bg-sky-100 text-sky-800'
          };
        default:
          return {
            titlePrefix: 'Locație',
            accentClass: 'text-blue-600',
            badgeClass: 'bg-gray-100 text-gray-800'
          };
      }
    })();

    const administrator = getFromPropertyMap(normalized, [
      'administrator',
      'admin',
      'gestion',
      'gestionare',
      'administrator_unitate'
    ]);
    const area = getFromPropertyMap(normalized, [
      'suprafata',
      'suprafata_ha',
      'surface',
      'area',
      'arie'
    ]);
    const address = getFromPropertyMap(normalized, ['adresa', 'address', 'strada', 'localitate']);
    const phone = getFromPropertyMap(normalized, ['telefon', 'phone', 'telefon_contact', 'mobil']);
    const description = getFromPropertyMap(normalized, [
      'descriere',
      'description',
      'detalii',
      'notes'
    ]);
    const email = getFromPropertyMap(normalized, ['email', 'mail', 'contact_email']);
    const website = getFromPropertyMap(normalized, ['website', 'site', 'url']);
    const pescuitInterzis = parseBoolean(
      getFromPropertyMap(normalized, ['pescuit_interzis', 'interzis', 'pescuit_interzis_bool'])
    );

    const lat = center[1].toFixed(5);
    const lng = center[0].toFixed(5);

    const infoRows = [
      administrator
        ? `<div class="flex items-start gap-2">
            <span class="text-xs font-semibold text-gray-500 w-24 shrink-0">Administrator</span>
            <span class="text-sm font-semibold text-gray-800">${sanitizeValue(administrator)}</span>
          </div>`
        : '',
      area
        ? `<div class="flex items-start gap-2">
            <span class="text-xs font-semibold text-gray-500 w-24 shrink-0">Suprafață</span>
            <span class="text-sm font-semibold text-gray-800">${sanitizeValue(area)}</span>
          </div>`
        : '',
      address
        ? `<div class="flex items-start gap-2">
            <span class="text-xs font-semibold text-gray-500 w-24 shrink-0">Adresă</span>
            <span class="text-sm text-gray-700">${sanitizeValue(address)}</span>
          </div>`
        : '',
      phone
        ? `<div class="flex items-start gap-2">
            <span class="text-xs font-semibold text-gray-500 w-24 shrink-0">Telefon</span>
            <a href="tel:${sanitizeValue(phone)}" class="text-sm text-blue-600 hover:underline">${sanitizeValue(phone)}</a>
          </div>`
        : '',
      email
        ? `<div class="flex items-start gap-2">
            <span class="text-xs font-semibold text-gray-500 w-24 shrink-0">Email</span>
            <a href="mailto:${sanitizeValue(email)}" class="text-sm text-blue-600 hover:underline">${sanitizeValue(email)}</a>
          </div>`
        : '',
      website
        ? `<div class="flex items-start gap-2">
            <span class="text-xs font-semibold text-gray-500 w-24 shrink-0">Website</span>
            <a href="${sanitizeValue(website)}" target="_blank" rel="noopener noreferrer" class="text-sm text-blue-600 hover:underline">${sanitizeValue(website)}</a>
          </div>`
        : '',
      `<div class="flex items-start gap-2">
          <span class="text-xs font-semibold text-gray-500 w-24 shrink-0">Coordonate</span>
          <span class="text-sm text-gray-700">${lat}° N, ${lng}° E</span>
        </div>`
    ].filter(Boolean);

    const statusRow =
      pescuitInterzis === null
        ? ''
        : `<div class="mb-3 p-2 rounded ${pescuitInterzis ? 'bg-red-50' : 'bg-green-50'}">
            <p class="text-sm font-semibold ${pescuitInterzis ? 'text-red-700' : 'text-green-700'}">
              ${pescuitInterzis ? '⚠️ Pescuit interzis' : '✅ Pescuit permis'}
            </p>
          </div>`;

    const descriptionBlock = description
      ? `<div class="mb-3 border-t border-gray-200 pt-3">
           <p class="text-sm text-gray-700 leading-relaxed">${sanitizeValue(description)}</p>
         </div>`
      : '';

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    const appleMapsUrl = `https://maps.apple.com/?daddr=${lat},${lng}`;

    return `
      <div class="p-4 bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-xs sm:max-w-sm ft-popup">
        <h3 class="font-bold text-lg ${visuals.accentClass} mb-2">
          ${visuals.titlePrefix}: ${sanitizeValue(rawName)}
        </h3>
        <div class="mb-3">
          <span class="inline-block ${visuals.badgeClass} text-xs font-semibold px-3 py-1 rounded-full">
            ${sanitizeValue(typeValue || 'necunoscut')}${geometryType ? ` · ${sanitizeValue(geometryType)}` : ''}
          </span>
        </div>
        ${statusRow}
        <div class="space-y-2">
          ${infoRows.join('')}
        </div>
        ${descriptionBlock}
        <div class="border-t border-gray-200 pt-3 mt-3 flex gap-2">
          <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer"
             class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs text-center py-2 px-3 rounded-lg transition-colors">
            Deschide Google Maps
          </a>
          <a href="${appleMapsUrl}" target="_blank" rel="noopener noreferrer"
             class="flex-1 bg-gray-900 hover:bg-gray-800 text-white text-xs text-center py-2 px-3 rounded-lg transition-colors">
            Deschide Apple Maps
          </a>
        </div>
      </div>
    `;
  };

  const openPopupForFeature = (
    feature: MapFeature,
    center: [number, number],
    geometryType?: Geometry['type']
  ) => {
    if (!map.current) {
      return;
    }

    if (currentPopup.current) {
      currentPopup.current.remove();
      currentPopup.current = null;
    }

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '400px',
      className: 'ft-popup'
    })
      .setLngLat(center)
      .setHTML(buildPopupContent(feature, center, geometryType))
      .addTo(map.current);

    currentPopup.current = popup;
  };

  const handleFeatureSelection = (
    feature: MapFeature,
    options: {
      geometryOverride?: Geometry;
      clickedLngLat?: maplibregl.LngLatLike;
      idOverride?: string | number | null;
      padding?: number;
      zoomOverride?: number;
    } = {}
  ) => {
    if (!feature) {
      return;
    }

    const geometry = options.geometryOverride ?? (feature.geometry as Geometry | undefined);
    const geometryInfo = computeGeometryInfo(geometry);

    const center =
      geometryInfo?.center ??
      (options.clickedLngLat ? toLngLatTuple(options.clickedLngLat) : null);

    if (!center) {
      console.warn('Missing coordinates for selected feature', feature);
      alert('Nu s-au putut obține coordonatele pentru această locație.');
      return;
    }

    closePreviousPopupAndClearSelection();

    const featureId = getFeatureId(feature, options.idOverride ?? null);
    setSelectedFeature(feature);
    setSelectedFeatureId(featureId);

    if (featureId !== null) {
      scheduleFeatureHighlight(featureId);
    }

    const geometryType = geometryInfo?.type ?? geometry?.type;
    const isPointGeometry =
      geometryType === 'Point' || geometryType === 'MultiPoint' || !geometryType;

    focusCameraOnGeometry({
      center,
      geometryInfo,
      isPoint: isPointGeometry,
      zoom:
        options.zoomOverride ??
        (geometryType === 'LineString' || geometryType === 'MultiLineString'
          ? 12
          : geometryType === 'Polygon' || geometryType === 'MultiPolygon'
          ? 13
          : 14),
      padding: options.padding
    });

    openPopupForFeature(feature, center, geometryType);
  };

  const clearSelection = () => {
    closePreviousPopupAndClearSelection();
    setSelectedFeature(null);
    setSelectedFeatureId(null);
  };
  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const styleElement = document.createElement('style');
    styleElement.textContent = mobileCSS;
    document.head.appendChild(styleElement);

    const mapConfig: maplibregl.MapOptions = {
      container: mapContainer.current,
      style: `https://api.mapcherry.io/styles/outdoor.json?key=${MAPCHERRY_CONFIG.mapToken}`,
      minZoom: 4,
      bounds: [13, 38, 35, 53],
      zoom: 5
    };

    const mapInstance = new maplibregl.Map(mapConfig);
    map.current = mapInstance;

    const interactiveLayers = [
      { id: 'point-magazin' },
      { id: 'point-ape-publice' },
      { id: 'polygon-ape-publice' },
      { id: 'line-ape-publice' },
      { id: 'polygon-balti-ro' },
      { id: 'point-balti-ro' }
    ];


    const registerInteractiveHandlers = () => {
      interactiveLayers.forEach(({ id }) => {
        mapInstance.on('click', id, (event) => {
          const feature = event.features?.[0] as MapFeature | undefined;
          if (!feature) {
            return;
          }

          const geometry = deriveGeometryFromFeature(feature);
          handleFeatureSelection(feature, {
            geometryOverride: geometry,
            clickedLngLat: event.lngLat
          });
        });

        mapInstance.on('mouseenter', id, () => {
          mapInstance.getCanvas().style.cursor = 'pointer';
        });

        mapInstance.on('mouseleave', id, () => {
          mapInstance.getCanvas().style.cursor = '';
        });
      });
    };

    mapInstance.once('load', () => {
      setIsMapLoaded(true);
      addFishingLayers();
      registerInteractiveHandlers();
    });

    mapInstance.on('sourcedata', (event) => {
      if (event.sourceId === 'abp-locuri' && event.isSourceLoaded) {
        console.log('ABP data source fully loaded');
      }
    });

    mapInstance.on('error', (event) => {
      console.error('Map error details:', event);
    });

    return () => {
      mapInstance.remove();
      map.current = null;
      document.head.removeChild(styleElement);
    };
  }, []);

  // Funcție pentru normalizarea textului (elimină diacriticele)
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u0103\u00E2\u00E1\u00E0\u00E3]/g, 'a')
      .replace(/[\u00EE\u00EF]/g, 'i')
      .replace(/[\u0219\u015F]/g, 's')
      .replace(/[\u021B\u0163]/g, 't');
  };

  // Search function - local search in loaded features (intelligent with scoring)
  const handleSearch = useCallback((query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    console.log('Searching for:', trimmedQuery);

    if (!map.current || !isMapLoaded) {
      console.log('Map not loaded yet');
      return;
    }

    try {
      const features = map.current.querySourceFeatures('abp-locuri', {
        sourceLayer: 'locuri'
      }) as MapFeature[];

      console.log('Found features:', features.length);

      const normalizedQuery = normalizeText(trimmedQuery);
      const seenKeys = new Set<string>();

      const filteredFeatures: SearchResult[] = features
        .map((feature) => {
          const properties = (feature.properties || {}) as Record<string, unknown>;
          const nameValue =
            (properties['nume'] as string | undefined) ??
            (properties['name'] as string | undefined) ??
            '';
          const typeValue =
            (properties['tip'] as string | undefined) ??
            (properties['type'] as string | undefined) ??
            '';
          const normalizedName = normalizeText(String(nameValue));
          const normalizedType = normalizeText(String(typeValue));

          let score = 0;

          if (normalizedName === normalizedQuery) score += 100;
          else if (normalizedName.startsWith(normalizedQuery)) score += 50;
          else if (normalizedName.includes(normalizedQuery)) score += 25;
          if (normalizedType.includes(normalizedQuery)) score += 10;

          const geometry = deriveGeometryFromFeature(feature);

          return {
            feature,
            geometry,
            properties,
            sourceLayer: feature.layer?.id,
            id: getFeatureId(feature),
            score
          };
        })
        .filter((result) => {
          if (result.score <= 0) {
            return false;
          }

          const nameValue =
            (result.properties['nume'] as string | undefined) ??
            (result.properties['name'] as string | undefined) ??
            '';
          const normalizedName = normalizeText(String(nameValue));

          const geometryInfo = result.geometry ? computeGeometryInfo(result.geometry) : null;
          const center = geometryInfo?.center;
          const key = `${normalizedName}-${center?.[0] ?? 'x'}-${center?.[1] ?? 'y'}-${result.id ?? 'no-id'}`;

          if (seenKeys.has(key)) {
            return false;
          }
          seenKeys.add(key);
          return true;
        })
        .sort((a, b) => b.score - a.score);

      console.log('Filtered features:', filteredFeatures.length);
      setSearchResults(filteredFeatures);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
    }
  }, [isMapLoaded]);

  // Debounce pentru căutare – instant și fluid
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

  // Handler pentru click pe rezultate - folose?te highlight + popup unificat
  const handleSearchResultClick = (result: SearchResult) => {
    const properties = result.properties;
    const name =
      (properties['nume'] as string | undefined) ?? (properties['name'] as string | undefined);
    console.log('Search result clicked:', name);

    setShowSearchResults(false);
    setSearchQuery('');

    const feature = result.feature;
    const geometry = result.geometry ?? deriveGeometryFromFeature(feature);

    handleFeatureSelection(feature, {
      geometryOverride: geometry,
      idOverride: result.id ?? getFeatureId(feature)
    });
  };

  // Funcția pentru localizarea utilizatorului
  const locateUser = () => {
    if (!navigator.geolocation) {
      alert('Geolocation nu este suportată de browser-ul tău.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('Geolocation accuracy:', accuracy, 'meters');
        const userCoords: [number, number] = [longitude, latitude];

        setUserLocation(userCoords);

        // Remove existing user marker
        if (userMarker) {
          userMarker.remove();
        }

        // Create new user marker - mai mare și mai vizibil
        const markerEl = document.createElement('div');
        markerEl.className = 'custom-marker';
        markerEl.style.cssText = `
          width: 24px;
          height: 24px;
          background-color: #EF4444;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          z-index: 1000;
        `;

        const newMarker = new maplibregl.Marker({ element: markerEl, anchor: 'center' })
          .setLngLat(userCoords)
          .addTo(map.current);

        setUserMarker(newMarker);

        // Fly to user location cu zoom mai mare pentru precizie
        map.current?.flyTo({
          center: userCoords,
          zoom: 16, // Zoom mai mare pentru precizie
          duration: 2000
        });

        // Adaugă cercul de precizie
        if (map.current?.getSource('user-location-circle')) {
          map.current.removeLayer('user-location-circle-fill');
          map.current.removeLayer('user-location-circle-stroke');
          map.current.removeSource('user-location-circle');
        }

        // Calculează raza în grade pentru cercul de precizie
        const radiusInMeters = Math.max(accuracy || 10, 5);
        const radiusInDegrees = radiusInMeters / 111000; // Aproximativ 111km per grad

        map.current?.addSource('user-location-circle', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            properties: {
              radius: radiusInDegrees
            }
          }
        });

        map.current?.addLayer({
          id: 'user-location-circle-fill',
          type: 'fill',
          source: 'user-location-circle',
          paint: {
            'fill-color': '#EF4444',
            'fill-opacity': 0.1
          }
        });

        map.current?.addLayer({
          id: 'user-location-circle-stroke',
          type: 'line',
          source: 'user-location-circle',
          paint: {
            'line-color': '#EF4444',
            'line-width': 2,
            'line-opacity': 0.5
          }
        });

        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsLocating(false);

        let errorMessage = 'Nu s-a putut obține locația ta.';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permisiunea de geolocație a fost refuzată. Te rog să activezi geolocația în browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Informațiile de locație nu sunt disponibile.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Cererea de geolocație a expirat. Te rog să încerci din nou.';
            break;
        }

        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Timeout mai mare
        maximumAge: 60000 // Cache mai mic pentru precizie mai bună
      }
    );
  };

  const addFishingLayers = () => {
    if (!map.current) return;

    const SOURCE_NAME = "abp-locuri";
    const DATA_LAYER = "locuri";

    // Filters for different types of fishing locations - exact same as demo
    const magazinFilter = ["all", ["==", "magazin", ["get", "tip"]], ["==", ["geometry-type"], "Point"]] as maplibregl.FilterSpecification;
    const baltiFilter = ["all", ["==", "balta", ["get", "tip"]], ["==", ["geometry-type"], "Polygon"]] as maplibregl.FilterSpecification;
    const baltiPointFilter = ["all", ["==", "balta", ["get", "tip"]], ["==", ["geometry-type"], "Point"]] as maplibregl.FilterSpecification;
    const apeLacuriFilter = ["all", ["==", "apa", ["get", "tip"]], ["==", ["geometry-type"], "Polygon"]] as maplibregl.FilterSpecification;
    const apeRauriFilter = ["all", ["==", "apa", ["get", "tip"]], ["==", ["geometry-type"], "LineString"]] as maplibregl.FilterSpecification;
    const apePointFilter = ["all", ["==", "apa", ["get", "tip"]], ["==", ["geometry-type"], "Point"]] as maplibregl.FilterSpecification;

    // Add source first - using correct username and dataset
    map.current.addSource(SOURCE_NAME, {
      type: "vector",
      tiles: [`https://api.mapcherry.io/tiles/${MAPCHERRY_CONFIG.username}/${MAPCHERRY_CONFIG.datasetKey}/{z}/{x}/{y}.pbf?key=${MAPCHERRY_CONFIG.mapToken}`],
      maxzoom: 14,
      bounds: [20.22, 43.4, 29.7, 48.3],
      promoteId: "id"
    });

    // Add magazin points - culori diferite pentru magazine
    map.current.addLayer({
      id: "point-magazin",
      type: "circle",
      source: SOURCE_NAME,
      "source-layer": DATA_LAYER,
      filter: magazinFilter,
      paint: {
        "circle-color": "#F59E0B", // Orange pentru magazine
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
        "circle-radius": 8
      }
    });

    // Add water bodies (lakes) - polygons
    map.current.addLayer({
      id: "polygon-ape-publice",
      type: "fill",
      source: SOURCE_NAME,
      "source-layer": DATA_LAYER,
      filter: apeLacuriFilter,
      minzoom: 8,
      paint: {
        "fill-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "#EF4444", // Roșu pentru selecție
          ["boolean", ["get", "pescuit_interzis"], false],
          "#EF4444", // Roșu pentru pescuit interzis
          "#3B82F6"  // Albastru pentru lacuri (ca pe homepage)
        ],
        "fill-opacity": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          0.7,
          ["boolean", ["get", "pescuit_interzis"], false],
          1,
          0.7
        ],
        "fill-outline-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "#EF4444", // Roșu pentru selecție
          ["boolean", ["get", "pescuit_interzis"], false],
          "#EF4444", // Roșu pentru pescuit interzis
          "#3B82F6"  // Albastru pentru lacuri (ca pe homepage)
        ]
      }
    }, "roads-track");

    // Add water bodies (rivers) - lines
    map.current.addLayer({
      id: "line-ape-publice",
      type: "line",
      source: SOURCE_NAME,
      "source-layer": DATA_LAYER,
      filter: apeRauriFilter,
      minzoom: 8,
      layout: {
        "line-cap": "round",
        "line-join": "bevel"
      },
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "rgba(239, 111, 108, 1)",
          ["boolean", ["get", "pescuit_interzis"], false],
          "rgba(233, 56, 53, 1)",
          "rgba(7, 91, 139, 1)"
        ],
        "line-width": { type: "exponential", stops: [[8, 2], [12, 4]] },
        "line-opacity": 0.7
      }
    }, "roads-track");

    // Add water point labels
    map.current.addLayer({
      id: "pointlabel-ape-publice",
      type: "symbol",
      source: SOURCE_NAME,
      "source-layer": DATA_LAYER,
      filter: apePointFilter,
      minzoom: 8,
      layout: {
        "text-font": ["Roboto Black"],
        "text-field": "{nume}",
        "text-size": {
          type: "exponential",
          stops: [[8, 9], [18, 15]]
        },
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "text-letter-spacing": 0.1,
        "text-anchor": "top",
        "text-rotate": 0,
        "text-transform": "none",
        "text-offset": [0, 1]
      },
      paint: {
        "text-color": "rgba(0, 61, 132, 1)",
        "text-halo-color": "rgba(247, 246, 246, 1)",
        "text-halo-width": 0.7
      }
    });

    // Add water points
    map.current.addLayer({
      id: "point-ape-publice",
      type: "circle",
      source: SOURCE_NAME,
      "source-layer": DATA_LAYER,
      filter: apePointFilter,
      paint: {
        "circle-color": [
          "case",
          ["boolean", ["get", "pescuit_interzis"], false],
          "#EF4444", // Roșu pentru pescuit interzis
          "#10B981"  // Verde pentru râuri (ca pe homepage)
        ],
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
        "circle-radius": 8
      }
    });

    // Add river labels
    map.current.addLayer({
      id: "linelabel-ape-publice",
      type: "symbol",
      source: SOURCE_NAME,
      "source-layer": DATA_LAYER,
      filter: apeRauriFilter,
      layout: {
        "text-font": ["Roboto Condensed Light"],
        "text-field": "{nume}",
        "text-size": { type: "exponential", stops: [[14, 9], [18, 13]] },
        "symbol-placement": "line",
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "text-offset": [0, -1],
        "text-letter-spacing": 0.1,
        "text-justify": "auto",
        "text-anchor": "center",
        "text-max-width": 5,
        "text-max-angle": 30,
        "text-keep-upright": true
      },
      paint: {
        "text-color": "rgba(0, 61, 132, 1)",
        "text-halo-color": "rgba(247, 246, 246, 1)",
        "text-halo-width": 0.7
      }
    });

    // Add fishing spots (bălți) - polygons
    map.current.addLayer({
      id: "polygon-balti-ro",
      type: "fill",
      source: SOURCE_NAME,
      "source-layer": DATA_LAYER,
      minzoom: 8,
      filter: baltiFilter,
      paint: {
        "fill-opacity": 0.7,
        "fill-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "rgba(239, 111, 108, 1)",
          "rgba(7, 91, 139, 1)"
        ]
      }
    }, "roads-track");

    // Add fishing spots (bălți) - points
    map.current.addLayer({
      id: "point-balti-ro",
      type: "circle",
      source: SOURCE_NAME,
      "source-layer": DATA_LAYER,
      filter: baltiPointFilter,
      paint: {
        "circle-color": "#0475c1",
        "circle-stroke-width": 2,
        "circle-stroke-color": "rgba(250, 247, 247, 1)",
        "circle-radius": 6
      }
    });

    // Add fishing spots labels
    map.current.addLayer({
      id: "point-balti-ro-text",
      type: "symbol",
      source: SOURCE_NAME,
      minzoom: 8,
      "source-layer": DATA_LAYER,
      filter: baltiPointFilter,
      layout: {
        "text-font": ["Roboto Black"],
        "text-field": "{nume}",
        "text-size": {
          type: "exponential",
          stops: [[8, 9], [18, 15]]
        },
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "text-letter-spacing": 0.1,
        "text-anchor": "top",
        "text-rotate": 0,
        "text-transform": "none",
        "text-offset": [0, 1]
      },
      paint: {
        "text-color": "rgba(0, 61, 132, 1)",
        "text-halo-color": "rgba(247, 246, 246, 1)",
        "text-halo-width": 0.7
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <SEOHead
        title="Test Hartă Mapcherry - Fish Trophy"
        description="Pagina de test pentru noua integrare Mapcherry cu hărți detaliate pentru pescuit"
        keywords="test hartă, mapcherry, pescuit, bălți, ape"
      />

      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Înapoi la Home</span>
              </Link>
            </div>

            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">
                Test Hartă Mapcherry
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container - format frumos ca pe homepage */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 p-6">
        <div
          ref={mapContainer}
          className="w-full rounded-lg overflow-hidden"
          style={{
            aspectRatio: '16/9',
            minHeight: '400px',
            maxHeight: '600px'
          }}
        />

        {/* Loading overlay */}
        {!isMapLoaded && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Se încarcă harta...</p>
            </div>
          </div>
        )}

        {/* Search bar - deasupra hărții */}
        <div className="absolute top-4 left-4 right-4 z-30">
          <div className="relative max-w-md mx-auto">
            <input
              id="search-input"
              name="search"
              type="text"
              placeholder="Caută locații, județe, râuri, lacuri..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="w-full px-4 py-3 pl-12 pr-4 bg-white border-2 border-gray-200 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
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
                className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shadow-sm border border-gray-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Search results - deasupra hărții */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-20 left-4 right-4 z-30">
            <div className="max-w-md mx-auto">
              <div className="bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">

              {searchResults.map((result, index) => {
                const properties = result.properties;
                const rawType = String((properties['tip'] as string | undefined) ?? (properties['type'] as string | undefined) ?? '');
                const typeKey = rawType.toLowerCase();
                const typeLabel = rawType || 'Tip necunoscut';
                const nameLabel = String((properties['nume'] as string | undefined) ?? (properties['name'] as string | undefined) ?? 'Locatie necunoscuta');
                const icon = typeKey === 'magazin' ? 'M' : typeKey === 'apa' ? 'A' : 'o';

                return (
                  <button
                    key={index}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-lg">{icon}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{nameLabel}</div>
                      <div className="text-xs text-gray-500">{typeLabel}</div>
                    </div>
                  </button>
                );
              })}

              </div>
            </div>
          </div>
        )}

        {showSearchResults && searchResults.length === 0 && searchQuery && (
          <div className="absolute top-20 left-4 right-4 z-30">
            <div className="max-w-md mx-auto">
              <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 text-center text-gray-500">
                Nu s-au găsit locații pentru "{searchQuery}"
              </div>
            </div>
          </div>
        )}

        {/* Map controls - exact ca pe homepage */}
        {isMapLoaded && map.current && (
          <div className="absolute bottom-4 right-4 z-30 space-y-2">
            {selectedFeature && (
              <button
                onClick={clearSelection}
                className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg shadow-lg border border-red-200 transition-all duration-200 hover:shadow-xl"
                title="Deselecteaza selectia"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {/* User location button */}
            <button
              onClick={locateUser}
              disabled={isLocating}
              className="bg-white hover:bg-gray-50 text-gray-700 hover:text-blue-600 p-3 rounded-lg shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              title={isLocating ? "Se localizează..." : "Locația mea"}
            >
              {isLocating ? (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <MapPin className="w-5 h-5" />
              )}
            </button>

            {/* Center on Romania button */}
            <button
              onClick={() => {
                if (map.current) {
                  map.current.flyTo({
                    center: [25.0094, 45.9432],
                    zoom: 6,
                    duration: 1000
                  });
                }
              }}
              className="bg-white hover:bg-gray-50 text-gray-700 hover:text-blue-600 p-3 rounded-lg shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl"
              title="Centrare pe România"
            >
              <Navigation className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Info panel */}
        <div className="absolute bottom-4 left-4 z-20">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-white/20 p-4 max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Test Hartă Mapcherry</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><strong>Token:</strong> {MAPCHERRY_CONFIG.mapToken.substring(0, 8)}...</p>
              <p><strong>Dataset:</strong> {MAPCHERRY_CONFIG.datasetKey}</p>
              <p><strong>Status:</strong> {isMapLoaded ? 'Încărcat' : 'Se încarcă...'}</p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
