// Forum Pescuit - Configurare rute
// Acest fișier definește toate rutele pentru secțiunea forum

import React from 'react';
import { Route, Routes } from 'react-router-dom';

// Import pagini forum
import ForumHome from './pages/ForumHome';
import CategoryPage from './pages/CategoryPage';
import TopicPage from './pages/TopicPage';

// Componenta principală pentru rutele forum
const ForumRoutes: React.FC = () => {
  return (
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
  );
};

export default ForumRoutes;
