// ─────────────────────────────────────────────
// ThemeContext — Global theme provider
// Wraps the entire app, drives all screens
// ─────────────────────────────────────────────
import React, { createContext, useContext, ReactNode } from 'react';
import { useAppStore } from '../store/appStore';
import { lightColors, darkColors, AppColors } from './colors';

interface ThemeContextValue {
  colors:      AppColors;
  isDark:      boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors:      lightColors,
  isDark:      false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme       = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const isDark      = theme === 'dark';
  const colors      = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
