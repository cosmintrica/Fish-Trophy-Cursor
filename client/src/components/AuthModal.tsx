import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { X, Mail, Lock, Eye, EyeOff, User, CheckCircle } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [counties, setCounties] = useState<{id: string, name: string}[]>([]);
  const [cities, setCities] = useState<{id: string, name: string}[]>([]);

  const { signIn, signUp, signInWithGoogle } = useAuth();

  // Load counties from database
  const loadCounties = async () => {
    try {
      const { data, error } = await supabase
        .from('counties')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setCounties(data || []);
    } catch (error) {
      console.error('Error loading counties:', error);
    }
  };

  // Load cities for selected county
  const loadCities = async (countyId: string) => {
    if (!countyId) {
      setCities([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name')
        .eq('county_id', countyId)
        .order('name');
      
      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  // Load counties on component mount
  useEffect(() => {
    if (isOpen) {
      loadCounties();
    }
  }, [isOpen]);

  // Load cities when county changes
  useEffect(() => {
    if (selectedCounty) {
      loadCities(selectedCounty);
    } else {
      setCities([]);
    }
  }, [selectedCounty]);

  if (!isOpen) return null;

  // Reset form when switching between login/register
  const resetForm = (keepSuccess = false) => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setSelectedCounty('');
    setSelectedCity('');
    setError('');
    if (!keepSuccess) {
      setSuccess('');
      setShowSuccess(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setShowSuccess(false);

    try {
      if (isLogin) {
        await signIn(email, password);
        onClose();
      } else {
        // Validation for registration
        if (!displayName.trim()) {
          setError('Numele este obligatoriu.');
          return;
        }
        if (!selectedCounty) {
          setError('Județul este obligatoriu.');
          return;
        }
        if (!selectedCity) {
          setError('Orașul este obligatoriu.');
          return;
        }

        await signUp(email, password, displayName, selectedCounty, selectedCity);
        
        setSuccess('Contul a fost creat cu succes!');
        setShowSuccess(true);
        
        // Elegant transition - keep success message and transform form
        setTimeout(() => {
          setIsTransitioning(true);
          setTimeout(() => {
            // Don't reset success message - keep it visible
            // Don't reset form - keep email for login
            setIsLogin(true);
            setIsTransitioning(false);
          }, 500); // Animation duration
        }, 2000);
      }
    } catch (err: unknown) {
      // Supabase error handling
      if (err && typeof err === 'object' && 'message' in err) {
        const message = (err as { message: string }).message;
        if (message.includes('already registered') || message.includes('User already registered')) {
          setError('Acest email este deja folosit. Încearcă să te autentifici.');
        } else if (message.includes('Invalid email') || message.includes('invalid email')) {
          setError('Email-ul nu este valid. Verifică formatul.');
        } else if (message.includes('Password should be at least') || message.includes('password too short')) {
          setError('Parola trebuie să aibă cel puțin 6 caractere.');
        } else if (message.includes('Invalid login credentials') || message.includes('invalid credentials')) {
          setError('Email sau parolă incorectă.');
        } else if (message.includes('Email not confirmed')) {
          setError('Email-ul nu a fost confirmat. Verifică-ți inbox-ul și apasă pe link-ul de confirmare.');
        } else if (message.includes('Too many requests')) {
          setError('Prea multe încercări. Așteaptă câteva minute și încearcă din nou.');
        } else {
          setError('A apărut o eroare. Încearcă din nou.');
        }
      } else {
        setError('A apărut o eroare. Încearcă din nou.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setShowSuccess(false);
    
    try {
      await signInWithGoogle();
      setSuccess('Autentificare cu Google reușită!');
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      // Supabase error handling
      if (err && typeof err === 'object' && 'message' in err) {
        const message = (err as { message: string }).message;
        if (message.includes('popup_closed_by_user')) {
          setError('Fereastra de autentificare a fost închisă. Încearcă din nou.');
        } else if (message.includes('popup_blocked')) {
          setError('Popup-ul a fost blocat de browser. Permite popup-urile pentru acest site.');
        } else if (message.includes('access_denied')) {
          setError('Accesul a fost refuzat. Încearcă din nou.');
        } else if (message.includes('network')) {
          setError('Eroare de rețea. Verifică conexiunea la internet.');
        } else {
          setError('A apărut o eroare la autentificarea cu Google.');
        }
      } else {
        setError('A apărut o eroare la autentificarea cu Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle county change - reset city when county changes
  const handleCountyChange = (countyId: string) => {
    setSelectedCounty(countyId);
    setSelectedCity(''); // Reset city when county changes
  };

  // Prepare options for dropdowns
  const countyOptions = counties.map(county => ({
    value: county.id,
    label: county.name
  }));

  const cityOptions = cities.map(city => ({
    value: city.id,
    label: city.name
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className={`bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-md sm:max-w-lg mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto transition-all duration-300 ${
        isTransitioning ? 'opacity-0 scale-95 transform -translate-y-4' : 'opacity-100 scale-100 transform translate-y-0'
      }`}>
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {isLogin ? 'Autentificare' : 'Înregistrare'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>



        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name - only for registration */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nume complet *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Numele tău complet"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="email@example.com"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parolă *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Location fields - only for registration */}
          {!isLogin && (
            <>
              {/* County */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Județ *
                </label>
                <SearchableSelect
                  options={countyOptions}
                  value={selectedCounty}
                  onChange={handleCountyChange}
                  placeholder="Selectează județul"
                  searchPlaceholder="Caută județ..."
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Oraș *
                </label>
                <SearchableSelect
                  options={cityOptions}
                  value={selectedCity}
                  onChange={setSelectedCity}
                  placeholder={selectedCounty ? "Selectează orașul" : "Selectează mai întâi județul"}
                  searchPlaceholder="Caută oraș..."
                  disabled={!selectedCounty}
                />
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-md transition-colors font-medium"
            disabled={loading}
          >
            {loading ? 'Se procesează...' : (isLogin ? 'Autentificare' : 'Înregistrare')}
          </Button>
        </form>

        {/* Success Message - at bottom */}
        {showSuccess && (
          <div className={`mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm transition-all duration-500 ${
            isTransitioning ? 'opacity-0 scale-95 transform -translate-y-2' : 'opacity-100 scale-100 transform translate-y-0'
          }`}>
            <div className="flex items-start">
              <div className={`flex-shrink-0 transition-all duration-300 ${
                isTransitioning ? 'scale-75' : 'scale-100'
              }`}>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-green-800 text-sm font-semibold mb-1">{success}</p>
                <p className="text-green-700 text-xs leading-relaxed">
                  Verifică email-ul pentru a confirma contul. După confirmare, te poți autentifica cu email-ul și parola de mai sus.
                </p>
                <div className="mt-2 flex items-center">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                  <span className="ml-2 text-xs text-green-600 font-medium">Pregătire autentificare...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Google Sign In */}
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">sau</span>
            </div>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            className="w-full mt-4 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 px-4 rounded-md transition-colors flex items-center justify-center space-x-2 font-medium"
            disabled={loading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continuă cu Google</span>
          </Button>
        </div>

        {/* Toggle between login/register */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              resetForm(true); // Keep success message
              setIsLogin(!isLogin);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {isLogin ? 'Nu ai cont? Înregistrează-te' : 'Ai deja cont? Autentifică-te'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
