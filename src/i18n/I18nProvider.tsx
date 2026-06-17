'use client';

import { useEffect, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { defaultLanguage, isSupportedLanguage, languageStorageKey } from '@/i18n/config';

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(languageStorageKey);
    if (storedLanguage && isSupportedLanguage(storedLanguage)) {
      void i18n.changeLanguage(storedLanguage);
      document.documentElement.lang = storedLanguage;
      return;
    }

    document.documentElement.lang = defaultLanguage;
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
