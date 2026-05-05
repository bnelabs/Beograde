import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { runBuildI18n } from './build-i18n-core.mjs';

describe('build-i18n', () => {
  test('translates a clean nested object', async () => {
    const srLatn = { tabs: { home: 'Početna', map: 'Mapa' }, common: { close: 'Zatvori' } };
    const overrides = {};
    const { output, warnings } = await runBuildI18n({ srLatn, overrides });
    assert.equal(output.tabs.home, 'Почетна');
    assert.equal(output.tabs.map, 'Мапа');
    assert.equal(output.common.close, 'Затвори');
    assert.equal(warnings.length, 0);
  });

  test('applies an override entry for a specific key path', async () => {
    const srLatn = { foo: { bar: 'WiFi' } };
    const overrides = { 'foo.bar': 'Вај-Фај' };
    const { output, warnings } = await runBuildI18n({ srLatn, overrides });
    assert.equal(output.foo.bar, 'Вај-Фај');
    assert.equal(warnings.length, 0);
  });

  test('emits a warning when input is accidentally Cyrillic (script-mismatch guard)', async () => {
    const srLatn = { tagline: 'Београд' };  // accidental Cyrillic in sr-Latn source
    const overrides = {};
    const { warnings } = await runBuildI18n({ srLatn, overrides });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /tagline/);
  });

  test('skips _doc keys at any depth', async () => {
    const srLatn = { _doc: 'ignored' };
    const overrides = { _doc: 'also ignored' };
    const { output } = await runBuildI18n({ srLatn, overrides });
    assert.equal(output._doc, undefined);
  });
});
