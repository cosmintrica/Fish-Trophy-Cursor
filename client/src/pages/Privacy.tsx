import { useLocation } from 'react-router-dom';
import { Shield, Lock, Eye, FileText, Mail, Calendar } from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { useStructuredData } from '@/hooks/useStructuredData';
import Layout from '@/components/Layout';
import ForumLayout, { forumUserToLayoutUser } from '@/forum/components/ForumLayout';

// Default theme pentru site-ul principal
const defaultTheme = {
  text: '#1f2937',
  textSecondary: '#6b7280',
  primary: '#3b82f6',
  surface: '#ffffff',
  border: '#e5e7eb'
};

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

function useSafeForumTheme() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useTheme } = require('@/forum/contexts/ThemeContext');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useTheme();
  } catch {
    return { theme: defaultTheme };
  }
}

export default function Privacy() {
  const location = useLocation();
  const isForum = location.pathname.startsWith('/forum');
  
  // Folosim hook-urile safe care returnează valori default dacă nu sunt în context
  const authResult = useSafeForumAuth();
  const themeResult = useSafeForumTheme();
  const forumUser = isForum ? (authResult?.forumUser || null) : null;
  const theme = isForum ? (themeResult?.theme || defaultTheme) : defaultTheme;
  
  const { websiteData, organizationData } = useStructuredData();

  const privacyUrl = isForum 
    ? 'https://fishtrophy.ro/forum/privacy' 
    : 'https://fishtrophy.ro/privacy';

  const content = (
    <div style={isForum ? {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '1rem',
      color: theme.text
    } : {
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '2rem 1rem'
    }}>
      <div style={isForum ? {
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: '0.5rem',
        padding: '2rem'
      } : {
        backgroundColor: 'white',
        borderRadius: '1rem',
        padding: '3rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: isForum ? theme.primary + '20' : '#3b82f6',
            color: isForum ? theme.primary : 'white',
            marginBottom: '1rem'
          }}>
            <Shield size={32} />
          </div>
          <h1 style={{
            fontSize: isForum ? '1.75rem' : '2.5rem',
            fontWeight: '700',
            color: isForum ? theme.text : '#1f2937',
            marginBottom: '0.5rem'
          }}>
            Politica de Confidențialitate
          </h1>
          <p style={{
            color: isForum ? theme.textSecondary : '#6b7280',
            fontSize: '1rem'
          }}>
            Ultima actualizare: 10 decembrie 2025
          </p>
        </div>

        {/* Introduction */}
        <section style={{ marginBottom: '2rem' }}>
          <p style={{
            fontSize: '1.1rem',
            lineHeight: '1.8',
            color: isForum ? theme.text : '#374151',
            marginBottom: '1rem'
          }}>
            Bine ai venit pe <strong>Fish Trophy</strong>! Respectăm confidențialitatea ta și ne angajăm să protejăm 
            datele tale personale. Această Politică de Confidențialitate explică cum colectăm, folosim, stocăm și 
            protejăm informațiile tale personale în conformitate cu Regulamentul General privind Protecția Datelor (GDPR) 
            și legislația română aplicabilă.
          </p>
        </section>

        {/* 1. Datele pe care le colectăm */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: isForum ? theme.primary : '#3b82f6',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <FileText size={24} />
            1. Datele pe care le colectăm
          </h2>
          <div style={{
            backgroundColor: isForum ? theme.surface : '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: `1px solid ${isForum ? theme.border : '#e5e7eb'}`
          }}>
            <h3 style={{
              fontSize: '1.2rem',
              fontWeight: '600',
              marginBottom: '0.75rem',
              color: isForum ? theme.text : '#1f2937'
            }}>
              1.1. Date furnizate de tine
            </h3>
            <ul style={{
              listStyle: 'disc',
              paddingLeft: '1.5rem',
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151'
            }}>
              <li><strong>Date de cont:</strong> nume de utilizator, adresă de email, parolă (criptată)</li>
              <li><strong>Profil:</strong> nume afișat, avatar, semnătură, preferințe</li>
              <li><strong>Conținut:</strong> postări, comentarii, mesaje, recorduri de pescuit, capturi</li>
              <li><strong>Date de contact:</strong> adresă de email pentru comunicări</li>
            </ul>

            <h3 style={{
              fontSize: '1.2rem',
              fontWeight: '600',
              marginTop: '1.5rem',
              marginBottom: '0.75rem',
              color: isForum ? theme.text : '#1f2937'
            }}>
              1.2. Date colectate automat
            </h3>
            <ul style={{
              listStyle: 'disc',
              paddingLeft: '1.5rem',
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151'
            }}>
              <li><strong>Date tehnice:</strong> adresă IP, tip de browser, sistem de operare, dispozitiv</li>
              <li><strong>Date de utilizare:</strong> pagini vizitate, timpul petrecut, acțiuni efectuate</li>
              <li><strong>Cookie-uri:</strong> vezi <a href={isForum ? '/forum/cookies' : '/cookies'} style={{ color: isForum ? theme.primary : '#3b82f6', textDecoration: 'underline' }}>Politica de Cookie-uri</a></li>
              <li><strong>Date de localizare:</strong> doar dacă accepți (pentru funcții de hartă)</li>
            </ul>
          </div>
        </section>

        {/* 2. Cum folosim datele */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: isForum ? theme.primary : '#3b82f6',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Eye size={24} />
            2. Cum folosim datele tale
          </h2>
          <div style={{
            backgroundColor: isForum ? theme.surface : '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: `1px solid ${isForum ? theme.border : '#e5e7eb'}`
          }}>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151',
              marginBottom: '1rem'
            }}>
              Folosim datele tale pentru:
            </p>
            <ul style={{
              listStyle: 'disc',
              paddingLeft: '1.5rem',
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151'
            }}>
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
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: isForum ? theme.primary : '#3b82f6',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Lock size={24} />
            3. Baza legală pentru prelucrare
          </h2>
          <div style={{
            backgroundColor: isForum ? theme.surface : '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: `1px solid ${isForum ? theme.border : '#e5e7eb'}`
          }}>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151',
              marginBottom: '1rem'
            }}>
              Prelucrăm datele tale personale pe baza următoarelor:
            </p>
            <ul style={{
              listStyle: 'disc',
              paddingLeft: '1.5rem',
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151'
            }}>
              <li><strong>Consimțământ:</strong> pentru cookie-uri de analiză și marketing</li>
              <li><strong>Executarea contractului:</strong> pentru furnizarea serviciilor</li>
              <li><strong>Interes legitim:</strong> pentru securitate și îmbunătățirea serviciilor</li>
              <li><strong>Obligații legale:</strong> pentru respectarea legii</li>
            </ul>
          </div>
        </section>

        {/* 4. Partajarea datelor */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: isForum ? theme.primary : '#3b82f6',
            marginBottom: '1rem'
          }}>
            4. Partajarea datelor cu terți
          </h2>
          <div style={{
            backgroundColor: isForum ? theme.surface : '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: `1px solid ${isForum ? theme.border : '#e5e7eb'}`
          }}>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151',
              marginBottom: '1rem'
            }}>
              Nu vindem datele tale. Partajăm date doar cu:
            </p>
            <ul style={{
              listStyle: 'disc',
              paddingLeft: '1.5rem',
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151'
            }}>
              <li><strong>Furnizori de servicii:</strong> Supabase (bază de date), Netlify (hosting), Google Analytics (analiză, cu consimțământ)</li>
              <li><strong>Autorități:</strong> doar dacă este cerut legal</li>
              <li><strong>Protecție:</strong> pentru prevenirea fraudelor și abuzurilor</li>
            </ul>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151',
              marginTop: '1rem',
              fontStyle: 'italic'
            }}>
              Toți furnizorii noștri respectă GDPR și au acorduri de prelucrare a datelor.
            </p>
          </div>
        </section>

        {/* 5. Drepturile tale */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: isForum ? theme.primary : '#3b82f6',
            marginBottom: '1rem'
          }}>
            5. Drepturile tale (GDPR)
          </h2>
          <div style={{
            backgroundColor: isForum ? theme.surface : '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: `1px solid ${isForum ? theme.border : '#e5e7eb'}`
          }}>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151',
              marginBottom: '1rem'
            }}>
              Ai următoarele drepturi:
            </p>
            <ul style={{
              listStyle: 'disc',
              paddingLeft: '1.5rem',
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151'
            }}>
              <li><strong>Dreptul de acces:</strong> poți solicita o copie a datelor tale</li>
              <li><strong>Dreptul de rectificare:</strong> poți actualiza datele incorecte</li>
              <li><strong>Dreptul la ștergere:</strong> poți solicita ștergerea contului</li>
              <li><strong>Dreptul la restricționare:</strong> poți limita prelucrarea</li>
              <li><strong>Dreptul la portabilitate:</strong> poți exporta datele tale</li>
              <li><strong>Dreptul de opoziție:</strong> poți te opune anumitor prelucrări</li>
              <li><strong>Dreptul de retragere a consimțământului:</strong> oricând</li>
            </ul>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151',
              marginTop: '1rem'
            }}>
              Pentru a exercita aceste drepturi, contactează-ne la:{' '}
              <a href="mailto:privacy@fishtrophy.ro" style={{ color: isForum ? theme.primary : '#3b82f6', textDecoration: 'underline' }}>
                privacy@fishtrophy.ro
              </a>
            </p>
          </div>
        </section>

        {/* 6. Securitate */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: isForum ? theme.primary : '#3b82f6',
            marginBottom: '1rem'
          }}>
            6. Securitatea datelor
          </h2>
          <div style={{
            backgroundColor: isForum ? theme.surface : '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: `1px solid ${isForum ? theme.border : '#e5e7eb'}`
          }}>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151'
            }}>
              Implementăm măsuri de securitate tehnice și organizatorice pentru protejarea datelor tale:
              criptare SSL/TLS, autentificare sigură, acces restricționat, backup-uri regulate și monitorizare continuă.
            </p>
          </div>
        </section>

        {/* 7. Stocare */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: isForum ? theme.primary : '#3b82f6',
            marginBottom: '1rem'
          }}>
            7. Perioada de stocare
          </h2>
          <div style={{
            backgroundColor: isForum ? theme.surface : '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: `1px solid ${isForum ? theme.border : '#e5e7eb'}`
          }}>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151'
            }}>
              Păstrăm datele tale atât timp cât este necesar pentru furnizarea serviciilor sau conform cerințelor legale.
              La ștergerea contului, datele sunt șterse definitiv în termen de 30 de zile, cu excepția celor necesare 
              pentru obligații legale sau rezolvarea disputelor.
            </p>
          </div>
        </section>

        {/* 8. Contact */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: isForum ? theme.primary : '#3b82f6',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Mail size={24} />
            8. Contact
          </h2>
          <div style={{
            backgroundColor: isForum ? theme.surface : '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: `1px solid ${isForum ? theme.border : '#e5e7eb'}`
          }}>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151',
              marginBottom: '0.5rem'
            }}>
              Pentru întrebări despre confidențialitate sau pentru a exercita drepturile tale:
            </p>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151'
            }}>
              <strong>Email:</strong>{' '}
              <a href="mailto:privacy@fishtrophy.ro" style={{ color: isForum ? theme.primary : '#3b82f6', textDecoration: 'underline' }}>
                privacy@fishtrophy.ro
              </a>
            </p>
          </div>
        </section>

        {/* Footer */}
        <div style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: `2px solid ${isForum ? theme.border : '#e5e7eb'}`,
          textAlign: 'center',
          color: isForum ? theme.textSecondary : '#6b7280',
          fontSize: '0.9rem'
        }}>
          <p>
            Această politică poate fi actualizată periodic. Vom notifica utilizatorii despre modificări semnificative.
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            <Calendar size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
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
          onLogin={() => {}}
          onLogout={() => {}}
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

