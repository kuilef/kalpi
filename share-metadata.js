(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiShareMetadata = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const METADATA = Object.freeze({
    en: Object.freeze({
      title: 'Compare your views with Israel’s parties in the 2026 Knesset election',
      description: 'Answer the questions and compare your views with the parties in the 2026 Knesset election',
      locale: 'en_US',
      alternates: Object.freeze(['he_IL', 'ru_RU']),
    }),
    he: Object.freeze({
      title: 'השוו את העמדות שלכם למפלגות בישראל בבחירות לכנסת ה־26',
      description: 'ענו על השאלות והשוו את העמדות שלכם למפלגות בבחירות לכנסת ה־26',
      locale: 'he_IL',
      alternates: Object.freeze(['en_US', 'ru_RU']),
    }),
    ru: Object.freeze({
      title: 'Сравни свои взгляды с партиями Израиля на выборах в Кнессет 2026',
      description: 'Ответьте на вопросы и сравните свои взгляды с партиями на выборах в Кнессет 2026',
      locale: 'ru_RU',
      alternates: Object.freeze(['en_US', 'he_IL']),
    }),
  });

  function get(locale) { return METADATA[locale] || METADATA.en; }

  function upsert(document, attribute, key, content) {
    let node = document.head.querySelector(`meta[${attribute}="${key}"]`);
    if (!node) {
      node = document.createElement('meta');
      node.setAttribute(attribute, key);
      document.head.appendChild(node);
    }
    node.setAttribute('content', content);
  }

  function apply(document, locale) {
    const metadata = get(locale);
    document.title = metadata.title;
    upsert(document, 'name', 'description', metadata.description);
    upsert(document, 'property', 'og:title', metadata.title);
    upsert(document, 'property', 'og:description', metadata.description);
    upsert(document, 'property', 'og:locale', metadata.locale);
    upsert(document, 'name', 'twitter:title', metadata.title);
    upsert(document, 'name', 'twitter:description', metadata.description);
    document.head.querySelectorAll('meta[property="og:locale:alternate"]').forEach((node) => node.remove());
    metadata.alternates.forEach((alternate) => {
      const node = document.createElement('meta');
      node.setAttribute('property', 'og:locale:alternate');
      node.setAttribute('content', alternate);
      document.head.appendChild(node);
    });
  }

  return { get, apply, metadata: METADATA };
});
