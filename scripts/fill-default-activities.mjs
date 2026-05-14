#!/usr/bin/env node
/**
 * Light-pass enrichment: ensure EVERY POI in src/assets/pois.json has an
 * `activities[]` array, even if the curator hasn't written hand-crafted cards.
 *
 * Default sets are keyed by category and reuse the POI's own name in the
 * activity title so the result reads naturally (e.g., "Visit Smederevo Fortress").
 *
 * Idempotent: only fills POIs that have no activities yet — never overwrites
 * the hand-curated ones produced by seed-poi-content.mjs. Run this AFTER the
 * seed script so the marquee POIs win.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function b(en, sr_lat) { return { en, sr_lat, sr_cyr: '', tr: '' }; }
function act({ titleEn, titleSr, summaryEn, summarySr, icon, durationMin, budget, intensity }) {
  return {
    title: b(titleEn, titleSr),
    summary: b(summaryEn, summarySr),
    icon, durationMin, budget, intensity,
  };
}

/** Returns 2-3 default activities for a POI given its name + category. */
function defaultsFor(poi) {
  const nameEn = poi.name?.en ?? poi.id;
  const nameSr = poi.name?.sr_lat ?? nameEn;

  switch (poi.category) {
    case 'sight':
      return [
        act({
          titleEn: `Walk the grounds of ${nameEn}`,
          titleSr: `Šetnja kroz ${nameSr}`,
          summaryEn: 'Take in the building exterior, surrounding square and any free-to-enter spaces.',
          summarySr: 'Pogledajte spoljašnjost, okolni trg i delove dostupne posetiocima.',
          icon: 'directions_walk', durationMin: 30, budget: 'free', intensity: 'easy',
        }),
        act({
          titleEn: 'Take a landmark photo',
          titleSr: 'Fotografišite znamenitost',
          summaryEn: 'Find the postcard angle — usually from across the square or under the main facade.',
          summarySr: 'Pronađite najbolji ugao — obično s trga ili ispred glavne fasade.',
          icon: 'photo_camera', durationMin: 10, budget: 'free', intensity: 'easy',
        }),
      ];

    case 'cuisine':
      return [
        act({
          titleEn: `Order the house specialty at ${nameEn}`,
          titleSr: `Naručite specijalitet kuće u ${nameSr}`,
          summaryEn: 'Ask the waiter what the kitchen is known for — usually the safest bet.',
          summarySr: 'Pitajte konobara šta kuhinja najbolje radi — najsigurniji izbor.',
          icon: 'restaurant', durationMin: 75, budget: 'mid', intensity: 'easy',
        }),
        act({
          titleEn: 'Pair with a local rakija',
          titleSr: 'Uz domaću rakiju',
          summaryEn: 'Plum, quince or apricot — small pour before the meal, never with the main.',
          summarySr: 'Šljiva, dunja ili kajsija — mala čaša pre jela, ne uz glavni meni.',
          icon: 'local_bar', durationMin: 15, budget: 'low', intensity: 'easy',
        }),
      ];

    case 'cafe':
      return [
        act({
          titleEn: `Slow coffee at ${nameEn}`,
          titleSr: `Lagana kafa u ${nameSr}`,
          summaryEn: 'Belgrade café culture is unhurried — sit, watch the street, refills are common.',
          summarySr: 'Beogradska kafana je opuštena — sedite, gledajte ulicu, dolivanje je uobičajeno.',
          icon: 'local_cafe', durationMin: 45, budget: 'low', intensity: 'easy',
        }),
        act({
          titleEn: 'Try a Serbian breakfast',
          titleSr: 'Srpski doručak',
          summaryEn: 'Eggs, kajmak, prosciutto and warm bread — most cafés serve until 12:00.',
          summarySr: 'Jaja, kajmak, pršuta i topli hleb — većina kafića servira do 12h.',
          icon: 'brunch_dining', durationMin: 60, budget: 'low', intensity: 'easy',
        }),
      ];

    case 'nightlife':
      return [
        act({
          titleEn: `Late-night session at ${nameEn}`,
          titleSr: `Noćni izlazak u ${nameSr}`,
          summaryEn: 'Doors usually 22:00; the crowd arrives after midnight — pace yourself.',
          summarySr: 'Vrata oko 22h; gužva posle ponoći — krećite polako.',
          icon: 'nightlife', durationMin: 180, budget: 'mid', intensity: 'active',
        }),
        act({
          titleEn: 'Check the DJ schedule',
          titleSr: 'Pogledajte raspored DJ-eva',
          summaryEn: 'Different rooms / nights vary widely — Instagram is the authoritative source.',
          summarySr: 'Sale i večeri se razlikuju — Instagram je glavni izvor.',
          icon: 'queue_music', durationMin: 10, budget: 'free', intensity: 'easy',
        }),
      ];

    case 'museum':
      return [
        act({
          titleEn: `Self-guided visit to ${nameEn}`,
          titleSr: `Samostalni obilazak ${nameSr}`,
          summaryEn: 'Allow about 90 minutes; signage is bilingual in most museums.',
          summarySr: 'Računajte oko 90 minuta; većina muzeja ima dvojezičnu signalizaciju.',
          icon: 'museum', durationMin: 90, budget: 'low', intensity: 'easy',
        }),
        act({
          titleEn: 'Catch a temporary exhibit',
          titleSr: 'Privremena izložba',
          summaryEn: 'Worth checking — Belgrade museums rotate guest collections every few months.',
          summarySr: 'Vredi proveriti — beogradski muzeji rotiraju izložbe svakih nekoliko meseci.',
          icon: 'palette', durationMin: 45, budget: 'low', intensity: 'easy',
        }),
      ];

    case 'viewpoint':
      return [
        act({
          titleEn: `Sunset at ${nameEn}`,
          titleSr: `Zalazak na ${nameSr}`,
          summaryEn: 'Arrive 30–45 min before the golden hour for the best light.',
          summarySr: 'Stignite 30–45 min pre zlatnog sata — najbolja svetla.',
          icon: 'wb_twilight', durationMin: 45, budget: 'free', intensity: 'easy',
        }),
        act({
          titleEn: 'Wide-angle photo from the parapet',
          titleSr: 'Širokougaona fotka sa ograde',
          summaryEn: 'Bring a wide lens or use the phone\'s 0.5× — the panorama is too big for standard.',
          summarySr: 'Ponesite širokougaoni objektiv ili koristite 0,5× — panorama je preširoka za standardni.',
          icon: 'photo_camera', durationMin: 15, budget: 'free', intensity: 'easy',
        }),
      ];

    case 'park':
      return [
        act({
          titleEn: `Walk a loop in ${nameEn}`,
          titleSr: `Krug kroz ${nameSr}`,
          summaryEn: 'Belgrade parks are unfenced — wander any path; benches are everywhere.',
          summarySr: 'Beogradski parkovi nisu ograđeni — lutajte stazama; klupa ima posvuda.',
          icon: 'park', durationMin: 60, budget: 'free', intensity: 'moderate',
        }),
        act({
          titleEn: 'Picnic with bakery food',
          titleSr: 'Piknik s pekarskim zalogajima',
          summaryEn: 'Grab burek, pita and yoghurt from a nearby pekara — under 5 € for two.',
          summarySr: 'Burek, pita, jogurt iz obližnje pekare — manje od 5 € za dvoje.',
          icon: 'bakery_dining', durationMin: 45, budget: 'low', intensity: 'easy',
        }),
      ];

    default:
      return [
        act({
          titleEn: `Visit ${nameEn}`,
          titleSr: `Poseta — ${nameSr}`,
          summaryEn: 'See what makes this place worth the detour.',
          summarySr: 'Pogledajte zašto vredi obilazak.',
          icon: 'place', durationMin: 30, budget: 'free', intensity: 'easy',
        }),
      ];
  }
}

const path = resolve('src/assets/pois.json');
const list = JSON.parse(readFileSync(path, 'utf8'));

let filled = 0, skipped = 0;
for (const poi of list) {
  if (Array.isArray(poi.activities) && poi.activities.length > 0) {
    skipped++;
    continue;
  }
  poi.activities = defaultsFor(poi);
  filled++;
}

writeFileSync(path, JSON.stringify(list, null, 2) + '\n');
console.log(`filled defaults for ${filled} POIs (skipped ${skipped} that already had activities)`);
