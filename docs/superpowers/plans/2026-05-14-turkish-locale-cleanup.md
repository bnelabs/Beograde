# Turkish Locale Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the three reviewer follow-ups from PR #6 — collapse dead `fillCyr` helpers, remove unsafe `as StringsBundle` casts, and add automated coverage for the Settings locale cycle through Turkish.

**Architecture:**
- **Task 1** trims dead code in the build pipeline (`fillCyrList` and `fillTr` lose their only callers; `fillCyr` is inlined). One file changes, existing tests remain authoritative.
- **Task 2** replaces type-laundering casts with a `DeepWiden<T>` utility type so the TypeScript compiler verifies every translation bundle structurally matches `en.json`. Missing keys fail at compile time instead of leaking to runtime fallback.
- **Task 3** adds a Karma spec for `SettingsComponent` that walks the full locale cycle (`en → sr-Latn → sr-Cyrl → tr → en`), pinning the cycle order and Turkish-arm behavior against regressions.

**Tech Stack:** TypeScript (strict), Angular 17 standalone components, Karma + Jasmine (`npm test -- --watch=false`), node:test for script suite (`npm run test:scripts`).

---

## File Structure

**Modified files:**
- `scripts/lib/build-provenance-core.mjs` — collapse three helpers into one (`fillBoth` + `fillBothList`). Same exports, fewer functions.
- `src/app/core/i18n/strings.service.ts` — introduce `DeepWiden<T>` utility, retype `StringsBundle`, drop the two `as StringsBundle` casts.

**New files:**
- `src/app/features/settings/settings.component.spec.ts` — Karma spec for `cycleLocale()` and `localeLabel()`.

**Untouched but worth reading:**
- `scripts/lib/build-provenance.test.mjs` — exercises the helpers through the public `runBuildProvenance` API; provides the safety net for Task 1.
- `src/app/core/i18n/i18n.service.ts` — owns the locale signal that Task 3's spec drives.
- `src/i18n/{en,sr-Latn,sr-Cyrl,tr}.json` — read for shape; not modified.

---

### Task 1: Collapse `fillCyr` / `fillTr` into a single `fillBoth`

**Why:** After PR #6 swapped every call site to `fillBoth`/`fillBothList`, `fillCyrList` has zero callers and `fillCyr`/`fillTr` are each used only inside `fillBoth`. Three helpers for one operation is noise — collapse to one.

**Files:**
- Modify: `scripts/lib/build-provenance-core.mjs:13-35`
- Test: `scripts/lib/build-provenance.test.mjs` (existing — no changes; the public-API tests cover the behavior)

- [ ] **Step 1: Run the existing script tests to confirm baseline green**

Run: `npm run test:scripts`
Expected: All 89 tests pass (the `build-provenance` describe block exercises every fill path through `runBuildProvenance`).

- [ ] **Step 2: Replace the three helper functions with a single `fillBoth`**

In `scripts/lib/build-provenance-core.mjs`, replace lines 13–35 (everything from `function fillCyr(b)` through the closing brace of `fillBothList`) with:

```js
function fillBoth(b) {
  const out = { ...b };
  if (!out.sr_cyr) out.sr_cyr = latnToCyrl(out.sr_lat || out.en || '');
  if (!out.tr) out.tr = out.en || '';
  return out;
}

function fillBothList(list) {
  if (!Array.isArray(list)) return list;
  return list.map(fillBoth);
}
```

Leave the rest of the file untouched. The remaining `fillBoth(...)` and `fillBothList(...)` call sites at lines 93–112 already use the surviving function names.

- [ ] **Step 3: Run the script tests to verify behavior unchanged**

Run: `npm run test:scripts`
Expected: All 89 tests still pass. Specifically the `'translit-fills sr_cyr ...'` tests and `'auto-drafts tr from en ...'` test must remain green — they validate the exact behavior that was previously split across `fillCyr` and `fillTr`.

- [ ] **Step 4: Run the Angular build to ensure the script integrates cleanly with prebuild**

Run: `npm run build:provenance`
Expected: Script runs to completion, writes `src/assets/pois.compiled.json` without errors. (No assertion on output diff — `pois.compiled.json` should be byte-identical because the function semantics are unchanged.)

- [ ] **Step 5: Verify `pois.compiled.json` did not drift**

Run: `git diff --stat src/assets/pois.compiled.json`
Expected: No changes (or output identical aside from regeneration timestamps if any — there are none in this file).

If the file did change, that means Step 2 introduced a semantic regression. Revert and investigate.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/build-provenance-core.mjs
git commit -m "refactor(scripts): collapse fillCyr/fillTr into single fillBoth helper"
```

---

### Task 2: Strict-type the strings bundles with `DeepWiden<T>` and drop the `as StringsBundle` casts

**Why:** `trStrings as StringsBundle` and `srCyrStrings as StringsBundle` lie to TypeScript. The compiler currently can't verify that `tr.json` and `sr-Cyrl.json` share the key structure of `en.json` — a missing or misspelled key would fall through to runtime as `undefined` (rendered as an empty string in the template). Replacing the casts with a `DeepWiden<typeof enStrings>` type forces TypeScript to verify structural compatibility at compile time.

**Mechanism:** TypeScript infers JSON imports as deeply-readonly literal types. `typeof enStrings` therefore looks like `{ tabs: { home: "Home", … }, … }`. Assigning a differently-valued bundle (e.g. `{ tabs: { home: "Ana sayfa", … } }`) directly to `typeof enStrings` fails because the *literal* values differ. `DeepWiden<T>` recursively replaces every leaf `string` literal with the wide `string` type — making structural assignability the only check left.

**Files:**
- Modify: `src/app/core/i18n/strings.service.ts:1-20`
- Test: `src/app/core/i18n/strings.service.spec.ts` (existing — touched if it asserts return-value identity; verified in Step 1 below)

- [ ] **Step 1: Read the existing strings.service.spec.ts to understand current assertions**

Run: `cat src/app/core/i18n/strings.service.spec.ts`
Expected: Read the file. Note which fields it asserts on. Plan: any test that compares an entire bundle object by reference (`expect(t).toBe(srLatStrings)`) is fine; any test that asserts on a specific *literal* string value will still work because the runtime values don't change.

- [ ] **Step 2: Write a new failing spec that enforces structural parity at compile time**

This step verifies the new typing setup catches missing keys. We cannot literally `expect` a TypeScript compile error in Jasmine, so the test instead asserts the *symptom* a missing key would cause: `t().settings.language_tr` must be a non-empty string for the `tr` bundle. This is a runtime echo of the type guarantee.

Append to `src/app/core/i18n/strings.service.spec.ts` (inside the existing `describe('StringsService', () => { ... })` block — locate the closing brace of the describe and insert before it):

```ts
it('exposes a non-empty language_tr label for every bundle (parity smoke check)', () => {
  TestBed.configureTestingModule({});
  const i18n = TestBed.inject(I18nService);
  const strings = TestBed.inject(StringsService);

  for (const loc of [
    { locale: 'en' as const, script: 'Latn' as const },
    { locale: 'sr' as const, script: 'Latn' as const },
    { locale: 'sr' as const, script: 'Cyrl' as const },
    { locale: 'tr' as const, script: 'Latn' as const },
  ]) {
    i18n.setLocale(loc);
    expect(strings.t().settings.language_tr).withContext(`locale=${loc.locale}/${loc.script}`).toBeTruthy();
  }
});
```

If the existing spec file does not import `TestBed` and `I18nService` at the top, add to the existing imports block:

```ts
import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';
```

- [ ] **Step 3: Run the new test to verify it passes against the current (cast-based) implementation**

Run: `npm test -- --watch=false --include='**/strings.service.spec.ts'`
Expected: All specs pass. The new parity test currently passes because the casts hide nothing in the present bundles. This baseline confirms the test is *not* a false-failure — it would only fail if a future bundle actually drops `settings.language_tr`.

- [ ] **Step 4: Replace `StringsBundle` with `DeepWiden<typeof enStrings>` and drop the casts**

Edit `src/app/core/i18n/strings.service.ts`. Replace the entire file with:

```ts
import { Injectable, computed, inject } from '@angular/core';
import { I18nService } from './i18n.service';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';
import srCyrStrings from '../../../i18n/sr-Cyrl.json';
import trStrings from '../../../i18n/tr.json';

type DeepWiden<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly DeepWiden<U>[]
    : { [K in keyof T]: DeepWiden<T[K]> };

type StringsBundle = DeepWiden<typeof enStrings>;

const en: StringsBundle = enStrings;
const srLat: StringsBundle = srLatStrings;
const srCyr: StringsBundle = srCyrStrings;
const tr: StringsBundle = trStrings;

@Injectable({ providedIn: 'root' })
export class StringsService {
  private readonly i18n = inject(I18nService);
  readonly t = computed<StringsBundle>(() => {
    const loc = this.i18n.locale();
    if (loc.locale === 'tr') return tr;
    if (loc.locale !== 'sr') return en;
    if (loc.script === 'Cyrl' && this.i18n.cyrillicEnabled()) return srCyr;
    return srLat;
  });
}
```

**Key changes:**
1. `DeepWiden<T>` recursively widens string literals to `string` — including inside arrays (no current bundle has arrays, but this future-proofs).
2. Each JSON import is assigned to a `const` typed as `StringsBundle`. *This is where the compiler does the structural check.* If `tr.json` drops a key present in `en.json`, this line fails to compile.
3. The `as StringsBundle` casts inside the `computed` are removed because each `const` is already correctly typed.

- [ ] **Step 5: Run the compiler + tests to verify nothing broke**

Run: `npm test -- --watch=false`
Expected: All 70+ existing app tests pass, including the new parity test from Step 2. The TypeScript compile happens as part of the Karma run — a missing key would surface as a TS2741 (`Property 'X' is missing`) error before any test executes.

- [ ] **Step 6: Verify the structural check actually catches a missing key (deliberate red)**

This is a *temporary destructive edit* to prove the type system catches drift. Do not commit the broken state.

Temporarily edit `src/i18n/tr.json` and remove the line containing `"language_tr": "Türkçe"` (line 91 — leave a trailing comma cleanup if needed).

Run: `npm test -- --watch=false 2>&1 | head -40`
Expected: Compile fails before any test runs, with an error message like `Property 'language_tr' is missing in type '...' but required in type '...'` pointing at `strings.service.ts`.

**If the build succeeds anyway**, the type system isn't catching the drift — investigate why (most likely `DeepWiden` is widening too aggressively, or `excessPropertyChecks` is suppressing). Fix before proceeding.

**Then restore** `src/i18n/tr.json`:

```bash
git checkout -- src/i18n/tr.json
```

Run: `npm test -- --watch=false`
Expected: All tests pass again.

- [ ] **Step 7: Run the production build to ensure no Angular AOT regression**

Run: `npm run build`
Expected: Build succeeds. Only the existing CommonJS warnings appear (no new TS errors).

- [ ] **Step 8: Commit**

```bash
git add src/app/core/i18n/strings.service.ts src/app/core/i18n/strings.service.spec.ts
git commit -m "refactor(i18n): structurally type strings bundles via DeepWiden; drop unsafe casts"
```

---

### Task 3: Add `SettingsComponent` spec covering the locale cycle through Turkish

**Why:** The Settings locale cycle (`en → sr-Latn → sr-Cyrl → tr → en`) is currently untested. PR #6's reviewer flagged the *manual* smoke-test box as unchecked. The right substitute is an automated Karma spec that exercises `cycleLocale()` end-to-end and asserts `localeLabel()` against the visible string for each step — this catches regressions where the cycle order is reshuffled or a label fails to resolve.

**Files:**
- Create: `src/app/features/settings/settings.component.spec.ts`
- Test: itself

- [ ] **Step 1: Write the failing spec**

Create `src/app/features/settings/settings.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SettingsComponent } from './settings.component';
import { I18nService } from '../../core/i18n/i18n.service';
import { TilePackService } from '../../core/tile-pack.service';
import { GeolocationService } from '../../core/geolocation.service';
import { PwaInstallService } from '../../core/pwa-install.service';

class StubTilePackService {
  meta = signal(null);
  status = signal('idle');
  async clear() {}
  async download() {}
}
class StubGeolocationService {
  position = signal(null);
  permission = signal('prompt');
  tracking = signal(false);
  start() {}
  stop() {}
}
class StubPwaInstallService {
  canInstall = signal(false);
  isStandalone = signal(false);
  isIos = signal(false);
  async promptInstall() {}
}

describe('SettingsComponent locale cycle', () => {
  let component: SettingsComponent;
  let i18n: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: TilePackService, useClass: StubTilePackService },
        { provide: GeolocationService, useClass: StubGeolocationService },
        { provide: PwaInstallService, useClass: StubPwaInstallService },
      ],
    });
    const fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    i18n = TestBed.inject(I18nService);
    i18n.setLocale({ locale: 'en', script: 'Latn' });
  });

  it('cycles en → sr-Latn → sr-Cyrl → tr → en and updates localeLabel for each step', () => {
    expect(i18n.locale()).toEqual({ locale: 'en', script: 'Latn' });
    expect(component['localeLabel']()).toBe('English');

    component.cycleLocale();
    expect(i18n.locale()).toEqual({ locale: 'sr', script: 'Latn' });
    expect(component['localeLabel']()).toBe('Srpski');

    component.cycleLocale();
    expect(i18n.locale()).toEqual({ locale: 'sr', script: 'Cyrl' });
    expect(component['localeLabel']()).toBe('Српски (ћирилица)');

    component.cycleLocale();
    expect(i18n.locale()).toEqual({ locale: 'tr', script: 'Latn' });
    expect(component['localeLabel']()).toBe('Türkçe');

    component.cycleLocale();
    expect(i18n.locale()).toEqual({ locale: 'en', script: 'Latn' });
    expect(component['localeLabel']()).toBe('English');
  });

  it('renders the Turkish localeLabel when started directly in tr', () => {
    i18n.setLocale({ locale: 'tr', script: 'Latn' });
    expect(component['localeLabel']()).toBe('Türkçe');
  });
});
```

**Note on the Cyrillic label:** The spec asserts `'Српски (ћирилица)'` — that's the value in `src/i18n/sr-Cyrl.json` under `settings.language_sr_cyr`. If the actual value differs (the build-i18n step writes it from `sr-Latn` via transliteration), check `src/i18n/sr-Cyrl.json` first and use whatever literal value is there. Do not hand-write a different transliteration — the JSON file is authoritative.

Run: `grep language_sr_cyr src/i18n/sr-Cyrl.json`
Use the exact value shown.

**Note on the localeLabel access:** `localeLabel` is `protected`, so accessing it as `component['localeLabel']` (string-indexed) is the standard TypeScript escape hatch for tests. Do not change the visibility to `public` just for testing.

- [ ] **Step 2: Run the new spec to verify it passes**

Run: `npm test -- --watch=false --include='**/settings.component.spec.ts'`
Expected: Both `it` blocks pass.

If the Cyrillic label assertion fails, the cause is almost certainly that `src/i18n/sr-Cyrl.json` contains a different literal than the one in the spec. Read the file and update the spec to match.

- [ ] **Step 3: Run the full Karma suite to confirm no regression**

Run: `npm test -- --watch=false`
Expected: All tests pass — the existing 70 + the new 2 = 72 (count may differ slightly if other tests have been added since the plan was written; the bar is "no failures").

- [ ] **Step 4: Commit**

```bash
git add src/app/features/settings/settings.component.spec.ts
git commit -m "test(settings): cover full locale cycle including Turkish"
```

---

### Task 4: Open the cleanup PR

**Why:** Ship the three cleanups as a single tight PR so the trail is auditable: dead-code removal, type-safety upgrade, regression coverage.

**Files:** none — branch + PR operations only.

- [ ] **Step 1: Push the branch**

Assumption: All three preceding tasks have been committed onto a branch (e.g., `feat/turkish-locale-cleanup`) cut from `main` *before* Task 1 began.

If you haven't created the branch yet, run before any earlier commits: `git checkout -b feat/turkish-locale-cleanup`.

Run: `git push -u origin feat/turkish-locale-cleanup`

Expected: Branch pushed to remote.

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "refactor(i18n): Turkish locale cleanup follow-ups" --body "$(cat <<'EOF'
## Summary
Closes the three reviewer follow-ups from PR #6:

- **Dead-code removal** — `fillCyr` / `fillCyrList` / `fillTr` collapsed into a single `fillBoth` helper in `build-provenance-core.mjs`. No behavior change; the existing `build-provenance.test.mjs` suite is the safety net.
- **Type safety** — `as StringsBundle` casts removed from `StringsService`. Bundles are now typed via `DeepWiden<typeof enStrings>`, so the TypeScript compiler structurally verifies that `sr-Latn.json`, `sr-Cyrl.json`, and `tr.json` carry every key in `en.json`. Missing keys fail compile.
- **Locale cycle coverage** — new `settings.component.spec.ts` walks `en → sr-Latn → sr-Cyrl → tr → en` and pins the Turkish-arm `localeLabel`.

## Test plan
- [x] `npm run test:scripts` — 89/89 (Task 1 safety net)
- [x] `npm test -- --watch=false` — full Karma suite (Tasks 2 + 3)
- [x] `npm run build` — production AOT clean
- [x] Deliberate-red verification: removed `language_tr` from `tr.json` and confirmed TS compile fails before tests run (Task 2 Step 6)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL returned. Surface it to the user.

- [ ] **Step 3: Confirm PR opened**

Run: `gh pr view --json url,state,mergeable`
Expected: `state=OPEN`, `mergeable=MERGEABLE`.

---

## Self-Review

**1. Spec coverage:**
- Reviewer follow-up "collapse `fillCyr` into `fillBoth`" → **Task 1**. ✅
- Reviewer follow-up "tighten `tr.json`/`sr-Cyrl.json` types to remove `as StringsBundle` casts OR wire parity script into CI" → **Task 2** removes the casts and shifts the safety check to the TypeScript compiler (no CI wiring needed; the existing Karma run plays that role locally). ✅
- Reviewer follow-up "manual browser smoke test (unchecked)" → **Task 3** automates the equivalent end-to-end cycle in Karma — stronger than the manual box because it pins regressions. ✅
- Reviewer follow-up "revisit locale toggle UX if a 5th locale lands" → intentionally **out of scope**. No 5th locale is on the immediate horizon; pre-designing for a hypothetical violates YAGNI. The reviewer flagged it as a *future* concern, not a current cleanup item.

**2. Placeholder scan:** No `TBD`, `TODO`, `implement later`, or `add appropriate error handling`. Every code step has full code. Every test step has full assertions. Every command has expected output. ✅

**3. Type consistency:**
- `StringsBundle` used identically in `strings.service.ts` and inferred via `typeof enStrings` everywhere.
- `cycleLocale()` and `localeLabel` signatures match the existing `SettingsComponent` (verified by reading the file during plan-writing).
- The spec accesses `localeLabel` as `component['localeLabel']` because it's `protected` — flagged in the plan body so the implementer doesn't try to make it `public`. ✅

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-14-turkish-locale-cleanup.md`.
