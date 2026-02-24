'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
    theme: Theme;
    setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useThemeContext() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useThemeContext must be used within ThemeProvider');
    return context;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('auto');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem('hub-theme') as Theme;
        if (saved && ['light', 'dark', 'auto'].includes(saved)) {
            setThemeState(saved);
        }
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const applyTheme = () => {
            const root = document.documentElement;
            let finalDark = false;

            if (theme === 'dark') {
                finalDark = true;
            } else if (theme === 'light') {
                finalDark = false;
            } else {
                // AUTO Logic:
                // "OS preference thắng nếu khác giờ? -> OS preference thắng trong Auto"
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const hour = new Date().getHours();

                // If OS is explicitly dark or light and the browser can detect it reliably, we blend it
                // Actually the requirement: Auto light/dark theo giờ (6-18 Light, 18-6 Dark).
                // "Nếu hệ điều hành có prefers-color-scheme, ưu tiên khi mode = Auto"
                // This means OS directly overrides time if set. Usually matchMedia is always true/false.
                // But let's just use matchMedia natively if it's explicitly dark:
                if (prefersDark) {
                    finalDark = true;
                } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
                    finalDark = false;
                } else {
                    // Fallback to time based
                    finalDark = (hour >= 18 || hour < 6);
                }
            }

            if (finalDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };

        applyTheme();

        // Listen for OS changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (theme === 'auto') applyTheme();
        };
        mediaQuery.addEventListener('change', handleChange);

        // Time interval for auto mode (re-check every minute just in case we cross the 18/6 boundary)
        const intervalId = setInterval(() => {
            if (theme === 'auto') applyTheme();
        }, 60000);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
            clearInterval(intervalId);
        };
    }, [theme, mounted]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('hub-theme', newTheme);
    };

    // prevent hydration flash by simply waiting for mount if you want strict parity,
    // but React 18 allows suppressHydrationWarning on HTML so this component just returns children
    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
