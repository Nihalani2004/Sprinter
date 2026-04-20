import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from '../theme';

const ThemeContext = createContext(null);

export const useThemeMode = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be inside ThemeContextProvider');
  return ctx;
};

export function ThemeContextProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('theme_mode');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme_mode', next);
      return next;
    });
  };

  // Set data attribute on html element for CSS variable targeting
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
