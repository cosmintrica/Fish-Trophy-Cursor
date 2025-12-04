import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { X, Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchableSelect from './SearchableSelect';

interface UnifiedAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  redirectAfterLogin?: string | null; // URL pentru redirect după login (null = rămâne pe pagina curentă)
  theme?: {
    surface: string;
    surfaceHover: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
    error: string;
    success: string;
  };
}

const UnifiedAuthModal = ({ 
  isOpen, 
  onClose, 
  initialMode = 'login',
  redirectAfterLogin = null,
  theme
}: UnifiedAuthModalProps) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Când se deschide modalul, setează modul corect
  useEffect(() => {
    if (isOpen) {
      setIsLogin(initialMode === 'login');
      setError('');
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
  const [counties, setCounties] = useState<{ id: string, name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string, name: string }[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
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

  // Load counties and cities
  useEffect(() => {
    if (!isLogin && isOpen) {
      const loadCounties = async () => {
        const { data } = await supabase.from('counties').select('id, name').order('name');
        if (data) setCounties(data);
      };
      loadCounties();
    }
  }, [isLogin, isOpen]);

  useEffect(() => {
    if (selectedCounty && !isLogin) {
      const loadCities = async () => {
        const { data } = await supabase
          .from('cities')
          .select('id, name')
          .eq('county_id', selectedCounty)
          .order('name');
        if (data) setCities(data);
      };
      loadCities();
    } else {
      setCities([]);
    }
  }, [selectedCounty, isLogin]);

  // Generate username from displayName
  const generateUsernameFromName = async (nameInput: string) => {
    if (!nameInput || nameInput.length < 3) return;

    let baseUsername = nameInput
      .toLowerCase()
      .replace(/[ăâîșț]/g, 'a')
      .replace(/[^a-z0-9_-]/g, '')
      .substring(0, 30);
    
    if (baseUsername.length < 3) {
      baseUsername = nameInput.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 6);
    }

    if (baseUsername.length < 3) return;

    let finalUsername = baseUsername;
    let attempt = 0;
    let exists = true;

    while (exists && attempt < 10) {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', finalUsername)
        .maybeSingle();
      
      if (!data) {
        exists = false;
      } else {
        attempt++;
        finalUsername = `${baseUsername}${attempt}`;
      }
    }

    if (!exists) {
      setUsername(finalUsername);
    }
  };

  useEffect(() => {
    if (displayName && !isLogin) {
      const timeoutId = setTimeout(() => {
        generateUsernameFromName(displayName);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [displayName, isLogin]);

  const resetForm = (keepMode = false) => {
    setEmailOrUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setUsername('');
    setSelectedCounty('');
    setSelectedCity('');
    setError('');
    setSuccess('');
    setShowSuccess(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordFocused(false);
    setEmailFocused(false);
    if (!keepMode) {
      setIsLogin(true);
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
          if (errorMessage.includes('Invalid login credentials')) {
            setError('Email sau parolă incorectă.');
          } else if (errorMessage.includes('Email not confirmed')) {
            setError('Email-ul nu a fost confirmat. Verifică-ți inbox-ul.');
          } else {
            setError(errorMessage.length > 100 ? 'A apărut o eroare la autentificare.' : errorMessage);
          }
          setLoading(false);
          return;
        }

        // Success - close modal and redirect if needed
        onClose();
        resetForm();
        
        // Redirect logic: use redirectAfterLogin if provided, otherwise stay on current page
        if (redirectAfterLogin) {
          navigate(redirectAfterLogin);
        }
        // If redirectAfterLogin is null, stay on current page (no redirect)
      } else {
        // Register
        if (!displayName.trim() || !username.trim() || !email.trim() || !password.trim() || !selectedCounty || !selectedCity) {
          setError('Completează toate câmpurile obligatorii.');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Parolele nu coincid.');
          setLoading(false);
          return;
        }

        if (username.length < 3 || username.length > 30) {
          setError('Username-ul trebuie să aibă între 3 și 30 de caractere.');
          setLoading(false);
          return;
        }

        if (!/^[a-z0-9_-]+$/.test(username)) {
          setError('Username-ul poate conține doar litere mici, cifre, _ și -.');
          setLoading(false);
          return;
        }

        // Pass county and city to signUp
        try {
          await signUp(email, password, displayName, selectedCounty, selectedCity, username);
        } catch (err: any) {
          const errorMessage = err?.message || '';
          if (errorMessage.includes('already registered')) {
            setError('Acest email este deja înregistrat.');
          } else if (errorMessage.includes('username')) {
            setError('Acest username este deja folosit.');
          } else {
            setError(errorMessage.length > 100 ? 'A apărut o eroare la înregistrare.' : errorMessage);
          }
          setLoading(false);
          return;
        }

        setSuccess('Cont creat cu succes!');
        setShowSuccess(true);
        setIsTransitioning(false);
        resetForm(true);
        setTimeout(() => {
          setIsTransitioning(true);
          setTimeout(() => {
            setShowSuccess(false);
            setIsLogin(true);
            setIsTransitioning(false);
          }, 500);
        }, 3000);
      }
    } catch (err) {
      let errorMessage = 'A apărut o eroare neașteptată.';
      if (err instanceof Error) {
        const message = err.message;
        if (message.includes('already registered') || message.includes('duplicate')) {
          errorMessage = 'Acest email sau username este deja înregistrat.';
        } else {
          errorMessage = message.length > 100 ? 'A apărut o eroare. Te rugăm să încerci din nou.' : message;
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
      await signInWithGoogle();
      onClose();
      // Redirect will be handled by auth state change
    } catch (err) {
      setError('A apărut o eroare la autentificarea cu Google.');
      setLoading(false);
    }
  };


  // Default theme (light mode)
  const defaultTheme = {
    surface: '#ffffff',
    surfaceHover: '#f3f4f6',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    primary: '#3b82f6',
    error: '#dc2626',
    success: '#10b981'
  };

  const activeTheme = theme || defaultTheme;

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: activeTheme.surface,
          borderRadius: '0.75rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '28rem',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          transition: 'all 0.3s',
          opacity: isTransitioning ? 0.95 : 1,
          transform: isTransitioning ? 'scale(0.95) translateY(-1rem)' : 'scale(1) translateY(0)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: activeTheme.textSecondary,
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '0.375rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = activeTheme.surfaceHover;
            e.currentTarget.style.color = activeTheme.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = activeTheme.textSecondary;
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: activeTheme.text,
            margin: '0 0 0.5rem 0'
          }}>
            {isLogin ? 'Autentificare' : 'Înregistrare'}
          </h2>
        </div>

        {isLogin ? (
          // LOGIN FORM
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: activeTheme.text,
                marginBottom: '0.5rem'
              }}>
                Email sau Username *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail 
                  size={16} 
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: activeTheme.textSecondary
                  }}
                />
                <input
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: '2.5rem',
                    paddingRight: '0.75rem',
                    paddingTop: '0.625rem',
                    paddingBottom: '0.625rem',
                    border: `1px solid ${activeTheme.border}`,
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: activeTheme.surface,
                    color: activeTheme.text
                  }}
                  placeholder="email sau username"
                  required
                  onFocus={(e) => e.target.style.borderColor = activeTheme.primary}
                  onBlur={(e) => e.target.style.borderColor = activeTheme.border}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: activeTheme.text,
                marginBottom: '0.5rem'
              }}>
                Parolă *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock 
                  size={16} 
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: activeTheme.textSecondary
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: '2.5rem',
                    paddingRight: '2.5rem',
                    paddingTop: '0.625rem',
                    paddingBottom: '0.625rem',
                    border: `1px solid ${activeTheme.border}`,
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: activeTheme.surface,
                    color: activeTheme.text
                  }}
                  placeholder="••••••••"
                  required
                  onFocus={(e) => e.target.style.borderColor = activeTheme.primary}
                  onBlur={(e) => e.target.style.borderColor = activeTheme.border}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: activeTheme.textSecondary,
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = activeTheme.text;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = activeTheme.textSecondary;
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: activeTheme.error,
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                border: `1px solid #fecaca`,
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.625rem 1rem',
                backgroundColor: loading ? activeTheme.textSecondary : activeTheme.primary,
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {loading ? 'Se procesează...' : 'Autentificare'}
            </button>
          </form>
        ) : (
          // REGISTER FORM - Simplified for forum (no county/city if not needed)
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: activeTheme.text,
                marginBottom: '0.5rem'
              }}>
                Nume complet *
              </label>
              <div style={{ position: 'relative' }}>
                <User 
                  size={16} 
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: activeTheme.textSecondary
                  }}
                />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: '2.5rem',
                    paddingRight: '0.75rem',
                    paddingTop: '0.625rem',
                    paddingBottom: '0.625rem',
                    border: `1px solid ${activeTheme.border}`,
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: activeTheme.surface,
                    color: activeTheme.text
                  }}
                  placeholder="Numele tău complet"
                  required
                  onFocus={(e) => e.target.style.borderColor = activeTheme.primary}
                  onBlur={(e) => e.target.style.borderColor = activeTheme.border}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: activeTheme.text,
                marginBottom: '0.5rem'
              }}>
                Username *
              </label>
              <div style={{ position: 'relative' }}>
                <User 
                  size={16} 
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: activeTheme.textSecondary
                  }}
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  style={{
                    width: '100%',
                    paddingLeft: '2.5rem',
                    paddingRight: '0.75rem',
                    paddingTop: '0.625rem',
                    paddingBottom: '0.625rem',
                    border: `1px solid ${activeTheme.border}`,
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: activeTheme.surface,
                    color: activeTheme.text
                  }}
                  placeholder="username"
                  required
                  onFocus={(e) => e.target.style.borderColor = activeTheme.primary}
                  onBlur={(e) => e.target.style.borderColor = activeTheme.border}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: activeTheme.textSecondary, marginTop: '0.25rem' }}>
                3-30 caractere: litere, cifre, _ și -
              </p>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: activeTheme.text,
                marginBottom: '0.5rem'
              }}>
                Email *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail 
                  size={16} 
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: activeTheme.textSecondary
                  }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setTimeout(() => setEmailFocused(false), 200)}
                  style={{
                    width: '100%',
                    paddingLeft: '2.5rem',
                    paddingRight: '0.75rem',
                    paddingTop: '0.625rem',
                    paddingBottom: '0.625rem',
                    border: `1px solid ${activeTheme.border}`,
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: activeTheme.surface,
                    color: activeTheme.text
                  }}
                  placeholder="email@example.com"
                  required
                />
                {emailFocused && shouldShowEmailSuggestions() && filteredDomains.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    zIndex: 10,
                    width: '100%',
                    marginTop: '0.25rem',
                    backgroundColor: activeTheme.surface,
                    border: `1px solid ${activeTheme.border}`,
                    borderRadius: '0.375rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {filteredDomains.map((domain) => {
                      const parts = email.split('@');
                      const localPart = parts[0] || '';
                      return (
                        <button
                          key={domain}
                          type="button"
                          onClick={() => {
                            setEmail(localPart + domain);
                            setEmailFocused(false);
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.5rem 0.75rem',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            color: activeTheme.text,
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = activeTheme.surfaceHover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {localPart}<span style={{ color: activeTheme.primary }}>{domain}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {!emailFocused && !email.includes('@') && email.length > 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#ea580c', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>❌</span> Email trebuie să conțină @
                  </p>
                )}
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: activeTheme.text,
                marginBottom: '0.5rem'
              }}>
                Parolă *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock 
                  size={16} 
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: activeTheme.textSecondary
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={(e) => {
                    setPasswordFocused(true);
                    e.target.style.borderColor = activeTheme.primary;
                  }}
                  onBlur={(e) => {
                    setPasswordFocused(false);
                    e.target.style.borderColor = activeTheme.border;
                  }}
                  style={{
                    width: '100%',
                    paddingLeft: '2.5rem',
                    paddingRight: '2.5rem',
                    paddingTop: '0.625rem',
                    paddingBottom: '0.625rem',
                    border: `1px solid ${activeTheme.border}`,
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: activeTheme.surface,
                    color: activeTheme.text
                  }}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: activeTheme.textSecondary,
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = activeTheme.text;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = activeTheme.textSecondary;
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordFocused && password.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {passwordRules.map((rule, index) => {
                    const isValid = rule.test(password);
                    return (
                      <div key={index} style={{
                        fontSize: '0.75rem',
                        color: isValid ? activeTheme.success : activeTheme.error,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span>{isValid ? '✅' : '❌'}</span>
                        <span>{rule.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: activeTheme.text,
                marginBottom: '0.5rem'
              }}>
                Confirmă parola *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock 
                  size={16} 
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: activeTheme.textSecondary
                  }}
                />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: '2.5rem',
                    paddingRight: '2.5rem',
                    paddingTop: '0.625rem',
                    paddingBottom: '0.625rem',
                    border: `1px solid ${activeTheme.border}`,
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: activeTheme.surface,
                    color: activeTheme.text
                  }}
                  placeholder="••••••••"
                  required
                  onFocus={(e) => e.target.style.borderColor = activeTheme.primary}
                  onBlur={(e) => e.target.style.borderColor = activeTheme.border}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: activeTheme.textSecondary,
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = activeTheme.text;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = activeTheme.textSecondary;
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p style={{ fontSize: '0.75rem', color: activeTheme.error, marginTop: '0.25rem' }}>
                  ❌ Parolele nu coincid
                </p>
              )}
              {confirmPassword.length > 0 && password === confirmPassword && password.length > 0 && (
                <p style={{ fontSize: '0.75rem', color: activeTheme.success, marginTop: '0.25rem' }}>
                  ✅ Parolele coincid
                </p>
              )}
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: activeTheme.text,
                marginBottom: '0.5rem'
              }}>
                Județ *
              </label>
              <SearchableSelect
                options={counties.map(county => ({ value: county.id, label: county.name }))}
                value={selectedCounty}
                onChange={(countyId) => {
                  setSelectedCounty(countyId);
                  setSelectedCity('');
                }}
                placeholder="Selectează județul"
                searchPlaceholder="Caută județ..."
                theme={activeTheme}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: activeTheme.text,
                marginBottom: '0.5rem'
              }}>
                Oraș *
              </label>
              <SearchableSelect
                options={cities.map(city => ({ value: city.id, label: city.name }))}
                value={selectedCity}
                onChange={setSelectedCity}
                placeholder={selectedCounty ? "Selectează orașul" : "Selectează mai întâi județul"}
                searchPlaceholder="Caută oraș..."
                disabled={!selectedCounty}
                theme={activeTheme}
              />
            </div>

            {error && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: activeTheme.error,
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                border: `1px solid #fecaca`,
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {showSuccess && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: `linear-gradient(to right, #d1fae5, #a7f3d0)`,
                border: `1px solid ${activeTheme.success}`,
                borderRadius: '0.5rem',
                textAlign: 'center',
                transition: 'all 0.5s',
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? 'scale(0.95) translateY(-0.5rem)' : 'scale(1) translateY(0)'
              }}>
                <p style={{ color: '#065f46', fontSize: '0.875rem', fontWeight: '600', margin: '0 0 0.25rem 0' }}>
                  {success}
                </p>
                <p style={{ color: '#047857', fontSize: '0.75rem', margin: 0 }}>
                  Verifică email-ul pentru a confirma contul. După confirmare, te poți autentifica.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.625rem 1rem',
                backgroundColor: loading ? activeTheme.textSecondary : activeTheme.primary,
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {loading ? 'Se procesează...' : 'Înregistrare'}
            </button>
          </form>
        )}

        {/* Google Sign In */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{
            position: 'relative',
            marginBottom: '1rem'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{
                width: '100%',
                borderTop: `1px solid ${activeTheme.border}`
              }} />
            </div>
            <div style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              fontSize: '0.875rem'
            }}>
              <span style={{
                padding: '0 0.5rem',
                backgroundColor: activeTheme.surface,
                color: activeTheme.textSecondary
              }}>
                sau
              </span>
            </div>
          </div>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.625rem 1rem',
              backgroundColor: activeTheme.surface,
              border: `1px solid ${activeTheme.border}`,
              color: activeTheme.text,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = activeTheme.surfaceHover;
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = activeTheme.surface;
              }
            }}
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Continuă cu Google</span>
          </button>
        </div>

        {/* Toggle Login/Register */}
        <div style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          paddingTop: '1.5rem',
          borderTop: `1px solid ${activeTheme.border}`
        }}>
          <button
            onClick={() => {
              resetForm(true);
              setIsLogin(!isLogin);
            }}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: activeTheme.primary,
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = activeTheme.primary;
            }}
          >
            {isLogin ? 'Nu ai cont? Înregistrează-te' : 'Ai deja cont? Autentifică-te'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedAuthModal;

