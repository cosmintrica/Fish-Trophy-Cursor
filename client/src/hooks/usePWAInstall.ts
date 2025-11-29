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
      if ((window.navigator as { standalone?: boolean }).standalone === true) {
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

    // Verifică dacă PWA este instalabil (manifest + service worker activ)
    const checkPWAInstallable = async () => {
      // Verifică dacă manifest.json există și este valid
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (!manifestLink) {
        return false;
      }

      // Verifică dacă service worker este activ
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration && registration.active) {
            // PWA este instalabil dacă manifest + service worker sunt active
            return true;
          }
        } catch (error) {
          console.error('Error checking service worker:', error);
        }
      }

      return false;
    };

    // Pentru Android - folosește beforeinstallprompt
    if (isAndroid()) {
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setIsInstallable(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // Verifică dacă PWA este instalabil și afișează prompt-ul manual dacă beforeinstallprompt nu apare
      const verifyAndShowPrompt = async () => {
        const isInstallable = await checkPWAInstallable();
        if (isInstallable && !deferredPrompt) {
          // Afișează prompt-ul manual dacă PWA este instalabil dar beforeinstallprompt nu apare
          setIsInstallable(true);
        }
      };

      // Verifică după 3 secunde (timp pentru încărcarea completă)
      setTimeout(() => {
        verifyAndShowPrompt();
      }, 3000);

      // Verifică și după 5 secunde (backup)
      setTimeout(() => {
        verifyAndShowPrompt();
      }, 5000);

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
