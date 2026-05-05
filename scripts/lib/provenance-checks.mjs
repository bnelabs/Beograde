// Pure provenance check helpers. All external calls (fetch) are
// dependency-injected so the module is fully testable without network.

const MIN_EXTRACT_CHARS = 400;

export async function checkWikipedia(title, lang, fetchFn = globalThis.fetch) {
  if (!title) return { pass: false };
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  // Wikimedia REST returns single-page summary; we use it because it's quotaless.
  const res = await fetchFn(url, {
    headers: { 'user-agent': 'Beograde build-provenance (https://beograde.app)' },
  });
  if (!res.ok) return { pass: false };
  const json = await res.json();
  const page = json;
  const extract = page.extract ?? '';
  if (extract.length < MIN_EXTRACT_CHARS) return { pass: false };
  return {
    pass: true,
    url: page.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  };
}

const OVERPASS = 'https://overpass-api.de/api/interpreter';

export async function checkOSM(ref, fetchFn = globalThis.fetch) {
  if (!ref) return { pass: false };
  const [type, id] = ref.split('/');
  if (!['node', 'way', 'relation'].includes(type) || !id) return { pass: false };
  const query = `[out:json][timeout:15]; ${type}(${id}); out tags;`;
  const res = await fetchFn(OVERPASS, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) return { pass: false };
  const json = await res.json();
  const el = json.elements?.[0];
  if (!el?.tags?.name) return { pass: false };
  return { pass: true, ref };
}

const GOOGLE_REVIEW_THRESHOLD = 500;
const TRIPADVISOR_REVIEW_THRESHOLD = 200;

export function checkOfficial(sources) {
  const hit = sources.find((s) => s.kind === 'official');
  return hit ? { pass: true, url: hit.url, org: hit.org } : { pass: false };
}

export function checkCrowdsourced(sources) {
  const g = sources.find((s) => s.kind === 'google-places');
  const t = sources.find((s) => s.kind === 'tripadvisor');
  if (g && g.reviewCount >= GOOGLE_REVIEW_THRESHOLD) return { pass: true };
  if (t && t.reviewCount >= TRIPADVISOR_REVIEW_THRESHOLD) return { pass: true };
  return { pass: false };
}

export function score(checks) {
  return Object.values(checks).filter(Boolean).length * 25;
}

export function isPublishable({ checks, editorialConfidence }) {
  return checks.wikipedia || checks.osm || checks.official || editorialConfidence === 'high';
}
