import {
  POI, Itinerary, ItineraryStop, TransitInfo, OpeningHours,
  ImageAsset, ReliabilityScore, Bilingual,
} from './types';

describe('types', () => {
  it('POI carries bilingual fields, optional transit, provenance', () => {
    const bg: Bilingual = { en: 'a', sr_lat: 'a', sr_cyr: 'a' };
    const poi: POI = {
      id: 'x',
      region: 'city',
      category: 'cafe',
      name: bg,
      description: bg,
      address: bg,
      lng: 0,
      lat: 0,
      tags: [],
      images: [],
      verifiedAt: '2026-05-04',
      sources: [],
      reliability: {
        score: 0,
        checks: { wikipedia: false, osm: false, official: false, crowdsourced: false },
      },
      editorialConfidence: 'medium',
      provenance: { translatedBy: 'auto-draft' as const, lastReviewedAt: '2026-05-04' },
    };
    expect(poi.id).toBe('x');
  });

  it('Itinerary has bilingual title/subtitle and stops', () => {
    const bg: Bilingual = { en: 't', sr_lat: 't', sr_cyr: 't' };
    const stop: ItineraryStop = { poiId: 'x', arrivalOffsetMinutes: 0, durationMinutes: 30 };
    const it: Itinerary = {
      id: 'i',
      title: bg,
      subtitle: bg,
      durationMinutes: 60,
      vibe: [],
      stops: [stop],
      geometryUrl: '',
      provenance: { translatedBy: 'auto-draft' as const, lastReviewedAt: '2026-05-04' },
    };
    expect(it.stops).toHaveLength(1);
  });

  it('TransitInfo carries departures and validity', () => {
    const bg: Bilingual = { en: 's', sr_lat: 's', sr_cyr: 's' };
    const t: TransitInfo = {
      mode: 'soko',
      fromStation: bg,
      toStation: bg,
      durationMinutes: 36,
      departures: ['06:25', '14:25'],
      validity: { from: '2026-04-01', to: '2026-10-31' },
      fareRSD: { min: 290, max: 290 },
    };
    expect(t.departures).toEqual(['06:25', '14:25']);
  });

  it('OpeningHours carries raw OSM grammar', () => {
    const h: OpeningHours = { raw: 'Tu-Su 10:00-18:00' };
    expect(h.raw).toContain('Tu-Su');
  });

  it('ImageAsset carries lqip + license', () => {
    const img: ImageAsset = {
      src: 'a',
      width: 100,
      height: 100,
      lqip: 'data:image/jpeg;base64,...',
      credit: 'me',
      license: 'CC BY 4.0',
    };
    expect(img.license).toBe('CC BY 4.0');
  });

  it('ReliabilityScore matches the four-check model', () => {
    const r: ReliabilityScore = {
      score: 75,
      checks: { wikipedia: true, osm: true, official: true, crowdsourced: false },
    };
    expect(r.score).toBe(75);
  });
});
