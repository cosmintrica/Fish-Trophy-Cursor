import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { X, Mail, Lock, Eye, EyeOff, User, CheckCircle } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register'; // Modul inițial (login sau register)
}

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  
  // Când se deschide modalul, setează modul corect
  useEffect(() => {
    if (isOpen) {
      setIsLogin(initialMode === 'login');
      setError(''); // Resetează eroarea când se deschide modalul
    }
  }, [isOpen, initialMode]);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [counties, setCounties] = useState<{ id: string, name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string, name: string }[]>([]);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  const { signIn, signUp, signInWithGoogle } = useAuth();

  // Email domain suggestions
  const emailDomains = ['@gmail.com', '@outlook.com', '@yahoo.com', '@hotmail.com', '@icloud.com'];

  // Smart filter for email domains
  const getFilteredDomains = () => {
    const parts = email.split('@');
    if (parts.length === 1) return emailDomains;
    if (parts.length === 2 && parts[1].length > 0 && !parts[1].includes('.')) {
      const domainPart = '@' + parts[1].toLowerCase();
      const filtered = emailDomains.filter(domain => domain.toLowerCase().startsWith(domainPart));
      return filtered.length > 0 ? filtered : [];
    }
    return [];
  };

  const filteredDomains = getFilteredDomains();

  const shouldShowEmailSuggestions = () => {
    if (!email || email.length === 0) return false;
    const parts = email.split('@');
    return parts.length === 1 || (parts.length === 2 && !parts[1].includes('.'));
  };

  // Password validation rules
  const passwordRules = [
    { test: (pwd: string) => pwd.length >= 8, label: 'Cel puțin 8 caractere' },
    { test: (pwd: string) => /[a-z]/.test(pwd), label: 'O literă mică' },
    { test: (pwd: string) => /[A-Z]/.test(pwd), label: 'O literă mare' },
    { test: (pwd: string) => /[0-9]/.test(pwd), label: 'O cifră' },
  ];

  // Generate username from displayName
  const generateUsernameFromName = async (nameInput: string) => {
    if (!nameInput || nameInput.length < 3) return;

    let baseUsername = nameInput.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 6);
    if (baseUsername.length < 3) {
      baseUsername = nameInput.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 6);
    }

    if (baseUsername.length < 3) return;

    let finalUsername = baseUsername;
    let attempt = 0;
    let exists = true;

    while (exists && attempt < 10) {
      const { data } = await supabase.from('profiles').select('username').eq('username', finalUsername).maybeSingle();
      if (!data) {
        exists = false;
      } else {
        const suffix = Math.floor(Math.random() * 999);
        finalUsername = baseUsername + suffix;
        attempt++;
      }
    }

    if (!exists) {
      setUsername(finalUsername);
    }
  };

  useEffect(() => {
    if (!isLogin && displayName.trim().length >= 3) {
      generateUsernameFromName(displayName);
    }
  }, [displayName, isLogin]);

  const loadCounties = async () => {
    try {
      const { data, error } = await supabase.from('counties').select('id, name').order('name');
      if (error) throw error;
      setCounties(data || []);
    } catch (error) {
      console.error('Error loading counties:', error);
    }
  };

  const loadCities = async (countyId: string) => {
    if (!countyId) {
      setCities([]);
      return;
    }
    try {
      const { data, error } = await supabase.from('cities').select('id, name').eq('county_id', countyId).order('name');
      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  useEffect(() => {
    if (isOpen) loadCounties();
  }, [isOpen]);

  useEffect(() => {
    if (selectedCounty) {
      loadCities(selectedCounty);
    } else {
      setCities([]);
    }
  }, [selectedCounty]);

  if (!isOpen) return null;

  const resetForm = (keepSuccess = false) => {
    setEmailOrUsername('');
    setEmail('');
    setPassword('');
    setDisplayName('');
    setUsername('');
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
        // Validate fields
        if (!emailOrUsername.trim()) {
          setError('Introdu email-ul sau username-ul.');
          setLoading(false);
          return;
        }
        if (!password.trim()) {
          setError('Introdu parola.');
          setLoading(false);
          return;
        }

        let loginEmail = emailOrUsername.trim();
        if (!emailOrUsername.includes('@')) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', emailOrUsername.toLowerCase().trim())
            .maybeSingle();

          if (profileError || !profile) {
            setError('Username-ul nu a fost găsit.');
            setLoading(false);
            return;
          }
          loginEmail = profile.email;
        }
        
        const result = await signIn(loginEmail, password);
        if (result?.error) {
          const errorMessage = result.error.message || '';
          const errorStatus = (result.error as any)?.status;
          const errorCode = (result.error as any)?.code;
          
          // Check if it's invalid credentials - might be Google account without password
          if (errorCode === 'invalid_credentials' || errorMessage.includes('Invalid login credentials') || errorMessage.includes('invalid_credentials')) {
            // Check if user exists and might be a Google account
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id, email')
                .eq('email', loginEmail.toLowerCase())
                .maybeSingle();
              
              if (profile) {
                // User exists - likely Google account without password
                setError('Acest cont a fost creat cu Google și nu are parolă setată. Te rugăm să folosești butonul "Continuă cu Google" pentru a te autentifica, sau mergi în Setări → Setări cont pentru a seta o parolă.');
              } else {
                setError('Email sau parolă incorectă.');
              }
            } catch (checkError) {
              console.error('Error checking profile:', checkError);
              // If check fails, show generic error
              setError('Email sau parolă incorectă. Dacă contul tău a fost creat cu Google, folosește butonul "Continuă cu Google" sau setează o parolă din Setări.');
            }
          } else if (errorStatus === 400 || errorCode === 400 || errorMessage.includes('invalid_grant') || errorMessage.includes('Email rate limit exceeded')) {
            // Other 400 errors - check if might be Google account
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id, email')
                .eq('email', loginEmail.toLowerCase())
                .maybeSingle();
              
              if (profile) {
                setError('Acest cont a fost creat cu Google și nu are parolă setată. Te rugăm să folosești butonul "Continuă cu Google" pentru a te autentifica, sau mergi în Setări → Setări cont pentru a seta o parolă.');
              } else {
                setError('Email sau parolă incorectă.');
              }
            } catch (checkError) {
              console.error('Error checking profile:', checkError);
              setError('Email sau parolă incorectă. Dacă contul tău a fost creat cu Google, folosește butonul "Continuă cu Google" sau setează o parolă din Setări.');
            }
          } else if (errorMessage.includes('Email not confirmed')) {
            setError('Email-ul nu a fost confirmat. Verifică-ți inbox-ul și apasă pe link-ul de confirmare.');
          } else {
            setError(errorMessage || 'Eroare la autentificare. Încearcă din nou.');
          }
          setLoading(false);
          return;
        }
        onClose();
      } else {
        if (!displayName.trim()) { setError('Numele este obligatoriu.'); return; }
        if (!username.trim()) { setError('Username-ul este obligatoriu.'); return; }
        if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) { setError('Username-ul poate conține doar litere, cifre, _ și - (3-30 caractere).'); return; }

        const { data: existingUser } = await supabase.from('profiles').select('username').eq('username', username.toLowerCase()).maybeSingle();
        if (existingUser) { setError('Acest username este deja folosit. Alege altul.'); return; }
        if (!selectedCounty) { setError('Județul este obligatoriu.'); return; }
        if (!selectedCity) { setError('Orașul este obligatoriu.'); return; }

        await signUp(email, password, displayName, selectedCounty, selectedCity, username);
        setSuccess('Contul a fost creat cu succes!');
        setShowSuccess(true);
        setTimeout(() => {
          setIsTransitioning(true);
          setTimeout(() => {
            setIsLogin(true);
            setIsTransitioning(false);
          }, 500);
        }, 2000);
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        const message = (err as { message: string }).message;
        if (message.includes('already registered')) setError('Acest email este deja folosit. Încearcă să te autentifici.');
        else if (message.includes('Invalid email')) setError('Email-ul nu este valid. Verifică formatul.');
        else if (message.includes('Password should be at least')) setError('Parola trebuie să aibă cel puțin 6 caractere.');
        else if (message.includes('Invalid login credentials')) setError('Email sau parolă incorectă.');
        else if (message.includes('Email not confirmed')) setError('Email-ul nu a fost confirmat. Verifică-ți inbox-ul și apasă pe link-ul de confirmare.');
        else setError('A apărut o eroare. Încearcă din nou.');
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
    try {
      // Don't show success message yet - Google OAuth redirects to Google first
      // The success will be handled by the auth state change listener after redirect
      await signInWithGoogle();
      // Close modal immediately - user will be redirected to Google
      onClose();
      // Don't set loading to false - let the redirect happen
    } catch (err) {
      setError('A apărut o eroare la autentificarea cu Google.');
      setLoading(false);
    }
  };

  const handleCountyChange = (countyId: string) => {
    setSelectedCounty(countyId);
    setSelectedCity('');
  };

  const countyOptions = counties.map(county => ({ value: county.id, label: county.name }));
  const cityOptions = cities.map(city => ({ value: city.id, label: city.name }));

  return (
    <div className="modal-overlay">
      <div className={`modal-content bg-white rounded-xl shadow-2xl p-4 sm:p-6 transition-all duration-300 max-w-xl sm:!max-w-lg ${isTransitioning ? 'opacity-0 scale-95 transform -translate-y-4' : 'opacity-100 scale-100 transform translate-y-0'
        }`}>
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {isLogin ? 'Autentificare' : 'Înregistrare'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {isLogin ? (
          // LOGIN FORM
          <form key="login-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email sau Username *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  name="login_identifier"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email sau username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Parolă *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  key="login-password"
                  id="login-password"
                  name="current-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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

            {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200 text-center">{error}</div>}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-md transition-colors font-medium" disabled={loading}>
              {loading ? 'Se procesează...' : 'Autentificare'}
            </Button>
          </form>
        ) : (
          // REGISTER FORM
          <form key="register-form" onSubmit={handleSubmit} className="space-y-4" autoComplete="off">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nume complet *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  name="full_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Numele tău complet"
                  required
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  name="new_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="username"
                  required
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">3-30 caractere: litere, cifre, _ și -</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="email"
                  name="new_email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setTimeout(() => setEmailFocused(false), 200)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@example.com"
                  required
                  autoComplete="off"
                />
                {emailFocused && shouldShowEmailSuggestions() && filteredDomains.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                    {filteredDomains.map((domain) => {
                      const parts = email.split('@');
                      const localPart = parts[0] || '';
                      return (
                        <button
                          key={domain}
                          type="button"
                          onClick={() => setEmail(localPart + domain)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700"
                        >
                          {localPart}<span className="text-blue-600">{domain}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {!email.includes('@') && email.length > 0 && (
                  <p className="text-xs text-orange-600 mt-1 text-center flex items-center justify-center gap-1">
                    <span>❌</span> Email trebuie să conțină @
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Parolă *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  key="register-password"
                  id="register-password"
                  name="new_password_field"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  autoComplete="new-password"
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
              {passwordFocused && password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordRules.map((rule, index) => {
                    const isValid = rule.test(password);
                    return (
                      <div key={index} className={`text-xs flex items-center gap-2 ${isValid ? 'text-green-600' : 'text-red-500'}`}>
                        <span>{isValid ? '✅' : '❌'}</span>
                        <span>{rule.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {!passwordFocused && (
                <p className="text-xs text-gray-500 mt-1 text-center">Minim 8 caractere, o literă mică, mare și o cifră</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Județ *</label>
              <SearchableSelect
                options={countyOptions}
                value={selectedCounty}
                onChange={handleCountyChange}
                placeholder="Selectează județul"
                searchPlaceholder="Caută județ..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Oraș *</label>
              <SearchableSelect
                options={cityOptions}
                value={selectedCity}
                onChange={setSelectedCity}
                placeholder={selectedCounty ? "Selectează orașul" : "Selectează mai întâi județul"}
                searchPlaceholder="Caută oraș..."
                disabled={!selectedCounty}
              />
            </div>

            {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200 text-center">{error}</div>}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-md transition-colors font-medium" disabled={loading}>
              {loading ? 'Se procesează...' : 'Înregistrare'}
            </Button>
          </form>
        )}

        {showSuccess && (
          <div className={`mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-95 transform -translate-y-2' : 'opacity-100 scale-100 transform translate-y-0'}`}>
            <div className="flex items-start">
              <div className={`flex-shrink-0 transition-all duration-300 ${isTransitioning ? 'scale-75' : 'scale-100'}`}>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-green-800 text-sm font-semibold mb-1">{success}</p>
                <p className="text-green-700 text-xs leading-relaxed">Verifică email-ul pentru a confirma contul. După confirmare, te poți autentifica.</p>
                <div className="mt-2 flex items-center">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <span className="ml-2 text-xs text-green-600 font-medium">Pregătire autentificare...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">sau</span></div>
          </div>
          <Button onClick={handleGoogleSignIn} className="w-full mt-4 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 px-4 rounded-md transition-colors flex items-center justify-center space-x-2 font-medium" disabled={loading}>
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Continuă cu Google</span>
          </Button>
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => { resetForm(true); setIsLogin(!isLogin); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            {isLogin ? 'Nu ai cont? Înregistrează-te' : 'Ai deja cont? Autentifică-te'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
