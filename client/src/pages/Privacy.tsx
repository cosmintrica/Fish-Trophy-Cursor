import { useLocation } from 'react-router-dom';
import { Shield, Lock, Eye, FileText, Mail, Calendar } from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { useStructuredData } from '@/hooks/useStructuredData';
import Layout from '@/components/Layout';
import ForumLayout, { forumUserToLayoutUser } from '@/forum/components/ForumLayout';
import { cn } from '@/lib/utils';

// Hook-uri safe care returnează valori default dacă nu sunt în context
function useSafeForumAuth() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useAuth } = require('@/forum/hooks/useAuth');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAuth();
  } catch {
    return { forumUser: null };
  }
}

export default function Privacy() {
  const location = useLocation();
  // Check if we are in the forum
  const isForum = location.pathname.startsWith('/forum');

  // Folosim hook-urile safe care returnează valori default dacă nu sunt în context
  const authResult = useSafeForumAuth();
  const forumUser = isForum ? (authResult?.forumUser || null) : null;

  const { websiteData, organizationData } = useStructuredData();

  const privacyUrl = isForum
    ? 'https://fishtrophy.ro/forum/privacy'
    : 'https://fishtrophy.ro/privacy';

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
            <Shield size={32} />
          </div>
          <h1 className={cn(
            "font-bold mb-2",
            isForum ? "text-3xl text-slate-900 dark:text-white" : "text-4xl text-gray-900 dark:text-white"
          )}>
            Politica de Confidențialitate
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
            Bine ai venit pe <strong>Fish Trophy</strong>! Respectăm confidențialitatea ta și ne angajăm să protejăm
            datele tale personale. Această Politică de Confidențialitate explică cum colectăm, folosim, stocăm și
            protejăm informațiile tale personale în conformitate cu Regulamentul General privind Protecția Datelor (GDPR)
            și legislația română aplicabilă.
          </p>
        </section>

        {/* 1. Datele pe care le colectăm */}
        <section className="mb-8">
          <h2 className={cn(
            "text-2xl font-semibold mb-4 flex items-center gap-2",
            isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"
          )}>
            <FileText size={24} />
            1. Datele pe care le colectăm
          </h2>
          <div className={cn(
            "p-6 rounded-lg border",
            isForum
              ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
              : "bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
          )}>
            <h3 className={cn(
              "text-xl font-semibold mb-3",
              isForum ? "text-slate-900 dark:text-white" : "text-gray-900 dark:text-white"
            )}>
              1.1. Date furnizate de tine
            </h3>
            <ul className={cn(
              "list-disc pl-6 space-y-2 leading-relaxed",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              <li><strong>Date de cont:</strong> nume de utilizator, adresă de email, parolă (criptată)</li>
              <li><strong>Profil:</strong> nume afișat, avatar, semnătură, preferințe</li>
              <li><strong>Conținut:</strong> postări, comentarii, mesaje, recorduri de pescuit, capturi</li>
              <li><strong>Date de contact:</strong> adresă de email pentru comunicări</li>
            </ul>

            <h3 className={cn(
              "text-xl font-semibold mt-6 mb-3",
              isForum ? "text-slate-900 dark:text-white" : "text-gray-900 dark:text-white"
            )}>
              1.2. Date colectate automat
            </h3>
            <ul className={cn(
              "list-disc pl-6 space-y-2 leading-relaxed",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              <li><strong>Date tehnice:</strong> adresă IP, tip de browser, sistem de operare, dispozitiv</li>
              <li><strong>Date de utilizare:</strong> pagini vizitate, timpul petrecut, acțiuni efectuate</li>
              <li><strong>Cookie-uri:</strong> vezi <a href={isForum ? '/forum/cookies' : '/cookies'} className="text-blue-600 dark:text-blue-400 hover:underline">Politica de Cookie-uri</a></li>
              <li><strong>Date de localizare:</strong> doar dacă accepți (pentru funcții de hartă)</li>
            </ul>
          </div>
        </section>

        {/* 2. Cum folosim datele */}
        <section className="mb-8">
          <h2 className={cn(
            "text-2xl font-semibold mb-4 flex items-center gap-2",
            isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"
          )}>
            <Eye size={24} />
            2. Cum folosim datele tale
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
              Folosim datele tale pentru:
            </p>
            <ul className={cn(
              "list-disc pl-6 space-y-2 leading-relaxed",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              <li>Furnizarea și îmbunătățirea serviciilor noastre</li>
              <li>Gestionarea contului tău și autentificarea</li>
              <li>Comunicarea cu tine (notificări, actualizări)</li>
              <li>Analiza utilizării site-ului (Google Analytics, cu consimțământ)</li>
              <li>Protecția și securitatea platformei</li>
              <li>Respectarea obligațiilor legale</li>
              <li>Personalizarea experienței tale</li>
            </ul>
          </div>
        </section>

        {/* 3. Baza legală */}
        <section className="mb-8">
          <h2 className={cn(
            "text-2xl font-semibold mb-4 flex items-center gap-2",
            isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"
          )}>
            <Lock size={24} />
            3. Baza legală pentru prelucrare
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
              Prelucrăm datele tale personale pe baza următoarelor:
            </p>
            <ul className={cn(
              "list-disc pl-6 space-y-2 leading-relaxed",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              <li><strong>Consimțământ:</strong> pentru cookie-uri de analiză și marketing</li>
              <li><strong>Executarea contractului:</strong> pentru furnizarea serviciilor</li>
              <li><strong>Interes legitim:</strong> pentru securitate și îmbunătățirea serviciilor</li>
              <li><strong>Obligații legale:</strong> pentru respectarea legii</li>
            </ul>
          </div>
        </section>

        {/* 4. Partajarea datelor */}
        <section className="mb-8">
          <h2 className={cn(
            "text-2xl font-semibold mb-4",
            isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"
          )}>
            4. Partajarea datelor cu terți
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
              Nu vindem datele tale. Partajăm date doar cu:
            </p>
            <ul className={cn(
              "list-disc pl-6 space-y-2 leading-relaxed",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              <li><strong>Furnizori de servicii:</strong> Supabase (bază de date), Netlify (hosting), Google Analytics (analiză, cu consimțământ)</li>
              <li><strong>Autorități:</strong> doar dacă este cerut legal</li>
              <li><strong>Protecție:</strong> pentru prevenirea fraudelor și abuzurilor</li>
            </ul>
            <p className="mt-4 italic text-sm text-gray-500 dark:text-gray-400">
              Toți furnizorii noștri respectă GDPR și au acorduri de prelucrare a datelor.
            </p>
          </div>
        </section>

        {/* 5. Drepturile tale */}
        <section className="mb-8">
          <h2 className={cn(
            "text-2xl font-semibold mb-4",
            isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"
          )}>
            5. Drepturile tale (GDPR)
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
              Ai următoarele drepturi:
            </p>
            <ul className={cn(
              "list-disc pl-6 space-y-2 leading-relaxed",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              <li><strong>Dreptul de acces:</strong> poți solicita o copie a datelor tale</li>
              <li><strong>Dreptul de rectificare:</strong> poți actualiza datele incorecte</li>
              <li><strong>Dreptul la ștergere:</strong> poți solicita ștergerea contului</li>
              <li><strong>Dreptul la restricționare:</strong> poți limita prelucrarea</li>
              <li><strong>Dreptul la portabilitate:</strong> poți exporta datele tale</li>
              <li><strong>Dreptul de opoziție:</strong> poți te opune anumitor prelucrări</li>
              <li><strong>Dreptul de retragere a consimțământului:</strong> oricând</li>
            </ul>
            <p className={cn(
              "mt-4 leading-relaxed",
              isForum ? "text-slate-700 dark:text-slate-300" : "text-gray-700 dark:text-gray-300"
            )}>
              Pentru a exercita aceste drepturi, contactează-ne la:{' '}
              <a href="mailto:privacy@fishtrophy.ro" className="text-blue-600 dark:text-blue-400 hover:underline">
                privacy@fishtrophy.ro
              </a>
            </p>
          </div>
        </section>

        {/* 6. Securitate */}
        <section className="mb-8">
          <h2 className={cn(
            "text-2xl font-semibold mb-4",
            isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"
          )}>
            6. Securitatea datelor
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
              Implementăm măsuri de securitate tehnice și organizatorice pentru protejarea datelor tale:
              criptare SSL/TLS, autentificare sigură, acces restricționat, backup-uri regulate și monitorizare continuă.
            </p>
          </div>
        </section>

        {/* 7. Stocare */}
        <section className="mb-8">
          <h2 className={cn(
            "text-2xl font-semibold mb-4",
            isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"
          )}>
            7. Perioada de stocare
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
              Păstrăm datele tale atât timp cât este necesar pentru furnizarea serviciilor sau conform cerințelor legale.
              La ștergerea contului, datele sunt șterse definitiv în termen de 30 de zile, cu excepția celor necesare
              pentru obligații legale sau rezolvarea disputelor.
            </p>
          </div>
        </section>

        {/* 8. Contact */}
        <section className="mb-8">
          <h2 className={cn(
            "text-2xl font-semibold mb-4 flex items-center gap-2",
            isForum ? "text-blue-600 dark:text-blue-400" : "text-blue-600 dark:text-blue-400"
          )}>
            <Mail size={24} />
            8. Contact
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
              Pentru întrebări despre confidențialitate sau pentru a exercita drepturile tale:
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
            Această politică poate fi actualizată periodic. Vom notifica utilizatorii despre modificări semnificative.
          </p>
          <p className="mt-2 flex items-center justify-center gap-1">
            <Calendar size={16} />
            Ultima actualizare: 10 decembrie 2025
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SEOHead
        title="Politica de Confidențialitate - Fish Trophy"
        description="Politica de confidențialitate Fish Trophy. Află cum protejăm datele tale personale și respectăm GDPR. Drepturile tale, securitatea datelor și contact."
        keywords="politica confidențialitate, GDPR, protecție date, confidențialitate, Fish Trophy"
        image="https://fishtrophy.ro/social-media-banner-v2.jpg"
        url={privacyUrl}
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

