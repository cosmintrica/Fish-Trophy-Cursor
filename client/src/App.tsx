import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth-supabase';
import { useAuth } from '@/hooks/useAuth';
import { analytics } from '@/lib/analytics';
import { useAnalytics } from '@/hooks/useAnalytics';
import Layout from '@/components/Layout';

// Initialize analytics
analytics;
import ProtectedRoute from '@/components/ProtectedRoute';
// AdminRoute removed - Black Sea now public
import ScrollToTop from '@/components/ScrollToTop';

// Pages
import Home from '@/pages/Home';
import BlackSeaComingSoon from '@/pages/BlackSeaComingSoon';
import Species from '@/pages/Species';
import Leaderboards from '@/pages/Leaderboards';
import Records from '@/pages/Records';
import Admin from '@/pages/Admin';
import SubmissionGuide from '@/pages/SubmissionGuide';
import Profile from '@/pages/Profile';
import PublicProfile from '@/pages/PublicProfile';
import FishingShops from '@/pages/FishingShops';
import OgGenerator from '@/pages/OgGenerator';
import EmailConfirmation from '@/pages/EmailConfirmation';
import ConstructionPage from '@/pages/ConstructionPage';
import MapTest from '@/pages/MapTest';

// Analytics wrapper component that uses useAnalytics inside Router
function AnalyticsWrapper({ children }: { children: React.ReactNode }) {
  useAnalytics();
  return <>{children}</>;
}

// Component to check if user is admin and show construction page if not
function AppContent() {
  const { user, loading } = useAuth();

  // Check if user is admin - use environment variable for security
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = user?.email === adminEmail;

  // Debug logging (only when user changes)
  if (user?.email) {
    console.log('AppContent - User:', user?.email);
    console.log('AppContent - Admin Email:', adminEmail);
    console.log('AppContent - Is Admin:', isAdmin);
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă...</p>
        </div>
      </div>
    );
  }

  // Show construction page if user is not admin or not logged in
  if (!isAdmin) {
    return <ConstructionPage />;
  }

  // Show full app for admin users
  return (
    <Layout>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/email-confirmation" element={<EmailConfirmation />} />
        <Route path="/black-sea" element={<BlackSeaComingSoon />} />
        <Route path="/species" element={<Species />} />
        <Route path="/leaderboards" element={<Leaderboards />} />
        <Route path="/records" element={<Records />} />
        <Route path="/profile/:userId" element={<PublicProfile />} />
        <Route path="/submission-guide" element={<SubmissionGuide />} />
        <Route path="/fishing-shops" element={<FishingShops />} />
        <Route path="/og-generator" element={<OgGenerator />} />
        <Route path="/map-test" element={<MapTest />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AnalyticsWrapper>
            <AppContent />
          </AnalyticsWrapper>
        </Router>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }
          }}
        />
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
