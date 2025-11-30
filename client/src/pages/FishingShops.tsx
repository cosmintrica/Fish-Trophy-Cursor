import { useState, useEffect, useRef } from 'react';
import { MapPin, Users, Trophy, Star, Mail, Phone, Clock, ShoppingBag, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const FishingShops = () => {
  const [stats, setStats] = useState([
    { icon: Users, value: 0, label: 'Pescari înregistrați', isNumber: true },
    { icon: Trophy, value: 0, label: 'Recorduri aprobate', isNumber: true },
    { icon: MapPin, value: 0, label: 'Locații de pescuit', isNumber: true },
    { icon: Star, value: '4.8/5', label: 'Rating utilizatori', isNumber: false }
  ]);
  const [displayStats, setDisplayStats] = useState([
    { icon: Users, value: '0', label: 'Pescari înregistrați' },
    { icon: Trophy, value: '0', label: 'Recorduri aprobate' },
    { icon: MapPin, value: '0', label: 'Locații de pescuit' },
    { icon: Star, value: '4.8/5', label: 'Rating utilizatori' }
  ]);
  const hasAnimated = useRef(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Pescari înregistrați
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Recorduri aprobate
        const { count: recordsCount } = await supabase
          .from('records')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'verified');

        // Locații de pescuit
        const { count: locationsCount } = await supabase
          .from('fishing_locations')
          .select('*', { count: 'exact', head: true });

        setStats([
          { icon: Users, value: usersCount || 0, label: 'Pescari înregistrați', isNumber: true },
          { icon: Trophy, value: recordsCount || 0, label: 'Recorduri aprobate', isNumber: true },
          { icon: MapPin, value: locationsCount || 0, label: 'Locații de pescuit', isNumber: true },
          { icon: Star, value: '4.8/5', label: 'Rating utilizatori', isNumber: false }
        ]);
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    loadStats();
  }, []);

  useEffect(() => {
    // Verifică dacă datele sunt încărcate (nu mai sunt 0)
    const hasData = stats.some(s => s.isNumber && typeof s.value === 'number' && s.value > 0);
    if (!hasData || hasAnimated.current) return;
    
    // Animație de numărare pentru statistici
    const animateValue = (start: number, end: number, duration: number, callback: (value: number) => void) => {
      const startTime = performance.now();
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function pentru animație mai smooth
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(start + (end - start) * easeOutQuart);
        
        callback(current);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          callback(end);
        }
      };
      
      requestAnimationFrame(animate);
    };

    // Animează fiecare statistică
    stats.forEach((stat, index) => {
      if (stat.isNumber && typeof stat.value === 'number' && stat.value > 0) {
        // Durata fixă pentru toate statisticile - sincronizare
        const duration = 2000; // 2 secunde pentru toate
        
        // Delay mic pentru fiecare statistică pentru efect cascadă
        setTimeout(() => {
          const numericValue = typeof stat.value === 'number' ? stat.value : 0;
          animateValue(0, numericValue, duration, (value) => {
            setDisplayStats(prev => {
              const newStats = [...prev];
              newStats[index] = {
                ...newStats[index],
                value: `${value.toLocaleString('ro-RO')}+`
              };
              return newStats;
            });
          });
        }, index * 100); // 100ms delay între fiecare statistică
      } else if (!stat.isNumber) {
        // Pentru rating, păstrează valoarea
        setDisplayStats(prev => {
          const newStats = [...prev];
          newStats[index] = {
            ...newStats[index],
            value: stat.value as string
          };
          return newStats;
        });
      }
    });

    hasAnimated.current = true;
  }, [stats]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const emailLower = email.trim().toLowerCase();
      
      // Verifică dacă email-ul există deja pentru fishing_shops
      const { data: existing } = await supabase
        .from('subscribers')
        .select('id, source')
        .eq('email', emailLower)
        .eq('source', 'fishing_shops')
        .maybeSingle();

      if (existing) {
        toast.error('Acest email este deja înregistrat pentru Fishing Shops!');
        setIsSubmitting(false);
        return;
      }

      // Adaugă subscription pentru fishing_shops
      // Notă: Dacă email-ul există deja pentru altă sursă (ex: construction_page),
      // va da eroare de duplicate key. Pentru a permite același email pentru surse diferite,
      // trebuie modificată schema să aibă UNIQUE(email, source) în loc de UNIQUE(email)
      const { error } = await supabase
        .from('subscribers')
        .insert([
          {
            email: emailLower,
            subscribed_at: new Date().toISOString(),
            status: 'active',
            source: 'fishing_shops'
          }
        ]);

      if (error) {
        if (error.code === '23505') {
          // Email deja există - verificăm dacă e pentru fishing_shops sau altă sursă
          const { data: check } = await supabase
            .from('subscribers')
            .select('source')
            .eq('email', emailLower)
            .maybeSingle();
          
          if (check?.source === 'fishing_shops') {
            toast.error('Acest email este deja înregistrat pentru Fishing Shops!');
          } else {
            // Există pentru altă sursă - schema nu permite același email pentru surse diferite
            // Trebuie modificată schema pentru a permite acest lucru
            toast.error('Acest email este deja înregistrat. Pentru a te abona și pentru Fishing Shops, contactează-ne.');
          }
        } else {
          throw error;
        }
      } else {
        setIsSubscribed(true);
        setEmail('');
        toast.success('Te-ai abonat cu succes! Vei fi notificat când funcționalitatea devine disponibilă.');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('A apărut o eroare. Te rugăm să încerci din nou.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            {displayStats.map((stat, index) => (
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
            <Link to="/">
              <Button size="lg" variant="outline" className="px-8 py-3">
                <MapPin className="w-5 h-5 mr-2" />
                Vezi Locații
              </Button>
            </Link>
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
            
            {isSubscribed ? (
              <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 rounded-lg p-4">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Te-ai abonat cu succes!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="w-full max-w-lg mx-auto">
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Adresa ta de email"
                    required
                    className="w-full px-5 py-2.5 pr-28 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base shadow-sm"
                    disabled={isSubmitting}
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md"
                  >
                    {isSubmitting ? (
                      <span className="text-sm">Se trimite...</span>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">Trimite</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
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
            <Link to="/">
              <Button size="lg" variant="secondary" className="px-8 py-3">
                <MapPin className="w-5 h-5 mr-2" />
                Vezi Harta
              </Button>
            </Link>
            <Link to="/records">
              <Button size="lg" variant="outline" className="px-8 py-3 border-white text-gray-900 bg-white hover:text-blue-600">
                <Trophy className="w-5 h-5 mr-2" />
                Vezi Recorduri
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FishingShops;
