export type Category = 'sight' | 'cuisine' | 'nightlife' | 'cafe' | 'museum' | 'viewpoint' | 'park';

export type Locale = 'en' | 'sr' | 'tr';
export type Script = 'Latn' | 'Cyrl';

/** Localized content. sr_cyr is auto-transliterated from sr_lat at build time.
 * tr is auto-drafted from en at build time and curated later. */
export interface Bilingual {
  en: string;
  sr_lat: string;
  sr_cyr: string;
  tr: string;
}

/** Per-locale translation provenance. `en` is source-of-truth and `sr_cyr` is
 * mechanically transliterated from `sr_lat`, so only `sr` (Latin) and `tr`
 * carry a curator/auto-draft state. */
export type TranslationStatus = 'auto-draft' | 'curator';

/** Audit trail. Tells curators which translations / sources are draft vs reviewed. */
export interface ProvenanceMeta {
  translatedBy: { sr: TranslationStatus; tr: TranslationStatus };
  lastReviewedAt: string;
}

export interface OpeningHours {
  /** OSM opening_hours grammar — the canonical form. Parsed at runtime by HoursService. */
  raw: string;
  notes?: Bilingual;
}

export interface ImageAsset {
  src: string;
  width: number;
  height: number;
  /** Base64-inlined 8x8 JPEG, ~150 bytes. Renders instantly while the real image loads. */
  lqip: string;
  credit: string;
  license: string;
  source?: string;
}

export type SourceRef =
  | { kind: 'wikipedia'; url: string; lang: 'en' | 'sr' }
  | { kind: 'osm'; ref: string }
  | { kind: 'official'; url: string; org: string }
  | { kind: 'google-places'; placeId: string; reviewCount: number; rating: number; checkedAt: string }
  | { kind: 'tripadvisor'; url: string; reviewCount: number; rating: number; checkedAt: string };

export interface ReliabilityScore {
  /** 0..100, transparency only — never a publish gate. */
  score: number;
  checks: {
    wikipedia: boolean;
    osm: boolean;
    official: boolean;
    crowdsourced: boolean;
  };
}

export interface TransitInfo {
  mode: 'soko' | 'regional-train' | 'suburban-train' | 'intercity-bus' | 'city-bus';
  fromStation: Bilingual;
  toStation: Bilingual;
  durationMinutes: number;
  /** Local-time HH:MM departure list, weekday/typical. */
  departures: string[];
  weekendDepartures?: string[];
  validity: { from: string; to: string };
  lastReturnLocal?: string;
  fareRSD: { min: number; max: number };
  bookingUrl?: string;
  notes?: Bilingual;
}

export type BudgetTier = 'free' | 'low' | 'mid' | 'high';
export type Intensity = 'easy' | 'moderate' | 'active';

export interface PoiActivity {
  /** Action verb + object: "Walk the ramparts", "Order Moskva šnit", "Descend to the crypt". */
  title: Bilingual;
  /** Material symbol name (e.g., 'directions_walk', 'restaurant'). */
  icon: string;
  /** Typical time commitment in minutes — used for the duration pill. */
  durationMin: number;
  /** Free | low (<10 €) | mid (10–30 €) | high (>30 €) — renders as a 4-dot bar. */
  budget: BudgetTier;
  /** Physical effort: easy (sit / stroll), moderate (stairs / 30+ min walk), active (climb / 1h+). */
  intensity: Intensity;
  /** One short line of what to expect: what you'll do, see, taste. */
  summary: Bilingual;
}

export interface POI {
  id: string;
  region: 'city' | 'metro' | 'day-trip';
  category: Category;
  name: Bilingual;
  description: Bilingual;
  address: Bilingual;
  lng: number;
  lat: number;
  hours?: OpeningHours;
  pricing?: { tier: '€' | '€€' | '€€€'; rsd?: { min: number; max: number } };
  tags: string[];
  images: ImageAsset[];
  /** 3–5 concrete, factual nuggets that signal why this place matters. Surfaces as photo-led cards. */
  highlights?: Bilingual[];
  /** Pros/cons pair to set honest expectations before a visit. */
  whatToExpect?: { pros: Bilingual[]; cons: Bilingual[] };
  /** 1–3 practical visit tips (best time, sneaky entrance, dress code, etc.). */
  tips?: Bilingual[];
  /** Short verifiable background paragraph — only present where the curator was confident. */
  history?: Bilingual;
  /** Concrete things to DO at this POI. Surfaces as photo-led cards with time + budget + intensity hints. */
  activities?: PoiActivity[];
  transit?: TransitInfo[];
  verifiedAt: string;
  /** Optional Wikipedia article title (English unless overridden by lang field elsewhere). */
  wikipediaTitle?: string;
  /** Optional OSM ref like 'relation/8645819' or 'way/123'. */
  osmRef?: string;
  sources: SourceRef[];
  reliability: ReliabilityScore;
  editorialConfidence: 'high' | 'medium' | 'low';
  provenance: ProvenanceMeta;
}

export interface ItineraryStop {
  poiId: string;
  arrivalOffsetMinutes: number;
  durationMinutes: number;
  notes?: Bilingual;
}

export interface Itinerary {
  id: string;
  /** 'city' renders on /routes (in-Belgrade walks); 'day-trip' on /trips (full-day excursions outside Belgrade). */
  kind: 'city' | 'day-trip';
  title: Bilingual;
  subtitle: Bilingual;
  durationMinutes: number;
  vibe: string[];
  stops: ItineraryStop[];
  geometryUrl?: string;
  elevationProfileUrl?: string;
  bestStartHourLocal?: number;
  /** Public-transport / driving guidance for non-walking legs of the route. */
  gettingThere?: Bilingual;
  provenance: ProvenanceMeta;
}

export interface UserPosition {
  lng: number;
  lat: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface SavedPlace {
  poiId: string;
  savedAt: number;
  note?: string;
}

export interface ItineraryProgress {
  itineraryId: string;
  startedAt: number;
  reachedStopIds: string[];
  lastUpdatedAt: number;
}
