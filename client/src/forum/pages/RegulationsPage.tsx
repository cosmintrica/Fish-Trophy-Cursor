import { Link } from 'react-router-dom';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';

export default function RegulationsPage() {
    const { forumUser, signOut } = useAuth();
    const { theme } = useTheme();

    const handleLogout = async () => {
        await signOut();
    };

    return (
        <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={handleLogout}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
                {/* Breadcrumbs */}
                <nav style={{ marginBottom: '2rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    <Link to="/forum" style={{ color: '#2563eb', textDecoration: 'none' }}>Forum</Link>
                    <span style={{ margin: '0 0.5rem' }}>›</span>
                    <span>Regulament</span>
                </nav>

                <div style={{
                    backgroundColor: theme.surface,
                    borderRadius: '1rem',
                    border: `1px solid ${theme.border}`,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                    padding: '2rem',
                    color: theme.text
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: `1px solid ${theme.border}`, paddingBottom: '1rem' }}>
                        <div style={{ fontSize: '2rem' }}>📜</div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Regulament Fish Trophy Forum</h1>
                            <p style={{ color: theme.textSecondary, marginTop: '0.25rem' }}>Ultima actualizare: 30 Noiembrie 2025</p>
                        </div>
                    </div>

                    <div style={{ lineHeight: '1.6' }}>
                        <section style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: theme.primary, marginBottom: '1rem' }}>1. Reguli Generale</h2>
                            <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <li>Păstrați un limbaj civilizat și respectuos față de toți membrii comunității.</li>
                                <li>Sunt interzise atacurile la persoană, jignirile, discriminarea și discursul instigator la ură.</li>
                                <li>Nu postați conținut pornografic, violent sau ilegal.</li>
                                <li>Spam-ul și reclama neautorizată sunt strict interzise.</li>
                            </ul>
                        </section>

                        <section style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: theme.primary, marginBottom: '1rem' }}>2. Postarea de Conținut</h2>
                            <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <li>Asigurați-vă că postați în categoria potrivită.</li>
                                <li>Folosiți titluri descriptive pentru topicuri. "Ajutor" sau "Întrebare" nu sunt titluri acceptabile.</li>
                                <li>Verificați dacă subiectul a mai fost discutat înainte de a deschide un topic nou (folosiți funcția de căutare).</li>
                                <li>Nu deviați de la subiectul discuției (off-topic).</li>
                            </ul>
                        </section>

                        <section style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: theme.primary, marginBottom: '1rem' }}>3. Catch & Release (C&R)</h2>
                            <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <li>Fish Trophy promovează pescuitul responsabil și protejarea naturii.</li>
                                <li>Încurajăm eliberarea capturilor (Catch & Release), în special a exemplarelor capitale.</li>
                                <li>Pozele cu pești morți, plini de sânge sau ținuți în condiții improprii sunt interzise și vor fi șterse.</li>
                            </ul>
                        </section>

                        <section style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: theme.primary, marginBottom: '1rem' }}>4. Sancțiuni</h2>
                            <p>Încălcarea regulamentului poate duce la:</p>
                            <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <li>Avertisment verbal sau scris.</li>
                                <li>Ștergerea sau editarea conținutului.</li>
                                <li>Suspendarea temporară a contului (ban).</li>
                                <li>Suspendarea permanentă a contului pentru abateri grave sau repetate.</li>
                            </ul>
                        </section>

                        <div style={{
                            backgroundColor: theme.surfaceHover,
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            borderLeft: `4px solid ${theme.accent}`,
                            fontSize: '0.875rem',
                            fontStyle: 'italic'
                        }}>
                            Prin utilizarea acestui forum, sunteți de acord să respectați acest regulament. Echipa de moderare își rezervă dreptul de a modifica regulamentul oricând, cu notificarea utilizatorilor.
                        </div>
                    </div>
                </div>
            </div>
        </ForumLayout>
    );
}
