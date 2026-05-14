import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  haversineM,
  normalizeName,
  nameOverlaps,
  extractGoodToKnow,
  pickBestMatch,
} from './geoapify-enrich-core.mjs';

describe('geoapify-enrich-core', () => {
  test('haversine is symmetric and roughly correct over a known leg', () => {
    // Republic Square ↔ Hotel Moskva — known ~700 m apart.
    const d = haversineM(20.4612, 44.8170, 20.4604, 44.8129);
    assert.ok(d > 400 && d < 700, `expected 400–700m, got ${Math.round(d)}m`);
    assert.equal(Math.round(d), Math.round(haversineM(20.4604, 44.8129, 20.4612, 44.8170)));
  });

  test('normalizeName strips diacritics, punctuation, and casing', () => {
    assert.equal(normalizeName('Beton Hala'), 'beton hala');
    assert.equal(normalizeName("Kafana '?' "), 'kafana');
    assert.equal(normalizeName('Banja Koviljača'), 'banja koviljaca');
  });

  test('nameOverlaps tolerates trailing qualifiers within the same script', () => {
    assert.ok(nameOverlaps('Kalemegdan Fortress', 'Kalemegdan'));
    assert.ok(nameOverlaps('Hotel Moskva', 'Moskva Hotel'));
    assert.ok(!nameOverlaps('Hotel Moskva', 'Vila Kalemegdan'));
    // Cyrillic vs Latin: deliberately falsy — pickBestMatch handles cross-script
    // via Geoapify's name_international block, not via the string comparison.
    assert.equal(nameOverlaps('Hotel Moskva', 'Хотел Москва'), false);
  });

  test('pickBestMatch rejects far-away matches', () => {
    const poi = { lng: 20.4604, lat: 44.8129, name: { en: 'Hotel Moskva', sr_lat: 'Hotel Moskva' } };
    const response = {
      results: [
        // 3 km away — same name but wrong building.
        { place_id: 'abc', name: 'Hotel Moskva', lat: 44.84, lon: 20.46 },
      ],
    };
    assert.equal(pickBestMatch(response, poi, { maxDistanceM: 500 }), null);
  });

  test('pickBestMatch returns the first hit within range that overlaps by name', () => {
    const poi = { lng: 20.4604, lat: 44.8129, name: { en: 'Hotel Moskva', sr_lat: 'Hotel Moskva' } };
    const response = {
      results: [
        { place_id: 'pid-1', name: 'Hotel Moskva', lat: 44.8129, lon: 20.4604 },
        { place_id: 'pid-2', name: 'Moskva Hotel', lat: 44.8127, lon: 20.4612 },
      ],
    };
    const match = pickBestMatch(response, poi);
    assert.equal(match.place_id, 'pid-1');
    assert.ok(match.distanceM < 50);
  });

  test('pickBestMatch prefers the stronger word overlap over the closer-but-wrong match', () => {
    // Reproduces the live Subotica Synagogue case: Jugolab Subotica sorted
    // first but shares only one word; the actual synagogue scored 2 words.
    const poi = {
      lng: 19.66777778, lat: 46.10361111,
      name: { en: 'Subotica Synagogue', sr_lat: 'Subotička sinagoga' },
    };
    const response = {
      results: [
        { place_id: 'wrong', name: 'Jugolab Subotica', lat: 46.1046721, lon: 19.6663749 },
        { place_id: 'right', name: 'Subotica Synagogue', lat: 46.101407, lon: 19.6613324 },
      ],
    };
    assert.equal(pickBestMatch(response, poi).place_id, 'right');
  });

  test('pickBestMatch transliterates Cyrillic candidate names for comparison', () => {
    // Geoapify returns "Кнеза Михаила" for Knez Mihailova; the matcher must
    // recognize the underlying Latin form rather than rejecting on script.
    const poi = {
      lng: 20.4582, lat: 44.8175,
      name: { en: 'Knez Mihailova', sr_lat: 'Knez Mihailova' },
    };
    const response = {
      results: [
        { place_id: 'pid-1', name: 'Кнеза Михаила', lat: 44.8164, lon: 20.4586 },
      ],
    };
    const match = pickBestMatch(response, poi);
    assert.ok(match, 'expected a confident match via Cyrillic transliteration');
    assert.equal(match.place_id, 'pid-1');
  });

  test('extractGoodToKnow pulls heritage, stars, building year, wikidata, website', () => {
    const placeDetails = {
      features: [
        {
          properties: {
            feature_type: 'details',
            website: 'http://www.hotelmoskva.rs',
            wiki_and_media: { wikidata: 'Q3145608' },
            heritage: { level: 2, ref: 'SK105' },
            accommodation: { stars: 4 },
            building: { start_date: '1908-01-14' },
          },
        },
      ],
    };
    assert.deepEqual(extractGoodToKnow(placeDetails), {
      wikidata: 'Q3145608',
      heritage: 'national',
      stars: 4,
      buildingYear: 1908,
      website: 'http://www.hotelmoskva.rs',
    });
  });

  test('extractGoodToKnow surfaces cafe-class fields when present', () => {
    const placeDetails = {
      features: [
        {
          properties: {
            feature_type: 'details',
            wheelchair: 'limited',
            internet_access: 'wlan',
            'internet_access:fee': 'no',
            outdoor_seating: 'yes',
            takeaway: 'no',
            cuisine: 'serbian',
            'payment:credit_cards': 'yes',
            'payment:cash': 'yes',
          },
        },
      ],
    };
    assert.deepEqual(extractGoodToKnow(placeDetails), {
      wheelchair: 'limited',
      wifi: 'free',
      outdoorSeating: true,
      takeaway: false,
      cuisine: 'serbian',
      payments: ['cards', 'cash'],
    });
  });

  test('extractGoodToKnow returns an empty object when nothing useful was tagged', () => {
    const placeDetails = { features: [{ properties: { feature_type: 'details', name: 'x' } }] };
    assert.deepEqual(extractGoodToKnow(placeDetails), {});
  });

  test('extractGoodToKnow drops social/video URLs that OSM sometimes stores in `website`', () => {
    const cases = [
      'https://youtube.com/watch?v=abc',
      'https://youtu.be/abc',
      'https://www.facebook.com/whatever',
      'https://instagram.com/some-place',
    ];
    for (const url of cases) {
      const out = extractGoodToKnow({ features: [{ properties: { website: url } }] });
      assert.equal(out.website, undefined, `should have rejected ${url}`);
    }
    // But a real domain stays.
    const ok = extractGoodToKnow({ features: [{ properties: { website: 'http://www.beogradskatvrdjava.co.rs/' } }] });
    assert.equal(ok.website, 'http://www.beogradskatvrdjava.co.rs/');
  });

  test('extractGoodToKnow rejects malformed wikidata IDs', () => {
    const placeDetails = { features: [{ properties: { wiki_and_media: { wikidata: 'not-a-q-id' } } }] };
    assert.deepEqual(extractGoodToKnow(placeDetails), {});
  });
});
