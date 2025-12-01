import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import ForumLayout, { forumUserToLayoutUser } from '../components/ForumLayout';
import { supabase } from '../../lib/supabase';

export default function AdminForum() {
  const { forumUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!forumUser) {
        navigate('/forum');
        return;
      }

      try {
        // Check if user has admin role in forum_users
        const { data: userData, error } = await supabase
          .from('forum_users')
          .select('role_id, forum_roles!inner(name)')
          .eq('user_id', forumUser.id)
          .single();

        if (error) {
          console.error('Error checking admin:', error);
          setIsAdmin(false);
          setChecking(false);
          return;
        }

        // Check if role is admin
        const role = userData?.forum_roles;
        if (role && typeof role === 'object' && 'name' in role && role.name === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          // Redirect if not admin
          setTimeout(() => {
            navigate('/forum');
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking admin:', error);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };

    checkAdmin();
  }, [forumUser, navigate]);

  if (checking) {
    return (
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
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
      <ForumLayout user={forumUserToLayoutUser(forumUser)} onLogin={() => { }} onLogout={() => { }}>
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

  return (
    <ForumLayout user={forumUser ? { id: forumUser.id, username: forumUser.username, email: '', isAdmin: true } as ForumUser : null} onLogin={() => { }} onLogout={() => { }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: theme.text, marginBottom: '2rem' }}>
          🔧 Admin Panel Forum
        </h1>

        <div style={{
          backgroundColor: theme.surface,
          borderRadius: '0.5rem',
          border: `1px solid ${theme.border}`,
          padding: '2rem'
        }}>
          <div style={{ color: theme.textSecondary, marginBottom: '1rem' }}>
            Panoul de administrare pentru forum va fi implementat aici.
          </div>
          <div style={{ color: theme.textSecondary, fontSize: '0.875rem' }}>
            Funcționalități planificate:
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              <li>Gestionare categorii și subcategorii</li>
              <li>Moderare topicuri și postări</li>
              <li>Gestionare utilizatori și roluri</li>
              <li>Raportări și restricții</li>
              <li>Statistici și rapoarte</li>
            </ul>
          </div>
        </div>
      </div>
    </ForumLayout>
  );
}

