import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trophy, Map, Fish, Users, Star } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <img 
                src="/icon_free.png" 
                alt="Fish Trophy" 
                className="h-20 w-20"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Fish Trophy
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              Platforma completă pentru pescarii din România
            </p>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Descoperă cele mai bune locații de pescuit, urmărește recordurile și 
              conectează-te cu comunitatea pescarilor din România.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/black-sea">
                  Explorează Marea Neagră
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/leaderboards">
                  Vezi Recordurile
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Caracteristici Principale
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tot ce ai nevoie pentru o experiență completă de pescuit
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Map className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Hărți Interactive</h3>
              <p className="text-muted-foreground">
                Hărți detaliate cu ape, locații și amenități pentru pescuit
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Recorduri</h3>
              <p className="text-muted-foreground">
                Sistem complet de recorduri cu moderare și leaderboards
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Fish className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Catalog Specii</h3>
              <p className="text-muted-foreground">
                Informații detaliate despre toate speciile de pești
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Comunitate</h3>
              <p className="text-muted-foreground">
                Conectează-te cu alți pescari și împărtășește experiențele
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Black Sea Section */}
      <section className="py-20 bg-gradient-to-r from-black-sea-primary/10 to-black-sea-secondary/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Secțiunea Mării Negre
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                O zonă dedicată pentru pescuitul în Marea Neagră, cu:
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <Star className="h-5 w-5 text-black-sea-primary mr-3" />
                  <span>Locații specifice marine</span>
                </li>
                <li className="flex items-center">
                  <Star className="h-5 w-5 text-black-sea-primary mr-3" />
                  <span>Specii de pești marine</span>
                </li>
                <li className="flex items-center">
                  <Star className="h-5 w-5 text-black-sea-primary mr-3" />
                  <span>Filtre specializate</span>
                </li>
                <li className="flex items-center">
                  <Star className="h-5 w-5 text-black-sea-primary mr-3" />
                  <span>Temă personalizată</span>
                </li>
              </ul>
              <Button size="lg" className="bg-black-sea-primary hover:bg-black-sea-secondary" asChild>
                <Link to="/black-sea">
                  Explorează Marea Neagră
                </Link>
              </Button>
            </div>
            <div className="text-center">
              <div className="bg-black-sea-light/50 w-64 h-64 rounded-full flex items-center justify-center mx-auto">
                <Fish className="h-32 w-32 text-black-sea-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Începe Să Explorezi
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Alătură-te comunității Fish Trophy și descoperă cele mai bune 
            locații de pescuit din România.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" asChild>
              <Link to="/species">
                Vezi Speciile
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
              <Link to="/leaderboards">
                Vezi Recordurile
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
