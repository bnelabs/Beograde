# POI image curator files

One file per POI, named `<poi-id>.json`. Adding/editing a file here is the only way a POI gets images at build time.

## Shape

```json
{
  "images": [
    {
      "commonsFile": "File:Tara_National_Park_Tara_View.jpg",
      "credit": "Yosemiti, CC BY-SA 3.0, via Wikimedia Commons",
      "license": "CC BY-SA 3.0",
      "source": "https://commons.wikimedia.org/wiki/File:Tara_National_Park_Tara_View.jpg"
    }
  ],
  "fetchedAt": "2026-05-10"
}
```

## Rules

- `commonsFile` must start with `File:` — exact name from Commons.
- `credit` and `license` are copied verbatim into `ImageAsset.credit` and `ImageAsset.license`. The curator (you) is responsible for getting attribution right.
- `source` is the canonical Commons file page URL.
- `fetchedAt` is the date you authored / last reviewed this entry. Bumping it forces re-fetch on the next `npm run build:images`.

## Build step

```bash
npm run build:images          # skip-if-fresh
npm run build:images -- --force   # full rebuild
```

This pipeline is intentionally **not** chained into `prebuild`. It hits Wikimedia Commons live; the production build must not depend on Wikimedia uptime.
