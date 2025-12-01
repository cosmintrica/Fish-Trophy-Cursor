// Forum Pescuit - Export principal
// Acest fișier exportă toate componentele și paginile forum pentru import ușor

// Pagini principale
export { default as ForumHome } from './pages/ForumHome';
export { default as CategoryPage } from './pages/CategoryPage';
export { default as TopicPage } from './pages/TopicPage';

// Componente principale
export { default as ForumLayout } from './components/ForumLayout';
export { default as ForumSidebar } from './components/ForumSidebar';
export { default as CategoryList } from './components/CategoryList';
export { default as TraditionalForumCategories } from './components/TraditionalForumCategories';

// Componente specifice
export { default as CreateTopicModal } from './components/CreateTopicModal';
export { default as MessageContainer } from './components/MessageContainer';
export { default as ActiveViewers } from './components/ActiveViewers';

// Componente mobile
export { default as MobileOptimizedCategories } from './components/MobileOptimizedCategories';

// Auth components
export { default as AuthProvider } from './components/AuthProvider';
export { default as SimpleLoginModal } from './components/SimpleLoginModal';
