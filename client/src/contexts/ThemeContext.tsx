import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    theme: {
        background: string;
        surface: string;
        surfaceHover: string;
        text: string;
        textSecondary: string;
        border: string;
        primary: string;
        secondary: string;
        accent: string;
        error: string;
        success: string;
    };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
    // Load theme preference from localStorage or DOM state (sync with index.html script)
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            // First check if the script already applied the class
            if (document.documentElement.classList.contains('dark')) {
                return true;
            }

            const savedTheme = localStorage.getItem('fish-trophy-theme');
            if (savedTheme) {
                return savedTheme === 'dark';
            }
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    // Apply theme to document (both class and data-attribute)
    useEffect(() => {
        const root = document.documentElement;

        // Apply theme immediately
        if (isDarkMode) {
            root.classList.add('dark');
            root.setAttribute('data-theme', 'dark');
            localStorage.setItem('fish-trophy-theme', 'dark');
        } else {
            root.classList.remove('dark');
            root.setAttribute('data-theme', 'light');
            localStorage.setItem('fish-trophy-theme', 'light');
        }

        // Remove direct style manipulation to let CSS classes work
        root.style.removeProperty('background-color');
        root.style.removeProperty('color');
        if (document.body) {
            document.body.style.removeProperty('background-color');
            document.body.style.removeProperty('color');
        }

        // Use MutationObserver to re-apply if class is removed by external code (e.g., Helmet)
        // Optimizat pentru a preveni re-render-uri excesive
        let animationFrameId: number | null = null;
        let lastCheck = 0;
        const CHECK_INTERVAL = 100; // Verifică doar la fiecare 100ms
        
        const observer = new MutationObserver(() => {
            const now = Date.now();
            if (now - lastCheck < CHECK_INTERVAL) return; // Throttle checks
            lastCheck = now;
            
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
            }
            
            animationFrameId = requestAnimationFrame(() => {
                const shouldHaveDark = isDarkMode;
                const hasDark = root.classList.contains('dark');
                
                // Only fix if there's a mismatch (class was removed when it shouldn't be)
                if (shouldHaveDark && !hasDark) {
                    root.classList.add('dark');
                    root.setAttribute('data-theme', 'dark');
                } else if (!shouldHaveDark && hasDark) {
                    root.classList.remove('dark');
                    root.setAttribute('data-theme', 'light');
                }
                animationFrameId = null;
            });
        });

        // Observe only class attribute changes, cu debounce
        observer.observe(root, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
            }
            observer.disconnect();
        };
    }, [isDarkMode]);

    const toggleDarkMode = () => {
        setIsDarkMode((prev) => !prev);
    };

    const lightTheme = {
        background: '#f8fafc', // Slate 50 - Cleaner / Forum Consistent
        surface: '#ffffff',
        surfaceHover: '#f1f5f9', // Slate 100
        text: '#0f172a', // Slate 900 - Crisper text
        textSecondary: '#64748b', // Slate 500
        border: '#e2e8f0', // Slate 200
        primary: '#2563eb', // Blue-600 (Preserved)
        secondary: '#059669', // Emerald-600
        accent: '#f59e0b', // Amber-500
        error: '#dc2626',
        success: '#059669'
    };

    const darkTheme = {
        background: '#0f172a', // Slate 900 - Original forum color
        surface: '#1e293b', // Slate 800
        surfaceHover: '#334155', // Slate 700
        text: '#f1f5f9', // Slate 50
        textSecondary: '#94a3b8', // Slate 400
        border: '#334155', // Slate 700
        primary: '#3b82f6', // Blue-500
        secondary: '#10b981', // Emerald-500
        accent: '#fbbf24', // Amber-400
        error: '#ef4444',
        success: '#10b981'
    };

    const theme = isDarkMode ? darkTheme : lightTheme;

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, theme }}>
            {children}
        </ThemeContext.Provider>
    );
};
