import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, Trophy, Star, Mail, Phone, Clock, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const FishingShops: React.FC = () => {
  const stats = [
    { icon: Users, value: '2,500+', label: 'Pescari înregistrați' },
    { icon: Trophy, value: '150+', label: 'Recorduri aprobate' },
    { icon: MapPin, value: '300+', label: 'Locații de pescuit' },
    { icon: Star, value: '4.8/5', label: 'Rating utilizatori' }
  ];

  const benefits = [
    {
      icon: MapPin,
      title: 'Vizibilitate pe Hartă',
      description: 'Magazinul tău va fi vizibil pentru toți pescarii din România pe harta interactivă Fish Trophy.'
    },
    {
      icon: Users,
      title: 'Acces la Comunitate',
      description: 'Conectează-te cu pescarii din zona ta și construiește o bază de clienți fideli.'
    },
    {
      icon: Trophy,
      title: 'Promovare Recorduri',
      description: 'Promovează recordurile pescariilor care folosesc echipamentul tău.'
    },
    {
      icon: ShoppingBag,
      title: 'Catalog Digital',
      description: 'Oferă-ți produsele în catalogul digital Fish Trophy cu descrieri detaliate.'
    }
  ];

  const contactInfo = [
    { icon: Mail, label: 'Email', value: 'contact@fishtrophy.ro' },
    { icon: Phone, label: 'Telefon', value: '+40 123 456 789' },
    { icon: Clock, label: 'Program', value: 'Luni-Vineri: 9:00-18:00' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">


      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <ShoppingBag className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              În Curând!
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Funcționalitatea pentru magazinele de pescuit va fi disponibilă în curând. 
              Vrei să-ți adaugi magazinul pe hartă?
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-8 h-8 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3">
              <Mail className="w-5 h-5 mr-2" />
              Trimite Detalii
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-3">
              <MapPin className="w-5 h-5 mr-2" />
              Vezi Locația
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Beneficiile de a fi pe Fish Trophy
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Descoperă cum poți crește afacerea ta prin prezența pe platforma noastră
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {benefit.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Cum funcționează?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Procesul simplu de a-ți adăuga magazinul pe Fish Trophy
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Trimite Detaliile</h3>
              <p className="text-gray-600">
                Completează formularul cu informațiile despre magazinul tău
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Verificare</h3>
              <p className="text-gray-600">
                Echipa noastră verifică și aprobă informațiile
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Activare</h3>
              <p className="text-gray-600">
                Magazinul tău apare pe hartă și este vizibil pentru toți utilizatorii
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Ai întrebări? Contactează-ne!
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {contactInfo.map((info, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <info.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="font-medium text-gray-900 mb-1">{info.label}</div>
                <div className="text-gray-600">{info.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 rounded-lg p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Vrei să fii primul care testează?
            </h3>
            <p className="text-gray-600 mb-6">
              Trimite-ne un email cu detaliile magazinului tău și vei fi notificat 
              când funcționalitatea devine disponibilă.
            </p>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Mail className="w-5 h-5 mr-2" />
              Trimite Email
            </Button>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Pregătit să-ți crești afacerea?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Alătură-te platformei Fish Trophy și conectează-te cu comunitatea de pescari din România
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="px-8 py-3">
              <MapPin className="w-5 h-5 mr-2" />
              Vezi Harta
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-3 border-white text-white hover:bg-white hover:text-blue-600">
              <Trophy className="w-5 h-5 mr-2" />
              Vezi Recorduri
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FishingShops;
