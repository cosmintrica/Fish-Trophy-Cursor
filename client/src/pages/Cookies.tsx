import { useLocation } from 'react-router-dom';
import { Cookie, Shield, BarChart3, Target, Settings, Info } from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { useStructuredData } from '@/hooks/useStructuredData';
import Layout from '@/components/Layout';
import ForumLayout, { forumUserToLayoutUser } from '@/forum/components/ForumLayout';
import { cn } from '@/lib/utils';

// Hook-uri safe care returnează valori default dacă nu sunt în context
function useSafeForumAuth() {
  try {
    const { useAuth } = require('@/forum/hooks/useAuth');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAuth();
  } catch {
    return { forumUser: null };
  }
}

export default function Cookies() {
  const location = useLocation();
  const isForum = location.pathname.startsWith('/forum');

  // Folosim hook-urile safe care returnează valori default dacă nu sunt în context
  const authResult = useSafeForumAuth();
  const forumUser = isForum ? (authResult?.forumUser || null) : null;

  const { websiteData, organizationData } = useStructuredData();

  const cookiesUrl = isForum
    ? 'https://fishtrophy.ro/forum/cookies'
    : 'https://fishtrophy.ro/cookies';

  const content = (
    <div className={cn(
      "mx-auto transition-colors duration-200",
      isForum ? "max-w-[1200px] p-4 text-slate-900 dark:text-slate-100" : "max-w-[1100px] py-8 px-4 text-gray-800 dark:text-gray-200"
    )}>
      <div className={cn(
        "rounded-2xl transition-all duration-200",
        isForum
          ? "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8"
          : "bg-white dark:bg-slate-800 p-12 shadow-xl rounded-2xl border border-gray-100 dark:border-slate-700"
      )}>
        {/* Header */}
        <div className="mb-8 text-center">
          <div className={cn(
            "inline-flex items-center justify-center w-16 h-16 rounded-full mb-4",
            isForum
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              : "bg-blue-500 text-white"
          )}>
            <Cookie size={32} />
          </div>
          <h1 className={cn(
            "font-bold mb-2",
            isForum ? "text-3xl text-slate-900 dark:text-white" : "text-4xl text-gray-900 dark:text-white"
          )}>
            Politica de Cookie-uri
          </h1>
          <p className={cn(
            "text-base",
            isForum ? "text-slate-500 dark:text-slate-400" : "text-gray-500 dark:text-gray-400"
          )}>
            Ultima actualizare: 10 decembrie 2025
          </p>
        </div>

        {/* Introduction */}
        <section className="mb-8">
          <p className={cn(
            "text-lg leading-relaxed mb-4",
            isForum ? "text-slate-800 dark:text-slate-200" : "text-gray-700 dark:text-gray-300"
          )}>
            Această Politică de Cookie-uri explică ce sunt cookie-urile, cum le folosim pe site-ul <strong>Fish Trophy</strong>,
            și cum poți gestiona preferințele tale. Respectăm legislația GDPR și oferim control complet asupra cookie-urilor.
          </p>
        </section>

        {/* 1. Ce sunt cookie-urile */}
        <section className="mb-8">
          <h2 className={cn(
            "text-2xl font-semibold mb-4 flex items-center gap-2",
            isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"
          )}>
            <Info size={24} />
            1. Ce sunt cookie-urile?
          </h2>
          <div className={cn(
            "p-6 rounded-lg border",
            isForum
              ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
              : "bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
          )}>
            <p className={cn(
              "leading-relaxed mb-4",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              Cookie-urile sunt fișiere text mici stocate pe dispozitivul tău când vizitezi un site web.
              Ele permit site-ului să-ți amintească preferințele, să îmbunătățească experiența și să ofere funcții personalizate.
            </p>
            <p className={cn(
              "leading-relaxed",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              Cookie-urile nu conțin informații personale identificabile direct și nu pot dăuna dispozitivului tău.
            </p>
          </div>
        </section>

        {/* 2. Tipuri de cookie-uri */}
        <section className="mb-8">
          <h2 className={cn(
            "text-2xl font-semibold mb-4 flex items-center gap-2",
            isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"
          )}>
            <Settings size={24} />
            2. Tipuri de cookie-uri pe care le folosim
          </h2>

          {/* Necessary Cookies */}
          <div className={cn(
            "p-6 rounded-lg border mb-4",
            isForum
              ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
              : "bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
          )}>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={20} className={isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"} />
              <h3 className={cn(
                "text-xl font-semibold",
                isForum ? "text-slate-900 dark:text-white" : "text-gray-900 dark:text-white"
              )}>
                2.1. Cookie-uri Necesare (Întotdeauna Active)
              </h3>
            </div>
            <p className={cn(
              "leading-relaxed mb-3",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              Aceste cookie-uri sunt esențiale pentru funcționarea site-ului și nu pot fi dezactivate:
            </p>
            <ul className={cn(
              "list-disc pl-6 space-y-2 leading-relaxed mb-3",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              <li><strong>Autentificare:</strong> mențin sesiunea ta de utilizator</li>
              <li><strong>Securitate:</strong> protejează împotriva atacurilor și fraudelor</li>
              <li><strong>Preferințe:</strong> rețin setările tale (tema, limba)</li>
              <li><strong>Funcționalitate:</strong> permit funcții de bază (formulare, căutare)</li>
            </ul>
            <p className="text-sm italic text-gray-500 dark:text-gray-400">
              Durată: Sesiune sau până la 1 an
            </p>
          </div>

          {/* Analytics Cookies */}
          <div className={cn(
            "p-6 rounded-lg border mb-4",
            isForum
              ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
              : "bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
          )}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={20} className={isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"} />
              <h3 className={cn(
                "text-xl font-semibold",
                isForum ? "text-slate-900 dark:text-white" : "text-gray-900 dark:text-white"
              )}>
                2.2. Cookie-uri de Analiză (Cu Consimțământ)
              </h3>
            </div>
            <p className={cn(
              "leading-relaxed mb-3",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              Ne ajută să înțelegem cum folosești site-ul pentru a-l îmbunătăți:
            </p>
            <ul className={cn(
              "list-disc pl-6 space-y-2 leading-relaxed mb-3",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              <li><strong>Google Analytics:</strong> analizează traficul, paginile populare, comportamentul utilizatorilor</li>
              <li><strong>Performanță:</strong> identifică probleme tehnice și zone de îmbunătățire</li>
              <li><strong>Statistici:</strong> număr de vizitatori, surse de trafic, conversii</li>
            </ul>
            <p className="text-sm italic text-gray-500 dark:text-gray-400">
              Durată: Până la 2 ani | Furnizor: Google LLC (conform <a href="https://policies.google.com/privacy" className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>)
            </p>
          </div>

          {/* Marketing Cookies */}
          <div className={cn(
            "p-6 rounded-lg border",
            isForum
              ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
              : "bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
          )}>
            <div className="flex items-center gap-2 mb-3">
              <Target size={20} className={isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"} />
              <h3 className={cn(
                "text-xl font-semibold",
                isForum ? "text-slate-900 dark:text-white" : "text-gray-900 dark:text-white"
              )}>
                2.3. Cookie-uri de Marketing (Cu Consimțământ)
              </h3>
            </div>
            <p className={cn(
              "leading-relaxed mb-3",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              Folosite pentru publicitate personalizată și măsurarea campaniilor (în viitor):
            </p>
            <ul className={cn(
              "list-disc pl-6 space-y-2 leading-relaxed mb-3",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              <li><strong>Publicitate:</strong> afișează anunțuri relevante pentru tine</li>
              <li><strong>Retargeting:</strong> reafișează anunțuri pentru utilizatori care au vizitat site-ul</li>
              <li><strong>Măsurare:</strong> evaluează eficacitatea campaniilor publicitare</li>
            </ul>
            <p className="text-sm italic text-gray-500 dark:text-gray-400">
              Durată: Până la 1 an | Momentan nu folosim cookie-uri de marketing
            </p>
          </div>
        </section>

        {/* 3. Gestionarea cookie-urilor */}
        <section className="mb-8">
          <h2 className={cn(
            "text-2xl font-semibold mb-4",
            isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"
          )}>
            3. Cum poți gestiona cookie-urile
          </h2>
          <div className={cn(
            "p-6 rounded-lg border",
            isForum
              ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
              : "bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
          )}>
            <p className={cn(
              "leading-relaxed mb-4",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              Ai control complet asupra cookie-urilor:
            </p>
            <ul className={cn(
              "list-disc pl-6 space-y-2 leading-relaxed mb-4",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              <li><strong>Banner de consimțământ:</strong> la prima vizită, poți alege ce cookie-uri să accepti</li>
              <li><strong>Setări browser:</strong> poți șterge sau bloca cookie-uri din setările browser-ului</li>
              <li><strong>Actualizare preferințe:</strong> poți schimba preferințele oricând din banner-ul de cookie-uri</li>
            </ul>
            <div className={cn(
              "p-4 rounded-lg border",
              isForum
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            )}>
              <p className={cn(
                "font-medium m-0 flex items-center gap-2",
                isForum ? "text-blue-800 dark:text-blue-300" : "text-blue-900 dark:text-blue-300"
              )}>
                <span>⚠️</span>
                <strong>Notă:</strong> Dezactivarea cookie-urilor necesare poate afecta funcționalitatea site-ului.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Cookie-uri terți */}
        <section className="mb-8">
          <h2 className={cn(
            "text-2xl font-semibold mb-4",
            isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"
          )}>
            4. Cookie-uri de la terți
          </h2>
          <div className={cn(
            "p-6 rounded-lg border",
            isForum
              ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
              : "bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
          )}>
            <p className={cn(
              "leading-relaxed mb-4",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              Folosim servicii terțe care pot seta cookie-uri:
            </p>
            <ul className={cn(
              "list-disc pl-6 space-y-2 leading-relaxed",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              <li><strong>Google Analytics:</strong> pentru analiză (vezi <a href="https://policies.google.com/privacy" className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>)</li>
              <li><strong>Supabase:</strong> pentru autentificare și bază de date (vezi <a href="https://supabase.com/privacy" className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">Supabase Privacy Policy</a>)</li>
            </ul>
            <p className="mt-4 italic text-sm text-gray-500 dark:text-gray-400">
              Aceste servicii au propriile politici de confidențialitate și cookie-uri.
            </p>
          </div>
        </section>

        {/* 5. Actualizări */}
        <section className="mb-8">
          <h2 className={cn(
            "text-2xl font-semibold mb-4",
            isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"
          )}>
            5. Actualizări ale acestei politici
          </h2>
          <div className={cn(
            "p-6 rounded-lg border",
            isForum
              ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
              : "bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
          )}>
            <p className={cn(
              "leading-relaxed",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              Putem actualiza această politică periodic pentru a reflecta schimbări în practicile noastre sau în legislație.
              Vom notifica utilizatorii despre modificări semnificative prin banner sau email.
            </p>
          </div>
        </section>

        {/* 6. Contact */}
        <section className="mb-8">
          <h2 className={cn(
            "text-2xl font-semibold mb-4",
            isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"
          )}>
            6. Contact
          </h2>
          <div className={cn(
            "p-6 rounded-lg border",
            isForum
              ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
              : "bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
          )}>
            <p className={cn(
              "leading-relaxed mb-2",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              Pentru întrebări despre cookie-uri:
            </p>
            <p className={cn(
              "leading-relaxed",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              <strong>Email:</strong>{' '}
              <a href="mailto:privacy@fishtrophy.ro" className="text-blue-600 dark:text-blue-400 hover:underline">
                privacy@fishtrophy.ro
              </a>
            </p>
          </div>
        </section>

        {/* Footer */}
        <div className={cn(
          "mt-12 pt-8 border-t text-center text-sm",
          isForum
            ? "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
            : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400"
        )}>
          <p>
            Pentru mai multe informații despre confidențialitate, consultă{' '}
            <a href={isForum ? '/forum/privacy' : '/privacy'} className="text-blue-600 dark:text-blue-400 hover:underline">
              Politica de Confidențialitate
            </a>.
          </p>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Ultima actualizare: 10 decembrie 2025
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SEOHead
        title="Politica de Cookie-uri - Fish Trophy"
        description="Politica de cookie-uri Fish Trophy. Află ce cookie-uri folosim, cum le gestionăm și cum poți controla preferințele tale. GDPR compliant."
        keywords="politica cookie-uri, cookie-uri, GDPR, confidențialitate, Fish Trophy, Google Analytics"
        image="https://fishtrophy.ro/social-media-banner-v2.jpg"
        url={cookiesUrl}
        type="website"
        structuredData={[websiteData, organizationData] as unknown as Record<string, unknown>[]}
      />
      {isForum ? (
        <ForumLayout
          user={forumUserToLayoutUser(forumUser)}
          onLogin={() => { }}
          onLogout={() => { }}
        >
          {content}
        </ForumLayout>
      ) : (
        <Layout>
          {content}
        </Layout>
      )}
    </>
  );
}

