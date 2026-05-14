# Phase 1b.3 — Image consumer in UI + multi-source curator (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the 46 curated AVIFs in the UI (POI detail hero, Home tile thumbs, Home "Today's pick" hero), extend the build-images pipeline so non-Commons sources are first-class, and run it against the 4 city Tier B cafes.

**Architecture:** A small typed helper (`buildSrcset`) derives 640/1024/1600 URLs from the `-1024.avif` path by string substitution — no data migration. A reusable `<app-image>` component wraps `ImageAsset` with LQIP background, `srcset`, eager/lazy modes, and an icon fallback for the imageless. The build-images pipeline gains a `sourceType: "direct-url"` curator schema that bypasses MediaWiki and fetches arbitrary URLs (Flickr CC / venue press / Pexels-style) with a curator-authored license + credit.

**Tech Stack:** Angular 17 standalone components, signals, `<picture>` + `srcset`, `sharp` for AVIF (existing), `<img loading="lazy" decoding="async">` native lazy-loading, vitest + node:test for unit coverage.

**Spec:** `docs/superpowers/specs/2026-05-11-beograde-redesign-phase-1b-3-design.md`.

---

## Task summary

| # | Task | Files (rough) |
|---|---|---|
| 1 | `buildSrcset` helper + tests | `src/app/data/image-srcset.ts` + spec |
| 2 | `<app-image>` component + tests | `src/app/ui/app-image/*` + spec |
| 3 | Wire POI detail hero | `src/app/features/poi-detail/*` |
| 4 | Wire Home tile thumbs | `src/app/features/home/*` |
| 5 | Wire Home "Today's pick" hero | `src/app/features/home/*` |
| 6 | Pipeline: `direct-url` sourceType | `scripts/lib/build-images-core.mjs` + test |
| 7 | Run multi-source curator on 4 cafes | curator JSONs + pipeline run |
| 8 | Final verification + PR + merge | (no new code) |

---

### Task 1: `buildSrcset` helper

**Files:**
- Create: `src/app/data/image-srcset.ts`
- Create: `src/app/data/image-srcset.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { buildSrcset, fallbackSizes } from './image-srcset';
import type { ImageAsset } from './types';

describe('buildSrcset', () => {
  const asset: ImageAsset = {
    src: '/assets/poi/kalemegdan/kalemegdan-belgrade-fortress-1024.avif',
    width: 1024, height: 615,
    lqip: 'data:image/jpeg;base64,abc',
    credit: 'X', license: 'CC BY-SA 4.0', source: 'https://x',
  };

  it('emits 640/1024/1600 widths derived from the -1024 src', () => {
    expect(buildSrcset(asset)).toBe(
      '/assets/poi/kalemegdan/kalemegdan-belgrade-fortress-640.avif 640w, ' +
      '/assets/poi/kalemegdan/kalemegdan-belgrade-fortress-1024.avif 1024w, ' +
      '/assets/poi/kalemegdan/kalemegdan-belgrade-fortress-1600.avif 1600w'
    );
  });

  it('returns just the original src when -1024 marker is not found', () => {
    const odd = { ...asset, src: '/assets/poi/foo/foo-800.avif', width: 800 };
    expect(buildSrcset(odd)).toBe('/assets/poi/foo/foo-800.avif 800w');
  });

  it('fallbackSizes returns a sane default sizes attribute', () => {
    expect(fallbackSizes('hero')).toContain('100vw');
    expect(fallbackSizes('tile')).toMatch(/\d+px|vw/);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- --watch=false src/app/data/image-srcset.spec.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement helper**

```ts
import type { ImageAsset } from './types';

const WIDTHS = [640, 1024, 1600] as const;
const CANONICAL = 1024;

export function buildSrcset(asset: ImageAsset): string {
  const marker = `-${CANONICAL}.`;
  if (!asset.src.includes(marker)) {
    return `${asset.src} ${asset.width}w`;
  }
  return WIDTHS
    .map((w) => `${asset.src.replace(marker, `-${w}.`)} ${w}w`)
    .join(', ');
}

export function fallbackSizes(kind: 'hero' | 'tile'): string {
  if (kind === 'hero') return '100vw';
  return '(min-width: 800px) 240px, 40vw';
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- --watch=false src/app/data/image-srcset.spec.ts`
Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
git add src/app/data/image-srcset.ts src/app/data/image-srcset.spec.ts
git commit -m "feat(ui): buildSrcset helper — derive 640/1024/1600 from canonical -1024 src"
```

---

### Task 2: `<app-image>` component

**Files:**
- Create: `src/app/ui/app-image/app-image.component.ts`
- Create: `src/app/ui/app-image/app-image.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppImageComponent } from './app-image.component';
import type { ImageAsset } from '../../data/types';

describe('AppImageComponent', () => {
  const asset: ImageAsset = {
    src: '/assets/poi/x/x-1024.avif', width: 1024, height: 615,
    lqip: 'data:image/jpeg;base64,abc',
    credit: 'A, CC BY 4.0', license: 'CC BY 4.0', source: 'https://x',
  };

  function setup(inputs: Partial<{ asset: ImageAsset | undefined; alt: string; eager: boolean; fallbackIcon: string }>): ComponentFixture<AppImageComponent> {
    TestBed.configureTestingModule({ imports: [AppImageComponent] });
    const fixture = TestBed.createComponent(AppImageComponent);
    if ('asset' in inputs) fixture.componentRef.setInput('asset', inputs.asset);
    fixture.componentRef.setInput('alt', inputs.alt ?? '');
    if (inputs.eager !== undefined) fixture.componentRef.setInput('eager', inputs.eager);
    if (inputs.fallbackIcon) fixture.componentRef.setInput('fallbackIcon', inputs.fallbackIcon);
    fixture.detectChanges();
    return fixture;
  }

  it('renders <img> with srcset and lazy loading by default', () => {
    const fixture = setup({ asset, alt: 'Kalemegdan' });
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('srcset')).toContain('-640.avif 640w');
    expect(img.getAttribute('srcset')).toContain('-1600.avif 1600w');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('alt')).toBe('Kalemegdan');
  });

  it('omits loading=lazy when eager is true', () => {
    const fixture = setup({ asset, eager: true });
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('loading')).toBeFalsy();
  });

  it('sets the LQIP as background-image on the container', () => {
    const fixture = setup({ asset });
    const container = fixture.nativeElement.querySelector('.app-image') as HTMLElement;
    expect(container.style.backgroundImage).toContain('data:image/jpeg;base64,abc');
  });

  it('renders fallback icon when asset is undefined', () => {
    const fixture = setup({ asset: undefined, fallbackIcon: 'local_cafe' });
    const icon = fixture.nativeElement.querySelector('.app-image-fallback') as HTMLElement;
    expect(icon).toBeTruthy();
    expect(icon.textContent).toContain('local_cafe');
    expect(fixture.nativeElement.querySelector('img')).toBeFalsy();
  });

  it('renders the credit caption', () => {
    const fixture = setup({ asset });
    const caption = fixture.nativeElement.querySelector('.app-image-credit');
    expect(caption.textContent).toContain('CC BY 4.0');
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- --watch=false src/app/ui/app-image/app-image.component.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement component**

```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ImageAsset } from '../../data/types';
import { buildSrcset, fallbackSizes } from '../../data/image-srcset';

@Component({
  selector: 'app-image',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-image"
         [style.aspectRatio]="ratio()"
         [style.backgroundImage]="bg()">
      @if (asset(); as a) {
        <img class="app-image-img"
             [src]="a.src"
             [srcset]="srcset()"
             [sizes]="sizes()"
             [width]="a.width" [height]="a.height"
             [alt]="alt()"
             [attr.loading]="eager() ? null : 'lazy'"
             decoding="async" />
        <span class="app-image-credit">{{ a.credit }}</span>
      } @else if (fallbackIcon(); as icon) {
        <span class="material-symbols-outlined app-image-fallback" aria-hidden="true">{{ icon }}</span>
      }
    </div>
  `,
  styles: [`
    .app-image {
      position: relative;
      width: 100%;
      overflow: hidden;
      background-color: var(--surface-2, #e7e9ee);
      background-size: cover;
      background-position: center;
      border-radius: inherit;
    }
    .app-image-img {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      object-position: center 40%;
    }
    .app-image-credit {
      position: absolute; right: 8px; bottom: 6px;
      font-size: 10px; line-height: 1.2;
      color: white;
      background: rgba(0,0,0,0.45);
      padding: 2px 6px; border-radius: 3px;
      max-width: 60%;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .app-image-fallback {
      position: absolute; inset: 0;
      display: grid; place-items: center;
      font-size: 36px;
      color: var(--text-muted, #5b6470);
    }
  `],
})
export class AppImageComponent {
  asset = input<ImageAsset | undefined>(undefined);
  alt = input<string>('');
  eager = input<boolean>(false);
  ratio = input<string>('16 / 9');
  fallbackIcon = input<string | undefined>(undefined);
  kind = input<'hero' | 'tile'>('hero');

  srcset = computed(() => {
    const a = this.asset();
    return a ? buildSrcset(a) : '';
  });
  sizes = computed(() => fallbackSizes(this.kind()));
  bg = computed(() => {
    const a = this.asset();
    return a ? `url("${a.lqip}")` : '';
  });
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- --watch=false src/app/ui/app-image/app-image.component.spec.ts`
Expected: PASS, 5/5.

- [ ] **Step 5: Commit**

```bash
git add src/app/ui/app-image/
git commit -m "feat(ui): <app-image> component — LQIP blur-up + srcset + fallback"
```

---

### Task 3: Wire POI detail hero

**Files:**
- Modify: `src/app/features/poi-detail/poi-detail.component.ts`
- Modify: `src/app/features/poi-detail/poi-detail.component.html`
- Modify: `src/app/features/poi-detail/poi-detail.component.css`

- [ ] **Step 1: Add the component import**

In `poi-detail.component.ts`:
- Add `import { AppImageComponent } from '../../ui/app-image/app-image.component';`
- Add `AppImageComponent` to the standalone `imports: [...]`.
- Add a getter or computed for the lead image:
  ```ts
  heroImage = computed(() => this.poi()?.images?.[0]);
  ```
- Add `categoryIcon = computed(() => { const p = this.poi(); return p ? CATEGORY_ICONS[p.category] : undefined; });` (import CATEGORY_ICONS from `../../data/pois`).

- [ ] **Step 2: Wire the template hero**

Replace the existing `.poi-hero` block so the image renders behind the existing chip + title. Keep the back button and save button overlaid. Use `<app-image>` with `eager=true`, `[asset]="heroImage()"`, `[fallbackIcon]="categoryIcon()"`, `ratio="16 / 9"`.

- [ ] **Step 3: Update CSS**

Ensure `.poi-hero-fg` stays absolutely positioned over the image, with a gradient overlay so text remains legible. Remove the existing gradient from `.poi-hero` (the `<app-image>` provides its own background).

- [ ] **Step 4: Manual test**

Run: `npm start` and navigate to a POI with an image (e.g. `/poi/kalemegdan`) and one without (`/poi/smokvica`). Confirm:
- Image renders, LQIP visible on slow throttle.
- Imageless POI shows the category icon fallback, no broken layout.

- [ ] **Step 5: Run existing tests, confirm green**

Run: `npm test -- --watch=false src/app/features/poi-detail`
Expected: existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/poi-detail/
git commit -m "feat(ui): POI detail hero renders curated image with LQIP + icon fallback"
```

---

### Task 4: Wire Home tile thumbs

**Files:**
- Modify: `src/app/features/home/home.component.ts`
- Modify: `src/app/features/home/home.component.html`
- Modify: `src/app/features/home/home.component.css`

- [ ] **Step 1: Add component import + helper**

In `home.component.ts`:
- Import `AppImageComponent` and add to `imports`.
- The existing template uses `item.poi.category` for the icon — replace the thumb with `<app-image [asset]="item.poi.images?.[0]" [fallbackIcon]="icons[item.poi.category]" kind="tile" ratio="4 / 3" />`.

- [ ] **Step 2: Update CSS**

`.home-tile-thumb` had a fixed-size icon block — adjust so it now hosts `<app-image>` at `aspect-ratio: 4 / 3`, full width of the tile.

- [ ] **Step 3: Manual test**

Tile row shows real photos when available, category icons for the 4 cafes. Confirm lazy-loading works (scroll, watch network panel).

- [ ] **Step 4: Commit**

```bash
git add src/app/features/home/
git commit -m "feat(ui): Home tile thumbs render curated image with icon fallback"
```

---

### Task 5: Wire Home "Today's pick" hero

**Files:**
- Modify: `src/app/ui/hero-card/hero-card.component.ts`
- Modify: `src/app/features/home/home.component.html`

- [ ] **Step 1: Extend hero-card to accept an optional `[asset]: ImageAsset | undefined`**

When asset is present, render `<app-image [asset]="asset()" [eager]="true" ratio="16 / 9" />` behind `.hero-fg`. Otherwise keep the existing gradient.

- [ ] **Step 2: In `home.component.ts`/template**

Compute the cover image for `todaysPick()` — lookup the lead POI id from the itinerary's first stop and read `images[0]`. Pass into `<app-hero-card>` via `[asset]`. If no image, hero-card falls back to the gradient.

- [ ] **Step 3: Manual test**

Today's pick on Home shows the lead POI image with the text overlay readable. Gradient overlay (linear-gradient bottom-up, dark) ensures text contrast.

- [ ] **Step 4: Commit**

```bash
git add src/app/ui/hero-card/ src/app/features/home/
git commit -m "feat(ui): Home Today's pick hero renders lead-POI image with gradient overlay"
```

---

### Task 6: Pipeline `direct-url` sourceType

**Files:**
- Modify: `scripts/lib/build-images-core.mjs`
- Modify: `scripts/lib/build-images.test.mjs`
- Modify: `scripts/README.md` (a one-paragraph note)

- [ ] **Step 1: Write the failing test**

In `scripts/lib/build-images.test.mjs`, add a test that:
- Builds a curator file with `sourceType: "direct-url"`, `fetchUrl: "https://example.test/foo.jpg"`, `license: "CC BY 2.0"`, credit + source.
- Stubs `fetchFn` to return a valid JPEG buffer for that URL.
- Asserts: AVIFs land in `src/assets/poi/<id>/`, the resulting `ImageAsset` has the curator-authored credit/license/source, `src` ends in `-1024.avif`.

- [ ] **Step 2: Run, verify fail**

Run: `npm run test:scripts -- scripts/lib/build-images.test.mjs`
Expected: FAIL (sourceType branch not implemented).

- [ ] **Step 3: Implement `fetchDirectUrl` + `resolveSource` dispatcher**

In `build-images-core.mjs`:
- Add `fetchDirectUrl({ fetchUrl, fetchFn })` that GETs `fetchUrl` with the existing `COMMONS_USER_AGENT`, validates 2xx + non-empty body, returns `{ buffer, contentType }`.
- Add `resolveSource(curatorEntry, fetchFn)` that branches on `sourceType` (default `commons`) and returns `{ buffer, credit, license, source }`.
- Inline the existing Commons path into `fetchCommonsFile` (already named that). The dispatcher calls one of the two. The downstream `writeAvifSet` + slug logic uses `poi.id` + a short hash of `source` URL when sourceType is `direct-url` (avoiding the `File:` slug derivation).
- Enforce license whitelist on `direct-url` entries before fetching.

- [ ] **Step 4: Run, verify pass**

Run: `npm run test:scripts`
Expected: all script tests green, count goes 63 → 64+.

- [ ] **Step 5: README update**

Add a short paragraph in `scripts/README.md` documenting the `sourceType: "direct-url"` curator shape with one example.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/build-images-core.mjs scripts/lib/build-images.test.mjs scripts/README.md
git commit -m "feat(scripts): build-images supports direct-url sourceType (non-Commons)"
```

---

### Task 7: Run multi-source curator against the 4 cafes

**Files:**
- Create up to 4 of: `data/poi-images/{smokvica,magistrala,supermarket-dorcol,drugstore}.json`

- [ ] **Step 1: Per cafe, run a Flickr / Pexels / venue press search**

For each of {smokvica, magistrala, supermarket-dorcol, drugstore}:
- WebSearch `flickr "Belgrade" "<cafe name>" license:cc` — log the top hits' license terms.
- WebSearch `<cafe name> Belgrade pexels OR unsplash` — log results.
- WebFetch the cafe's own website if accessible; look for a press/media page that explicitly grants reuse.

- [ ] **Step 2: For each cafe that has a viable source**

Author a `direct-url` curator file:

```json
{
  "images": [{
    "sourceType": "direct-url",
    "fetchUrl": "<full image URL from the licensed source>",
    "credit": "<author>, <license>, via <platform>",
    "license": "CC BY 2.0",
    "source": "<page URL where the image is hosted>"
  }],
  "fetchedAt": "2026-05-11"
}
```

- [ ] **Step 3: Run the pipeline**

```bash
npm run build:images
```

Expected: each authored curator produces 3 AVIFs in `src/assets/poi/<id>/`; the `pois.compiled.json` entry for that cafe gains an `images[0]`. Throttled — should take seconds, not minutes.

- [ ] **Step 4: Document outcomes**

In a working note for the PR body, list each cafe: "shipped with image" OR "no free-licensed photography located; searched Flickr CC / Pexels / Unsplash / venue press".

- [ ] **Step 5: Commit**

```bash
git add data/poi-images/ src/assets/poi/ src/assets/pois.compiled.json
git commit -m "feat(content): close cafe image gap where free-licensed coverage exists"
```

If no cafe yielded a viable source, this commit is skipped and the next task's PR body records the empty outcome.

---

### Task 8: Final verification + PR + merge

- [ ] **Step 1: Full test suites**

```bash
npm run test:scripts
npm test -- --watch=false
```

Expected: both green. Note the new totals.

- [ ] **Step 2: Build the app**

```bash
npm run build
```

Expected: no errors, no new warnings beyond the pre-1b.3 baseline.

- [ ] **Step 3: Manual UI sanity**

`npm start`. Spot-check: Home loads images for first row, scroll behavior LQIP→AVIF, Today's pick image, POI detail for an image-having POI (kalemegdan) and an imageless POI (drugstore if still imageless).

- [ ] **Step 4: Push + PR + merge**

```bash
git push -u origin feat/phase-1b-3-image-consumer
gh pr create --title "feat(1b.3): image consumer in UI + multi-source curator pipeline" --body "..."
gh pr merge --squash --delete-branch
```

PR body includes the per-cafe outcome from Task 7 Step 4.
