import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Trophy, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FishSpecies {
  id: string;
  name: string;
  scientific_name: string;
  category: 'dulce' | 'sarat' | 'amestec';
  water_type: 'lac' | 'rau' | 'baraj' | 'mare' | 'delta';
  region: string;
  min_weight: number;
  max_weight: number;
  min_length: number;
  max_length: number;
  description: string;
  habitat: string;
  feeding_habits: string;
  spawning_season: string;
  image_url: string;
  is_native: boolean;
  is_protected: boolean;
}



const Species: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Toate');
  const [species, setSpecies] = useState<FishSpecies[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories = ['Toate', 'Pești de apă dulce', 'Pești de apă sărată', 'Pești migratori'];

  // Load species from Supabase
  useEffect(() => {
    const loadSpecies = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('fish_species')
          .select('*')
          .order('name');

        if (error) {
          console.error('Error loading species:', error);
          setError('Eroare la încărcarea speciilor');
          return;
        }

        setSpecies(data || []);
      } catch (err) {
        console.error('Error loading species:', err);
        setError('Eroare la încărcarea speciilor');
      } finally {
        setLoading(false);
      }
    };

    loadSpecies();
  }, []);

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case 'dulce': return 'Pești de apă dulce';
      case 'sarat': return 'Pești de apă sărată';
      case 'amestec': return 'Pești migratori';
      default: return 'Altele';
    }
  };

  const getDifficultyLevel = (species: FishSpecies) => {
    if (species.is_protected) return 'Protejat';
    if (species.max_weight > 10) return 'Avansată';
    if (species.max_weight > 3) return 'Medie';
    return 'Ușoară';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Ușoară': return 'bg-green-100 text-green-800';
      case 'Medie': return 'bg-yellow-100 text-yellow-800';
      case 'Avansată': return 'bg-orange-100 text-orange-800';
      case 'Protejat': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredSpecies = species.filter(speciesItem => {
    const matchesSearch = speciesItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         speciesItem.scientific_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesCategory = true;
    if (selectedCategory !== 'Toate') {
      const categoryMap: { [key: string]: string } = {
        'Pești de apă dulce': 'dulce',
        'Pești de apă sărată': 'sarat',
        'Pești migratori': 'amestec'
      };
      matchesCategory = speciesItem.category === categoryMap[selectedCategory];
    }
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Catalog de Specii
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Descoperă toate speciile de pești din România cu informații detaliate 
            despre habitat, comportament și tehnici de pescuit.
          </p>
        </div>



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

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Se încarcă speciile...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg max-w-md mx-auto">
              {error}
            </div>
          </div>
        )}

        {/* Species Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpecies.map(speciesItem => {
              const difficulty = getDifficultyLevel(speciesItem);
              const difficultyColor = getDifficultyColor(difficulty);
              
              return (
                <div key={speciesItem.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <img 
                      src={speciesItem.image_url || '/icon_free.png'} 
                      alt={speciesItem.name}
                      className="w-16 h-16 rounded-lg object-cover mr-4"
                      loading="lazy"
                      decoding="async"
                    />
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{speciesItem.name}</h3>
                      <p className="text-sm text-muted-foreground italic">{speciesItem.scientific_name}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm">
                      <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>{speciesItem.habitat || 'Habitat necunoscut'}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>{speciesItem.spawning_season || 'Toate anotimpurile'}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Trophy className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>{getCategoryDisplayName(speciesItem.category)}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    {speciesItem.description || 'Descriere nu este disponibilă.'}
                  </p>
                  
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm">
                      <span className="font-medium">Dimensiune: </span>
                      <span className="text-muted-foreground">
                        {speciesItem.min_length && speciesItem.max_length 
                          ? `${speciesItem.min_length}-${speciesItem.max_length} cm`
                          : 'Necunoscută'
                        }
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Greutate: </span>
                      <span className="text-muted-foreground">
                        {speciesItem.min_weight && speciesItem.max_weight 
                          ? `${speciesItem.min_weight}-${speciesItem.max_weight} kg`
                          : 'Necunoscută'
                        }
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="font-medium">Regiunea: </span>
                      <span className="text-muted-foreground capitalize">{speciesItem.region}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Tip apă: </span>
                      <span className="text-muted-foreground capitalize">{speciesItem.water_type}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${difficultyColor}`}>
                      {difficulty}
                    </span>
                    {speciesItem.is_native && (
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Nativ
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredSpecies.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-muted/50 p-6 rounded-2xl max-w-md mx-auto">
              <h3 className="text-lg font-bold mb-2">Nu s-au găsit specii</h3>
              <p className="text-muted-foreground text-sm">
                Încearcă să modifici termenii de căutare sau filtrele.
              </p>
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
