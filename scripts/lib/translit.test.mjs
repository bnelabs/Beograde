import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { latnToCyrl, cyrlToLatn, roundTripsCleanly } from './translit.mjs';

describe('latnToCyrl basic letters', () => {
  test('one-to-one ASCII letters map to Cyrillic', () => {
    assert.equal(latnToCyrl('Beograd'), 'Београд');
    assert.equal(latnToCyrl('Sava'), 'Сава');
    assert.equal(latnToCyrl('TRG'), 'ТРГ');
  });

  test('Serbian-specific single letters', () => {
    assert.equal(latnToCyrl('Šabac'), 'Шабац');
    assert.equal(latnToCyrl('Čačak'), 'Чачак');
    assert.equal(latnToCyrl('Žaba'), 'Жаба');
    assert.equal(latnToCyrl('ćevap'), 'ћевап');
    assert.equal(latnToCyrl('đak'), 'ђак');
  });
});

describe('latnToCyrl digraphs (the tricky part)', () => {
  test('lowercase digraphs', () => {
    assert.equal(latnToCyrl('ljubav'), 'љубав');
    assert.equal(latnToCyrl('njegov'), 'његов');
    assert.equal(latnToCyrl('džak'), 'џак');
  });

  test('title-cased digraph: only the first letter capitalised → њ-style single Cyrillic capital', () => {
    assert.equal(latnToCyrl('Ljubav'), 'Љубав');
    assert.equal(latnToCyrl('Njegov'), 'Његов');
  });

  test('ALL-CAPS digraph: both letters capitalised → ЊЕГОВ', () => {
    assert.equal(latnToCyrl('LJUBAV'), 'ЉУБАВ');
    assert.equal(latnToCyrl('NJEGOV'), 'ЊЕГОВ');
    assert.equal(latnToCyrl('DŽAK'), 'ЏАК');
  });

  test('digraph false-friend: "nje" inside a non-digraph context still translates as њ + е', () => {
    // Pure Serbian: "konjac" → "коњац". This is a deliberate property of the
    // table — round-trip QA will catch foreign words that should NOT collapse.
    assert.equal(latnToCyrl('konjac'), 'коњац');
  });
});

describe('cyrlToLatn round-trip', () => {
  test('Beograd round-trips', () => {
    assert.equal(cyrlToLatn(latnToCyrl('Beograd')), 'Beograd');
  });

  test('digraphs round-trip', () => {
    assert.equal(cyrlToLatn(latnToCyrl('ljubav')), 'ljubav');
    assert.equal(cyrlToLatn(latnToCyrl('NJEGOV')), 'NJEGOV');
  });
});

describe('roundTripsCleanly', () => {
  test('returns true for a clean Serbian string', () => {
    assert.equal(roundTripsCleanly('Beograd na vodi'), true);
  });

  test('returns true for a foreign loanword whose chars all pass through', () => {
    // "München" — `ü` is not in the table and passes through both directions,
    // so the string round-trips cleanly. Documented as a property of the
    // table so reviewers don't expect non-Latin chars to fail the gate.
    assert.equal(roundTripsCleanly('München'), true);
  });

  test('returns false when input is accidentally already Cyrillic (sanity guard)', () => {
    // The QA gate's real job: catch when sr-Latn source accidentally contains
    // Cyrillic. latnToCyrl is a no-op on Cyrillic, but cyrlToLatn collapses it
    // to Latin, so the round-trip diverges.
    assert.equal(roundTripsCleanly('Знак питања'), false);
  });
});

describe('passthroughs', () => {
  test('digits unchanged', () => {
    assert.equal(latnToCyrl('Knez Mihailova 24'), 'Кнез Михаилова 24');
  });
  test('punctuation and whitespace unchanged', () => {
    assert.equal(latnToCyrl('Beograd, Srbija!'), 'Београд, Србија!');
  });
});
