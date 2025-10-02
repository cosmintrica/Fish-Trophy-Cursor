import AuthProvider from '../components/AuthProvider';
import CategoryPage from './CategoryPage';

export default function CategoryPageWrapper() {
  return (
    <AuthProvider>
      <CategoryPage />
    </AuthProvider>
  );
}
