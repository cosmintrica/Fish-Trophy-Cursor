import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapPin, Users, Trophy, Star, Mail, Phone, Clock, ShoppingBag, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import ShopInquiryModal from '@/components/ShopInquiryModal';
import SEOHead from '@/components/SEOHead';
import { useStructuredData } from '@/hooks/useStructuredData';

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
  const animationFrameRefs = useRef<number[]>([]);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);

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

        const newStats = [
          { icon: Users, value: usersCount || 0, label: 'Pescari înregistrați', isNumber: true },
          { icon: Trophy, value: recordsCount || 0, label: 'Recorduri aprobate', isNumber: true },
          { icon: MapPin, value: locationsCount || 0, label: 'Locații de pescuit', isNumber: true },
          { icon: Star, value: '4.8/5', label: 'Rating utilizatori', isNumber: false }
        ];

        setStats(newStats);

        // Resetează animația când datele se încarcă
        hasAnimated.current = false;
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    loadStats();
  }, []);

  // Animație pentru statistici
  useEffect(() => {
    // Cleanup animații anterioare
    animationFrameRefs.current.forEach(rafId => cancelAnimationFrame(rafId));
    animationFrameRefs.current = [];

    // Verifică dacă datele sunt încărcate (nu mai sunt 0)
    const hasData = stats.some(s => s.isNumber && typeof s.value === 'number' && s.value > 0);
    if (!hasData) {
      hasAnimated.current = false;
      return;
    }

    // Resetează animația dacă datele s-au schimbat (de la 0 la valori pozitive)
    // Verifică dacă displayStats are încă 0 pentru statisticile care acum au valori > 0
    const needsAnimation = stats.some((stat, index) => {
      if (stat.isNumber && typeof stat.value === 'number' && stat.value > 0) {
        const displayValue = parseInt(displayStats[index]?.value.replace(/[^0-9]/g, '') || '0');
        return displayValue === 0 || displayValue !== stat.value;
      }
      return false;
    });

    if (!needsAnimation && hasAnimated.current) {
      return;
    }

    hasAnimated.current = true;

    // Durata fixă pentru toate statisticile (2 secunde)
    const duration = 2000;

    // Animație pentru fiecare statistică
    stats.forEach((stat, index) => {
      if (stat.isNumber && typeof stat.value === 'number' && stat.value > 0) {
        const endValue = stat.value;

        // Delay mic pentru efect cascadă
        setTimeout(() => {
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function pentru animație smooth
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(endValue * easeOutQuart);

            setDisplayStats(prev => {
              const newStats = [...prev];
              newStats[index] = {
                ...newStats[index],
                value: `${current.toLocaleString('ro-RO')}+`
              };
              return newStats;
            });

            if (progress < 1) {
              const rafId = requestAnimationFrame(animate);
              animationFrameRefs.current.push(rafId);
            } else {
              // Asigură-te că ajunge la valoarea finală
              setDisplayStats(prev => {
                const newStats = [...prev];
                newStats[index] = {
                  ...newStats[index],
                  value: `${endValue.toLocaleString('ro-RO')}+`
                };
                return newStats;
              });
            }
          };

          const rafId = requestAnimationFrame(animate);
          animationFrameRefs.current.push(rafId);
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

    // Cleanup function
    return () => {
      animationFrameRefs.current.forEach(rafId => cancelAnimationFrame(rafId));
      animationFrameRefs.current = [];
    };
  }, [stats]);

  const handleSubscribe = useCallback(async (e: React.FormEvent) => {
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
  }, [email]);

  const { websiteData, organizationData, createBreadcrumbData } = useStructuredData();
  const shopsUrl = 'https://fishtrophy.ro/fishing-shops';
  const shopsTitle = 'Magazine Pescuit România - Echipament Pescuit | Fish Trophy';
  const shopsDescription = 'Descoperă magazinele de pescuit din România. Echipament pescuit, undițe, momele, accesorii și multe altele. Lista completă de magazine pescuit verificate.';
  const shopsImage = 'https://fishtrophy.ro/social-media-banner-v2.jpg';
  const shopsKeywords = 'magazine pescuit, echipament pescuit, magazin pescuit romania, undite pescuit, momele pescuit, carlige pescuit, echipament pescuit romania, magazin pescuit online, echipament pescuit profesional';

  const benefits = useMemo(() => [
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
  ], []);

  const contactInfo = useMemo(() => [
    { icon: Mail, label: 'Email', value: 'contact@fishtrophy.ro' },
    { icon: Phone, label: 'Telefon', value: '+40 123 456 789' },
    { icon: Clock, label: 'Program', value: 'Luni-Vineri: 9:00-18:00' }
  ], []);

  return (
    <>
      <SEOHead
        title={shopsTitle}
        description={shopsDescription}
        keywords={shopsKeywords}
        image={shopsImage}
        url={shopsUrl}
        type="website"
        structuredData={[
          websiteData, 
          organizationData,
          createBreadcrumbData([
            { name: 'Acasă', url: 'https://fishtrophy.ro/' },
            { name: 'Magazine Pescuit', url: 'https://fishtrophy.ro/fishing-shops' }
          ])
        ] as unknown as Record<string, unknown>[]}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50" style={{ willChange: 'auto' }}>


      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <ShoppingBag className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              În Curând!
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Funcționalitatea pentru magazinele de pescuit va fi disponibilă în curând.
              Vrei să-ți adaugi magazinul pe hartă?
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12" style={{ contain: 'layout style' }}>
            {displayStats.map((stat, index) => (
              <div
                key={index}
                className="text-center"
                style={{
                  willChange: 'transform',
                  transform: 'translateZ(0)',
                  contain: 'layout style'
                }}
              >
                <div
                  className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{
                    willChange: 'transform',
                    transform: 'translateZ(0)'
                  }}
                >
                  <stat.icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div
                  className="text-2xl font-bold text-gray-900 dark:text-white mb-1"
                  style={{
                    willChange: 'contents',
                    transform: 'translateZ(0)'
                  }}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3"
              onClick={() => setIsShopModalOpen(true)}
            >
              <Mail className="w-5 h-5 mr-2" />
              Trimite Detalii
            </Button>
            <Link to="/">
              <Button size="lg" variant="outline" className="px-8 py-3 dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700">
                <MapPin className="w-5 h-5 mr-2" />
                Vezi Locații
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900" style={{ contain: 'layout style' }}>
        <div className="max-w-7xl mx-auto" style={{ willChange: 'auto' }}>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Beneficiile de a fi pe Fish Trophy
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Descoperă cum poți crește afacerea ta prin prezența pe platforma noastră
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8" style={{ contain: 'layout' }}>
            {benefits.map((benefit, index) => (
              <Card
                key={index}
                className="text-center hover:shadow-lg transition-shadow bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                style={{
                  willChange: 'transform',
                  transform: 'translateZ(0)',
                  contain: 'layout style'
                }}
              >
                <CardHeader>
                  <div
                    className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{
                      willChange: 'transform',
                      transform: 'translateZ(0)'
                    }}
                  >
                    <benefit.icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-lg text-gray-900 dark:text-white">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 dark:text-gray-300">
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
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Cum funcționează?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Procesul simplu de a-ți adăuga magazinul pe Fish Trophy
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Trimite Detaliile</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Completează formularul cu informațiile despre magazinul tău
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Verificare</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Echipa noastră verifică și aprobă informațiile
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Activare</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Magazinul tău apare pe hartă și este vizibil pentru toți utilizatorii
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Ai întrebări? Contactează-ne!
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {contactInfo.map((info, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <info.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="font-medium text-gray-900 dark:text-white mb-1">{info.label}</div>
                <div className="text-gray-600 dark:text-gray-300">{info.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 dark:bg-slate-800/50 rounded-lg p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Vrei să fii primul care testează?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Trimite-ne un email cu detaliile magazinului tău și vei fi notificat
              când funcționalitatea devine disponibilă.
            </p>

            {isSubscribed ? (
              <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
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
                    className="w-full px-5 py-2.5 pr-28 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white dark:placeholder-gray-400"
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
              <Button size="lg" variant="secondary" className="px-8 py-3 bg-white text-blue-600 hover:bg-blue-50 border-none">
                <MapPin className="w-5 h-5 mr-2" />
                Vezi Harta
              </Button>
            </Link>
            <Link to="/records">
              <Button size="lg" variant="outline" className="px-8 py-3 border-white text-white hover:bg-white hover:text-blue-600 bg-transparent">
                <Trophy className="w-5 h-5 mr-2" />
                Vezi Recorduri
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Shop Inquiry Modal */}
      <ShopInquiryModal
        isOpen={isShopModalOpen}
        onClose={() => setIsShopModalOpen(false)}
      />
    </div>
    </>
  );
};

export default FishingShops;
