import { Video, Camera, Scale, CheckCircle, AlertTriangle, Rocket, Ruler, X, Fish } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { useStructuredData } from '../hooks/useStructuredData';

const SubmissionGuide = () => {
  const { websiteData, organizationData } = useStructuredData();

  return (
    <>
      <SEOHead
        title="Ghid Submisie Recorduri - Regulament și Verificare | Fish Trophy"
        description="Ghid complet pentru înregistrarea recordurilor de pescuit pe Fish Trophy. Află regulile pentru video, fotografii și măsurători corecte pentru a intra în clasamentul național."
        keywords="ghid submisie, regulament pescuit, verificare recorduri, reguli video pescuit, masurare pesti, validare capturi, fish trophy regulament"
        image="https://fishtrophy.ro/social-media-banner-v2.jpg"
        url="https://fishtrophy.ro/submission-guide"
        type="article"
        structuredData={[websiteData, organizationData] as unknown as Record<string, unknown>[]}
      />
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 mb-6">
              <Fish className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Ghid pentru Submisia Recordurilor
            </h1>
            <p className="text-xl text-gray-600 dark:text-slate-300 max-w-3xl mx-auto">
              Urmează aceste instrucțiuni pentru a-ți submite recordul corect și a fi verificat rapid
            </p>
          </div>

          {/* Video Requirements */}
          <div className="rounded-xl border-2 border-red-200 dark:border-red-900/50 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 shadow-lg mb-8">
            <div className="flex flex-col space-y-1.5 p-6 border-b border-red-200 dark:border-red-900/50 mb-4">
              <div className="text-2xl font-bold leading-none tracking-tight flex items-center text-gray-900 dark:text-white">
                <div className="w-10 h-10 rounded-lg bg-red-500 dark:bg-red-600 flex items-center justify-center mr-3">
                  <Video className="h-5 w-5 text-white" />
                </div>
                Cerințe pentru Video
              </div>
            </div>
            <div className="p-6 pt-4">
              <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-sm dark:text-slate-200">
                      <strong>IMPORTANT:</strong> Videoul este obligatoriu pentru toate recordurile.
                      Fără video, recordul nu va fi verificat.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-green-600 dark:text-green-400 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Ce trebuie să conțină videoul:
                    </h4>
                    <ul className="text-sm space-y-1 text-gray-700 dark:text-slate-200">
                      <li>• Spune clar: "Această filmare este pentru Fish Trophy România" sau menționează "Fish Trophy" în orice fel</li>
                      <li>• Arată peștele pe cântar cu greutatea vizibilă</li>
                      <li>• Măsoară lungimea cu ruleta/riglă</li>
                      <li>• Filmează locația de pescuit</li>
                      <li>• Durata minimă: 30 secunde</li>
                      <li>• Calitate minimă: 720p</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-red-600 dark:text-red-400 flex items-center">
                      <X className="h-4 w-4 mr-2" />
                      Ce NU trebuie să faci:
                    </h4>
                    <ul className="text-sm space-y-1 text-gray-700 dark:text-slate-200">
                      <li>• Nu edita videoul</li>
                      <li>• Nu folosi imagini statice</li>
                      <li>• Nu ascunde cântarul sau ruleta</li>
                      <li>• Nu filma în întuneric complet</li>
                      <li>• Nu folosi cântare defecte</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Photo Requirements */}
          <div className="rounded-xl border-2 border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 shadow-lg mb-8">
            <div className="flex flex-col space-y-1.5 p-6 border-b border-blue-200 dark:border-blue-900/50 mb-4">
              <div className="text-2xl font-bold leading-none tracking-tight flex items-center text-gray-900 dark:text-white">
                <div className="w-10 h-10 rounded-lg bg-blue-500 dark:bg-blue-600 flex items-center justify-center mr-3">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                Cerințe pentru Fotografii
              </div>
            </div>
            <div className="p-6 pt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Scale className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <h4 className="font-semibold dark:text-white">Fotografie cu Cântarul</h4>
                    <p className="text-sm text-gray-600 dark:text-slate-300">Peștele pe cântar cu greutatea clară</p>
                  </div>

                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Ruler className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <h4 className="font-semibold dark:text-white">Fotografie cu Ruleta</h4>
                    <p className="text-sm text-gray-600 dark:text-slate-300">Măsurarea lungimii cu riglă/ruletă</p>
                  </div>

                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <Camera className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <h4 className="font-semibold dark:text-white">Fotografie la Locație</h4>
                    <p className="text-sm text-gray-600 dark:text-slate-300">Tu cu peștele la locul de pescuit</p>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-sm dark:text-slate-200">
                      <strong>IMPORTANT:</strong> Fotografiile sunt obligatorii pentru toate recordurile. Fără fotografii, recordul nu va fi verificat.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Measurement Requirements */}
          <div className="rounded-xl border-2 border-purple-200 dark:border-purple-900/50 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 shadow-lg mb-8">
            <div className="flex flex-col space-y-1.5 p-6 border-b border-purple-200 dark:border-purple-900/50 mb-4">
              <div className="text-2xl font-bold leading-none tracking-tight flex items-center text-gray-900 dark:text-white">
                <div className="w-10 h-10 rounded-lg bg-purple-500 dark:bg-purple-600 flex items-center justify-center mr-3">
                  <Scale className="h-5 w-5 text-white" />
                </div>
                Cerințe pentru Măsurători
              </div>
            </div>
            <div className="p-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 dark:text-white">Greutatea (Obligatorie)</h4>
                  <ul className="text-sm space-y-2 text-gray-700 dark:text-slate-200">
                    <li>• Folosește un cântar digital calibrat</li>
                    <li>• Afișajul trebuie să fie clar vizibil</li>
                    <li>• Peștele trebuie să fie cântărit proaspăt prins</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 dark:text-white">Lungimea (Obligatorie)</h4>
                  <ul className="text-sm space-y-2 text-gray-700 dark:text-slate-200">
                    <li>• Măsoară de la vârful gurii la vârful cozii</li>
                    <li>• Folosește riglă sau ruletă cu gradații clare</li>
                    <li>• Peștele trebuie să fie întins drept</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Process */}
          <div className="rounded-xl border-2 border-green-200 dark:border-green-900/50 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 shadow-lg mb-8">
            <div className="flex flex-col space-y-1.5 p-6 border-b border-green-200 dark:border-green-900/50 mb-4">
              <div className="text-2xl font-bold leading-none tracking-tight flex items-center text-gray-900 dark:text-white">
                <div className="w-10 h-10 rounded-lg bg-green-500 dark:bg-green-600 flex items-center justify-center mr-3">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                Procesul de Verificare
              </div>
            </div>
            <div className="p-6 pt-4">
              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: 'Submisia Recordului',
                    description: 'Completezi formularul cu toate datele și încarci materialele'
                  },
                  {
                    step: 2,
                    title: 'Verificare Automată',
                    description: 'Sistemul verifică dacă toate fișierele și datele sunt complete'
                  },
                  {
                    step: 3,
                    title: 'Verificare Manuală',
                    description: 'Administratorii verifică videoul și fotografiile (24-48 ore)'
                  },
                  {
                    step: 4,
                    title: 'Publicare Record',
                    description: 'Recordul apare în clasamente și pe profilul tău'
                  }
                ].map((item) => (
                  <div key={item.step} className="flex items-center space-x-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 flex items-center justify-center text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold dark:text-white">{item.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-slate-300">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tips for Quick Verification */}
          <div className="rounded-xl border-2 border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 shadow-lg">
            <div className="flex flex-col space-y-1.5 p-6 border-b border-amber-200 dark:border-amber-900/50 mb-4">
              <div className="text-2xl font-bold leading-none tracking-tight text-gray-900 dark:text-white">
                Sfaturi pentru Verificare Rapidă
              </div>
            </div>
            <div className="p-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center">
                    <Rocket className="h-4 w-4 mr-2" />
                    Pentru verificare rapidă:
                  </h4>
                  <ul className="text-sm space-y-1 text-gray-700 dark:text-slate-200">
                    <li>• Filmează în lumină naturală bună</li>
                    <li>• Vorbește clar în video</li>
                    <li>• Arată cântarul și ruleta aproape</li>
                    <li>• Completează toate câmpurile obligatorii</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-orange-600 dark:text-orange-400 mb-2 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Evită respingerile:
                  </h4>
                  <ul className="text-sm space-y-1 text-gray-700 dark:text-slate-200">
                    <li>• Nu folosi recorduri vechi</li>
                    <li>• Nu copia conținut de pe alte site-uri</li>
                    <li>• Nu exagera dimensiunile</li>
                    <li>• Nu uita să menționezi Fish Trophy România în video</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubmissionGuide;
