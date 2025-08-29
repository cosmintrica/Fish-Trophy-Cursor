
import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Fish, Users, Map } from 'lucide-react';
import L from 'leaflet';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

const Home: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Initialize Leaflet map
      const map = L.map(mapRef.current).setView([45.9432, 24.9668], 7); // Romania center
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Add fishing locations
      const fishingLocations: Array<{
        name: string;
        coords: [number, number];
        type: string;
        description: string;
      }> = [
        {
          name: 'Marea Neagră - Constanța',
          coords: [44.1733, 28.6383],
          type: 'Maritim',
          description: 'Pescuit în larg și de coastă'
        },
        {
          name: 'Delta Dunării',
          coords: [45.4167, 29.2833],
          type: 'Delta',
          description: 'Pescuit în canale și lacuri'
        },
        {
          name: 'Lacul Snagov',
          coords: [44.7167, 26.1833],
          type: 'Lac',
          description: 'Pescuit de crap și știucă'
        },
        {
          name: 'Lacul Bicaz',
          coords: [46.8167, 25.9167],
          type: 'Lac de munte',
          description: 'Pescuit de păstrăv și lipan'
        },
        {
          name: 'Râul Someș',
          coords: [47.1833, 23.9167],
          type: 'Râu de munte',
          description: 'Pescuit de păstrăv și lipan'
        },
        {
          name: 'Lacul Vidra',
          coords: [45.3667, 26.1667],
          type: 'Lac artificial',
          description: 'Pescuit de crap și caras'
        }
      ];

      // Custom icon for fishing locations
      const fishingIcon = L.divIcon({
        className: 'custom-fishing-icon',
        html: '🎣',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      // Add markers for each location
      fishingLocations.forEach(location => {
        const marker = L.marker(location.coords, { icon: fishingIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-3">
              <h3 class="font-bold text-lg mb-2">${location.name}</h3>
              <p class="text-sm text-gray-600 mb-2">${location.type}</p>
              <p class="text-sm text-gray-700">${location.description}</p>
              <button class="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                Vezi recorduri
              </button>
            </div>
          `);
      });

      // Add some fishing zones
      const fishingZones: Array<{
        name: string;
        coords: [number, number][];
        color: string;
      }> = [
        {
          name: 'Zona Marea Neagră',
          coords: [[43.5, 27.5], [43.5, 29.5], [45.5, 29.5], [45.5, 27.5]],
          color: '#3B82F6'
        },
        {
          name: 'Zona Delta Dunării',
          coords: [[44.5, 28.5], [44.5, 30.5], [46.5, 30.5], [46.5, 28.5]],
          color: '#10B981'
        }
      ];

      fishingZones.forEach(zone => {
        L.polygon(zone.coords, {
          color: zone.color,
          weight: 2,
          fillColor: zone.color,
          fillOpacity: 0.1
        }).addTo(map).bindTooltip(zone.name);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section - Mic și elegant */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-6">
              <img src="/icon_free.png" alt="Fish Trophy" className="w-16 h-16" onError={(e) => {
                console.error('Failed to load hero icon:', e);
                e.currentTarget.style.display = 'none';
              }} />
            </div>
            <h1 className="text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              Fish Trophy
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Platforma completă pentru pescarii din România. Înregistrează-ți trofeele, 
              urmărește recordurile și explorează locațiile de pescuit.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/leaderboards"
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <Trophy className="w-5 h-5 mr-2" />
              Vezi Recordurile
            </Link>
            <Link
              to="/submission-guide"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-slate-700 font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border border-slate-200"
            >
              <Map className="w-5 h-5 mr-2" />
              Ghid Submisie
            </Link>
          </div>
        </div>
      </section>

      {/* Harta cu Locații - Elementul Principal */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              Harta Locațiilor de Pescuit
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Explorează cele mai bune locații de pescuit din România. 
              Vezi unde au fost prinse trofeele record și descoperă noi locații.
            </p>
          </div>
          
          {/* Harta Leaflet Interactivă */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-800">
                  🗺️ Harta Interactivă
                </h3>
                <div className="flex items-center space-x-4 text-sm text-slate-600">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    <span>Zone de pescuit</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🎣</span>
                    <span>Locații</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div 
              ref={mapRef} 
              className="w-full h-96 bg-slate-100"
              style={{ minHeight: '400px' }}
            ></div>
            
            <div className="p-6 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <span className="text-lg">🌊</span>
                  <p className="font-medium text-slate-700">Marea Neagră</p>
                  <p className="text-slate-500">Pescuit maritim</p>
                </div>
                <div className="text-center">
                  <span className="text-lg">🏞️</span>
                  <p className="font-medium text-slate-700">Lacuri</p>
                  <p className="text-slate-500">Pescuit de pește dulce</p>
                </div>
                <div className="text-center">
                  <span className="text-lg">🏔️</span>
                  <p className="font-medium text-slate-700">Râuri de munte</p>
                  <p className="text-slate-500">Pescuit de păstrăv</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              De ce Fish Trophy?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Platforma ta completă pentru înregistrarea și gestionarea trofeelor de pescuit
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Recorduri Oficiale</h3>
              <p className="text-slate-600 leading-relaxed">
                Înregistrează-ți trofeele și urmărește recordurile oficiale din România. 
                Fiecare captură este verificată și documentată.
              </p>
            </div>
            
            <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <Fish className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Specii Complete</h3>
              <p className="text-slate-600 leading-relaxed">
                Baza de date completă cu toate speciile de pești din România. 
                Informații detaliate despre fiecare specie și habitatul său.
              </p>
            </div>
            
            <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Comunitate</h3>
              <p className="text-slate-600 leading-relaxed">
                Conectează-te cu alți pescari din România. 
                Împărtășește experiențele și descoperă noi locații de pescuit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6 tracking-tight">
            Începe să înregistrezi trofeele tale
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Alătură-te comunității Fish Trophy și fii parte din istoria pescuitului din România
          </p>
          <Link
            to="/leaderboards"
            className="inline-flex items-center justify-center px-10 py-5 bg-white text-blue-600 font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            <Trophy className="w-6 h-6 mr-3" />
            Vezi Recordurile
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
