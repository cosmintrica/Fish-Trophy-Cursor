import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { HelmetProvider } from 'react-helmet-async';
import { useEffect } from 'react';
import { AuthProvider } from '@/lib/auth-supabase';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import ScrollToTop from '@/components/ScrollToTop';
import ErrorBoundary from '@/components/ErrorBoundary';
import { initAnalytics } from '@/lib/analytics';
import { useWebVitals, performanceUtils } from '@/hooks/useWebVitals';

// Pages
import Home from '@/pages/Home';
import BlackSea from '@/pages/BlackSea';
import Species from '@/pages/Species';
import Leaderboards from '@/pages/Leaderboards';
import Records from '@/pages/Records';
import Admin from '@/pages/Admin';
import SubmissionGuide from '@/pages/SubmissionGuide';
import Profile from '@/pages/Profile';
import FishingShops from '@/pages/FishingShops';
import OgGenerator from '@/pages/OgGenerator';
import EmailConfirmation from '@/pages/EmailConfirmation';

function App() {
  // Initialize Web Vitals tracking
  useWebVitals();

  useEffect(() => {
    // Initialize analytics
    initAnalytics();
    
    // Optimize performance
    performanceUtils.optimizeFonts();
    performanceUtils.registerServiceWorker();
    
    // Preconnect to external domains
    performanceUtils.preconnect('https://fonts.googleapis.com');
    performanceUtils.preconnect('https://fonts.gstatic.com');
    performanceUtils.preconnect('https://cdnjs.cloudflare.com');
  }, []);

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <Router>
            <Layout>
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/email-confirmation" element={<EmailConfirmation />} />
                <Route 
                  path="/black-sea" 
                  element={
                    <AdminRoute>
                      <BlackSea />
                    </AdminRoute>
                  } 
                />
                <Route path="/species" element={<Species />} />
                <Route path="/leaderboards" element={<Leaderboards />} />
                <Route path="/records" element={<Records />} />
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
          </Router>
          <Toaster />
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
