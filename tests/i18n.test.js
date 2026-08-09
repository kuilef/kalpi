const test = require('node:test');
const assert = require('node:assert/strict');
const I18n = require('../i18n.js');

test('Hebrew is RTL and a missing locale does not fall back', () => {
  assert.equal(I18n.isRtl('he'), true);
  assert.equal(I18n.isRtl('en'), false);
  assert.equal(I18n.localized({ name_en: 'Likud', name_ru: 'Ликуд' }, 'name', 'en'), 'Likud');
  assert.throws(() => I18n.localized({ name_ru: 'Ликуд' }, 'name', 'he'), /name_he/);
});

test('locale preference defaults to Russian and only stores supported values', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
  assert.equal(I18n.loadLocale(storage), 'ru');
  values.set('kalpiPrototypeLocaleV1', 'he');
  assert.equal(I18n.loadLocale(storage), 'he');
  values.set('kalpiPrototypeLocaleV1', 'fr');
  assert.equal(I18n.loadLocale(storage), 'ru');
  I18n.saveLocale(storage, 'en');
  assert.equal(values.get('kalpiPrototypeLocaleV1'), 'en');
});
