import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import { Toaster } from 'sonner'; // Temporarily disabled
import { HelmetProvider } from 'react-helmet-async';
import { useEffect } from 'react';
import { AuthProvider } from '@/lib/auth-supabase';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import ScrollToTop from '@/components/ScrollToTop';
// import ErrorBoundary from '@/components/ErrorBoundary'; // Temporarily disabled
// import { initAnalytics } from '@/lib/analytics'; // Temporarily disabled
// import { useWebVitals, performanceUtils } from '@/hooks/useWebVitals'; // Temporarily disabled
// import { useErrorHandler } from '@/hooks/useErrorHandler'; // Temporarily disabled

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
  // Initialize Web Vitals tracking - temporarily disabled
  // useWebVitals();
  
  // Initialize error handling - temporarily disabled
  // useErrorHandler();

  useEffect(() => {
    // All performance optimizations temporarily disabled to fix mobile reload issue
    // initAnalytics();
    // performanceUtils.optimizeFonts();
    // performanceUtils.registerServiceWorker();
    // performanceUtils.preconnect('https://fonts.googleapis.com');
    // performanceUtils.preconnect('https://fonts.gstatic.com');
    // performanceUtils.preconnect('https://cdnjs.cloudflare.com');
  }, []);

  return (
    <HelmetProvider>
      {/* ErrorBoundary temporarily disabled to fix mobile reload issue */}
      {/* <ErrorBoundary> */}
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
          {/* <Toaster /> temporarily disabled */}
        </AuthProvider>
      {/* </ErrorBoundary> */}
    </HelmetProvider>
  );
}

export default App;
