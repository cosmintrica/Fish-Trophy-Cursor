import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
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

// Componenta principală pentru rutele forum
const ForumRoutes: React.FC = () => {
  return (
    <ThemeProvider>
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

            {/* Rute utilizatori - folosim prefix /user/ pentru a evita conflicte cu categorii */}
            {/* IMPORTANT: Această rută trebuie să fie înainte de categoriile generice */}
            <Route path="/user/:username" element={<ForumUserProfile />} />

            {/* URL-uri clean și ierarhice: /forum/categorySlug/subforumSlug/topicSlug */}
            {/* IMPORTANT: Ordinea rutelor este CRITICĂ - mai specific înainte de mai general */}
            {/* IMPORTANT: Subforums sunt tratate ca subcategorii în URL-uri: category/subforum (nu category/subcategory/subforum) */}

            {/* Rute topicuri - unificate: category/potentialSlug/topic (potentialSlug poate fi subcategorie SAU subforum) */}
            {/* IMPORTANT: Unificăm rutele - TopicPage detectează automat dacă e subcategorie sau subforum */}
            <Route path="/:categorySlug/:potentialSlug/:topicSlug" element={<TopicPage />} />

            {/* Rute subforums (category/subforum) - 2 segmente, TREBUIE înainte de subcategorii */}
            <Route path="/:categorySlug/:subforumSlug" element={<CategoryPage />} />

            {/* Rute subcategorii (category/subcategory) */}
            <Route path="/:categorySlug/:subcategorySlug" element={<CategoryPage />} />

            {/* Rute categorii (doar category slug) */}
            <Route path="/:categorySlug" element={<CategoryPage />} />

            {/* Rute legacy pentru compatibilitate */}
            <Route path="/category/:id" element={<CategoryPage />} />
            <Route path="/topic/:id" element={<TopicPage />} />

          </Routes>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default ForumRoutes;