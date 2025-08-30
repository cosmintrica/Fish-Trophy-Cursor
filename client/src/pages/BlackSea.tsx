import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Fish, MapPin, Navigation, Waves, Anchor, Ship, Compass } from 'lucide-react';
import L from 'leaflet';
import { fishingLocations } from '@/services/locations';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issues
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function BlackSea() {
  const mapInstanceRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Inițializează harta focusată pe litoralul românesc
    const map = L.map(mapContainerRef.current, {
      center: [44.1733, 28.6383], // Constanța - centrul litoralului
      zoom: 8,
      zoomControl: true,
      attributionControl: true
    });

    // Adaugă layer-ul OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    // Adaugă locațiile maritime inițiale
    addMaritimeLocationsToMap(map, 'all');

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, []);

  // Funcție pentru adăugarea locațiilor maritime pe hartă
  const addMaritimeLocationsToMap = (map: L.Map, filterType: string) => {
    // Șterge markerii existenți
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Filtrează doar locațiile maritime
    const maritimeLocations = fishingLocations.filter(loc => loc.type === 'maritime');
    const locationsToShow = filterType === 'all' ? maritimeLocations : 
      maritimeLocations.filter(loc => loc.type === filterType);

    locationsToShow.forEach(location => {
      const iconSize = 45; // Marker mai mare pentru Marea Neagră
      const icon = L.divIcon({
        className: 'custom-marker-maritime',
        html: `<div class="w-11 h-11 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center hover:scale-110 transition-transform duration-200">
                 <Waves className="w-6 h-6 text-white" />
               </div>`,
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize / 2]
      });

      const marker = L.marker(location.coords, { icon }).addTo(map);
      
      marker.bindPopup(`
        <div class="p-4 min-w-[300px] max-w-[350px] bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
              <Waves className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 class="font-bold text-lg text-cyan-900">${location.name}</h3>
              <p class="text-sm text-cyan-700">${location.county}, Litoralul Românesc</p>
            </div>
          </div>
          
          <p class="text-cyan-800 mb-3">${location.description}</p>
          
          <div class="mb-3">
            <div class="flex flex-wrap gap-1 mb-2">
              ${location.species.map(species => 
                `<span class="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs rounded">${species}</span>`
              ).join('')}
            </div>
            <div class="flex flex-wrap gap-1">
              ${location.facilities.map(facility => 
                `<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">${facility}</span>`
              ).join('')}
            </div>
          </div>
          
          <div class="flex items-center justify-between text-sm text-cyan-700 mb-3">
            <span>📊 ${location.recordCount} recorduri</span>
            <span>🚗 ${location.parking ? 'Parcare' : 'Fără parcare'}</span>
            <span>🏕️ ${location.camping ? 'Camping' : 'Fără camping'}</span>
          </div>
          
          <div class="flex gap-2">
            <button class="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors">
              Vezi recorduri
            </button>
            <button class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors">
              Adaugă record
            </button>
          </div>
        </div>
      `);
    });
  };

  // Funcție pentru filtrarea locațiilor maritime
  const filterMaritimeLocations = (type: string) => {
    setActiveFilter(type);
    
    if (mapInstanceRef.current) {
      addMaritimeLocationsToMap(mapInstanceRef.current, type);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
      {/* Hero Section - Maritime Theme */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl mr-8">
              <Waves className="w-14 h-14 text-white" />
            </div>
            <div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent leading-tight">
                Marea Neagră
              </h1>
              <p className="text-2xl md:text-3xl text-cyan-700 mt-4 font-medium">
                Destinația Pescarilor Maritimi din România
              </p>
            </div>
          </div>
          
          <p className="text-xl md:text-2xl text-cyan-800 max-w-4xl mx-auto leading-relaxed mb-8">
            Explorează apele Mării Negre și descoperă locațiile de pescuit maritime de pe litoralul românesc. 
            <br />
            <span className="font-semibold">Harta interactivă cu toate locațiile maritime!</span>
          </p>
        </div>
      </section>

      {/* Maritime Map Section */}
      <section className="px-4 sm:px-6 lg:px-8 mb-16">
        <div className="max-w-7xl mx-auto">
          {/* Maritime Map Controls */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                { type: 'all', label: 'Toate Locațiile', icon: Compass, color: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700' },
                { type: 'maritime', label: 'Locații Maritime', icon: Waves, color: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700' }
              ].map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  onClick={() => filterMaritimeLocations(type)}
                  className={`${color} text-white px-6 py-3 rounded-2xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-3 ${
                    activeFilter === type ? 'ring-4 ring-cyan-300 scale-105' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-base">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Maritime Map Container */}
          <div className="relative">
            <div 
              ref={mapContainerRef} 
              className="w-full h-[500px] md:h-[600px] lg:h-[700px] rounded-3xl shadow-2xl border-4 border-cyan-200 overflow-hidden"
              style={{ zIndex: 1 }}
            />
            
            {/* Maritime Info Overlay */}
            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-cyan-200">
              <h4 className="text-sm font-semibold text-cyan-900 mb-2">🌊 Litoralul Românesc</h4>
              <div className="text-xs text-cyan-700 space-y-1">
                <div>• Constanța - Portul Principal</div>
                <div>• Mamaia - Plaja Centrală</div>
                <div>• Eforie - Plaja Modern</div>
                <div>• Costinești - Plaja Tineretului</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Maritime Features */}
      <section className="px-4 sm:px-6 lg:px-8 mb-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-cyan-900 mb-12">
            Caracteristici Maritime
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-cyan-200">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                <Waves className="w-10 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-cyan-900 mb-4 text-center">
                Harta Interactivă
              </h3>
              <p className="text-cyan-700 text-center leading-relaxed">
                Explorează toate locațiile maritime cu o hartă interactivă specializată pentru Marea Neagră
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-cyan-200">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                <Ship className="w-10 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-cyan-900 mb-4 text-center">
                Locații Maritime
              </h3>
              <p className="text-cyan-700 text-center leading-relaxed">
                Porturi, plaje, zone protejate și toate locațiile de pescuit de pe litoralul românesc
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-cyan-200">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                <Fish className="w-10 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-cyan-900 mb-4 text-center">
                Specii Marine
              </h3>
              <p className="text-cyan-700 text-center leading-relaxed">
                Toate speciile marine din Marea Neagră cu informații detaliate și recorduri
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Maritime Theme */}
      <section className="px-4 sm:px-6 lg:px-8 mb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-3xl p-8 md:p-12 shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Pregătit pentru Aventura Maritimă?
            </h2>
            <p className="text-lg md:text-xl text-cyan-100 mb-8 leading-relaxed">
              Explorează locațiile maritime și descoperă pescuitul pe Marea Neagră
            </p>
            <Link
              to="/"
              className="inline-block bg-white text-cyan-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-gray-50"
            >
              Explorează Locațiile Terestre
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
