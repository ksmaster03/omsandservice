import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { th } from './th';
import { en } from './en';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { th: { translation: th }, en: { translation: en } },
    fallbackLng: 'th',
    supportedLngs: ['th', 'en'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'nba-customer-lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
