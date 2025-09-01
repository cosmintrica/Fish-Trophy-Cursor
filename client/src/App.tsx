import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import ScrollToTop from '@/components/ScrollToTop';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';


// Pages
import Home from '@/pages/Home';
import BlackSea from '@/pages/BlackSea';
import Species from '@/pages/Species';
import Leaderboards from '@/pages/Leaderboards';
import Admin from '@/pages/Admin';
import SubmissionGuide from '@/pages/SubmissionGuide';
import Profile from '@/pages/Profile';
import FishingShops from '@/pages/FishingShops';
import OgGenerator from '@/pages/OgGenerator';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Layout>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/black-sea" element={<BlackSea />} />
              <Route path="/species" element={<Species />} />
              <Route path="/leaderboards" element={<Leaderboards />} />
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
    </QueryClientProvider>
  );
}

// Initialize Vercel Analytics and Speed Insights
inject();
injectSpeedInsights();

export default App;
