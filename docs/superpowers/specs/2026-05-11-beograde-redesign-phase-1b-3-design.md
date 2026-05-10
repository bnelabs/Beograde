---
title: Beograde redesign — Phase 1b.3 (image consumer in UI + multi-source curator)
date: 2026-05-11
phase: 1b.3
status: ready-for-plan
---

# Phase 1b.3 — image consumer in UI + multi-source curator

## Goal

Make the 46 curated AVIFs visible in the UI, and extend the image pipeline so
non-Commons sources are first-class — then run it against the 4 city Tier B
cafes to close as much of that gap as primary-source licenses allow.

## Why this slice, and not the others

Phase 1b master design lists six remaining 1b items: image UI consumer (deferred
from 1b.2), Trips/day-trip detail UI, five remaining charts, editorial story
cards, first-run polish, map style refresh. Three reasons to take only the
image consumer in this phase:

1. **Existing data sits dormant.** 46 POIs ship `ImageAsset[]` entries today;
   zero are rendered. This is the highest-visibility improvement per unit of
   risk in the entire 1b list.
2. **The multi-source curator naturally lives in the same PR.** Extending the
   pipeline schema while we're already touching the curator surface keeps the
   churn in one reviewable unit.
3. **Trips UI and charts each have their own surface area** that deserves a
   focused phase. Bundling them here would re-create the Phase-1 sprawl the
   redesign explicitly broke up.

## Scope

**In scope:**

- POI detail hero renders the curated image with LQIP blur-up, `srcset`, credit
  + license caption.
- Home "Open now" tile thumbnails switch from category icons to the curated
  image (with icon fallback for the 4 Tier B cafes if they end up still
  imageless).
- Home "Today's pick" hero card switches from gradient to itinerary cover
  image (cover image = lead POI's hero image).
- Image pipeline supports a `sourceType` field on curator JSON:
  `"commons"` (today's default, inferred when absent) and `"direct-url"`
  (fetches a given URL with explicit license + credit).
- Multi-source curator is run against the 4 cafes. The deliverable reports
  outcomes honestly: M of 4 found CC-licensed coverage, the remainder
  documented as "no free-licensed photography located" with the queries
  attempted.

**Out of scope (deferred to 1b.4+):**

- Trips tab UI / day-trip detail / itinerary cards for day-trips.
- Five remaining charts.
- Editorial story cards on Home.
- First-run onboarding polish.
- Map style refresh.
- Image gallery (multiple images per POI). The data model already supports
  `ImageAsset[]`; we just only render the first entry.
- Lazy-loading library or CDN tier. Native `loading="lazy"` is the whole story
  for this phase.

## Decision 1 — srcset by naming convention, not data

Each curated POI has three AVIFs on disk: `-640.avif`, `-1024.avif`,
`-1600.avif`. `ImageAsset.src` currently points at the 1024 variant. Two
options:

- **A. Derive other widths by string substitution** in the consumer:
  `src.replace('-1024.', '-640.')` etc. Pipeline contract: widths are always
  640/1024/1600 with that exact suffix.
- **B. Extend `ImageAsset` to carry `srcset: Array<{src, width}>`.** Honest in
  the data, but means a `pois.compiled.json` migration plus
  `build-images --force` for all 46 POIs (~2 min with the throttle).

**Decision: A.** Reasons: the naming contract is already enforced in
`writeAvifSet`; option A involves zero data migration and zero diff churn on
the 46 curator files; the substitution is one line in a shared helper. We
encode the contract in a small typed helper (`buildSrcset(asset)`) so the
substitution lives in one place and is unit-tested. If we ever want non-uniform
widths per POI, we migrate to B then. YAGNI for now.

## Decision 2 — LQIP blur-up: CSS `background-image`, not a separate `<img>`

Two render strategies for the blur-up:

- Render an `<img>` for the LQIP, then swap to the real `<img>` on load.
- Set the LQIP as `background-image` on the hero container; the real `<img>`
  paints on top once `onload` fires.

**Decision: background-image.** It eliminates layout jitter (the container
already has its aspect ratio set), avoids managing two `<img>` lifecycles,
and the LQIP data URI is ~150 bytes — small enough to inline in HTML without
caching concerns. The real `<img>` uses `decoding="async"` and `loading="lazy"`
(except for the above-the-fold POI detail hero, which is eager).

## Decision 3 — Aspect ratio: container locks ratio, image uses `object-fit: cover`

Curated AVIFs span a range of aspect ratios (e.g.,
`kalemegdan-1024.avif` is 1024×615 ≈ 1.66:1, not 16:9). Options:

- Drop the hero card's `aspect-ratio: 16/9` lock to honor per-image ratios.
- Keep the lock and `object-fit: cover` the image (some cropping).

**Decision: keep the lock, `object-fit: cover`.** The current layout depends on
a predictable hero height; ad-hoc per-image ratios would cascade into list
alignment work. Most curated images are buildings/landscapes where centered
cropping is safe (no faces near the frame edges). For POI detail hero, the
same `object-fit: cover` rule applies — `object-position: center 40%` biases
crops toward sky-heavy compositions where the subject is in the upper half.

## Decision 4 — Multi-source curator: schema extension, not a separate pipeline

Today a curator file looks like:

```json
{
  "images": [
    { "commonsFile": "File:Foo.jpg", "credit": "...", "license": "CC BY-SA 4.0",
      "source": "https://commons.wikimedia.org/wiki/File:Foo.jpg" }
  ],
  "fetchedAt": "2026-05-11"
}
```

We extend to support an alternative input variant:

```json
{
  "images": [
    { "sourceType": "direct-url",
      "fetchUrl": "https://live.staticflickr.com/.../foo_b.jpg",
      "credit": "Alice (alicephotos), CC BY 2.0, via Flickr",
      "license": "CC BY 2.0",
      "source": "https://www.flickr.com/photos/alicephotos/123/" }
  ],
  "fetchedAt": "2026-05-11"
}
```

Rules:

- `sourceType: "commons"` is the default when absent. Existing 46 curator files
  remain valid without edits.
- When `sourceType: "direct-url"`, `fetchUrl` is required; `commonsFile` MUST
  be absent. The fetcher hits `fetchUrl` directly with the same
  `COMMONS_USER_AGENT` (already a descriptive UA) and no MediaWiki round-trip.
- The accepted-license whitelist is unchanged
  (CC0 / CC BY 2-4 / CC BY-SA 2-4 / Public domain). A direct-url entry with a
  non-whitelisted license is rejected at build time.
- The slug used for the on-disk filename derives from POI id + a short hash of
  the source URL — no `File:` prefix to strip.
- The build-images skip-if-fresh path keys on the on-disk AVIFs and the
  curator file mtime; sourceType is transparent to that check.

This is a strictly additive change. The 46 existing curator files do not need
to be touched.

## Decision 5 — Cafe gap: honest reporting

Run the multi-source curator against the 4 cafes (smokvica, magistrala,
supermarket-dorcol, drugstore). Realistic expectation: CC-licensed photography
for specific modern Belgrade hospitality venues is rare, so the result may be
0–2 of 4. The acceptance gate is **"capability shipped, capability attempted,
outcomes documented"** — not "all 50 POIs have images."

Each cafe that ends up still imageless gets a line in the PR description:
the queries that were attempted (Flickr CC search, Pexels, Unsplash with
attribution, venue's own press page) and why no source was usable. The UI
already gracefully handles missing images (category-icon thumb on Home,
gradient hero on POI detail).

## Architecture

```
ImageAsset[]                   types.ts (unchanged data shape)
       │
       ▼
buildSrcset(asset) ──► <picture> srcset                shared helper (new)
       │
       ▼
<app-image>                                            UI component (new)
   ├─ POI detail hero (eager)
   ├─ Home "Today's pick" hero card (eager)
   └─ Home "Open now" tile thumb (lazy)

scripts/lib/build-images-core.mjs
   ├─ fetchCommonsFile()      existing
   ├─ fetchDirectUrl()        new
   └─ resolveSource(curator)  dispatches on sourceType
```

`<app-image>` accepts `[asset]: ImageAsset | undefined`, `[alt]: string`,
`[eager]: boolean = false`, `[ratio]: '16/9' | '4/3' | '1/1' = '16/9'`. When
asset is undefined, it renders a category-icon fallback (controlled by an
optional `[fallbackIcon]: string` input). Credit caption is always rendered
when an asset is present (subtle, bottom-right, expandable on tap for full
license string).

## Acceptance criteria

1. POI detail hero renders the curated image for all 46 POIs with images.
   The 4 cafes that remain imageless fall back to the current gradient hero
   without layout shift.
2. Home "Open now" tiles render image thumbs for POIs that have images;
   category-icon fallback for the rest. Visible blur-up on slow networks
   (verified by manual throttle in DevTools).
3. Home "Today's pick" hero card renders the lead POI's image as the
   background; gradient remains the fallback.
4. `npm run build:images` accepts the new `sourceType: "direct-url"` schema
   and produces working AVIFs from a non-Commons URL. Covered by a unit test
   that exercises the new path with a fixture fetch.
5. The 4 cafes have been run through the curator pipeline. Each cafe either
   has images shipped (with credit + license in `ImageAsset`) OR has a
   one-line PR-description entry documenting which sources were searched and
   why none were usable.
6. Lighthouse Performance for `/poi/kalemegdan` on simulated 4G does not
   regress more than 5 points vs the pre-1b.3 baseline (capture before
   landing the first image-consumer commit).
7. All existing tests pass. New tests (srcset helper, app-image consumer,
   multi-source fetcher) bring the script test count and Vitest test count up
   together; numbers logged in the PR body.

## Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Cumulative AVIF download cost hurts initial load | Medium | Home above-the-fold renders 1 hero + ~3 tile thumbs. Lazy-load all below-the-fold thumbs. Lighthouse gate (criterion 6) is the catch. |
| Direct-URL fetch hits a 404 or auth wall at build time | Low | `runBuildImages` already aborts the entry on fetch failure; existing failure mode covers this. Curator files committed only after a successful local run. |
| Non-Commons license terms (Flickr CC BY 2.0, etc.) require specific attribution wording | Medium | License-whitelist enforcement is build-time; the credit string is curator-authored, so it includes the platform-specific attribution form. Spot-check during curator authoring. |
| `object-fit: cover` crops a face badly | Low | None of the 46 city/day-trip POIs have people as the subject. The 4 cafes, if they end up with images, are interior shots — review crops manually before commit. |
| Image consumer regresses on iOS Safari LQIP-base64 handling | Low | LQIP is JPEG (already shipped). Test on real iOS once before merge. |

## Out of scope, explicitly

- **Image galleries.** `ImageAsset[]` is rendered as `images[0]` only.
- **CDN / image-CDN routing.** AVIFs are served from `/assets/poi/` like today.
- **WebP fallback.** AVIFs are the only format; iOS 16+ is the floor.
- **Editing UI / "report a wrong image" flow.** Belongs to a later content-ops
  phase.

## Done definition

PR merged to main with:

- The runtime UI rendering curated images on POI detail, Home tiles, Home
  hero card.
- The build pipeline accepting non-Commons curator entries, exercised by a
  unit test and a real run against the 4 cafes.
- A PR body documenting the per-cafe outcome.
- No Lighthouse regression beyond the 5-point band on `/poi/kalemegdan`.
- All script + Vitest tests green.
