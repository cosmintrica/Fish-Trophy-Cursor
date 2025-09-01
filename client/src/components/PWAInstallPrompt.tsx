import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function PWAInstallPrompt() {
  const { isInstallable, isInstalled, showTutorial, installApp, closeTutorial, dismissNotification } = usePWAInstall();
  const [isIOS, setIsIOS] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Verifică dacă este iOS
    const checkIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent);
    };

    setIsIOS(checkIOS());

    // Afișează notificarea jos dacă este instalabil și nu a fost respinsă
    if (isInstallable && !isInstalled) {
      const notificationDismissed = localStorage.getItem('pwa-notification-dismissed') === 'true';
      if (!notificationDismissed) {
        setShowNotification(true);
      }
    }
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    await installApp();
    setShowNotification(false);
  };

  const handleDismissNotification = () => {
    setShowNotification(false);
    dismissNotification();
  };

  // Tutorial modal (apare doar prima dată)
  if (showTutorial) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Instalează Fish Trophy
            </h2>
            
            <p className="text-gray-600 mb-6">
              {isIOS 
                ? 'Pentru o experiență mai bună, adaugă aplicația pe ecranul de start:'
                : 'Pentru o experiență mai bună, instalează aplicația:'
              }
            </p>

            {isIOS ? (
              <div className="text-left text-sm text-gray-700 space-y-2 mb-6">
                <p>1. Apasă butonul Share (împărtășire) din Safari</p>
                <p>2. Selectează "Adaugă la ecranul de start"</p>
                <p>3. Apasă "Adaugă"</p>
              </div>
            ) : (
              <div className="text-left text-sm text-gray-700 space-y-2 mb-6">
                <p>1. Apasă butonul "Instalează" din notificarea de jos</p>
                <p>2. Confirmă instalarea</p>
                <p>3. Aplicația va apărea pe ecranul de start</p>
              </div>
            )}
            
            <button
              onClick={closeTutorial}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
            >
              Am înțeles
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                onClick={handleInstall}
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
