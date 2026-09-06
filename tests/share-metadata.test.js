const test = require('node:test');
const assert = require('node:assert/strict');
const ShareMetadata = require('../share-metadata.js');

test('share metadata has localized titles, descriptions and Open Graph locales', () => {
  assert.deepEqual(ShareMetadata.get('en'), {
    title: 'Compare your views with Israel’s parties in the 2026 Knesset election',
    description: 'Answer the questions and compare your views with the parties in the 2026 Knesset election',
    locale: 'en_US',
    alternates: ['he_IL', 'ru_RU'],
  });
  assert.deepEqual(ShareMetadata.get('he'), {
    title: 'השוו את העמדות שלכם למפלגות בישראל בבחירות לכנסת ה־26',
    description: 'ענו על השאלות והשוו את העמדות שלכם למפלגות בבחירות לכנסת ה־26',
    locale: 'he_IL',
    alternates: ['en_US', 'ru_RU'],
  });
  assert.equal(ShareMetadata.get('ru').locale, 'ru_RU');
  assert.equal(ShareMetadata.get('unknown').title, ShareMetadata.get('en').title);
});

test('share metadata updates document title and social meta tags', () => {
  const nodes = new Map();
  const allNodes = [];
  const document = {
    title: '',
    head: {
      querySelector(selector) {
        const match = /^meta\[(?:name|property)="([^"]+)"\]$/.exec(selector);
        return match ? nodes.get(match[1]) || null : null;
      },
      querySelectorAll(selector) {
        return selector === 'meta[property="og:locale:alternate"]' ? [...nodes.values()].filter((node) => node.property === 'og:locale:alternate') : [];
      },
      append(node) { allNodes.push(node); nodes.set(node.name || node.property, node); },
      appendChild(node) { this.append(node); },
    },
    createElement() {
      return { setAttribute(name, value) { this[name] = value; } };
    },
  };
  ShareMetadata.apply(document, 'he');
  assert.equal(document.title, 'השוו את העמדות שלכם למפלגות בישראל בבחירות לכנסת ה־26');
  assert.equal(nodes.get('description').content, ShareMetadata.get('he').description);
  assert.equal(nodes.get('og:title').content, document.title);
  assert.equal(nodes.get('og:locale').content, 'he_IL');
  assert.deepEqual(allNodes.filter((node) => node.property === 'og:locale:alternate').map((node) => node.content), ['en_US', 'ru_RU']);
});
