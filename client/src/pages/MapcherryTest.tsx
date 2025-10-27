import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Navigation, Search, X } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import type { Feature, FeatureCollection, Geometry, GeometryCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import SEOHead from '@/components/SEOHead';
import { useAuth } from '@/hooks/useAuth';
import { geocodingService } from '@/services/geocoding';

// Mapcherry configuration
const MAPCHERRY_CONFIG = {
  mapToken: '0004a01ba144c2917782fd536f245345',
  username: 'cosmintrica',
  datasetKey: 'abp-ct-all'
};

const HIGHLIGHT_SOURCE_ID = 'selected-feature-highlight';
const HIGHLIGHT_LAYER_IDS = {
  polygonFill: 'selected-feature-highlight-polygon-fill',
  outline: 'selected-feature-highlight-outline',
  point: 'selected-feature-highlight-point'
} as const;

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
    width: 28px !important;
    height: 28px !important;
    font-size: 22px !important;
    line-height: 28px !important;
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
  const userLocationPopupRef = useRef<maplibregl.Popup | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

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

  const interactiveLayerIds = useMemo(
    () => [
      'point-magazin',
      'point-ape-publice',
      'polygon-ape-publice',
      'line-ape-publice',
      'polygon-balti-ro',
      'point-balti-ro'
    ],
    []
  );

  // Helper function to close previous popup and clear previous selection
  const closePreviousPopupAndClearSelection = () => {
    // Close current popup
    if (currentPopup.current) {
      currentPopup.current.remove();
      currentPopup.current = null;
    }

    clearHighlightGeometry();

    // Clear previous selection state
    if (previousSelectedId.current !== null) {
      clearFeatureSelectionState(previousSelectedId.current);
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

  const formatCoordinate = (value: number, axis: 'lat' | 'lng') => {
    const direction = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
    return `${Math.abs(value).toFixed(5)}&deg; ${direction}`;
  };

  const toLngLatTuple = (lngLatLike: maplibregl.LngLatLike): [number, number] => {
    const lngLat = maplibregl.LngLat.convert(lngLatLike);
    return [lngLat.lng, lngLat.lat];
  };

  const getFeatureId = useCallback(
    (feature: MapFeature | null | undefined, fallback?: string | number | null): string | number | null => {
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
    },
    []
  );

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

  const deriveGeometryFromFeature = useCallback((feature: MapFeature): Geometry | undefined => {
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
  }, []);

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

  const geometryToFeatureList = (geometry: Geometry): Feature[] => {
    if (geometry.type === 'GeometryCollection') {
      const collection = geometry as GeometryCollection;
      return (collection.geometries || [])
        .filter((geom): geom is Geometry => Boolean(geom) && typeof (geom as Geometry).type === 'string')
        .flatMap((geom) => geometryToFeatureList(geom));
    }

    const feature: Feature = {
      type: 'Feature',
      geometry,
      properties: {}
    };

    return [feature];
  };

  const ensureHighlightLayers = () => {
    if (!map.current) {
      return;
    }

    if (!map.current.getSource(HIGHLIGHT_SOURCE_ID)) {
      map.current.addSource(HIGHLIGHT_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });
    }

    const beforeLayerId = map.current.getLayer('point-balti-ro-text') ? 'point-balti-ro-text' : undefined;
    const addLayerIfMissing = (
      layerId: string,
      layer: Parameters<maplibregl.Map['addLayer']>[0]
    ) => {
      if (!map.current?.getLayer(layerId)) {
        map.current?.addLayer(layer, beforeLayerId);
      }
    };

    addLayerIfMissing(HIGHLIGHT_LAYER_IDS.polygonFill, {
      id: HIGHLIGHT_LAYER_IDS.polygonFill,
      type: 'fill',
      source: HIGHLIGHT_SOURCE_ID,
      filter: [
        'any',
        ['==', ['geometry-type'], 'Polygon'],
        ['==', ['geometry-type'], 'MultiPolygon']
      ],
      paint: {
        'fill-color': '#fca5a5',
        'fill-opacity': 0.25
      }
    });

    addLayerIfMissing(HIGHLIGHT_LAYER_IDS.outline, {
      id: HIGHLIGHT_LAYER_IDS.outline,
      type: 'line',
      source: HIGHLIGHT_SOURCE_ID,
      filter: [
        'any',
        ['==', ['geometry-type'], 'Polygon'],
        ['==', ['geometry-type'], 'MultiPolygon'],
        ['==', ['geometry-type'], 'LineString'],
        ['==', ['geometry-type'], 'MultiLineString']
      ],
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': '#ef4444',
        'line-width': 3,
        'line-opacity': 0.9
      }
    });

    addLayerIfMissing(HIGHLIGHT_LAYER_IDS.point, {
      id: HIGHLIGHT_LAYER_IDS.point,
      type: 'circle',
      source: HIGHLIGHT_SOURCE_ID,
      filter: [
        'any',
        ['==', ['geometry-type'], 'Point'],
        ['==', ['geometry-type'], 'MultiPoint']
      ],
      paint: {
        'circle-color': '#ef4444',
        'circle-radius': 11,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 3,
        'circle-opacity': 0.95,
        'circle-blur': 0.12
      }
    });
  };

  const setHighlightGeometry = (geometry?: Geometry | null) => {
    if (!map.current) {
      return;
    }

    const highlightSource = map.current.getSource(HIGHLIGHT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!highlightSource) {
      return;
    }

    if (!geometry) {
      const emptyCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: []
      };
      highlightSource.setData(emptyCollection);
      return;
    }

    const features = geometryToFeatureList(geometry);
    const featureCollection: FeatureCollection = {
      type: 'FeatureCollection',
      features
    };
    highlightSource.setData(featureCollection);
  };

  const clearHighlightGeometry = () => {
    setHighlightGeometry(null);
  };

  const updateFeatureSelectionState = (featureId: string | number | null, selected: boolean) => {
    if (!map.current || featureId === null) {
      return;
    }

    try {
      map.current.setFeatureState(
        { source: 'abp-locuri', sourceLayer: 'locuri', id: featureId },
        { selected }
      );
    } catch (error) {
      console.warn('Unable to update feature selection state', featureId, error);
    }
  };

  const clearFeatureSelectionState = (featureId: string | number | null) => {
    if (!map.current || featureId === null) {
      return;
    }

    try {
      map.current.removeFeatureState(
        { source: 'abp-locuri', sourceLayer: 'locuri', id: featureId },
        'selected'
      );
    } catch (error) {
      console.warn('Unable to clear feature selection state', featureId, error);
    }
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
        updateFeatureSelectionState(featureId, true);
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

  const collectFromPropertyMap = (propertyMap: Map<string, unknown>, keys: string[]) => {
    const results: string[] = [];
    const seen = new Set<string>();

    keys.forEach((key) => {
      const value = propertyMap.get(key.toLowerCase());
      if (value === undefined || value === null) {
        return;
      }

      const stringValue = String(value).trim();
      if (!stringValue || seen.has(stringValue.toLowerCase())) {
        return;
      }

      seen.add(stringValue.toLowerCase());
      results.push(stringValue);
    });

    return results;
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
      getFromPropertyMap(normalized, ['nume', 'name', 'denumire', 'title']) ?? 'Locatie de pescuit';
    const typeValue = String(
      getFromPropertyMap(normalized, ['tip', 'type', 'categorie']) ?? 'necunoscut'
    ).toLowerCase();
    const typeLabel = typeValue ? typeValue.charAt(0).toUpperCase() + typeValue.slice(1) : 'Necunoscut';

    const visuals = (() => {
      switch (typeValue) {
        case 'magazin':
          return { prefix: 'Magazin', badgeClass: 'bg-amber-100 text-amber-800' };
        case 'balta':
          return { prefix: 'Balta', badgeClass: 'bg-sky-100 text-sky-700' };
        case 'apa':
          return { prefix: 'Apa', badgeClass: 'bg-blue-100 text-blue-700' };
        default:
          return { prefix: 'Locatie', badgeClass: 'bg-slate-100 text-slate-600' };
      }
    })();

    const geometryLabel = geometryType ? geometryType.replace(/([a-z])([A-Z])/g, '$1 $2') : '';

    const administrator = getFromPropertyMap(normalized, [
      'administrator',
      'administrator_baltii',
      'administrator_baltei',
      'administrator_lac',
      'admin',
      'gestion',
      'gestionare',
      'gestion_unitate',
      'coordonator'
    ]);
    const contactPerson = getFromPropertyMap(normalized, [
      'persoana_contact',
      'contact',
      'contact_nume',
      'responsabil',
      'manager',
      'contact_person'
    ]);
    const area = getFromPropertyMap(normalized, [
      'suprafata',
      'suprafata_ha',
      'surface',
      'area',
      'arie',
      'suprafata_totala',
      'suprafata_m2',
      'suprafata_mp',
      'suprafata_km2'
    ]);
    const depth = getFromPropertyMap(normalized, [
      'adancime',
      'adancime_medie',
      'adancime_maxima',
      'depth'
    ]);
    const locality = getFromPropertyMap(normalized, [
      'localitate',
      'judet',
      'county',
      'oras',
      'regiune',
      'comuna',
      'sat',
      'zona'
    ]);
    const address = getFromPropertyMap(normalized, [
      'adresa',
      'address',
      'strada',
      'adresa_completa',
      'locatie',
      'localizare',
      'address_full'
    ]);
    const species = getFromPropertyMap(normalized, [
      'specii',
      'species',
      'pesti',
      'fish',
      'ichthyofauna',
      'specii_pesti'
    ]);
    const facilities = getFromPropertyMap(normalized, [
      'facilitati',
      'amenajari',
      'dotari',
      'facilities',
      'services',
      'utilitati'
    ]);

    const phoneNumbers = collectFromPropertyMap(normalized, [
      'telefon',
      'telefon1',
      'telefon2',
      'telefon_contact',
      'telefon_administrator',
      'mobil',
      'nr_telefon',
      'phone',
      'contact_phone',
      'telefon_fix'
    ]);
    const emailAddresses = collectFromPropertyMap(normalized, [
      'email',
      'mail',
      'contact_email',
      'email_contact',
      'email_admin'
    ]);
    const websiteLinks = collectFromPropertyMap(normalized, [
      'website',
      'site',
      'url',
      'link',
      'pagina_web',
      'url_site'
    ]);
    const program = getFromPropertyMap(normalized, [
      'program',
      'orar',
      'schedule',
      'orar_functionare',
      'program_functionare',
      'orar_pescuit',
      'program_baltii'
    ]);
    const fees = getFromPropertyMap(normalized, [
      'tarif',
      'pret',
      'taxa',
      'cost',
      'tarife',
      'taxe',
      'preturi',
      'costuri',
      'tarif_pescuit',
      'taxa_pescuit',
      'tarif_zi',
      'tarif24h'
    ]);
    const description = getFromPropertyMap(normalized, [
      'descriere',
      'description',
      'detalii',
      'notes',
      'descriere_baltii',
      'detalii_balti',
      'observatii',
      'informatii',
      'description_ro'
    ]);
    const pescuitInterzis = parseBoolean(
      getFromPropertyMap(normalized, ['pescuit_interzis', 'interzis', 'pescuit_interzis_bool'])
    );

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${center[1]},${center[0]}`;
    const appleMapsUrl = `https://maps.apple.com/?daddr=${center[1]},${center[0]}`;

    const badges: string[] = [
      `<span class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${visuals.badgeClass}">${sanitizeValue(typeLabel)}</span>`
    ];
    if (geometryLabel) {
      badges.push(
        `<span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">${sanitizeValue(geometryLabel)}</span>`
      );
    }
    if (pescuitInterzis === true) {
      badges.push(
        `<span class="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Pescuit interzis</span>`
      );
    }
    if (pescuitInterzis === false) {
      badges.push(
        `<span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Pescuit permis</span>`
      );
    }

    const createInfoRow = (
      icon: string,
      label: string,
      value: string,
      options: { allowHtml?: boolean } = {}
    ) => {
      const displayValue = options.allowHtml ? value : sanitizeValue(value);
      return `
        <div class="flex items-start gap-3">
          <span class="text-lg leading-none">${icon}</span>
          <div class="space-y-0.5">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">${sanitizeValue(label)}</p>
            <p class="text-sm text-slate-700 leading-snug">${displayValue}</p>
          </div>
        </div>
      `;
    };

    const createLinkRow = (
      icon: string,
      label: string,
      value: string,
      href: string,
      options: { newTab?: boolean } = {}
    ) => {
      const sanitizedHref = sanitizeValue(href);
      const sanitizedLabel = sanitizeValue(label);
      const sanitizedValue = sanitizeValue(value);
      const targetAttributes = options.newTab ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `
        <div class="flex items-start gap-3">
          <span class="text-lg leading-none">${icon}</span>
          <div class="space-y-0.5">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">${sanitizedLabel}</p>
            <a href="${sanitizedHref}" class="text-blue-600 font-semibold hover:underline"${targetAttributes}>${sanitizedValue}</a>
          </div>
        </div>
      `;
    };

    const normalizeTelHref = (value: string) => {
      const normalizedValue = value.replace(/[^0-9+]/g, '');
      return `tel:${normalizedValue}`;
    };

    const normalizeMailHref = (value: string) => `mailto:${value.replace(/\s+/g, '')}`;

    const normalizeWebsiteHref = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return '#';
      }
      if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
      }
      return `https://${trimmed}`;
    };

    const coordinateValue = `${formatCoordinate(center[1], 'lat')} &bull; ${formatCoordinate(
      center[0],
      'lng'
    )}`;

    const infoItems: string[] = [
      createInfoRow('🧭', 'Coordonate', coordinateValue, { allowHtml: true })
    ];

    if (locality) {
      infoItems.push(createInfoRow('🏙️', 'Localitate', String(locality)));
    }

    if (address) {
      infoItems.push(createInfoRow('📍', 'Adresa', String(address)));
    }

    if (administrator) {
      infoItems.push(createInfoRow('🧑‍💼', 'Administrator', String(administrator)));
    }

    if (contactPerson) {
      const adminString = administrator ? String(administrator).toLowerCase().trim() : '';
      const contactString = String(contactPerson).toLowerCase().trim();
      if (!adminString || adminString !== contactString) {
        infoItems.push(createInfoRow('🤝', 'Persoana de contact', String(contactPerson)));
      }
    }

    if (area) {
      infoItems.push(createInfoRow('📐', 'Suprafata', String(area)));
    }

    if (depth) {
      infoItems.push(createInfoRow('🌊', 'Adancime', String(depth)));
    }

    if (program) {
      infoItems.push(createInfoRow('🕒', 'Program', String(program)));
    }

    if (fees) {
      infoItems.push(createInfoRow('💶', 'Tarife', String(fees)));
    }

    if (species) {
      infoItems.push(createInfoRow('🐟', 'Specii', String(species)));
    }

    if (facilities) {
      infoItems.push(createInfoRow('🛠️', 'Facilitati', String(facilities)));
    }

    phoneNumbers.forEach((phoneValue) => {
      const trimmed = phoneValue.trim();
      if (!trimmed) {
        return;
      }
      infoItems.push(createLinkRow('☎️', 'Telefon', trimmed, normalizeTelHref(trimmed)));
    });

    emailAddresses.forEach((emailValue) => {
      const trimmed = emailValue.trim();
      if (!trimmed) {
        return;
      }
      infoItems.push(createLinkRow('✉️', 'Email', trimmed, normalizeMailHref(trimmed)));
    });

    websiteLinks.forEach((websiteValue) => {
      const trimmed = websiteValue.trim();
      if (!trimmed) {
        return;
      }
      infoItems.push(
        createLinkRow('🔗', 'Website', trimmed, normalizeWebsiteHref(trimmed), { newTab: true })
      );
    });

    const infoSection = infoItems.length
      ? `<div class="space-y-3">${infoItems.join('')}</div>`
      : '';

    const descriptionBlock = description
      ? `<div class="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-600">${sanitizeValue(
          String(description)
        )}</div>`
      : '';

    const statusBlock =
      pescuitInterzis === true
        ? `<div class="flex items-start gap-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
            <span class="text-lg leading-none">&#9888;</span>
            <span>Pescuitul este interzis in aceasta locatie.</span>
          </div>`
        : pescuitInterzis === false
        ? `<div class="flex items-start gap-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            <span class="text-lg leading-none">&#9989;</span>
            <span>Pescuitul este permis in aceasta locatie.</span>
          </div>`
        : '';

    return `
      <div class="max-w-[340px] min-w-[240px]">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xl px-4 py-4 md:px-5 md:py-5 space-y-4">
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">${visuals.prefix}</p>
            <h3 class="text-lg font-bold text-slate-900">${sanitizeValue(rawName)}</h3>
          </div>
          <div class="flex flex-wrap gap-2">${badges.join('')}</div>
          ${statusBlock}
          ${infoSection}
          ${descriptionBlock}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <a
              href="${sanitizeValue(googleMapsUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              class="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700"
            >
              <span class="text-lg leading-none">🗺️</span>
              <span>Google Maps</span>
            </a>
            <a
              href="${sanitizeValue(appleMapsUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              class="group inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-800"
            >
              <span class="text-lg leading-none">&#63743;</span>
              <span>Apple Maps</span>
            </a>
          </div>
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
      closeOnClick: true,
      maxWidth: '400px',
      className: 'ft-popup'
    })
      .setLngLat(center)
      .setHTML(buildPopupContent(feature, center, geometryType))
      .addTo(map.current);

    popup.on('close', () => {
      currentPopup.current = null;
      clearHighlightGeometry();
      setSelectedFeature(null);
      if (previousSelectedId.current !== null) {
        clearFeatureSelectionState(previousSelectedId.current);
        previousSelectedId.current = null;
      }
    });

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
      alert('Nu s-au putut obtine coordonatele pentru aceasta locatie.');
      return;
    }

    closePreviousPopupAndClearSelection();

    const featureId = getFeatureId(feature, options.idOverride ?? null);
    setSelectedFeature(feature);
    setHighlightGeometry(geometry ?? null);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const registerInteractiveHandlers = () => {
      interactiveLayerIds.forEach((layerId) => {
        mapInstance.on('mouseenter', layerId, () => {
          mapInstance.getCanvas().style.cursor = 'pointer';
        });

        mapInstance.on('mouseleave', layerId, () => {
          mapInstance.getCanvas().style.cursor = '';
        });
      });

      mapInstance.on('click', (event) => {
        const featuresAtPoint = mapInstance.queryRenderedFeatures(event.point, {
          layers: interactiveLayerIds
        }) as MapFeature[];

        if (!featuresAtPoint.length) {
          clearSelection();
          return;
        }

        const preferred = resolvePreferredFeature(featuresAtPoint);
        if (!preferred) {
          return;
        }

        handleFeatureSelection(preferred.feature, {
          geometryOverride: preferred.geometry,
          clickedLngLat: event.lngLat
        });
      });
    };

    mapInstance.once('load', () => {
      setIsMapLoaded(true);
      addFishingLayers();
      ensureHighlightLayers();
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

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!currentPopup.current) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest('.maplibregl-popup')) {
        return;
      }

      if (mapContainer.current && target && mapContainer.current.contains(target)) {
        return;
      }

      closePreviousPopupAndClearSelection();
      setSelectedFeature(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Functie pentru normalizarea textului (elimina diacriticele)
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

  const getGeometryPriority = (geometryType?: Geometry['type'] | string | null): number => {
    const type = (geometryType ?? '').toLowerCase();
    if (type === 'polygon' || type === 'multipolygon') {
      return 3;
    }
    if (type === 'linestring' || type === 'multilinestring') {
      return 2;
    }
    if (type === 'point' || type === 'multipoint') {
      return 1;
    }
    return 0;
  };

  const getLayerPriority = (layerId?: string): number => {
    if (!layerId) return 0;
    if (layerId.includes('polygon')) return 3;
    if (layerId.includes('line')) return 2;
    if (layerId.includes('point')) return 1;
    return 0;
  };

  const resolvePreferredFeature = useCallback(
    (features: MapFeature[]): { feature: MapFeature; geometry?: Geometry } | null => {
      if (!features.length) return null;

      let best: { feature: MapFeature; geometry?: Geometry } | null = null;
      let bestScore = -Infinity;

      for (const candidate of features) {
        const geometry = deriveGeometryFromFeature(candidate);
        const geometryType = geometry?.type ?? (candidate.geometry as Geometry | undefined)?.type;
        const geometryPriority = getGeometryPriority(geometryType);
        const layerPriority = getLayerPriority(candidate.layer?.id);
        const score = geometryPriority * 100 + layerPriority * 10 + (candidate.id !== undefined ? 1 : 0);

        if (score > bestScore) {
          bestScore = score;
          best = { feature: candidate, geometry };
        }
      }

      return best;
    },
    [deriveGeometryFromFeature]
  );

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
      const candidates = new Map<
        string,
        SearchResult & { geometryPriority: number; normalizedName: string }
      >();
      let fallbackCounter = 0;

      const maybeStoreCandidate = (
        key: string,
        candidate: SearchResult & { geometryPriority: number; normalizedName: string }
      ) => {
        const existing = candidates.get(key);
        if (!existing) {
          candidates.set(key, candidate);
          return;
        }

        if (candidate.score > existing.score) {
          candidates.set(key, candidate);
          return;
        }

        if (
          candidate.score === existing.score &&
          candidate.geometryPriority > existing.geometryPriority
        ) {
          candidates.set(key, candidate);
        }
      };

      features.forEach((feature) => {
        const properties = (feature.properties || {}) as Record<string, unknown>;
        const nameValue =
          (properties['nume'] as string | undefined) ??
          (properties['name'] as string | undefined) ??
          '';
        const typeValue =
          (properties['tip'] as string | undefined) ??
          (properties['type'] as string | undefined) ??
          '';
        const countyValue =
          (properties['judet'] as string | undefined) ??
          (properties['county'] as string | undefined) ??
          (properties['localitate'] as string | undefined) ??
          '';
        const addressValue =
          (properties['adresa'] as string | undefined) ??
          (properties['address'] as string | undefined) ??
          (properties['strada'] as string | undefined) ??
          '';

        const normalizedName = normalizeText(String(nameValue));
        const normalizedType = normalizeText(String(typeValue));
        const normalizedCounty = normalizeText(String(countyValue));
        const normalizedAddress = normalizeText(String(addressValue));

        let score = 0;

        if (normalizedName === normalizedQuery) score += 120;
        else if (normalizedName.startsWith(normalizedQuery)) score += 60;
        else if (normalizedName.includes(normalizedQuery)) score += 35;

        if (normalizedType && normalizedType.includes(normalizedQuery)) score += 15;
        if (normalizedCounty && normalizedCounty.includes(normalizedQuery)) score += 15;
        if (normalizedAddress && normalizedAddress.includes(normalizedQuery)) score += 10;

        const geometry = deriveGeometryFromFeature(feature);
        const geometryType = geometry?.type ?? (feature.geometry as Geometry | undefined)?.type;
        const geometryPriority = getGeometryPriority(geometryType);
        score += geometryPriority * 5;

        if (score <= 0) {
          return;
        }

        const candidate: SearchResult & { geometryPriority: number; normalizedName: string } = {
          feature,
          geometry,
          properties,
          sourceLayer: feature.layer?.id,
          id: getFeatureId(feature),
          score,
          geometryPriority,
          normalizedName
        };

        const key =
          candidate.id !== undefined && candidate.id !== null
            ? String(candidate.id)
            : normalizedName
            ? `${normalizedName}-${normalizedType || 'unknown'}`
            : `${feature.layer?.id ?? 'feature'}-${fallbackCounter++}`;

        maybeStoreCandidate(key, candidate);
      });

      const filteredFeatures: SearchResult[] = Array.from(candidates.values())
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (b.geometryPriority !== a.geometryPriority) {
            return b.geometryPriority - a.geometryPriority;
          }
          return a.normalizedName.localeCompare(b.normalizedName);
        })
        .map((item) => ({
          feature: item.feature,
          geometry: item.geometry,
          properties: item.properties,
          sourceLayer: item.sourceLayer,
          id: item.id,
          score: item.score
        }));

      console.log('Filtered features:', filteredFeatures.length);
      setSearchResults(filteredFeatures);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
    }
  }, [deriveGeometryFromFeature, getFeatureId, isMapLoaded]);

  // Debounce pentru cautare – instant si fluid
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

  // Functia pentru Enter in cautare
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

  // Functia pentru localizarea utilizatorului
  const locateUser = () => {
    if (!navigator.geolocation) {
      alert('Geolocation nu este suportata de browser.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const userCoords: [number, number] = [longitude, latitude];

        setUserLocation(userCoords);

        if (userMarker) {
          userMarker.remove();
        }

        if (userLocationPopupRef.current) {
          userLocationPopupRef.current.remove();
          userLocationPopupRef.current = null;
        }

        const mapInstance = map.current;
        if (!mapInstance) {
          setIsLocating(false);
          return;
        }

        const markerEl = document.createElement('div');
        markerEl.className = 'custom-marker';
        markerEl.style.cssText = `
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.35);
          color: #ffffff;
          font-size: 18px;
          pointer-events: auto;
          cursor: pointer;
        `;
        markerEl.textContent = String.fromCodePoint(0x1F3A3);

        const marker = new maplibregl.Marker({ element: markerEl, anchor: 'center' })
          .setLngLat(userCoords)
          .addTo(mapInstance);

        setUserMarker(marker);

        const displayName =
          (user?.user_metadata?.display_name as string | undefined) ||
          user?.email?.split('@')[0] ||
          'Utilizator';
        const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) || '';
        const userInitial = displayName.charAt(0).toUpperCase();

        let resolvedAddress = '';
        try {
          resolvedAddress = await geocodingService.reverseGeocode(latitude, longitude);
        } catch (geoError) {
          console.error('Reverse geocoding failed:', geoError);
        }
        const popupHtml = `
          <div class="min-w-[220px] max-w-[260px] rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-xl">
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold flex items-center justify-center overflow-hidden">
                ${
                  avatarUrl
                    ? `<img src="${sanitizeValue(avatarUrl)}" alt="${sanitizeValue(displayName)}" class="h-full w-full object-cover" />`
                    : sanitizeValue(userInitial)
                }
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-900">${sanitizeValue(displayName)}</p>
                <p class="text-xs text-slate-500">Pozitie curenta</p>
              </div>
            </div>
            <div class="mt-3 space-y-2 text-xs text-slate-600">
              <div class="flex items-start gap-2">
                <span class="text-base leading-none">&#128205;</span>
                <span class="font-mono">${formatCoordinate(latitude, 'lat')}, ${formatCoordinate(longitude, 'lng')}</span>
              </div>
              ${
                resolvedAddress
                  ? `<div class="flex items-start gap-2">
                      <span class="text-base leading-none">&#127968;</span>
                      <span>${sanitizeValue(resolvedAddress)}</span>
                    </div>`
                  : ''
              }
              <div class="flex items-start gap-2">
                <span class="text-base leading-none">&#128200;</span>
                <span>Acuratete aproximativa: ${Math.max(5, Math.round(accuracy))} m</span>
              </div>
            </div>
          </div>
        `;

        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: [0, -22],
          className: 'ft-user-popup'
        })
          .setLngLat(userCoords)
          .setHTML(popupHtml)
          .addTo(mapInstance);

        userLocationPopupRef.current = popup;
        marker.setPopup(popup);
        marker.togglePopup();

        mapInstance.flyTo({
          center: userCoords,
          zoom: 15,
          duration: 1500
        });

        if (mapInstance.getSource('user-location-circle')) {
          mapInstance.removeLayer('user-location-circle-fill');
          mapInstance.removeLayer('user-location-circle-stroke');
          mapInstance.removeSource('user-location-circle');
        }

        const radiusInMeters = Math.max(accuracy || 10, 5);
        const radiusInDegrees = radiusInMeters / 111000;

        mapInstance.addSource('user-location-circle', {
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

        mapInstance.addLayer({
          id: 'user-location-circle-fill',
          type: 'fill',
          source: 'user-location-circle',
          paint: {
            'fill-color': '#3B82F6',
            'fill-opacity': 0.12
          }
        });

        mapInstance.addLayer({
          id: 'user-location-circle-stroke',
          type: 'line',
          source: 'user-location-circle',
          paint: {
            'line-color': '#3B82F6',
            'line-width': 2,
            'line-opacity': 0.35
          }
        });

        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsLocating(false);

        let errorMessage = 'Nu s-a putut obtine locatia ta.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permisiunea de geolocatie a fost refuzata. Te rog sa activezi geolocatia in browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Informatiile de locatie nu sunt disponibile.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Cererea de geolocatie a expirat. Te rog sa incerci din nou.';
            break;
        }

        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
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
        "circle-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "#EF4444",
          "#F59E0B"
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          4,
          2.5
        ],
        "circle-radius": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          10,
          8
        ]
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
          "#EF4444", // Rosu pentru selectie
          ["boolean", ["get", "pescuit_interzis"], false],
          "#EF4444", // Rosu pentru pescuit interzis
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
          "#EF4444", // Rosu pentru selectie
          ["boolean", ["get", "pescuit_interzis"], false],
          "#EF4444", // Rosu pentru pescuit interzis
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
          ["boolean", ["feature-state", "selected"], false],
          "#EF4444",
          ["boolean", ["get", "pescuit_interzis"], false],
          "#EF4444",
          "#10B981"
        ],
        "circle-stroke-width": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          4,
          3
        ],
        "circle-stroke-color": "#ffffff",
        "circle-radius": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          10,
          8
        ]
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

    // Add fishing spots (balti) - polygons
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

    // Add fishing spots (balti) - points
    map.current.addLayer({
      id: "point-balti-ro",
      type: "circle",
      source: SOURCE_NAME,
      "source-layer": DATA_LAYER,
      filter: baltiPointFilter,
      paint: {
        "circle-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "#EF4444",
          "#0475c1"
        ],
        "circle-stroke-width": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          4,
          2
        ],
        "circle-stroke-color": "rgba(250, 247, 247, 1)",
        "circle-radius": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          9,
          6
        ]
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
        title="Test Harta Mapcherry - Fish Trophy"
        description="Pagina de test pentru noua integrare Mapcherry cu harti detaliate pentru pescuit"
        keywords="test harta, mapcherry, pescuit, balti, ape"
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
                <span className="font-medium">Inapoi la Home</span>
              </Link>
            </div>

            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">
                Test Harta Mapcherry
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="relative">
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-3xl shadow-lg px-5 py-4 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                id="search-input"
                name="search"
                type="text"
                placeholder="Cauta locatii, judete, rauri, lacuri..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-full bg-transparent text-sm md:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setShowSearchResults(false)
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:bg-slate-50 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-3 z-40">
                <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-2xl max-h-80 overflow-y-auto">
                  {searchResults.map((result, index) => {
                    const properties = result.properties
                    const rawType = String(
                      (properties['tip'] as string | undefined) ??
                        (properties['type'] as string | undefined) ??
                        ''
                    )
                    const typeKey = rawType.toLowerCase()
                    const typeLabel = rawType || 'Tip necunoscut'
                    const nameLabel = String(
                      (properties['nume'] as string | undefined) ??
                        (properties['name'] as string | undefined) ??
                        'Locatie necunoscuta'
                    )
                    const geometryType =
                      result.geometry?.type || result.feature.geometry?.type || ''
                    const geometryLabel = geometryType
                      ? geometryType.replace(/([a-z])([A-Z])/g, '$1 $2')
                      : ''
                    const county =
                      (properties['judet'] as string | undefined) ||
                      (properties['county'] as string | undefined) ||
                      (properties['localitate'] as string | undefined) ||
                      ''
                    const icon =
                      typeKey === 'magazin'
                        ? String.fromCodePoint(0x1F6D2)
                        : typeKey === 'apa'
                        ? String.fromCodePoint(0x1F30A)
                        : String.fromCodePoint(0x1F3A3)
                    return (
                      <button
                        key={index}
                        onClick={() => handleSearchResultClick(result)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 flex items-center gap-3 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-lg">
                            <span>{icon}</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">{nameLabel}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                              {typeLabel}
                            </span>
                            {geometryLabel && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                {geometryLabel}
                              </span>
                            )}
                          </div>
                          {county && (
                            <div className="mt-1 text-xs text-slate-500 truncate">
                              {String(county)}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {showSearchResults && searchResults.length === 0 && searchQuery && (
              <div className="absolute left-0 right-0 mt-3 z-40">
                <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-2xl px-5 py-4 text-center text-slate-500">
                  Nu s-au gasit locatii pentru "{searchQuery}"
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute -inset-1 rounded-[32px] bg-gradient-to-br from-sky-200 via-emerald-200 to-blue-200 opacity-60 blur-lg" />
            <div className="relative rounded-3xl border border-slate-200 shadow-2xl bg-white overflow-hidden">
              <div
                ref={mapContainer}
                className="w-full"
                style={{
                  aspectRatio: isMobile ? '3/4' : '16/9',
                  minHeight: isMobile ? '420px' : '560px'
                }}
              />

              {!isMapLoaded && (
                <div className="absolute inset-0 bg-white/85 backdrop-blur-sm flex items-center justify-center z-20">
                  <div className="text-center space-y-3">
                    <div className="mx-auto h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-600 font-medium">Se incarca harta...</p>
                  </div>
                </div>
              )}

              {isMapLoaded && map.current && (
                <div className="absolute bottom-5 right-5 z-30 flex flex-col items-end gap-2">
                  {selectedFeature && (
                    <button
                      onClick={clearSelection}
                      className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-500 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-rose-600"
                      title="Sterge selectia"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={locateUser}
                    disabled={isLocating}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-lg transition hover:-translate-y-0.5 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                    title={isLocating ? 'Se localizeaza...' : 'Locatia mea'}
                  >
                    {isLocating ? (
                      <div className="h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                    ) : (
                      <span className="text-lg">{String.fromCodePoint(0x1F3A3)}</span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (map.current) {
                        map.current.flyTo({
                          center: [25.0094, 45.9432],
                          zoom: 6,
                          duration: 1000
                        })
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-lg transition hover:-translate-y-0.5 hover:text-blue-600"
                    title="Centreaza pe Romania"
                  >
                    <Navigation className="h-4 w-4" />
                  </button>
                </div>
              )}

              {isMapLoaded && (
                <div className="absolute bottom-5 left-5 z-30 max-w-xs">
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 px-5 py-4 text-sm text-slate-600">
                    <h3 className="font-semibold text-slate-900 text-base mb-2">Test harta Mapcherry</h3>
                    <div className="space-y-1">
                      <p><span className="font-semibold text-slate-700">Token:</span> {MAPCHERRY_CONFIG.mapToken.substring(0, 8)}...</p>
                      <p><span className="font-semibold text-slate-700">Dataset:</span> {MAPCHERRY_CONFIG.datasetKey}</p>
                      <p><span className="font-semibold text-slate-700">Status:</span> {isMapLoaded ? 'Activ' : 'Se incarca...'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/40 shadow-inner" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
