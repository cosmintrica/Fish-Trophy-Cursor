import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface PWAInstallPromptProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export default function PWAInstallPrompt({ onInstall, onDismiss }: PWAInstallPromptProps) {
  const { isInstallable, isInstalled, installApp, dismissNotification } = usePWAInstall();
  
  // Props are used directly in the component, no need for wrapper functions
  const [isIOS, setIsIOS] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Verifică dacă este iOS
    const checkIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent);
    };

    setIsIOS(checkIOS());

    // Verifică dacă este dispozitiv mobil
    const isMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    // Afișează notificarea jos dacă este instalabil și nu a fost respinsă
    if (isInstallable && !isInstalled && isMobile()) {
      const notificationDismissed = localStorage.getItem('pwa-notification-dismissed') === 'true';
      if (!notificationDismissed) {
        // Delay redus pentru a permite aplicației să se încarce (sincronizat cu hook-ul)
        setTimeout(() => {
          setShowNotification(true);
        }, 2500); // 2.5 secunde - după ce hook-ul verifică (2 secunde)
      }
    }
  }, [isInstallable, isInstalled]);

  const handleInstallAsync = async () => {
    await installApp();
    setShowNotification(false);
    onInstall();
  };

  const handleDismissNotification = () => {
    setShowNotification(false);
    dismissNotification();
    onDismiss();
  };

  // Tutorial modal removed - using notification only

  // Notificare jos (rămâne până când utilizatorul o închide)
  if (!showNotification || !isInstallable || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 mb-1">
              Instalează Fish Trophy
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {isIOS 
                ? 'Adaugă aplicația pe ecranul de start pentru acces rapid'
                : 'Instalează aplicația pentru o experiență mai bună'
              }
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleInstallAsync}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                {isIOS ? 'Instrucțiuni' : 'Instalează'}
              </button>
              
              <button
                onClick={handleDismissNotification}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Închide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
