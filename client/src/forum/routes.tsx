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

// Componenta principală pentru rutele forum
const ForumRoutes: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Routes>
          {/* Ruta principală forum */}
          <Route path="/" element={<ForumHome />} />

          {/* Rute categorii */}
          <Route path="/category/:id" element={<CategoryPage />} />
          <Route path="/category/:id/:subcategoryId" element={<CategoryPage />} />

          {/* Rute topicuri */}
          <Route path="/topic/:id" element={<TopicPage />} />

          {/* Rute utilizatori */}
          <Route path="/user/:id" element={<div>Profil Utilizator Forum</div>} />

          {/* Postări recente și membri */}
          <Route path="/recent" element={<RecentPosts />} />
          <Route path="/members" element={<ActiveMembers />} />

          {/* Căutare */}
          <Route path="/search" element={<div>Căutare Forum</div>} />

          {/* Regulament */}
          <Route path="/rules" element={<RegulationsPage />} />

          {/* Mesaje private */}
          <Route path="/messages" element={<div>Mesaje Private</div>} />

          {/* Admin forum */}
          <Route path="/admin" element={<AdminForum />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default ForumRoutes;