
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Fish, MapPin, Navigation, X } from 'lucide-react';
import L from 'leaflet';
import { fishingLocations } from '@/services/locations';

import { geocodingService } from '@/services/geocoding';
import { useAuth } from '@/lib/auth';
import SEOHead from '@/components/SEOHead';
import { useStructuredData } from '@/hooks/useStructuredData';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issues
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Home() {
  const { user } = useAuth();
  const { websiteData, organizationData } = useStructuredData();
  const mapInstanceRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const locationsLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showShopPopup, setShowShopPopup] = useState(false);
  const [showLocationRequest, setShowLocationRequest] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Detect if mobile device
    const isMobile = window.innerWidth <= 768;
    
    // Inițializează harta cu setări optimizate pentru performanță
    const map = L.map(mapContainerRef.current, {
      center: [45.9432, 25.0094], // Centrul României
      zoom: isMobile ? 6 : 7, // Zoom diferit pentru desktop vs mobil
      minZoom: isMobile ? 5 : 6, // Zoom minim diferit
      maxZoom: 18,
      zoomControl: true,
      attributionControl: true,
      // Optimizări pentru performanță
      preferCanvas: true, // Folosește Canvas pentru toate dispozitivele
      zoomSnap: isMobile ? 0.5 : 1,
      zoomDelta: isMobile ? 0.5 : 1,
      wheelPxPerZoomLevel: isMobile ? 120 : 60,
      // Optimizări suplimentare pentru performanță
      renderer: L.canvas(),
      fadeAnimation: false,
      markerZoomAnimation: false
    });

    // Adaugă layer-ul OpenStreetMap cu optimizări pentru performanță
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
      subdomains: ['a', 'b', 'c'],
      // Optimizări pentru performanță
      keepBuffer: 2,
      updateWhenIdle: false,
      updateWhenZooming: false,
      // Cache optimizat
      maxNativeZoom: 18,
      tileSize: 256,
      zoomOffset: 0
    }).addTo(map);

    mapInstanceRef.current = map;

    // Creează layer separat pentru locații
    const locationsLayer = L.layerGroup().addTo(map);
    locationsLayerRef.current = locationsLayer;

    // Adaugă locațiile inițiale cu delay pentru performanță
    setTimeout(() => {
      addLocationsToMap(map, 'all');
    }, 100);

    // Adaugă event listener pentru click pe hartă să închidă popup-urile
    map.on('click', () => {
      setShowShopPopup(false);
      setShowLocationRequest(false);
    });

    // Verifică dacă utilizatorul a acceptat deja locația și o afișează
    const locationAccepted = localStorage.getItem('locationAccepted');
    if (locationAccepted === 'true' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Obține adresa prin reverse geocoding
          const address = await geocodingService.reverseGeocode(latitude, longitude);
          
          // Creează marker cu fundal alb și design îmbunătățit
          const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: `<div class="w-14 h-14 bg-white border-4 border-blue-500 rounded-full shadow-2xl flex items-center justify-center text-3xl transform hover:scale-110 transition-transform duration-200">🎣</div>`,
            iconSize: [56, 56],
            iconAnchor: [28, 28]
          });

          const userMarker = L.marker([latitude, longitude], { icon: userIcon });
          userLocationMarkerRef.current = userMarker;
          userMarker.addTo(map);

          // Adaugă popup cu design îmbunătățit
          const userName = user?.displayName || user?.email?.split('@')[0] || 'Utilizator';
          const userPhoto = user?.photoURL || '';
          
          userMarker.bindPopup(`
            <div class="p-3 min-w-[180px] max-w-[200px] bg-white rounded-lg shadow-md border border-gray-200">
              <div class="text-center mb-2">
                <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 border border-white rounded-full flex items-center justify-center overflow-hidden shadow-sm mx-auto mb-1">
                  ${userPhoto ? 
                    `<img src="${userPhoto}" alt="${userName}" class="w-full h-full object-cover rounded-full" />` :
                    `<span class="text-white font-bold text-sm">${userName.charAt(0).toUpperCase()}</span>`
                  }
                </div>
                <h3 class="font-bold text-sm text-gray-800 mb-1">${userName}</h3>
                <p class="text-xs text-gray-600">📍 Locația ta curentă</p>
              </div>
              
              <div class="space-y-1">
                <div class="bg-gray-50 rounded p-1.5">
                  <p class="text-xs font-medium text-gray-700 mb-0.5">GPS</p>
                  <p class="text-xs text-gray-600 font-mono">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</p>
                </div>
                
                <div class="bg-gray-50 rounded p-1.5">
                  <p class="text-xs font-medium text-gray-700 mb-0.5">Adresă</p>
                  <p class="text-xs text-gray-600">${address}</p>
                </div>
              </div>
            </div>
          `, {
            className: 'custom-popup',
            maxWidth: 220,
            closeButton: true,
            autoClose: false,
            closeOnClick: false
          });
        },
        (error) => {
          console.error('Eroare la obținerea locației:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minute cache
        }
      );
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, [user]);

  // Funcție pentru adăugarea locațiilor pe hartă
  const addLocationsToMap = (_map: L.Map, filterType: string) => {
    // Șterge doar markerii din layer-ul de locații
    if (locationsLayerRef.current) {
      locationsLayerRef.current.clearLayers();
    }

    // Adaugă locațiile filtrate
    const locationsToShow = filterType === 'all' ? fishingLocations : 
      fishingLocations.filter(loc => loc.type === filterType);

    // Adaugă markerii în batch pentru performanță mai bună
    const markers: L.Marker[] = [];
    
    locationsToShow.forEach(location => {
      // Determină culoarea în funcție de tipul locației
      let markerColor = 'bg-gray-500'; // default pentru 'all'
      let borderColor = 'border-gray-600';
      
      switch (location.type) {
        case 'river':
          markerColor = 'bg-emerald-500';
          borderColor = 'border-emerald-600';
          break;
        case 'lake':
          markerColor = 'bg-blue-500';
          borderColor = 'border-blue-600';
          break;
        case 'pond':
          markerColor = 'bg-red-500';
          borderColor = 'border-red-600';
          break;
        case 'private_pond':
          markerColor = 'bg-purple-500';
          borderColor = 'border-purple-600';
          break;
        case 'maritime':
          markerColor = 'bg-indigo-500';
          borderColor = 'border-indigo-600';
          break;
      }

      const iconSize = 32; // Marker mai mic
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="w-8 h-8 ${markerColor} ${borderColor} rounded-full border-3 border-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
                 <Fish className="w-5 h-5 text-white" />
               </div>`,
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize / 2]
      });

      const marker = L.marker(location.coords, { icon });
      markers.push(marker);
      
      marker.bindPopup(`
        <div class="p-3 min-w-[240px] max-w-[280px] bg-white rounded-lg shadow-md border border-gray-200">
          <div class="mb-3">
            <h3 class="font-bold text-base text-gray-800 mb-1">${location.name}</h3>
            <p class="text-sm text-gray-600">${location.county}, ${location.region}</p>
          </div>
          
          <div class="mb-3">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-sm font-medium text-gray-700">Recorduri:</span>
              <div class="flex items-center gap-1">
                ${location.recordCount >= 1 ? '<span class="text-yellow-500">🥇</span>' : ''}
                ${location.recordCount >= 2 ? '<span class="text-gray-400">🥈</span>' : ''}
                ${location.recordCount >= 3 ? '<span class="text-amber-600">🥉</span>' : ''}
                <span class="text-sm text-gray-600">${location.recordCount}</span>
              </div>
            </div>
          </div>
          
          <div class="mb-3">
            <p class="text-xs font-medium text-gray-700 mb-1">Specii de pești:</p>
            <div class="flex flex-wrap gap-1">
              ${location.species.map(species => 
                `<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">${species}</span>`
              ).join('')}
            </div>
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
      `, {
        maxWidth: 300
      });
    });
    
    // Adaugă toți markerii în batch pentru performanță mai bună
    if (locationsLayerRef.current && markers.length > 0) {
      locationsLayerRef.current.addLayers(markers);
    }
  };

  // Funcție pentru filtrarea locațiilor
  const filterLocations = (type: string) => {
    setActiveFilter(type);
    
    if (mapInstanceRef.current) {
      // Resetează harta la poziția inițială (România) cu animație mai rapidă
      mapInstanceRef.current.setView([45.9432, 25.0094], 7, { animate: true, duration: 0.5 });
      // Adaugă locațiile cu delay mic pentru performanță
      setTimeout(() => {
        addLocationsToMap(mapInstanceRef.current!, type);
      }, 50);
    }
  };

  // Funcție pentru centrarea pe locația utilizatorului cu watchPosition
  const centerOnUserLocation = async () => {
    try {
      // Verifică dacă geolocation este disponibil
      if (!navigator.geolocation) {
        alert('Geolocation nu este suportat de acest browser.');
        return;
      }

      // Verifică dacă utilizatorul a dat deja permisiunea
      const locationAccepted = localStorage.getItem('locationAccepted') === 'true';
      
      if (locationAccepted) {
        // Dacă a dat deja permisiunea, centrează direct pe locația sa
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([latitude, longitude], 12);
            }
          },
          (error) => {
            console.error('Eroare la obținerea locației:', error);
            // Dacă nu poate obține locația, afișează popup-ul
            setShowLocationRequest(true);
          },
          { maximumAge: 300000, timeout: 10000, enableHighAccuracy: true }
        );
      } else {
        // Dacă nu a dat permisiunea, afișează popup-ul
        setShowLocationRequest(true);
      }
    } catch (error) {
      console.error('Eroare la obținerea locației:', error);
    }
  };

  // Funcție pentru gestionarea permisiunii de locație
  const handleLocationPermission = async (granted: boolean) => {
    setShowLocationRequest(false);
    
    if (!granted) {
      return;
    }

    try {
      // Șterge markerul anterior dacă există
      if (userLocationMarkerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(userLocationMarkerRef.current);
      }

      // Folosește watchPosition pentru primul fix rapid
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          if (mapInstanceRef.current) {
            // Centrează harta pe locația utilizatorului
            mapInstanceRef.current.setView([latitude, longitude], 12);
            
            // Obține adresa prin reverse geocoding
            const address = await geocodingService.reverseGeocode(latitude, longitude);
            
            // Creează marker cu fundal alb și design îmbunătățit
            const userIcon = L.divIcon({
              className: 'user-location-marker',
              html: `<div class="w-14 h-14 bg-white border-4 border-blue-500 rounded-full shadow-2xl flex items-center justify-center text-3xl transform hover:scale-110 transition-transform duration-200">🎣</div>`,
              iconSize: [56, 56],
              iconAnchor: [28, 28]
            });

            const userMarker = L.marker([latitude, longitude], { icon: userIcon });
            userLocationMarkerRef.current = userMarker;
            userMarker.addTo(mapInstanceRef.current);

            // Adaugă popup cu design îmbunătățit
            const userName = user?.displayName || user?.email?.split('@')[0] || 'Utilizator';
            const userPhoto = user?.photoURL || '';
            
            userMarker.bindPopup(`
              <div class="p-3 min-w-[180px] max-w-[200px] bg-white rounded-lg shadow-md border border-gray-200">
                <div class="text-center mb-2">
                  <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 border border-white rounded-full flex items-center justify-center overflow-hidden shadow-sm mx-auto mb-1">
                    ${userPhoto ? 
                      `<img src="${userPhoto}" alt="${userName}" class="w-full h-full object-cover rounded-full" />` :
                      `<span class="text-white font-bold text-sm">${userName.charAt(0).toUpperCase()}</span>`
                    }
                  </div>
                  <h3 class="font-bold text-sm text-gray-800 mb-1">${userName}</h3>
                  <p class="text-xs text-gray-600">📍 Locația ta curentă</p>
                </div>
                
                <div class="space-y-1">
                  <div class="bg-gray-50 rounded p-1.5">
                    <p class="text-xs font-medium text-gray-700 mb-0.5">GPS</p>
                    <p class="text-xs text-gray-600 font-mono">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</p>
                  </div>
                  
                  <div class="bg-gray-50 rounded p-1.5">
                    <p class="text-xs font-medium text-gray-700 mb-0.5">Adresă</p>
                    <p class="text-xs text-gray-600">${address}</p>
                  </div>
                </div>
              </div>
            `, {
              className: 'custom-popup',
              maxWidth: 220,
              closeButton: true,
              autoClose: false,
              closeOnClick: false
            }).openPopup();

            // Salvează că utilizatorul a acceptat locația
            localStorage.setItem('locationAccepted', 'true');
          }

          // Oprește watchPosition după primul fix
          navigator.geolocation.clearWatch(watchId);
        },
        (error) => {
          console.error('Eroare la obținerea locației:', error);
          navigator.geolocation.clearWatch(watchId);
          alert('Nu s-a putut obține locația. Verifică permisiunile browser-ului.');
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000 // 5 minute cache
        }
      );
    } catch (error) {
      console.error('Eroare la obținerea locației:', error);
      alert('Eroare la obținerea locației.');
    }
  };



  // Funcție pentru deschiderea popup-ului magazin
  const openShopPopup = () => {
    setShowShopPopup(true);
  };

  return (
    <>
      <SEOHead
        title="Fish Trophy - Platforma Pescarilor din România"
        description="Descoperă cele mai bune locații de pescuit din România, urmărește recordurile și concurează cu alții pescari pasionați. Hărți interactive, ghiduri complete și comunitate activă."
        keywords="pescuit, romania, locatii pescuit, recorduri pescuit, harta pescuit, marea neagra, rauri romania, lacuri romania, balti pescuit, specii pesti, tehnici pescuit, echipament pescuit, platforma pescarilor, comunitate pescuit"
        image="https://fishtrophy.ro/api/og?title=Fish%20Trophy&subtitle=Platforma%20Pescarilor%20din%20Rom%C3%A2nia&domain=fishtrophy.ro"
        url="https://fishtrophy.ro"
        type="website"
        structuredData={[websiteData, organizationData] as unknown as Record<string, unknown>[]}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
          <div className="fixed right-0 top-0 h-full w-64 bg-white shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Meniu</h2>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="space-y-4">
              <Link
                to="/"
                className="block text-gray-700 hover:text-blue-600 py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Acasă
              </Link>
              <Link
                to="/submission-guide"
                className="block text-gray-700 hover:text-blue-600 py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Ghid Submisie
              </Link>
              <Link
                to="/profile"
                className="block text-gray-700 hover:text-blue-600 py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Profilul meu
              </Link>
            </nav>
          </div>
        </div>
      )}

      {/* Hero Section - Small Banner */}
      <section className="relative py-4 md:py-6 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-xl p-4 md:p-6 text-center shadow-lg">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2">
              Descoperă cele mai bune locuri de pescuit din România
            </h1>
            <p className="text-sm md:text-base text-white">
              Explorează harta interactivă, înregistrează recordurile tale și concurează în clasamentele naționale!
            </p>
          </div>
        </div>
      </section>

      {/* Map Section - Mobile Optimized */}
      <section className="px-4 md:px-6 lg:px-8 mb-16">
        <div className="max-w-7xl mx-auto">
          {/* Map Controls - Mobile Optimized */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
              {[
                { type: 'all', label: 'Toate', icon: MapPin, color: 'bg-gray-500 hover:bg-gray-600' },
                { type: 'river', label: 'Râuri', icon: MapPin, color: 'bg-emerald-500 hover:bg-emerald-600' },
                { type: 'lake', label: 'Lacuri', icon: MapPin, color: 'bg-blue-500 hover:bg-blue-600' },
                { type: 'pond', label: 'Bălți Sălbatice', icon: MapPin, color: 'bg-red-500 hover:bg-red-600' },
                { type: 'private_pond', label: 'Bălți Private', icon: MapPin, color: 'bg-purple-500 hover:bg-purple-600' }
              ].map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  onClick={() => filterLocations(type)}
                  className={`${color} text-white px-4 py-2 md:px-6 md:py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 ${
                    activeFilter === type ? 'ring-4 ring-blue-200' : ''
                  }`}
                >
                  <Icon className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-sm md:text-base">{label}</span>
                </button>
              ))}
              
              <button
                onClick={openShopPopup}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base">Magazine de Pescuit</span>
              </button>
            </div>
          </div>

          {/* Map Container - Mobile Optimized */}
          <div className="relative">
            <div 
              ref={mapContainerRef} 
              className="w-full h-96 md:h-[500px] lg:h-[600px] rounded-2xl shadow-2xl border-4 border-white overflow-hidden"
              style={{ zIndex: 1 }}
            />
            
            {/* Map Controls - Top Left (Zoom) */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
              <button
                onClick={() => mapInstanceRef.current?.zoomIn()}
                className="bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-lg shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl"
                title="Zoom in"
              >
                <span className="text-lg font-bold">+</span>
              </button>
              <button
                onClick={() => mapInstanceRef.current?.zoomOut()}
                className="bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-lg shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl"
                title="Zoom out"
              >
                <span className="text-lg font-bold">−</span>
              </button>
            </div>

            {/* Geolocation Button - Top Right */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={centerOnUserLocation}
                className="bg-white hover:bg-gray-50 text-gray-700 p-3 rounded-xl shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl"
                title="Centrare pe locația mea"
              >
                <Navigation className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Mobile Optimized */}
      <section className="px-4 md:px-6 lg:px-8 mb-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-12">
            De ce Fish Trophy?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: MapPin,
                title: "Locații Verificate",
                description: "Toate locațiile sunt verificate și cu coordonate precise"
              },
              {
                icon: Fish,
                title: "Recorduri Reale",
                description: "Sistem de verificare pentru toate recordurile"
              },
              {
                icon: Navigation,
                title: "Geolocație",
                description: "Găsește locațiile cele mai apropiate de tine"
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <feature.icon className="w-8 h-10 md:w-10 md:h-12 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 text-center">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-center leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Mobile Optimized */}
      <section className="px-4 md:px-6 lg:px-8 mb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 md:p-12 shadow-2xl">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-6">
              Începe să pescuiți cu Fish Trophy!
            </h2>
            <p className="text-lg md:text-xl text-blue-100 mb-8 leading-relaxed">
              Înregistrează-te acum și accesează toate funcționalitățile platformei
            </p>
            <Link
              to="/submission-guide"
              className="inline-block bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-gray-50"
            >
              Ghidul Complet
            </Link>
          </div>
        </div>
      </section>

      {/* Location Request Overlay */}
      {showLocationRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Navigation className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Permite accesul la locație
            </h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Pentru a-ți arăta locațiile de pescuit cele mai apropiate și pentru a-ți oferi o experiență personalizată
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleLocationPermission(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 transition-colors"
              >
                Nu acum
              </button>
              <button
                onClick={() => handleLocationPermission(true)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Permite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shop Popup Modal */}
      {showShopPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              În Curând!
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Funcționalitatea pentru magazinele de pescuit va fi disponibilă în curând.
            </p>
            <p className="text-gray-700 mb-8 leading-relaxed font-medium">
              Vrei să-ți adaugi magazinul pe hartă? 
              <br />
              <span className="text-blue-600">Trimite-ne un email cu detaliile tale!</span>
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowShopPopup(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 transition-colors"
              >
                Închide
              </button>
              <Link
                to="/fishing-shops"
                onClick={() => setShowShopPopup(false)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Trimite Detalii
              </Link>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
