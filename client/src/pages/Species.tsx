import React, { useState } from 'react';
import { Search, Fish, MapPin, Calendar, Trophy } from 'lucide-react';

// Mock data pentru demonstrație
const mockSpecies = [
  {
    id: 1,
    name: 'Crap',
    scientificName: 'Cyprinus carpio',
    image: '/icon_free.png',
    category: 'Pești de apă dulce',
    habitat: 'Lacuri, râuri, bălți',
    size: '30-80 cm',
    weight: '1-15 kg',
    season: 'Toate anotimpurile',
    difficulty: 'Medie',
    records: 45,
    description: 'Unul dintre cei mai populari pești de pescuit din România. Se găsește în aproape toate apele dulci.'
  },
  {
    id: 2,
    name: 'Șalău',
    scientificName: 'Sander lucioperca',
    image: '/icon_premium.png',
    category: 'Pești de apă dulce',
    habitat: 'Lacuri mari, râuri cu apă curgătoare',
    size: '40-100 cm',
    weight: '2-12 kg',
    season: 'Primăvară și toamnă',
    difficulty: 'Avansată',
    records: 23,
    description: 'Pește răpitor foarte apreciat de pescari. Necesită tehnici speciale de pescuit.'
  },
  {
    id: 3,
    name: 'Biban',
    scientificName: 'Perca fluviatilis',
    image: '/icon_free.png',
    category: 'Pești de apă dulce',
    habitat: 'Lacuri, râuri, bălți',
    size: '15-40 cm',
    weight: '0.5-2 kg',
    season: 'Toate anotimpurile',
    difficulty: 'Ușoară',
    records: 67,
    description: 'Pește comun și ușor de prins. Ideal pentru începători în pescuit.'
  },
  {
    id: 4,
    name: 'Platca',
    scientificName: 'Abramis brama',
    image: '/icon_free.png',
    category: 'Pești de apă dulce',
    habitat: 'Lacuri, râuri cu apă liniștită',
    size: '25-60 cm',
    weight: '0.8-4 kg',
    season: 'Primăvară și vară',
    difficulty: 'Medie',
    records: 34,
    description: 'Pește de talie medie, foarte activ în perioadele calde ale anului.'
  }
];

const mockRecords = [
  {
    id: 1,
    species: 'Crap',
    weight: 12.5,
    length: 75,
    location: 'Lacul Snagov',
    angler: 'Mihai Popescu',
    date: '2024-03-15',
    image: '/icon_free.png',
    verified: true
  },
  {
    id: 2,
    species: 'Șalău',
    weight: 8.2,
    length: 65,
    location: 'Dunărea',
    angler: 'Ana Ionescu',
    date: '2024-02-28',
    image: '/icon_premium.png',
    verified: true
  },
  {
    id: 3,
    species: 'Biban',
    weight: 1.8,
    length: 35,
    location: 'Lacul Herăstrău',
    angler: 'Alexandru Marin',
    date: '2024-04-02',
    image: '/icon_free.png',
    verified: false
  }
];

const Species: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Toate');
  const [activeTab, setActiveTab] = useState('species');

  const categories = ['Toate', 'Pești de apă dulce', 'Pești de mare', 'Pești migratori'];

  const filteredSpecies = mockSpecies.filter(species => {
    const matchesSearch = species.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         species.scientificName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Toate' || species.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Catalog de Specii & Recorduri
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Descoperă toate speciile de pești din România și urmărește recordurile 
            impresionante ale comunității noastre de pescari.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-muted/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('species')}
              className={`px-6 py-2 rounded-md transition-colors ${
                activeTab === 'species' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Fish className="w-4 h-4 inline mr-2" />
              Specii
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`px-6 py-2 rounded-md transition-colors ${
                activeTab === 'records' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Trophy className="w-4 h-4 inline mr-2" />
              Recorduri
            </button>
          </div>
        </div>

        {activeTab === 'species' && (
          <>
            {/* Search and Filter */}
            <div className="mb-8 space-y-4">
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Caută specii..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div className="flex flex-wrap justify-center gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm transition-colors ${
                      selectedCategory === category
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Species Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpecies.map(species => (
                <div key={species.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <img 
                      src={species.image} 
                      alt={species.name}
                      className="w-16 h-16 rounded-lg object-cover mr-4"
                    />
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{species.name}</h3>
                      <p className="text-sm text-muted-foreground italic">{species.scientificName}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm">
                      <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>{species.habitat}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>{species.season}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Trophy className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>{species.records} recorduri</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">{species.description}</p>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="font-medium">Dimensiune: </span>
                      <span className="text-muted-foreground">{species.size}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Greutate: </span>
                      <span className="text-muted-foreground">{species.weight}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      species.difficulty === 'Ușoară' ? 'bg-green-100 text-green-800' :
                      species.difficulty === 'Medie' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {species.difficulty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'records' && (
          <div className="space-y-6">
            {/* Records Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Recorduri Recente</h2>
              <p className="text-muted-foreground">
                Cele mai impresionante capturi ale comunității noastre
              </p>
            </div>

            {/* Records List */}
            <div className="space-y-4">
              {mockRecords.map(record => (
                <div key={record.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <img 
                        src={record.image} 
                        alt={record.species}
                        className="w-12 h-12 rounded-lg object-cover mr-4"
                      />
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{record.species}</h3>
                        <p className="text-sm text-muted-foreground">de {record.angler}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{record.weight} kg</div>
                      <div className="text-sm text-muted-foreground">{record.length} cm</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{record.location}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{new Date(record.date).toLocaleDateString('ro-RO')}</span>
                    </div>
                    <div className="flex items-center">
                      {record.verified ? (
                        <span className="text-green-600 text-xs font-medium">✓ Verificat</span>
                      ) : (
                        <span className="text-yellow-600 text-xs font-medium">⏳ În așteptare</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Record Button */}
            <div className="text-center pt-8">
              <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors">
                <Trophy className="w-4 h-4 inline mr-2" />
                Adaugă Record Nou
              </button>
            </div>
          </div>
        )}

        {/* Development Note */}
        <div className="mt-16 text-center">
          <div className="bg-muted/50 p-6 rounded-2xl max-w-2xl mx-auto">
            <h3 className="text-lg font-bold mb-2">🚧 Schiță de Dezvoltare</h3>
            <p className="text-muted-foreground text-sm">
              Această pagină este o schiță funcțională care demonstrează design-ul și structura 
              pentru catalogul de specii și recorduri. Funcționalitatea completă va fi implementată 
              în următoarele faze de dezvoltare.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Species;
