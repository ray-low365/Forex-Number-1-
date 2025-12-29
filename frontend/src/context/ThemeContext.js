import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('fx-pulse-theme');
    return saved || 'neon'; // Default to neon
  });

  useEffect(() => {
    localStorage.setItem('fx-pulse-theme', theme);
    
    if (theme === 'luxury') {
      document.documentElement.classList.add('luxury-theme');
    } else {
      document.documentElement.classList.remove('luxury-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'neon' ? 'luxury' : 'neon');
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isNeon: theme === 'neon',
    isLuxury: theme === 'luxury'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
