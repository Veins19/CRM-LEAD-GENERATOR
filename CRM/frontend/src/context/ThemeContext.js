// frontend/src/context/ThemeContext.js

import React, { createContext, useState, useEffect, useContext, useRef } from 'react';

const ThemeContext = createContext();

const STORAGE_KEY = 'theme';
const LIGHT = 'light';
const DARK = 'dark';

// Determine initial theme:
// 1) Use saved preference if present
// 2) Otherwise, follow OS preference via prefers-color-scheme
function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === LIGHT || saved === DARK) return saved;
  } catch (_) {
    // ignore storage read errors
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT; // OS-level preference [web:167]
  }
  return LIGHT;
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);
  const hasExplicitChoice = useRef(false);

  // Mark if user has explicitly chosen a theme during this session
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      hasExplicitChoice.current = saved === LIGHT || saved === DARK;
    } catch (_) {
      hasExplicitChoice.current = false;
    }
  }, []);

  // Apply theme to <html data-theme="..."> and update color-scheme for native controls
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    // Help UA default controls adapt (e.g., form controls, scrollbars) [web:169]
    root.style.colorScheme = theme;

    try {
      localStorage.setItem(STORAGE_KEY, theme);
      hasExplicitChoice.current = true;
    } catch (_) {
      // ignore storage write errors
    }
  }, [theme]);

  // When no explicit choice, follow OS changes dynamically
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)'); // Detect OS-level preference changes [web:167]
    const handler = (e) => {
      if (!hasExplicitChoice.current) {
        setTheme(e.matches ? DARK : LIGHT);
      }
    };
    // modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    }
    // legacy
    media.addListener?.(handler);
    return () => media.removeListener?.(handler);
  }, []);

  const toggleTheme = () => setTheme((prev) => (prev === LIGHT ? DARK : LIGHT));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
