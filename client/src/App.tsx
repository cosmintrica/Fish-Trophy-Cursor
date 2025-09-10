import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth-supabase';
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

// Analytics wrapper component that uses useAnalytics inside Router
function AnalyticsWrapper({ children }: { children: React.ReactNode }) {
  useAnalytics();
  return <>{children}</>;
}

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AnalyticsWrapper>
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
