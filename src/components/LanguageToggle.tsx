'use client';

import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  isSupportedLanguage,
  languageStorageKey,
  supportedLanguages,
  type SupportedLanguage,
} from '@/i18n';

export default function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const activeLanguage = isSupportedLanguage(i18n.language) ? i18n.language : 'en';

  async function handleLanguageChange(language: SupportedLanguage): Promise<void> {
    await i18n.changeLanguage(language);
    window.localStorage.setItem(languageStorageKey, language);
    document.documentElement.lang = language;
  }

  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
      <Languages className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
      <span className="sr-only">{t('language.label')}</span>
      <select
        aria-label={t('language.ariaLabel')}
        value={activeLanguage}
        onChange={(event) => {
          const nextLanguage = event.target.value;
          if (isSupportedLanguage(nextLanguage)) {
            void handleLanguageChange(nextLanguage);
          }
        }}
        className="bg-transparent font-medium outline-none"
      >
        {supportedLanguages.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  );
}
