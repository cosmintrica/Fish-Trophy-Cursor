import { X, User, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onRegister?: () => void; // Callback pentru înregistrare
  title?: string;
  message?: string;
  actionName?: string;
}

export const AuthRequiredModal = ({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  title = 'Autentificare necesară',
  message = 'Trebuie să fii autentificat pentru a accesa această funcționalitate.',
  actionName = 'această acțiune'
}: AuthRequiredModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="text-blue-100 text-sm mt-1">Cont necesar</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-6">
            {message}
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => {
                onClose();
                onLogin();
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 text-base font-semibold shadow-lg flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Autentificare
            </Button>
            <Button
              onClick={() => {
                onClose();
                if (onRegister) {
                  onRegister();
                } else {
                  // Fallback: dispatch event pentru a deschide AuthModal în modul register
                  const event = new CustomEvent('openAuthModal', { detail: { mode: 'register' } });
                  window.dispatchEvent(event);
                }
              }}
              variant="outline"
              className="w-full border-2 border-gray-300 hover:border-blue-500 py-6 text-base font-semibold flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Creează cont nou
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
