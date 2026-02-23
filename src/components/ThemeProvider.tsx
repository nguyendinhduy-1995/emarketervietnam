'use client';
import { useEffect } from 'react';

/**
 * Automatically applies the '.dark' class to the HTML element
 * based on the time of day (18h-6h -> Dark, 6h-18h -> Light).
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const updateTheme = () => {
            const hour = new Date().getHours();
            const root = document.documentElement;

            if (hour >= 18 || hour < 6) {
                // Nighttime -> Dark Mode
                root.classList.add('dark');
            } else {
                // Daytime -> Light Mode
                root.classList.remove('dark');
            }
        };

        // Initialize theme
        updateTheme();

        // Check every minute if theme needs to change
        const intervalId = setInterval(updateTheme, 60000);

        return () => clearInterval(intervalId);
    }, []);

    return <>{children}</>;
}
