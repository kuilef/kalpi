(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiI18n = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SUPPORTED_LOCALES = Object.freeze(['en', 'ru', 'he']);
  const DEFAULT_LOCALE = 'ru';
  const STORAGE_KEY = 'kalpiPrototypeLocaleV1';

  function isLocale(locale) { return SUPPORTED_LOCALES.includes(locale); }
  function isRtl(locale) { return locale === 'he'; }
  function localized(record, baseKey, locale) {
    const key = `${baseKey}_${locale}`;
    if (typeof record?.[key] !== 'string' || !record[key].trim()) {
      throw new Error(`Missing localized field ${key}`);
    }
    return record[key];
  }
  function loadLocale(storage) {
    try {
      const saved = storage?.getItem(STORAGE_KEY);
      return isLocale(saved) ? saved : DEFAULT_LOCALE;
    } catch (_) { return DEFAULT_LOCALE; }
  }
  function saveLocale(storage, locale) {
    if (!isLocale(locale)) return DEFAULT_LOCALE;
    try { storage?.setItem(STORAGE_KEY, locale); } catch (_) {}
    return locale;
  }

  return { SUPPORTED_LOCALES, DEFAULT_LOCALE, STORAGE_KEY, isRtl, localized, loadLocale, saveLocale };
});
