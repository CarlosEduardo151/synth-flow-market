import React, { createContext, useContext, useState, useEffect } from 'react';

type SystemTheme = 'dark' | 'light';

interface SystemThemeContextType {
  systemTheme: SystemTheme;
  toggleSystemTheme: () => void;
}

const SystemThemeContext = createContext<SystemThemeContextType | undefined>(undefined);

export const SystemThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [systemTheme, setSystemTheme] = useState<SystemTheme>(() => {
    return (localStorage.getItem('system-theme') as SystemTheme) || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('system-theme', systemTheme);
  }, [systemTheme]);

  const toggleSystemTheme = () => {
    setSystemTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <SystemThemeContext.Provider value={{ systemTheme, toggleSystemTheme }}>
      {children}
    </SystemThemeContext.Provider>
  );
};

export const useSystemTheme = () => {
  const context = useContext(SystemThemeContext);
  if (!context) {
    throw new Error('useSystemTheme must be used within SystemThemeProvider');
  }
  return context;
};
