import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from '../i18n/locales/en';
import tl from '../i18n/locales/tl';

const LANG_KEY = 'hf_parish_language';
const locales = { en, tl };

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem(LANG_KEY) || 'en');

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    try {
      localStorage.removeItem('hf_parish_theme');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === 'tl' ? 'tl' : 'en';
    localStorage.setItem(LANG_KEY, language);
  }, [language]);

  const dictionary = locales[language] || locales.en;

  const t = useCallback(
    (key) => dictionary[key] ?? locales.en[key] ?? key,
    [dictionary]
  );

  const tStatus = useCallback(
    (status) => dictionary[`status.${status}`] ?? status,
    [dictionary]
  );

  const tService = useCallback(
    (name) => dictionary[`service.${name}`] ?? name,
    [dictionary]
  );

  const tFeature = useCallback((name) => name, []);

  const value = useMemo(
    () => ({ language, setLanguage, t, tStatus, tService, tFeature }),
    [language, t, tStatus, tService, tFeature]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
