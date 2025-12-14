import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import { supabase } from '../../lib/supabase';
import AdminPanelTabs, { AdminTab } from '../components/admin/AdminPanelTabs';
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminCategories from '../components/admin/AdminCategories';
import AdminModeration from '../components/admin/AdminModeration';
import AdminReputation from '../components/admin/AdminReputation';
import AdminBadges from '../components/admin/AdminBadges';
import AdminBraconajReports from '../components/admin/AdminBraconajReports';
import AdminRoles from '../components/admin/AdminRoles';
import AdminMarketplace from '../components/admin/AdminMarketplace';

export default function AdminForum() {
  const { forumUser, loading: authLoading, signOut } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
  };
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      // Wait for auth to finish loading before checking
      if (authLoading) {
        setChecking(true);
        return;
      }

      // If auth finished loading and no user, redirect
      if (!forumUser) {
        setChecking(false);
        setIsAdmin(false);
        navigate('/forum');
        return;
      }

      try {
        setChecking(true);
        
        // First check if forumUser already has isAdmin flag (from useAuth hook)
        if (forumUser.isAdmin === true) {
          setIsAdmin(true);
          setChecking(false);
          return;
        }

        // If not set, check if user has admin role in profiles (sursa de adevăr)
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', forumUser.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking admin:', error);
          setIsAdmin(false);
          setChecking(false);
          navigate('/forum');
          return;
        }

        // Check if role is admin
        if (profileData?.role === 'admin') {
          setIsAdmin(true);
          setChecking(false);
        } else {
          setIsAdmin(false);
          setChecking(false);
          // Redirect if not admin
          navigate('/forum');
        }
      } catch (error) {
        console.error('Error checking admin:', error);
        setIsAdmin(false);
        setChecking(false);
        navigate('/forum');
      }
    };

    checkAdmin();
  }, [forumUser, authLoading, navigate]);

  if (checking) {
    return (
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={handleLogout}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
            <div>Se verifică permisiunile...</div>
          </div>
        </div>
      </ForumLayout>
    );
  }

  if (!isAdmin) {
    return (
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={handleLogout}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚫</div>
            <div style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Acces Interzis</div>
            <div style={{ color: '#6b7280', marginBottom: '1rem' }}>Nu ai permisiuni de administrator pentru forum.</div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Redirecționare către forum...</div>
          </div>
        </div>
      </ForumLayout>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'categorii':
        return <AdminCategories />;
      case 'moderare':
        return <AdminModeration />;
      case 'reputatie':
        return <AdminReputation />;
      case 'badges':
        return <AdminBadges />;
      case 'braconaj':
        return <AdminBraconajReports />;
      case 'roluri':
        return <AdminRoles />;
      case 'marketplace':
        return <AdminMarketplace />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <ForumLayout user={forumUserToLayoutUser(forumUser ? { ...forumUser, isAdmin: true } : null)} onLogin={() => { }} onLogout={() => { }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: theme.text, marginBottom: '1rem' }}>
          🔧 Admin Panel Forum
        </h1>

        <div style={{
          backgroundColor: theme.surface,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`,
          padding: '1rem',
          minHeight: '600px',
          width: '100%',
          overflow: 'hidden'
        }}>
          <AdminPanelTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <div style={{ width: '100%', overflowX: 'hidden' }}>
            {renderTabContent()}
          </div>
        </div>
      </div>
    </ForumLayout>
  );
}

