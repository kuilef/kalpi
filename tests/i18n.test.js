const test = require('node:test');
const assert = require('node:assert/strict');
const I18n = require('../i18n.js');

test('URL language overrides stored choice, invalid choices fall back safely', () => {
  assert.deepEqual(I18n.SUPPORTED_LOCALES, ['en', 'he', 'ru']);
  assert.equal(I18n.DEFAULT_LOCALE, 'en');
  assert.equal(I18n.loadLocale({ getItem: () => null }, ''), 'en');
  const storage = { getItem: () => 'he' };
  assert.equal(I18n.loadLocale(storage, '?lang=en'), 'en');
  assert.equal(I18n.loadLocale(storage, '?lang=invalid'), 'he');
  assert.equal(I18n.loadLocale({ getItem() { throw Error('blocked'); } }, '?lang=he'), 'he');
});

test('language catalogs interpolate values without changing original data', () => {
  I18n.register('en', { 'Совпадение {value}': 'Match {value}', 'Пример': 'Example' });
  I18n.setLocale('en');
  const record = { explanation_ru: 'Пример', value: -0.5 };
  assert.equal(I18n.text('Совпадение {value}', { value: '75%' }), 'Match 75%');
  assert.equal(I18n.text(record.explanation_ru), 'Example');
  assert.deepEqual(record, { explanation_ru: 'Пример', value: -0.5 });
  assert.equal(I18n.text('פרוטוקול הכנסת'), 'פרוטוקול הכנסת');
  assert.equal(I18n.text('https://example.org/מסמך'), 'https://example.org/מסמך');
  I18n.setLocale('ru');
  assert.equal(I18n.text('Совпадение {value}', { value: '75%' }), 'Совпадение 75%');
});

test('changing locale only persists the language key, never questionnaire answers', () => {
  const writes = [];
  const storage = { setItem: (...args) => writes.push(args) };
  I18n.saveLocale(storage, 'he');
  assert.deepEqual(writes, [[I18n.STORAGE_KEY, 'he']]);
  assert.equal(I18n.isRtl('he'), true);
  assert.equal(I18n.isRtl('en'), false);
});
