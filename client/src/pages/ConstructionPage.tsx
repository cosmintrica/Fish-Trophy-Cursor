import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Wrench, Fish, Clock, Mail, LogIn, CheckCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const ConstructionPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { signIn } = useAuth();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('subscribers')
        .insert([
          {
            email: email.trim().toLowerCase(),
            subscribed_at: new Date().toISOString(),
            status: 'active'
          }
        ]);

      if (error) {
        if (error.code === '23505') {
          toast.error('Acest email este deja înregistrat!');
        } else {
          throw error;
        }
      } else {
        setIsSubscribed(true);
        setEmail('');
        toast.success('Te-ai abonat cu succes! Vei fi primul care află când site-ul este gata.');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('A apărut o eroare. Te rugăm să încerci din nou.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      toast.error('Completează toate câmpurile.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const result = await signIn(loginEmail.trim(), loginPassword);
      if (result?.error) {
        const errorMessage = result.error.message;
        if (errorMessage.includes('Invalid login credentials')) {
          toast.error('Email sau parolă incorectă.');
        } else if (errorMessage.includes('Email not confirmed')) {
          toast.error('Email-ul nu a fost confirmat. Verifică-ți inbox-ul.');
        } else {
          toast.error(errorMessage || 'Eroare la autentificare.');
        }
        setIsLoggingIn(false);
        return;
      }
      
      toast.success('Te-ai logat cu succes!');
      setShowLoginModal(false);
      setLoginEmail('');
      setLoginPassword('');

      // Reîncarcă pagina pentru a actualiza starea de autentificare
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: unknown) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Eroare la autentificare. Te rugăm să încerci din nou.';
      toast.error(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Fish Trophy - Site în Construcție</title>
        <meta name="description" content="Fish Trophy - Platforma pentru recorduri de pescuit din România. Site-ul este în construcție și va fi disponibil în curând." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-2 sm:p-4">
        <div className="max-w-4xl mx-auto text-center w-full">
          {/* Header cu buton de login */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-white hover:bg-gray-50 text-gray-700 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <LogIn className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Admin Login</span>
              <span className="sm:hidden">Login</span>
            </button>
          </div>

          {/* Logo și titlu principal */}
          <div className="mb-8 sm:mb-12">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-4 sm:mb-6">
              <img
                src="/icon_free.png"
                alt="Fish Trophy"
                className="w-12 h-12 sm:w-16 sm:h-16"
                onError={(e) => {
                  // Fallback la iconița de pește dacă imaginea nu se încarcă
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <Fish className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600 hidden" />
              <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold text-gray-900">
                Fish Trophy
              </h1>
            </div>
            <p className="text-sm sm:text-xl md:text-2xl text-gray-600 mb-2 px-4">
              Platforma pentru Recorduri de Pescuit din România
            </p>
          </div>

          {/* Mesaj principal */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 md:p-12 mb-6 sm:mb-8 border border-gray-100">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">
              Site-ul este în Construcție
            </h2>

            <p className="text-sm sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 leading-relaxed px-2">
              Lucrăm intens pentru a-ți oferi cea mai bună experiență de pescuit digital.
              Site-ul va fi disponibil în curând cu funcționalități complete pentru înregistrarea
              și urmărirea recordurilor de pescuit din România.
            </p>

            {/* Features preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Fish className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Recorduri de Pescuit</h3>
                <p className="text-gray-600 text-xs sm:text-sm">Înregistrează și urmărește recordurile tale de pescuit</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-200">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Hărți Interactive</h3>
                <p className="text-gray-600 text-xs sm:text-sm">Explorează locațiile de pescuit din România</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-purple-200 sm:col-span-2 md:col-span-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Comunitate</h3>
                <p className="text-gray-600 text-xs sm:text-sm">Conectează-te cu alți pescari pasionați</p>
              </div>
            </div>

            {/* Subscribe form */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Vrei să fii primul care află când site-ul este gata?</h3>

              {isSubscribed ? (
                <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-medium text-sm sm:text-base">Te-ai abonat cu succes! Mulțumim!</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="max-w-md mx-auto">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Introdu email-ul tău"
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="hidden sm:inline">Se abonează...</span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Abonează-te</span>
                          <span className="sm:hidden">Abonează</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">
                    Te vom notifica când site-ul este gata. Nu spam, doar actualizări importante!
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-gray-500 px-4">
            <p className="text-xs sm:text-sm">
              © 2025 Fish Trophy. Toate drepturile rezervate.
            </p>
            <p className="text-xs mt-1 sm:mt-2">
              Site-ul este în dezvoltare activă. Mulțumim pentru răbdare!
            </p>
          </div>
        </div>

        {/* Login Modal */}
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <LogIn className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-2xl font-bold text-gray-900">
                    Admin Login
                  </h3>
                </div>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="p-1 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                <div>
                  <label htmlFor="loginEmail" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="loginEmail"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Introdu email-ul tău"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="loginPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Parolă
                  </label>
                  <input
                    type="password"
                    id="loginPassword"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Introdu parola"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-3 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="flex-1 px-4 sm:px-6 py-2 sm:py-3 border-2 border-gray-300 text-gray-700 rounded-xl sm:rounded-2xl font-medium hover:bg-gray-50 transition-colors text-sm sm:text-base"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl sm:rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    {isLoggingIn ? (
                      <>
                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="hidden sm:inline">Se loghează...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      'Login'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ConstructionPage;
