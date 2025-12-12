import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import AuthProvider from './components/AuthProvider';

import RegulationsPage from './pages/RegulationsPage';

// Import pagini forum
import ForumHome from './pages/ForumHome';
import CategoryPage from './pages/CategoryPage';
import TopicPage from './pages/TopicPage';
import AdminForum from './pages/AdminForum';
import RecentPosts from './pages/RecentPosts';
import ActiveMembers from './pages/ActiveMembers';
import ForumUserProfile from './pages/ForumUserProfile';
import NotFound404 from '../components/NotFound404';
import Privacy from '../pages/Privacy';
import Cookies from '../pages/Cookies';

import { useSubscribeToForumUpdates } from './hooks/useSubscribeToForumUpdates';

// Componenta principală pentru rutele forum
const ForumRoutes: React.FC = () => {
  // Activează ascultarea update-urilor în timp real pentru tot forumul
  useSubscribeToForumUpdates();

  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          {/* Ruta principală forum */}
          <Route path="/" element={<ForumHome />} />

          {/* Rute speciale - trebuie să fie înainte de categoriile generice */}
          <Route path="/recent" element={<RecentPosts />} />
          <Route path="/members" element={<ActiveMembers />} />
          <Route path="/search" element={<div>Căutare Forum</div>} />
          <Route path="/rules" element={<RegulationsPage />} />
          <Route path="/messages" element={<div>Mesaje Private</div>} />
          <Route path="/admin" element={<AdminForum />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookies" element={<Cookies />} />

          {/* Rute utilizatori - folosim prefix /user/ pentru a evita conflicte cu categorii */}
          {/* IMPORTANT: Această rută trebuie să fie înainte de categoriile generice */}
          <Route path="/user/:username" element={<ForumUserProfile />} />

          {/* Ruta explicită pentru 404 */}
          <Route path="/404" element={<NotFound404 />} />

          {/* URL-uri clean și ierarhice: /forum/subcategorySlug/topicSlug (FĂRĂ categorySlug) */}
          {/* IMPORTANT: Ordinea rutelor este CRITICĂ - mai specific înainte de mai general */}
          {/* IMPORTANT: Eliminăm categorySlug din URL-uri pentru URL-uri mai clean și mai scurte */}

          {/* Rute topicuri - subcategorySlug/topicSlug (potentialSlug poate fi subcategorie SAU subforum) */}
          {/* IMPORTANT: TopicPage detectează automat dacă e subcategorie sau subforum */}
          <Route path="/:potentialSlug/:topicSlug" element={<TopicPage />} />

          {/* Rute subcategorii/subforums (doar subcategorySlug sau subforumSlug) */}
          <Route path="/:subcategoryOrSubforumSlug" element={<CategoryPage />} />

          {/* Rute legacy pentru compatibilitate */}
          <Route path="/category/:id" element={<CategoryPage />} />
          <Route path="/topic/:id" element={<TopicPage />} />

          {/* 404 - Catch all pentru rute invalide */}
          <Route path="*" element={<NotFound404 />} />

        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
};

export default ForumRoutes;