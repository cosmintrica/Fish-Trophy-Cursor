import React from 'react';
import { Fish, MapPin, Star } from 'lucide-react';

const BlackSea: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black-sea-light/20 to-black-sea-primary/10">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="bg-black-sea-primary/20 w-20 h-20 rounded-full flex items-center justify-center">
              <Fish className="h-12 w-12 text-black-sea-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Marea Neagră
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Secțiunea dedicată pescuitului în Marea Neagră cu locații specifice, 
            specii marine și filtre personalizate.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-2xl font-bold mb-6 text-black-sea-primary">
              Locații Populare
            </h2>
            <div className="space-y-4">
              {[
                'Constanța - Portul Turistic',
                'Mamaia - Plaja Centrală',
                'Eforie Nord - Plaja Modern',
                'Costinești - Plaja Tineretului',
                'Vama Veche - Plaja Liberă'
              ].map((location, index) => (
                <div key={index} className="flex items-center p-3 bg-white/50 rounded-lg">
                  <MapPin className="h-5 w-5 text-black-sea-primary mr-3" />
                  <span>{location}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6 text-black-sea-primary">
              Specii Marine
            </h2>
            <div className="space-y-4">
              {[
                'Scorpionul de mare',
                'Bibanul de mare',
                'Hamsia',
                'Sardina',
                'Macroul'
              ].map((species, index) => (
                <div key={index} className="flex items-center p-3 bg-white/50 rounded-lg">
                  <Fish className="h-5 w-5 text-black-sea-primary mr-3" />
                  <span>{species}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="bg-black-sea-primary/10 p-8 rounded-2xl">
            <h3 className="text-2xl font-bold mb-4 text-black-sea-primary">
              Caracteristici Speciale
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Star className="h-8 w-8 text-black-sea-primary mx-auto mb-2" />
                <h4 className="font-semibold mb-2">Filtre Marine</h4>
                <p className="text-sm text-muted-foreground">
                  Filtre specializate pentru zona Mării Negre
                </p>
              </div>
              <div className="text-center">
                <Star className="h-8 w-8 text-black-sea-primary mx-auto mb-2" />
                <h4 className="font-semibold mb-2">Temă Personalizată</h4>
                <p className="text-sm text-muted-foreground">
                  Design dedicat cu culorile marine
                </p>
              </div>
              <div className="text-center">
                <Star className="h-8 w-8 text-black-sea-primary mx-auto mb-2" />
                <h4 className="font-semibold mb-2">Locații Verificate</h4>
                <p className="text-sm text-muted-foreground">
                  Toate locațiile sunt verificate de comunitate
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlackSea;
