
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Fish, Users, Map, MapPin, ShoppingBag, Navigation, X } from 'lucide-react';
import L from 'leaflet';
import { fishingLocations, fishingZones, fishingShops } from '@/services/locations';
import { geolocationService } from '@/services/geolocation';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix pentru iconițele Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Home() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showShops, setShowShops] = useState(false);
  const [showShopPopup, setShowShopPopup] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Inițializează harta
    const map = L.map(mapRef.current).setView([45.9432, 25.0094], 7);
    mapInstanceRef.current = map;

    // Adaugă layer-ul OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Adaugă zonele de pescuit
    fishingZones.forEach(zone => {
      L.polygon(zone.coords, {
        color: zone.color,
        weight: 2,
        fillColor: zone.color,
        fillOpacity: 0.1
      }).addTo(map).bindPopup(`
        <div class="p-3">
          <h3 class="font-bold text-lg mb-2">${zone.name}</h3>
          <p class="text-sm text-gray-600 mb-2">${zone.description}</p>
          <span class="inline-block px-2 py-1 text-xs rounded ${zone.protected ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}">
            ${zone.protected ? 'Protejat' : 'Deschis'}
          </span>
        </div>
      `);
    });

    // Funcție pentru adăugarea locațiilor pe hartă
    const addLocationsToMap = (locations: typeof fishingLocations, showAll: boolean = false) => {
      // Șterge markerii existenți
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      // Adaugă locațiile filtrate
      const locationsToShow = showAll ? locations : 
        activeFilter === 'all' ? locations : 
        locations.filter(loc => loc.type === activeFilter);

      locationsToShow.forEach(location => {
        const iconSize = 32;
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div class="w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                   <Fish className="w-5 h-5 text-white" />
                 </div>`,
          iconSize: [iconSize, iconSize],
          iconAnchor: [iconSize / 2, iconSize / 2]
        });

        const marker = L.marker(location.coords, { icon }).addTo(map);
        
        marker.bindPopup(`
          <div class="p-4 min-w-[300px]">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Fish className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 class="font-bold text-lg">${location.name}</h3>
                <p class="text-sm text-gray-600">${location.county}, ${location.region}</p>
              </div>
            </div>
            
            <p class="text-gray-700 mb-3">${location.description}</p>
            
            <div class="mb-3">
              <div class="flex flex-wrap gap-1 mb-2">
                ${location.species.map(species => 
                  `<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">${species}</span>`
                ).join('')}
              </div>
              <div class="flex flex-wrap gap-1">
                ${location.facilities.map(facility => 
                  `<span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">${facility}</span>`
                ).join('')}
              </div>
            </div>
            
            <div class="flex items-center justify-between text-sm text-gray-600 mb-3">
              <span>📊 ${location.recordCount} recorduri</span>
              <span>🚗 ${location.parking ? 'Parcare' : 'Fără parcare'}</span>
              <span>🏕️ ${location.camping ? 'Camping' : 'Fără camping'}</span>
            </div>
            
            <div class="flex gap-2">
              <button class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors">
                Vezi recorduri
              </button>
              <button class="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors">
                Adaugă record
              </button>
            </div>
          </div>
        `);
      });
    };

    // Adaugă locațiile inițiale
    addLocationsToMap(fishingLocations, true);

    // Adaugă magazinele de pescuit (dacă sunt vizibile)
    if (showShops) {
      fishingShops.forEach(shop => {
        const iconSize = 28;
        const icon = L.divIcon({
          className: 'custom-shop-marker',
          html: `<div class="w-7 h-7 bg-orange-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                   <ShoppingBag className="w-4 h-4 text-white" />
                 </div>`,
          iconSize: [iconSize, iconSize],
          iconAnchor: [iconSize / 2, iconSize / 2]
        });

        const marker = L.marker(shop.coords, { icon }).addTo(map);
        
        marker.bindPopup(`
          <div class="p-3 min-w-[250px]">
            <div class="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              <h3 class="font-bold text-lg">${shop.name}</h3>
            </div>
            <p class="text-sm text-gray-600 mb-2">${shop.address}, ${shop.city}</p>
            <p class="text-gray-700 mb-2">${shop.description}</p>
            ${shop.phone ? `<p class="text-sm text-blue-600">📞 ${shop.phone}</p>` : ''}
            ${shop.website ? `<a href="${shop.website}" target="_blank" class="text-sm text-blue-600 hover:underline">🌐 Website</a>` : ''}
            <div class="mt-3 pt-3 border-t">
              <button onclick="window.showShopPopup = true" class="w-full bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors">
                Vrei să apară pe hartă?
              </button>
            </div>
          </div>
        `);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [showShops, activeFilter]);

  // Funcție pentru obținerea locației utilizatorului
  const getUserLocation = async () => {
    try {
      const location = await geolocationService.getCurrentPosition();
      setUserLocation({ lat: location.latitude, lng: location.longitude });
      
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([location.latitude, location.longitude], 12);
      }
    } catch (error) {
      console.error('Eroare la obținerea locației:', error);
      alert('Nu s-a putut obține locația. Verifică permisiunile browser-ului.');
    }
  };

  // Funcție pentru filtrarea locațiilor
  const filterLocations = (type: string) => {
    setActiveFilter(type);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero Section */}
      <section className="py-12 md:py-16 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Descoperă <span className="text-blue-600">Locațiile</span> de Pescuit
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Harta interactivă cu toate locațiile de pescuit din România. Găsește locul perfect pentru următorul trofeu!
          </p>
        </div>
      </section>

      {/* Map Section */}
      <section className="px-4 pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Map Controls */}
          <div className="mb-6 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => filterLocations('all')}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-blue-500 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Map className="w-5 h-5 inline mr-2" />
              Toate
            </button>
            <button
              onClick={() => filterLocations('river')}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                activeFilter === 'river'
                  ? 'bg-blue-500 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Fish className="w-5 h-5 inline mr-2" />
              Râuri
            </button>
            <button
              onClick={() => filterLocations('lake')}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                activeFilter === 'lake'
                  ? 'bg-blue-500 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <MapPin className="w-5 h-5 inline mr-2" />
              Lacuri
            </button>
            <button
              onClick={() => filterLocations('pond')}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                activeFilter === 'pond'
                  ? 'bg-blue-500 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <MapPin className="w-5 h-5 inline mr-2" />
              Bălți Sălbatice
            </button>
            <button
              onClick={() => filterLocations('private_pond')}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                activeFilter === 'private_pond'
                  ? 'bg-blue-500 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Trophy className="w-5 h-5 inline mr-2" />
              Bălți Private
            </button>
            <button
              onClick={() => setShowShops(!showShops)}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                showShops
                  ? 'bg-orange-500 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <ShoppingBag className="w-5 h-5 inline mr-2" />
              Magazine de Pescuit
            </button>
          </div>

          {/* Map Container */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden relative">
            <div className="p-4 bg-gray-50 border-b">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Map className="w-6 h-6 text-blue-500" />
                Harta Interactivă
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {fishingLocations.length} locații de pescuit • {fishingShops.length} magazine • {fishingZones.length} zone protejate
              </p>
            </div>
            
            {/* Buton de geolocație */}
            <button
              onClick={getUserLocation}
              className="absolute top-20 right-4 z-[1000] bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110"
              title="Centreză pe locația mea"
            >
              <Navigation className="w-5 h-5" />
            </button>
            
            <div ref={mapRef} className="h-[600px] w-full relative z-10" />
          </div>
        </div>
      </section>

      {/* Popup pentru magazine */}
      {showShopPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Vrei să apară pe hartă?</h3>
              <button
                onClick={() => setShowShopPopup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Dacă ai un magazin de pescuit și vrei să apară pe hartă, trimite-ne un email cu:
            </p>
            <ul className="text-sm text-gray-600 mb-6 space-y-2">
              <li>• Numele magazinului</li>
              <li>• Adresa completă</li>
              <li>• Numărul de telefon</li>
              <li>• Website (dacă ai)</li>
              <li>• Program de funcționare</li>
              <li>• Descrierea serviciilor</li>
            </ul>
            <div className="text-center">
              <a
                href="mailto:contact@fishtrophy.ro?subject=Magazin de pescuit pentru hartă"
                className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Trimite email
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              De ce să folosești Fish Trophy?
            </h2>
            <p className="text-lg text-gray-600">
              Platforma completă pentru pescarii din România
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Map className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Hărți Interactive</h3>
              <p className="text-gray-600">
                Descoperă locațiile de pescuit cu coordonate precise și informații detaliate
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Recorduri Verificate</h3>
              <p className="text-gray-600">
                Sistemul de recorduri cu verificare și aprobare pentru trofeele tale
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Comunitate</h3>
              <p className="text-gray-600">
                Conectează-te cu alți pescari și împărtășește experiențele tale
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-green-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">
            Gata să începi să pescuești?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Înregistrează-te gratuit și începe să explorezi locațiile de pescuit din România
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
            >
              Înregistrează-te
            </Link>
            <Link
              to="/submission-guide"
              className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              Ghid Recorduri
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
