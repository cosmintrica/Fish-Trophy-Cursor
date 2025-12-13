import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
  const { isDarkMode } = useTheme();

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

  // Generate username from displayName (use full name, not just first word)
  const generateUsernameFromName = async (nameInput: string) => {
    if (!nameInput || nameInput.length < 3) return;

    // Use full name, not just first word - more unique and safe for multiple users
    // "Ion Popescu" -> "ionpopescu" instead of just "ion"
    let baseUsername = nameInput
      .toLowerCase()
      .replace(/[ăâîșț]/g, 'a') // Replace Romanian diacritics
      .replace(/[^a-z0-9_-]/g, '') // Remove all non-alphanumeric except underscore and dash
      .substring(0, 30); // Max 30 characters
    
    // If too short after cleaning, use first part as fallback
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
    setConfirmPassword('');
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
          
          // Handle different error types with specific messages
          if (errorCode === 'invalid_credentials' || errorMessage.includes('Invalid login credentials') || errorMessage.includes('invalid_credentials')) {
            // Invalid credentials - wrong email or password
            setError('Email sau parolă incorectă.');
          } else if (errorMessage.includes('Email rate limit exceeded') || errorMessage.includes('rate limit')) {
            setError('Prea multe încercări. Te rugăm să aștepți câteva momente și să încerci din nou.');
          } else if (errorMessage.includes('Email not confirmed')) {
            setError('Email-ul nu a fost confirmat. Verifică-ți inbox-ul și apasă pe link-ul de confirmare.');
          } else if (errorStatus === 400 || errorCode === 400) {
            // Generic 400 error - likely wrong credentials
            setError('Email sau parolă incorectă.');
          } else {
            // Other errors - show the actual error message or generic
            setError(errorMessage || 'Eroare la autentificare. Încearcă din nou.');
          }
          setLoading(false);
          return;
        }
        onClose();
      } else {
        if (!displayName.trim()) { setError('Numele este obligatoriu.'); setLoading(false); return; }
        if (!username.trim()) { setError('Username-ul este obligatoriu.'); setLoading(false); return; }
        if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) { setError('Username-ul poate conține doar litere, cifre, _ și - (3-30 caractere).'); setLoading(false); return; }

        const { data: existingUser } = await supabase.from('profiles').select('username').eq('username', username.toLowerCase()).maybeSingle();
        if (existingUser) { setError('Acest username este deja folosit. Alege altul.'); setLoading(false); return; }
        if (!selectedCounty) { setError('Județul este obligatoriu.'); setLoading(false); return; }
        if (!selectedCity) { setError('Orașul este obligatoriu.'); setLoading(false); return; }
        if (!confirmPassword.trim()) { setError('Confirmarea parolei este obligatorie.'); setLoading(false); return; }
        if (password !== confirmPassword) { setError('Parolele nu coincid. Te rugăm să reintroduci parola.'); setLoading(false); return; }

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
      console.error('Signup error details:', err);
      
      // Extract error message from various error formats
      let errorMessage = 'A apărut o eroare la înregistrare. Te rugăm să încerci din nou.';
      
      if (err && typeof err === 'object') {
        // Supabase error format
        if ('message' in err) {
          const message = (err as { message: string }).message;
          errorMessage = message;
          
          // Map common error messages to user-friendly Romanian messages
          if (message.includes('already registered') || message.includes('already exists') || message.includes('User already registered')) {
            errorMessage = 'Acest email este deja folosit. Încearcă să te autentifici.';
          } else if (message.includes('Email address') && message.includes('is invalid') || message.includes('Invalid email') || message.includes('invalid email') || message.includes('Email format')) {
            errorMessage = 'Email-ul nu este valid. Supabase blochează unele email-uri de test (ex: test@gmail.com). Te rugăm să folosești un email real.';
          } else if (message.includes('password') || message.includes('Password')) {
            if (message.includes('at least') || message.includes('minimum')) {
              errorMessage = 'Parola trebuie să aibă minim 6 caractere.';
            } else if (message.includes('too weak') || message.includes('weak')) {
              errorMessage = 'Parola este prea slabă. Folosește o parolă mai puternică.';
            } else {
              errorMessage = 'Parola nu îndeplinește cerințele. Te rugăm să folosești o parolă mai puternică.';
            }
          } else if (message.includes('username') || message.includes('Username')) {
            if (message.includes('already') || message.includes('exists') || message.includes('taken')) {
              errorMessage = 'Acest username este deja folosit. Alege altul.';
            } else if (message.includes('invalid') || message.includes('format')) {
              errorMessage = 'Username-ul nu este valid. Folosește doar litere, cifre, underscore (_) și cratimă (-).';
            } else {
              errorMessage = 'Username-ul nu este valid sau este deja folosit.';
            }
          } else if (message.includes('rate limit') || message.includes('too many')) {
            errorMessage = 'Prea multe încercări. Te rugăm să aștepți câteva momente și să încerci din nou.';
          } else if (message.includes('network') || message.includes('fetch')) {
            errorMessage = 'Eroare de conexiune. Verifică conexiunea la internet și încearcă din nou.';
          } else if (message.includes('constraint') || message.includes('violates')) {
            errorMessage = 'Datele introduse nu sunt valide. Verifică toate câmpurile.';
          } else {
            // Show the actual error message if it's meaningful
            errorMessage = message.length > 100 ? 'A apărut o eroare la înregistrare. Te rugăm să încerci din nou.' : message;
          }
        }
        
        // Check for status code in error
        if ('status' in err) {
          const status = (err as { status: number }).status;
          if (status === 400) {
            errorMessage = 'Datele introduse nu sunt valide. Verifică toate câmpurile.';
          } else if (status === 429) {
            errorMessage = 'Prea multe încercări. Te rugăm să aștepți câteva momente.';
          } else if (status >= 500) {
            errorMessage = 'Eroare de server. Te rugăm să încerci mai târziu.';
          }
        }
      }
      
      setError(errorMessage);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-4 sm:p-6 transition-all duration-300 w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto ${isTransitioning ? 'opacity-0 scale-95 transform -translate-y-4' : 'opacity-100 scale-100 transform translate-y-0'
        }`}>
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {isLogin ? 'Autentificare' : 'Înregistrare'}
          </h2>
          <button onClick={onClose} className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {isLogin ? (
          // LOGIN FORM
          <form key="login-form" onSubmit={handleSubmit} className="space-y-4 w-full">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Email sau Username *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 h-4 w-4" />
                <input
                  type="text"
                  name="login_identifier"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email sau username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Parolă *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 h-4 w-4" />
                <input
                  key="login-password"
                  id="login-password"
                  name="current-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-9 pr-9 py-2.5 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-900/50 text-center">{error}</div>}

            <Button type="submit" className="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white py-2.5 px-4 rounded-md transition-colors font-medium" disabled={loading}>
              {loading ? 'Se procesează...' : 'Autentificare'}
            </Button>
          </form>
        ) : (
          // REGISTER FORM - 2 columns layout
          <form key="register-form" onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Nume complet *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 h-4 w-4" />
                <input
                  type="text"
                  name="full_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Numele tău complet"
                  required
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Username *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 h-4 w-4" />
                <input
                  type="text"
                  name="new_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="username"
                  required
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">3-30 caractere: litere, cifre, _ și -</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 h-4 w-4" />
                <input
                  type="email"
                  name="new_email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setTimeout(() => setEmailFocused(false), 200)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@example.com"
                  required
                  autoComplete="off"
                />
                {emailFocused && shouldShowEmailSuggestions() && filteredDomains.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg">
                    {filteredDomains.map((domain) => {
                      const parts = email.split('@');
                      const localPart = parts[0] || '';
                      return (
                        <button
                          key={domain}
                          type="button"
                          onClick={() => setEmail(localPart + domain)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 text-sm text-gray-700 dark:text-slate-200"
                        >
                          {localPart}<span className="text-blue-600 dark:text-blue-400">{domain}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {!email.includes('@') && email.length > 0 && (
                  <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                    <span>❌</span> Email trebuie să conțină @
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Parolă *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 h-4 w-4" />
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
                  className="w-full pl-9 pr-9 py-2.5 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordFocused && password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordRules.map((rule, index) => {
                    const isValid = rule.test(password);
                    return (
                      <div key={index} className={`text-xs flex items-center gap-2 ${isValid ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        <span>{isValid ? '✅' : '❌'}</span>
                        <span>{rule.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {!passwordFocused && (
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Minim 8 caractere, o literă mică, mare și o cifră</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Confirmă parola *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 h-4 w-4" />
                <input
                  key="register-confirm-password"
                  id="register-confirm-password"
                  name="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full pl-9 pr-9 py-2.5 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">❌ Parolele nu coincid</p>
              )}
              {confirmPassword.length > 0 && password === confirmPassword && password.length > 0 && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">✅ Parolele coincid</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Județ *</label>
              <SearchableSelect
                options={countyOptions}
                value={selectedCounty}
                onChange={handleCountyChange}
                placeholder="Selectează județul"
                searchPlaceholder="Caută județ..."
                isDarkMode={isDarkMode}
                theme={isDarkMode ? {
                  surface: '#1e293b',
                  surfaceHover: '#334155',
                  text: '#f1f5f9',
                  textSecondary: '#94a3b8',
                  border: '#475569',
                  primary: '#3b82f6'
                } : undefined}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Oraș *</label>
              <SearchableSelect
                options={cityOptions}
                value={selectedCity}
                onChange={setSelectedCity}
                placeholder="Selectează orașul"
                searchPlaceholder="Caută oraș..."
                disabled={!selectedCounty}
                isDarkMode={isDarkMode}
                theme={isDarkMode ? {
                  surface: '#1e293b',
                  surfaceHover: '#334155',
                  text: '#f1f5f9',
                  textSecondary: '#94a3b8',
                  border: '#475569',
                  primary: '#3b82f6'
                } : undefined}
              />
            </div>
            </div>

            {error && <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-900/50 text-center">{error}</div>}

            <Button type="submit" className="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white py-2.5 px-4 rounded-md transition-colors font-medium" disabled={loading}>
              {loading ? 'Se procesează...' : 'Înregistrare'}
            </Button>
          </form>
        )}

        {showSuccess && (
          <div className={`mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-900/50 rounded-lg shadow-sm transition-all duration-500 text-center ${isTransitioning ? 'opacity-0 scale-95 transform -translate-y-2' : 'opacity-100 scale-100 transform translate-y-0'}`}>
            <div className="flex flex-col items-center">
              <div className={`flex-shrink-0 transition-all duration-300 mb-2 ${isTransitioning ? 'scale-75' : 'scale-100'}`}>
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-green-800 dark:text-green-300 text-sm font-semibold mb-1">{success}</p>
              <p className="text-green-700 dark:text-green-400 text-xs leading-relaxed">Verifică email-ul pentru a confirma contul. După confirmare, te poți autentifica.</p>
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300 dark:border-slate-600" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400">sau</span></div>
          </div>
          <Button onClick={handleGoogleSignIn} className="w-full mt-4 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 py-2.5 px-4 rounded-md transition-colors flex items-center justify-center space-x-2 font-medium" disabled={loading}>
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
          <button onClick={() => { resetForm(true); setIsLogin(!isLogin); }} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium">
            {isLogin ? 'Nu ai cont? Înregistrează-te' : 'Ai deja cont? Autentifică-te'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
