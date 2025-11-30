import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CheckCircle, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const EmailConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      // Supabase redirects with access_token and refresh_token in URL fragments (hash)
      // Check if user is already authenticated (email was confirmed)
      const { data: { session } } = await supabase.auth.getSession();
      
      // If user is already authenticated and has OAuth provider, redirect immediately
      // This prevents showing email confirmation message for OAuth users
      if (session?.user) {
        const providers = session.user.app_metadata?.providers || [];
        const isOAuthUser = providers.length > 0 && providers.includes('google');
        
        if (isOAuthUser) {
          // OAuth users don't need email confirmation, redirect immediately
          navigate('/', { replace: true });
          return;
        }
        
        // For regular email users who already confirmed, show success message
        if (session.user.email_confirmed_at) {
          setStatus('success');
          setMessage('Email-ul a fost confirmat cu succes! Acum te poți autentifica.');
          return;
        }
      }

      // Parse hash for OAuth tokens (Supabase OAuth uses hash, not query params)
      // Also check query params as fallback (some OAuth flows use query params)
      const hash = window.location.hash.substring(1); // Remove #
      const hashParams = new URLSearchParams(hash);
      let accessToken = hashParams.get('access_token');
      let refreshToken = hashParams.get('refresh_token');
      
      // Fallback: check query params if hash is empty
      if (!accessToken || !refreshToken) {
        accessToken = searchParams.get('access_token') || accessToken;
        refreshToken = searchParams.get('refresh_token') || refreshToken;
      }

      // Check URL parameters for email confirmation tokens
      const token = searchParams.get('token');
      const type = searchParams.get('type');

      if (accessToken && refreshToken) {
        // Handle OAuth confirmation (Google, etc.)
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            setStatus('error');
            setMessage('A apărut o eroare la autentificare. Te rugăm să încerci din nou.');
          } else {
            // Clear hash from URL
            window.history.replaceState(null, '', window.location.pathname);
            // For OAuth (Google), redirect immediately without showing confirmation message
            // This is not an email confirmation, it's an OAuth login
            navigate('/', { replace: true });
            return;
          }
        } catch (error) {
          setStatus('error');
          setMessage('A apărut o eroare neașteptată. Te rugăm să încerci din nou.');
        }
      } else if (token && type === 'signup') {
        // Handle email confirmation token
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          });

          if (error) {
            if (error.message.includes('expired')) {
              setStatus('expired');
              setMessage('Link-ul de confirmare a expirat. Te rugăm să ceri un link nou.');
            } else {
              setStatus('error');
              setMessage('A apărut o eroare la confirmarea email-ului. Te rugăm să încerci din nou.');
            }
          } else {
            setStatus('success');
            setMessage('Email-ul a fost confirmat cu succes! Acum te poți autentifica.');
          }
        } catch (error) {
          setStatus('error');
          setMessage('A apărut o eroare neașteptată. Te rugăm să încerci din nou.');
        }
      } else {
        setStatus('error');
        setMessage('Link-ul de confirmare nu este valid.');
      }
    };

    handleEmailConfirmation();
  }, [searchParams]);

  const handleResendConfirmation = async () => {
    const email = searchParams.get('email');
    if (!email) {
      setMessage('Email-ul nu a fost găsit. Te rugăm să încerci să te înregistrezi din nou.');
      return;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        setMessage('A apărut o eroare la retrimiterea email-ului. Te rugăm să încerci din nou.');
      } else {
        setMessage('Email-ul de confirmare a fost retrimis! Verifică-ți inbox-ul.');
      }
    } catch (error) {
      setMessage('A apărut o eroare neașteptată. Te rugăm să încerci din nou.');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-600" />;
      case 'error':
      case 'expired':
        return <AlertCircle className="h-16 w-16 text-red-600" />;
      default:
        return <Mail className="h-16 w-16 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
      case 'expired':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return 'Se confirmă email-ul...';
      case 'success':
        return 'Email confirmat cu succes!';
      case 'error':
        return 'Eroare la confirmare';
      case 'expired':
        return 'Link expirat';
      default:
        return 'Confirmare email';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card className={`${getStatusColor()} border-2`}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle className="text-xl">{getStatusTitle()}</CardTitle>
            <CardDescription className="text-center">
              {message}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {status === 'success' && (
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  Contul tău a fost activat cu succes! Acum te poți autentifica și începe să adaugi recorduri.
                </p>
                <Button 
                  onClick={() => navigate('/')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Mergi la pagina principală
                </Button>
              </div>
            )}

            {(status === 'error' || status === 'expired') && (
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  {status === 'expired' 
                    ? 'Link-ul de confirmare a expirat. Poți cere un link nou sau să te înregistrezi din nou.'
                    : 'A apărut o problemă cu confirmarea email-ului. Te rugăm să încerci din nou.'
                  }
                </p>
                <div className="space-y-2">
                  <Button 
                    onClick={handleResendConfirmation}
                    variant="outline"
                    className="w-full"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Retrimite email-ul de confirmare
                  </Button>
                  <Button 
                    onClick={() => navigate('/')}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Mergi la pagina principală
                  </Button>
                </div>
              </div>
            )}

            {status === 'loading' && (
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Se procesează confirmarea email-ului. Te rugăm să aștepți...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Ai probleme? Contactează-ne la{' '}
            <a href="mailto:support@fishtrophy.ro" className="text-blue-600 hover:underline">
              support@fishtrophy.ro
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation;
