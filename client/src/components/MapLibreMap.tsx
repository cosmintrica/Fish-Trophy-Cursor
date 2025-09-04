// components/MapLibreMap.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map, MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getAllLocationsAsGeoJSON } from '@/services/maplibreLocations';

// Stilul hărții - folosim un stil gratuit
const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

interface MapLibreMapProps {
  className?: string;
  onLocationClick?: (location: any) => void;
}

export default function MapLibreMap({ className = "w-full h-[calc(100vh-64px)]", onLocationClick }: MapLibreMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Inițializare hartă
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [25.0, 45.8], // Centrul României
      zoom: 6,
      attributionControl: {},
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      fadeDuration: 0, // Elimină fade pentru performanță mai bună pe mobil
    });

    // Controale
    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }));
    map.current.addControl(new maplibregl.GeolocateControl({ 
      trackUserLocation: true
    }));

    // Când harta se încarcă
    map.current.on('load', async () => {
      try {
        setLoading(true);
        
        // Încarcă toate locațiile
        const geoJsonData = await getAllLocationsAsGeoJSON();
        
        // Adaugă sursa GeoJSON cu clustering
        map.current!.addSource('fishing-locations', {
          type: 'geojson',
          data: geoJsonData,
          cluster: true,
          clusterMaxZoom: 12,
          clusterRadius: 40,
        });

        // Layer pentru clustere
        map.current!.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'fishing-locations',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#86efac',    // Verde deschis pentru clustere mici
              25, '#22c55e', // Verde pentru clustere medii
              100, '#15803d' // Verde închis pentru clustere mari
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              16, 25, 22, 100, 28
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': '#0a0a0a'
          }
        });

        // Layer pentru numărul din clustere
        map.current!.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'fishing-locations',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-size': 12
          },
          paint: {
            'text-color': '#0a0a0a'
          }
        });

        // Layer pentru punctele individuale (stilizate după tip)
        map.current!.addLayer({
          id: 'unclustered-points',
          type: 'circle',
          source: 'fishing-locations',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': 6,
            'circle-color': [
              'match',
              ['get', 'type'],
              'lac', '#60a5fa',           // Albastru pentru lacuri
              'rau', '#22d3ee',           // Cyan pentru râuri
              'balti_private', '#f59e0b', // Portocaliu pentru bălți private
              'balti_salbatic', '#10b981', // Verde pentru bălți sălbatice
              'mare', '#3b82f6',          // Albastru închis pentru mare
              'delta', '#8b5cf6',         // Mov pentru delta
              '#a3a3a3'                   // Gri pentru alte tipuri
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': '#0a0a0a'
          }
        });

        // Click pe cluster - zoom în el
        map.current!.on('click', 'clusters', (e: MapMouseEvent) => {
          const features = map.current!.queryRenderedFeatures(e.point, { layers: ['clusters'] });
          const clusterId = features[0].properties?.cluster_id;
          const source = map.current!.getSource('fishing-locations') as maplibregl.GeoJSONSource;
          
          source.getClusterExpansionZoom(clusterId).then((zoom: number) => {
            map.current!.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom: zoom
            });
          }).catch((err: any) => {
            console.error('Error expanding cluster:', err);
          });
        });

        // Click pe punct individual - afișează popup
        map.current!.on('click', 'unclustered-points', (e: any) => {
          const feature = e.features?.[0];
          if (!feature) return;

          const coords = (feature.geometry as any).coordinates.slice() as [number, number];
          const props = feature.properties || {};

          // Callback pentru click
          if (onLocationClick) {
            onLocationClick(props);
          }

          // Popup cu informații
          new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: '300px'
          })
            .setLngLat(coords)
            .setHTML(`
              <div style="min-width: 200px; font-family: system-ui, sans-serif;">
                <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">
                  ${props.name || 'Fără nume'}
                </div>
                ${props.subtitle ? `<div style="font-size: 12px; opacity: 0.8; margin-bottom: 8px;">${props.subtitle}</div>` : ''}
                <div style="font-size: 12px; line-height: 1.4;">
                  <div><strong>Tip:</strong> ${props.type || '-'}</div>
                  <div><strong>Județ:</strong> ${props.county || '-'}</div>
                  <div><strong>Regiune:</strong> ${props.region || '-'}</div>
                  ${props.administrare ? `<div><strong>Administrare:</strong> ${props.administrare}</div>` : ''}
                </div>
              </div>
            `)
            .addTo(map.current!);
        });

        // Cursor pointer pentru clustere și puncte
        map.current!.on('mouseenter', 'clusters', () => {
          if (map.current!.getCanvas()) {
            map.current!.getCanvas().style.cursor = 'pointer';
          }
        });

        map.current!.on('mouseleave', 'clusters', () => {
          if (map.current!.getCanvas()) {
            map.current!.getCanvas().style.cursor = '';
          }
        });

        map.current!.on('mouseenter', 'unclustered-points', () => {
          if (map.current!.getCanvas()) {
            map.current!.getCanvas().style.cursor = 'pointer';
          }
        });

        map.current!.on('mouseleave', 'unclustered-points', () => {
          if (map.current!.getCanvas()) {
            map.current!.getCanvas().style.cursor = '';
          }
        });

        setLoading(false);
      } catch (err) {
        console.error('Error loading map data:', err);
        setError('Eroare la încărcarea datelor hărții');
        setLoading(false);
      }
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onLocationClick]);

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă harta...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-red-50`}>
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">⚠️</div>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className={className} />;
}
