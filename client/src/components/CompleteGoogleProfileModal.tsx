import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CompleteGoogleProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userEmail: string;
}

export const CompleteGoogleProfileModal = ({
  isOpen,
  onClose,
  onComplete,
  userEmail,
}: CompleteGoogleProfileModalProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingUsername, setLoadingUsername] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
      setError('');
      setLoadingUsername(true);
      
      // Load username from profile
      (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', user.id)
              .maybeSingle();
            
            if (!profileError && profile?.username) {
              setUsername(profile.username);
            }
          }
        } catch (err) {
          console.error('Error loading username:', err);
        } finally {
          setLoadingUsername(false);
        }
      })();
    }
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password
    if (!password.trim()) {
      setError('Parola este obligatorie.');
      return;
    }

    if (password.length < 6) {
      setError('Parola trebuie să aibă minim 6 caractere.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Parolele nu coincid.');
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Utilizatorul nu este autentificat.');
      }

      // Update password only
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password,
      });

      if (passwordError) {
        throw passwordError;
      }

      // Mark profile as completed in user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { profile_completed: true }
      });

      if (metadataError) {
        console.error('Error updating user metadata:', metadataError);
        // Don't throw - profile update was successful
      }

      // Success - close modal and refresh
      onComplete();
      onClose();
    } catch (err: any) {
      console.error('Error completing profile:', err);
      setError(err.message || 'A apărut o eroare la completarea profilului. Te rugăm să încerci din nou.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ pointerEvents: 'auto' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Completează-ți profilul
            </h2>
            <p className="text-sm text-gray-600">
              Te-ai înregistrat cu Google. Pentru a continua, te rugăm să îți setezi o parolă.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                disabled
                className="mt-1 bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="username" className="text-sm font-semibold text-gray-700">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={loadingUsername ? 'Se încarcă...' : username}
                disabled
                className="mt-1 bg-gray-50 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                Username-ul tău a fost generat automat.
              </p>
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                Parolă <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Minim 6 caractere"
                className="mt-1"
                required
                minLength={6}
              />
              <p className="mt-1 text-xs text-gray-500">
                Minim 6 caractere. Vei putea folosi această parolă pentru a te autentifica și fără Google.
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                Confirmă parola <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                placeholder="Reintrodu parola"
                className="mt-1"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Anulează
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={loading || loadingUsername}
              >
                {loading ? 'Se salvează...' : 'Completează profilul'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

