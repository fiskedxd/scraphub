import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const DEFAULT_ACCENT_COLOR = '#38bdf8';
const VALID_THEMES = new Set(['dark', 'light', 'white']);
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const getStoredTheme = () => {
  const saved = localStorage.getItem('theme');
  return VALID_THEMES.has(saved) ? saved : 'dark';
};

const getStoredAccentColor = () => {
  const saved = localStorage.getItem('accentColor');
  return HEX_COLOR_PATTERN.test(saved || '') ? saved : DEFAULT_ACCENT_COLOR;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getStoredTheme);
  const [accentColor, setAccentColorState] = useState(getStoredAccentColor);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor);
    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--accent-color-hover', `${accentColor}33`);
  }, [accentColor]);

  const toggleTheme = (newTheme) => {
    if (VALID_THEMES.has(newTheme)) setTheme(newTheme);
  };

  const setAccentColor = (newColor) => {
    if (HEX_COLOR_PATTERN.test(newColor)) setAccentColorState(newColor);
  };

  const value = {
    theme,
    toggleTheme,
    accentColor,
    setAccentColor,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isWhite: theme === 'white'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
