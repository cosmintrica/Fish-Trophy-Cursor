import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Verifică dacă utilizatorul a văzut deja tutorialul
    const hasSeenTutorial = localStorage.getItem('pwa-tutorial-seen') === 'true';
    
    // Verifică dacă aplicația este deja instalată
    const checkIfInstalled = () => {
      // Verifică dacă rulează în mod standalone (instalat)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      
      // Verifică dacă este iOS și dacă este în homescreen
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return true;
      }
      
      return false;
    };

    // Verifică dacă este dispozitiv mobil
    const isMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    // Verifică dacă este iOS
    const isIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent);
    };

    // Verifică dacă este Android
    const isAndroid = () => {
      return /Android/.test(navigator.userAgent);
    };

    // Verifică dacă este tabletă
    const isTablet = () => {
      return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
    };

    // Doar pentru dispozitive mobile (Android, iOS, tablete)
    if (!isMobile() && !isTablet()) {
      return;
    }

    // Verifică dacă este deja instalată
    if (checkIfInstalled()) {
      return;
    }

    // Afișează tutorialul doar prima dată
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }

    // Pentru Android - folosește beforeinstallprompt
    if (isAndroid()) {
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setIsInstallable(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    // Pentru iOS - afișează instrucțiuni manuale
    if (isIOS()) {
      setIsInstallable(true);
    }

    // Verifică dacă aplicația a fost instalată
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      // Pentru iOS, afișează instrucțiuni
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        alert('Pentru a instala aplicația pe iOS:\n\n1. Apasă butonul Share (împărtășire) din Safari\n2. Selectează "Adaugă la ecranul de start"\n3. Apasă "Adaugă"');
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Eroare la instalarea aplicației:', error);
    }
  };

  const closeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('pwa-tutorial-seen', 'true');
  };

  const dismissNotification = () => {
    setIsInstallable(false);
    localStorage.setItem('pwa-notification-dismissed', 'true');
  };

  return {
    isInstallable,
    isInstalled,
    showTutorial,
    installApp,
    closeTutorial,
    dismissNotification
  };
};
