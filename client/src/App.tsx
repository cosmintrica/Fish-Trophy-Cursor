import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth-supabase';
import { useAdmin } from '@/hooks/useAdmin';
import { analytics } from '@/lib/analytics';
import { useAnalytics } from '@/hooks/useAnalytics';
import Layout from '@/components/Layout';

// Initialize analytics
analytics;
import ProtectedRoute from '@/components/ProtectedRoute';
import ScrollToTop from '@/components/ScrollToTop';

// Pages
import Home from '@/pages/Home';
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
import MapcherryTest from '@/pages/MapcherryTest';
import ForumRoutes from '@/forum/routes';

// Analytics wrapper component that uses useAnalytics inside Router
function AnalyticsWrapper({ children }: { children: React.ReactNode }) {
  useAnalytics();
  return <>{children}</>;
}

function AppContent() {
  const { loading } = useAdmin();

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
  return (
    <Routes>
      {/* Forum routes - independent layout */}
      <Route path="/forum/*" element={<ForumRoutes />} />

      {/* Main site routes - with Layout */}
      <Route path="/*" element={
        <Layout>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/email-confirmation" element={<EmailConfirmation />} />
            <Route path="/species" element={<Species />} />
            <Route path="/leaderboards" element={<Leaderboards />} />
            <Route path="/records" element={<Records />} />
            <Route path="/profile/:userId" element={<PublicProfile />} />
            <Route path="/submission-guide" element={<SubmissionGuide />} />
            <Route path="/fishing-shops" element={<FishingShops />} />
            <Route path="/og-generator" element={<OgGenerator />} />
            <Route path="/mapcherry-test" element={<MapcherryTest />} />
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
      } />
    </Routes>
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
