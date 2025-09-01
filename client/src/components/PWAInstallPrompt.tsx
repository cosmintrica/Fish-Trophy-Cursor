import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function PWAInstallPrompt() {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Verifică dacă este iOS
    const checkIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent);
    };

    setIsIOS(checkIOS());

    // Afișează prompt-ul doar dacă este instalabil și nu este deja instalat
    if (isInstallable && !isInstalled) {
      // Verifică dacă utilizatorul a respins prompt-ul anterior
      const promptDismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!promptDismissed) {
        // Așteaptă puțin înainte să afișeze prompt-ul
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000); // 3 secunde după încărcare

        return () => clearTimeout(timer);
      }
    }
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    await installApp();
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!showPrompt || !isInstallable || isInstalled) {
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
                onClick={handleInstall}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                {isIOS ? 'Instrucțiuni' : 'Instalează'}
              </button>
              
              <button
                onClick={handleDismiss}
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
