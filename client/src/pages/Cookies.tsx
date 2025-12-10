import { useLocation } from 'react-router-dom';
import { Cookie, Shield, BarChart3, Target, Settings, Info } from 'lucide-react';
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

export default function Cookies() {
  const location = useLocation();
  const isForum = location.pathname.startsWith('/forum');
  
  // Folosim hook-urile safe care returnează valori default dacă nu sunt în context
  const authResult = useSafeForumAuth();
  const themeResult = useSafeForumTheme();
  const forumUser = isForum ? (authResult?.forumUser || null) : null;
  const theme = isForum ? (themeResult?.theme || defaultTheme) : defaultTheme;
  
  const { websiteData, organizationData } = useStructuredData();

  const cookiesUrl = isForum 
    ? 'https://fishtrophy.ro/forum/cookies' 
    : 'https://fishtrophy.ro/cookies';

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
            <Cookie size={32} />
          </div>
          <h1 style={{
            fontSize: isForum ? '1.75rem' : '2.5rem',
            fontWeight: '700',
            color: isForum ? theme.text : '#1f2937',
            marginBottom: '0.5rem'
          }}>
            Politica de Cookie-uri
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
            Această Politică de Cookie-uri explică ce sunt cookie-urile, cum le folosim pe site-ul <strong>Fish Trophy</strong>, 
            și cum poți gestiona preferințele tale. Respectăm legislația GDPR și oferim control complet asupra cookie-urilor.
          </p>
        </section>

        {/* 1. Ce sunt cookie-urile */}
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
            <Info size={24} />
            1. Ce sunt cookie-urile?
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
              Cookie-urile sunt fișiere text mici stocate pe dispozitivul tău când vizitezi un site web. 
              Ele permit site-ului să-ți amintească preferințele, să îmbunătățească experiența și să ofere funcții personalizate.
            </p>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151'
            }}>
              Cookie-urile nu conțin informații personale identificabile direct și nu pot dăuna dispozitivului tău.
            </p>
          </div>
        </section>

        {/* 2. Tipuri de cookie-uri */}
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
            <Settings size={24} />
            2. Tipuri de cookie-uri pe care le folosim
          </h2>

          {/* Necessary Cookies */}
          <div style={{
            backgroundColor: isForum ? theme.surface : '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: `1px solid ${isForum ? theme.border : '#e5e7eb'}`,
            marginBottom: '1rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              <Shield size={20} style={{ color: isForum ? theme.primary : '#3b82f6' }} />
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: '600',
                color: isForum ? theme.text : '#1f2937'
              }}>
                2.1. Cookie-uri Necesare (Întotdeauna Active)
              </h3>
            </div>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151',
              marginBottom: '0.75rem'
            }}>
              Aceste cookie-uri sunt esențiale pentru funcționarea site-ului și nu pot fi dezactivate:
            </p>
            <ul style={{
              listStyle: 'disc',
              paddingLeft: '1.5rem',
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151'
            }}>
              <li><strong>Autentificare:</strong> mențin sesiunea ta de utilizator</li>
              <li><strong>Securitate:</strong> protejează împotriva atacurilor și fraudelor</li>
              <li><strong>Preferințe:</strong> rețin setările tale (tema, limba)</li>
              <li><strong>Funcționalitate:</strong> permit funcții de bază (formulare, căutare)</li>
            </ul>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.textSecondary : '#6b7280',
              marginTop: '0.75rem',
              fontSize: '0.9rem',
              fontStyle: 'italic'
            }}>
              Durată: Sesiune sau până la 1 an
            </p>
          </div>

          {/* Analytics Cookies */}
          <div style={{
            backgroundColor: isForum ? theme.surface : '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: `1px solid ${isForum ? theme.border : '#e5e7eb'}`,
            marginBottom: '1rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              <BarChart3 size={20} style={{ color: isForum ? theme.primary : '#3b82f6' }} />
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: '600',
                color: isForum ? theme.text : '#1f2937'
              }}>
                2.2. Cookie-uri de Analiză (Cu Consimțământ)
              </h3>
            </div>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151',
              marginBottom: '0.75rem'
            }}>
              Ne ajută să înțelegem cum folosești site-ul pentru a-l îmbunătăți:
            </p>
            <ul style={{
              listStyle: 'disc',
              paddingLeft: '1.5rem',
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151'
            }}>
              <li><strong>Google Analytics:</strong> analizează traficul, paginile populare, comportamentul utilizatorilor</li>
              <li><strong>Performanță:</strong> identifică probleme tehnice și zone de îmbunătățire</li>
              <li><strong>Statistici:</strong> număr de vizitatori, surse de trafic, conversii</li>
            </ul>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.textSecondary : '#6b7280',
              marginTop: '0.75rem',
              fontSize: '0.9rem',
              fontStyle: 'italic'
            }}>
              Durată: Până la 2 ani | Furnizor: Google LLC (conform{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: isForum ? theme.primary : '#3b82f6', textDecoration: 'underline' }}>
                Google Privacy Policy
              </a>)
            </p>
          </div>

          {/* Marketing Cookies */}
          <div style={{
            backgroundColor: isForum ? theme.surface : '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: `1px solid ${isForum ? theme.border : '#e5e7eb'}`
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              <Target size={20} style={{ color: isForum ? theme.primary : '#3b82f6' }} />
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: '600',
                color: isForum ? theme.text : '#1f2937'
              }}>
                2.3. Cookie-uri de Marketing (Cu Consimțământ)
              </h3>
            </div>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151',
              marginBottom: '0.75rem'
            }}>
              Folosite pentru publicitate personalizată și măsurarea campaniilor (în viitor):
            </p>
            <ul style={{
              listStyle: 'disc',
              paddingLeft: '1.5rem',
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151'
            }}>
              <li><strong>Publicitate:</strong> afișează anunțuri relevante pentru tine</li>
              <li><strong>Retargeting:</strong> reafișează anunțuri pentru utilizatori care au vizitat site-ul</li>
              <li><strong>Măsurare:</strong> evaluează eficacitatea campaniilor publicitare</li>
            </ul>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.textSecondary : '#6b7280',
              marginTop: '0.75rem',
              fontSize: '0.9rem',
              fontStyle: 'italic'
            }}>
              Durată: Până la 1 an | Momentan nu folosim cookie-uri de marketing
            </p>
          </div>
        </section>

        {/* 3. Gestionarea cookie-urilor */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: isForum ? theme.primary : '#3b82f6',
            marginBottom: '1rem'
          }}>
            3. Cum poți gestiona cookie-urile
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
              Ai control complet asupra cookie-urilor:
            </p>
            <ul style={{
              listStyle: 'disc',
              paddingLeft: '1.5rem',
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151'
            }}>
              <li><strong>Banner de consimțământ:</strong> la prima vizită, poți alege ce cookie-uri să accepti</li>
              <li><strong>Setări browser:</strong> poți șterge sau bloca cookie-uri din setările browser-ului</li>
              <li><strong>Actualizare preferințe:</strong> poți schimba preferințele oricând din banner-ul de cookie-uri</li>
            </ul>
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: isForum ? theme.primary + '10' : '#eff6ff',
              borderRadius: '0.5rem',
              border: `1px solid ${isForum ? theme.primary + '30' : '#bfdbfe'}`
            }}>
              <p style={{
                lineHeight: '1.8',
                color: isForum ? theme.text : '#1e40af',
                fontWeight: '500',
                margin: 0
              }}>
                ⚠️ <strong>Notă:</strong> Dezactivarea cookie-urilor necesare poate afecta funcționalitatea site-ului.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Cookie-uri terți */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: isForum ? theme.primary : '#3b82f6',
            marginBottom: '1rem'
          }}>
            4. Cookie-uri de la terți
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
              Folosim servicii terțe care pot seta cookie-uri:
            </p>
            <ul style={{
              listStyle: 'disc',
              paddingLeft: '1.5rem',
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151'
            }}>
              <li><strong>Google Analytics:</strong> pentru analiză (vezi{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: isForum ? theme.primary : '#3b82f6', textDecoration: 'underline' }}>
                  Google Privacy Policy
                </a>)
              </li>
              <li><strong>Supabase:</strong> pentru autentificare și bază de date (vezi{' '}
                <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: isForum ? theme.primary : '#3b82f6', textDecoration: 'underline' }}>
                  Supabase Privacy Policy
                </a>)
              </li>
            </ul>
            <p style={{
              lineHeight: '1.8',
              color: isForum ? theme.text : '#374151',
              marginTop: '1rem',
              fontStyle: 'italic'
            }}>
              Aceste servicii au propriile politici de confidențialitate și cookie-uri.
            </p>
          </div>
        </section>

        {/* 5. Actualizări */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: isForum ? theme.primary : '#3b82f6',
            marginBottom: '1rem'
          }}>
            5. Actualizări ale acestei politici
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
              Putem actualiza această politică periodic pentru a reflecta schimbări în practicile noastre sau în legislație. 
              Vom notifica utilizatorii despre modificări semnificative prin banner sau email.
            </p>
          </div>
        </section>

        {/* 6. Contact */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: isForum ? theme.primary : '#3b82f6',
            marginBottom: '1rem'
          }}>
            6. Contact
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
              Pentru întrebări despre cookie-uri:
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
            Pentru mai multe informații despre confidențialitate, consultă{' '}
            <a href={isForum ? '/forum/privacy' : '/privacy'} style={{ color: isForum ? theme.primary : '#3b82f6', textDecoration: 'underline' }}>
              Politica de Confidențialitate
            </a>.
          </p>
          <p style={{ marginTop: '0.5rem' }}>
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

