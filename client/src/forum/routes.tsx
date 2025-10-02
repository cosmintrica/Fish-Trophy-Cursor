import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import AuthProvider from './components/AuthProvider';

// Import pagini forum
import ForumHome from './pages/ForumHome';
import CategoryPage from './pages/CategoryPage';
import TopicPage from './pages/TopicPage';

// Componenta principală pentru rutele forum
const ForumRoutes: React.FC = () => {
  return (
    <ThemeProvider>
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

          {/* Căutare */}
          <Route path="/search" element={<div>Căutare Forum</div>} />

          {/* Mesaje private */}
          <Route path="/messages" element={<div>Mesaje Private</div>} />

          {/* Admin forum */}
          <Route path="/admin" element={<div>Admin Forum</div>} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default ForumRoutes;