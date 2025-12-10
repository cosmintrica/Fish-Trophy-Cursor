import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from '@/lib/auth-supabase';
import { useAuth } from '@/hooks/useAuth';
// import { useAdmin } from '@/hooks/useAdmin'; // Nu mai folosim loading-ul global
import { analytics } from '@/lib/analytics';
import { useAnalytics } from '@/hooks/useAnalytics';
import Layout from '@/components/Layout';
import { CompleteGoogleProfileModal } from '@/components/CompleteGoogleProfileModal';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { MessageNotificationManager } from '@/components/MessageNotificationManager';
import { queryClient } from '@/lib/query-client';

// Initialize analytics
analytics;
import ProtectedRoute from '@/components/ProtectedRoute';
import ScrollToTop from '@/components/ScrollToTop';
import CookieConsent from '@/components/CookieConsent';

// Loading component pentru lazy loaded pages
const PageLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Se încarcă...</p>
    </div>
  </div>
);

// ✅ OPTIMIZARE: Lazy load pagini mari (code splitting)
// Pagini mari - lazy loaded (conțin biblioteci mari sau sunt complexe)
const Home = lazy(() => import('@/pages/Home')); // Conține MapLibre GL (mare)
const Admin = lazy(() => import('@/pages/Admin')); // Pagina admin (probabil mare)
const Profile = lazy(() => import('@/pages/Profile')); // Pagina profil (probabil mare)

// Pagini mici - importate normal (nu blochează)
import Species from '@/pages/Species';
import Leaderboards from '@/pages/Leaderboards';
import Records from '@/pages/Records';
import SubmissionGuide from '@/pages/SubmissionGuide';
import PublicProfile from '@/pages/PublicProfile';
import FishingShops from '@/pages/FishingShops';
import EmailConfirmation from '@/pages/EmailConfirmation';
import Messages from '@/pages/Messages';
import Privacy from '@/pages/Privacy';
import Cookies from '@/pages/Cookies';
import ForumRoutes from '@/forum/routes';
import NotFound404 from '@/components/NotFound404';

// Analytics wrapper component that uses useAnalytics inside Router
function AnalyticsWrapper({ children }: { children: React.ReactNode }) {
  useAnalytics();
  return <>{children}</>;
}

// Realtime messages wrapper - active on all pages
function RealtimeMessagesWrapper({ children }: { children: React.ReactNode }) {
  useRealtimeMessages();
  return <>{children}</>;
}

function ProfileCompletionWrapper({ children }: { children: React.ReactNode }) {
  const { needsProfileCompletion, setNeedsProfileCompletion, user } = useAuth();

  const handleComplete = () => {
    setNeedsProfileCompletion(false);
    // Refresh page to update user data
    window.location.reload();
  };

  return (
    <>
      {children}
      {needsProfileCompletion && user && (
        <CompleteGoogleProfileModal
          isOpen={needsProfileCompletion}
          onClose={() => { }} // Don't allow closing without completing
          onComplete={handleComplete}
          userEmail={user.email || ''}
        />
      )}
    </>
  );
}

function AppContent() {
  // Nu mai blocăm render-ul pentru loading - afișăm direct conținutul
  // React Query cache-ul asigură datele instant, iar loading-ul se face în background
  return (
    <Routes>
      {/* Forum routes - independent layout */}
      <Route path="/forum/*" element={<ForumRoutes />} />

      {/* Main site routes - with Layout */}
      <Route path="/*" element={
        <Layout>
          <ScrollToTop />
          <Routes>
            <Route
              path="/"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Home />
                </Suspense>
              }
            />
            <Route path="/email-confirmation" element={<EmailConfirmation />} />
            <Route path="/species" element={<Species />} />
            <Route path="/leaderboards" element={<Leaderboards />} />
            <Route path="/records" element={<Records />} />
            <Route path="/profile/:username" element={<PublicProfile />} />
            <Route path="/submission-guide" element={<SubmissionGuide />} />
            <Route path="/fishing-shops" element={<FishingShops />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <Profile />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <Admin />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            {/* 404 - Catch all pentru rute invalide din site-ul principal */}
            <Route path="*" element={<NotFound404 />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  );
}

// React Query Provider Wrapper
function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools doar în development - icon-ul cu palmierul apare doar în development */}
      {/* IMPORTANT: DevTools NU apare în production - doar în development */}
      {/* Doar dezvoltatorii care rulează local văd acest icon */}
      {/* User requested removal of DevTools icon even in dev mode */}
      {/* {import.meta.env.DEV && (
        <ReactQueryDevtools
          initialIsOpen={false}
        />
      )} */}
    </QueryClientProvider>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryProvider>
        <AuthProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <RealtimeMessagesWrapper>
              <AnalyticsWrapper>
                <ProfileCompletionWrapper>
                  <AppContent />
                </ProfileCompletionWrapper>
              </AnalyticsWrapper>
            </RealtimeMessagesWrapper>
            <MessageNotificationManager />
            <CookieConsent />
          </Router>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              },
              className: 'toast-message'
            }}
          />
        </AuthProvider>
      </QueryProvider>
    </HelmetProvider>
  );
}

export default App;
