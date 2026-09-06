(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiI18n = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SUPPORTED_LOCALES = Object.freeze(['en', 'ru', 'he']);
  const DEFAULT_LOCALE = 'ru';
  const STORAGE_KEY = 'kalpiPrototypeLocaleV1';
  const catalogs = { ru: Object.create(null), en: Object.create(null), he: Object.create(null) };
  const missing = new Set();
  let currentLocale = DEFAULT_LOCALE;

  function register(locale, dictionary) {
    if (!isLocale(locale)) throw new Error(`Unsupported locale: ${locale}`);
    Object.assign(catalogs[locale], dictionary);
  }
  function getLocale() { return currentLocale; }
  function setLocale(locale) {
    if (!isLocale(locale)) throw new Error(`Unsupported locale: ${locale}`);
    currentLocale = locale;
    missing.clear();
    return locale;
  }
  function text(source, params = {}) {
    const original = String(source ?? '');
    const translated = catalogs[currentLocale][original];
    if (currentLocale !== 'ru' && translated == null && /[А-Яа-яЁё]/.test(original)) missing.add(original);
    return (translated ?? original).replace(/\{(\w+)\}/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match);
  }

  function isLocale(locale) { return SUPPORTED_LOCALES.includes(locale); }
  function isRtl(locale) { return locale === 'he'; }
  function localized(record, baseKey, locale) {
    const key = `${baseKey}_${locale}`;
    if (typeof record?.[key] !== 'string' || !record[key].trim()) {
      throw new Error(`Missing localized field ${key}`);
    }
    return record[key];
  }
  function loadLocale(storage, search = '') {
    const requested = new URLSearchParams(search).get('lang');
    if (isLocale(requested)) return requested;
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

  return { SUPPORTED_LOCALES, DEFAULT_LOCALE, STORAGE_KEY, isLocale, isRtl, localized, loadLocale, saveLocale,
    register, getLocale, setLocale, text, missing, ready: Promise.resolve() };
});
