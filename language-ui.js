(function () {
  'use strict';
  const I18n = window.KalpiI18n;
  const names = { ru: 'Русский', en: 'English', he: 'עברית' };
  const loaded = new Map();
  let switching = false;
  const storage = () => { try { return window.localStorage; } catch (_) { return null; } };

  function loadCatalog(locale) {
    if (locale === 'ru') return Promise.resolve();
    if (!loaded.has(locale)) {
      const request = Promise.all(['pages', 'ui', 'data', 'app'].map(async (group) => {
        const response = await fetch(`locales/${group}-${locale}.json?v=20260906-languages`);
        if (!response.ok) throw new Error(`${group}-${locale}: HTTP ${response.status}`);
        return response.json();
      })).then((dictionaries) => {
        dictionaries.forEach((dictionary) => I18n.register(locale, dictionary));
      }).catch((error) => { loaded.delete(locale); throw error; });
      loaded.set(locale, request);
    }
    return loaded.get(locale);
  }

  function applyPage(root = document) {
    const locale = I18n.getLocale();
    document.documentElement.lang = locale;
    document.documentElement.dir = I18n.isRtl(locale) ? 'rtl' : 'ltr';
    window.KalpiShareMetadata?.apply(document, locale);
    root.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = I18n.text(element.dataset.i18n); });
    root.querySelectorAll('[data-i18n-html]').forEach((element) => { element.innerHTML = I18n.text(element.dataset.i18nHtml); });
    for (const attribute of ['aria-label', 'title']) {
      root.querySelectorAll(`[data-i18n-${attribute}]`).forEach((element) => {
        element.setAttribute(attribute, I18n.text(element.getAttribute(`data-i18n-${attribute}`)));
      });
    }
    root.querySelectorAll('a[href]').forEach((anchor) => {
      const url = new URL(anchor.getAttribute('href'), location.href);
      if (url.origin === location.origin && /\/(?:index|analytics|methodology)\.html$/.test(url.pathname)) {
        url.searchParams.set('lang', locale);
        anchor.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
      }
    });
    document.querySelectorAll('[data-language]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.language === locale));
    });
  }

  function remember(locale) {
    I18n.saveLocale(storage(), locale);
    const url = new URL(location.href);
    url.searchParams.set('lang', locale);
    history.replaceState(history.state, '', url);
  }

  function showError() {
    const host = document.getElementById('language-error');
    host.textContent = I18n.getLocale() === 'he' ? 'לא ניתן לטעון את השפה. נסו שוב.'
      : I18n.getLocale() === 'en' ? 'Could not load the language. Please try again.'
        : 'Не удалось загрузить язык. Попробуйте ещё раз.';
    host.hidden = false;
  }

  async function switchLanguage(locale) {
    if (switching || locale === I18n.getLocale()) return;
    switching = true;
    const focusedControl = document.activeElement;
    const buttons = document.querySelectorAll('[data-language]');
    buttons.forEach((button) => { button.disabled = true; });
    document.getElementById('language-error').hidden = true;
    try {
      await loadCatalog(locale);
      I18n.setLocale(locale);
      remember(locale);
      applyPage();
      const pending = [];
      window.dispatchEvent(new CustomEvent('kalpi:languagechange', { detail: { locale, waitUntil: (promise) => pending.push(promise) } }));
      await Promise.all(pending);
    } catch (_) { showError(); }
    finally {
      switching = false;
      buttons.forEach((button) => { button.disabled = false; });
      if (focusedControl?.dataset.language) focusedControl.focus({ preventScroll: true });
    }
  }

  function mount() {
    const host = document.querySelector('.site-header .shell');
    const nav = document.createElement('nav');
    nav.className = 'language-switcher';
    nav.setAttribute('aria-label', 'Language / Язык / שפה');
    nav.dir = 'ltr';
    for (const locale of ['en', 'he', 'ru']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.language = locale;
      button.lang = locale;
      button.dir = I18n.isRtl(locale) ? 'rtl' : 'ltr';
      button.textContent = names[locale];
      button.addEventListener('click', () => switchLanguage(locale));
      nav.append(button);
    }
    const error = document.createElement('p');
    error.id = 'language-error';
    error.className = 'notice';
    error.setAttribute('role', 'status');
    error.hidden = true;
    host.prepend(nav);
    nav.after(error);
  }

  I18n.applyPage = applyPage;
  const domReady = document.readyState === 'loading'
    ? new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true })) : Promise.resolve();
  const initialLocale = I18n.loadLocale(storage(), location.search);
  const catalogReady = loadCatalog(initialLocale).then(() => true, () => false);
  I18n.ready = Promise.all([domReady, catalogReady]).then(([, success]) => {
    mount();
    I18n.setLocale(success ? initialLocale : 'ru');
    if (success) remember(initialLocale);
    applyPage();
    if (!success) showError();
  });
})();
