import { Itinerary } from './types';

export const ITINERARIES: Itinerary[] = [
  {
    id: 'history-walk',
    title: 'Old Belgrade in Half a Day',
    subtitle: 'Fortress, kafanas, and the cobbles in between.',
    durationMinutes: 240,
    vibe: ['history', 'walking', 'first-time'],
    geometryUrl: 'assets/itineraries/history-walk.geojson',
    stops: [
      { poiId: 'kalemegdan', arrivalOffsetMinutes: 0, durationMinutes: 60, notes: 'Start at the upper town. Find the Victor monument.' },
      { poiId: 'bajrakli-mosque', arrivalOffsetMinutes: 70, durationMinutes: 15 },
      { poiId: 'princess-ljubica', arrivalOffsetMinutes: 95, durationMinutes: 30 },
      { poiId: 'kafana-question-mark', arrivalOffsetMinutes: 130, durationMinutes: 45, notes: 'Ćevapi and a half-litre of beer.' },
      { poiId: 'knez-mihailova', arrivalOffsetMinutes: 180, durationMinutes: 30 },
      { poiId: 'republic-square', arrivalOffsetMinutes: 215, durationMinutes: 25 },
    ],
  },
  {
    id: 'foodie-crawl',
    title: 'Foodie Crawl Through Dorćol',
    subtitle: 'Coffee, brunch, kafana, cake, late drinks.',
    durationMinutes: 480,
    vibe: ['foodie', 'walking', 'evening'],
    geometryUrl: 'assets/itineraries/foodie-crawl.geojson',
    stops: [
      { poiId: 'magistrala', arrivalOffsetMinutes: 0, durationMinutes: 30, notes: 'Flat white to start.' },
      { poiId: 'supermarket-dorcol', arrivalOffsetMinutes: 45, durationMinutes: 75, notes: 'Late brunch in the courtyard.' },
      { poiId: 'smokvica', arrivalOffsetMinutes: 150, durationMinutes: 45 },
      { poiId: 'hotel-moskva', arrivalOffsetMinutes: 240, durationMinutes: 45, notes: 'Moskva Šnit and a coffee.' },
      { poiId: 'skadarlija', arrivalOffsetMinutes: 320, durationMinutes: 90, notes: 'Kafana dinner with live tamburica.' },
      { poiId: 'cetinjska', arrivalOffsetMinutes: 420, durationMinutes: 60, notes: 'Last drink in the courtyard.' },
    ],
  },
  {
    id: 'riverside-splavovi',
    title: 'Riverside Sunset to Splavovi',
    subtitle: 'Walk the Sava, eat by the water, dance on it.',
    durationMinutes: 360,
    vibe: ['nightlife', 'summer', 'date'],
    geometryUrl: 'assets/itineraries/riverside-splavovi.geojson',
    stops: [
      { poiId: 'belgrade-waterfront', arrivalOffsetMinutes: 0, durationMinutes: 45 },
      { poiId: 'brankov-most', arrivalOffsetMinutes: 50, durationMinutes: 20, notes: 'Sunset shot from the bridge.' },
      { poiId: 'beton-hala', arrivalOffsetMinutes: 80, durationMinutes: 120, notes: 'Long dinner, watch the lights come on.' },
      { poiId: 'savamala', arrivalOffsetMinutes: 210, durationMinutes: 60, notes: 'Pre-game drinks in a gallery bar.' },
      { poiId: 'splavovi', arrivalOffsetMinutes: 280, durationMinutes: 80, notes: 'Pick a splav by the music spilling out.' },
    ],
  },
  {
    id: 'family-day',
    title: 'Family Day Outdoors',
    subtitle: 'Big space, small queues, ice cream stops.',
    durationMinutes: 360,
    vibe: ['family', 'kids', 'outdoor'],
    geometryUrl: 'assets/itineraries/family-day.geojson',
    stops: [
      { poiId: 'kalemegdan', arrivalOffsetMinutes: 0, durationMinutes: 90 },
      { poiId: 'zoo-belgrade', arrivalOffsetMinutes: 95, durationMinutes: 90 },
      { poiId: 'knez-mihailova', arrivalOffsetMinutes: 195, durationMinutes: 45, notes: 'Ice cream and a street performer.' },
      { poiId: 'tasmajdan-park', arrivalOffsetMinutes: 250, durationMinutes: 60 },
      { poiId: 'tesla-museum', arrivalOffsetMinutes: 320, durationMinutes: 40, notes: 'Time the coil demo.' },
    ],
  },
  {
    id: 'rainy-day',
    title: 'Rainy Day Indoors',
    subtitle: 'Two great museums, two great cafés, no umbrella drama.',
    durationMinutes: 300,
    vibe: ['rainy', 'museums', 'indoor'],
    geometryUrl: 'assets/itineraries/rainy-day.geojson',
    stops: [
      { poiId: 'national-museum', arrivalOffsetMinutes: 0, durationMinutes: 90 },
      { poiId: 'hotel-moskva', arrivalOffsetMinutes: 100, durationMinutes: 45 },
      { poiId: 'tesla-museum', arrivalOffsetMinutes: 160, durationMinutes: 60 },
      { poiId: 'manaks-house', arrivalOffsetMinutes: 230, durationMinutes: 35 },
      { poiId: 'smokvica', arrivalOffsetMinutes: 270, durationMinutes: 30 },
    ],
  },
  {
    id: 'viewpoint-sunset',
    title: 'Three Viewpoints, One Sunset',
    subtitle: 'Catch Belgrade from above, water-level, and across the Sava.',
    durationMinutes: 240,
    vibe: ['viewpoint', 'sunset', 'photography'],
    geometryUrl: 'assets/itineraries/viewpoint-sunset.geojson',
    stops: [
      { poiId: 'kalemegdan', arrivalOffsetMinutes: 0, durationMinutes: 60, notes: 'Upper-town walls, golden hour.' },
      { poiId: 'brankov-most', arrivalOffsetMinutes: 70, durationMinutes: 30 },
      { poiId: 'zemun-quay', arrivalOffsetMinutes: 110, durationMinutes: 60 },
      { poiId: 'gardos-tower', arrivalOffsetMinutes: 175, durationMinutes: 50, notes: 'Climb for the final viewpoint.' },
    ],
  },
];

export const ITINERARY_BY_ID = new Map<string, Itinerary>(
  ITINERARIES.map((i) => [i.id, i]),
);

export function getItinerary(id: string): Itinerary | undefined {
  return ITINERARY_BY_ID.get(id);
}
