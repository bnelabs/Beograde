# Turkish Style Guide (Beograde)

Anchors all `tr` translations in `src/assets/pois.json`. When a place-name or term is listed here, use the form here — don't translate it differently elsewhere.

This guide is intentionally short: it covers names that appear in the pilot 5 POIs plus shared tourism vocabulary that will recur across the remaining 45. Extend it (don't replace it) as more POIs come online.

---

## City and country names

Use the established Turkish forms where they exist; otherwise keep the local name as-is.

| Local                | Turkish        | Notes |
| -------------------- | -------------- | ----- |
| Beograd / Belgrade   | **Belgrad**    | Established Turkish exonym. |
| Srbija / Serbia      | **Sırbistan**  | |
| Novi Sad             | Novi Sad       | No Turkish exonym; keep as-is. |
| Niš                  | Niş            | Established exonym. |
| Dunav / Danube       | **Tuna**       | Established exonym. |
| Sava                 | Sava           | Keep as-is. |

## Belgrade place names (pilot 5)

| Local                | Turkish form used | Reasoning |
| -------------------- | ----------------- | --------- |
| Kalemegdan           | **Kalemegdan**    | Already Turkish-origin (`kale meydanı`, "fortress square"). Keep the modern Serbian form intact; Turkish readers will recognise it. Don't render as "Kalemeydan". |
| Beogradska Tvrđava   | **Belgrad Kalesi** | "Belgrade Fortress" — natural Turkish phrasing. |
| Skadarlija           | **Skadarlija**    | Proper noun; no exonym. Pronunciation hint optional in body copy, never in `name`. |
| Hotel Moskva         | **Hotel Moskva**  | A 100+ year old hotel brand — keep the brand name intact. Don't render as "Moskova Oteli" even though Turkish for Moscow-the-city is *Moskova*. Treat like any other foreign hotel brand. |
| Moskva šnit          | **Moskva şnit**   | Keep dessert's proper-noun form; Turkish reader will treat it as a named dish. |
| Knez Mihailova       | **Knez Mihailova** | Pedestrian street; keep proper noun. In body copy you may gloss as "Prens Mihailova Caddesi" once. |
| Trg Republike / Republic Square | **Trg Republike (Cumhuriyet Meydanı)** | Use the Serbian name as the primary form (that's what locals say and what signage shows), with Turkish gloss in parentheses on first mention. Generic Turkish for "Republic Square" is *Cumhuriyet Meydanı*. |
| Stari Grad           | **Stari Grad** (eski şehir) | Use Serbian name; gloss in parens in body copy if needed. |

## Tourism vocabulary

Single canonical Turkish term per concept. If a synonym is more natural in a specific sentence, the gloss takes precedence — but the canonical form below is the default.

| English / Serbian            | Turkish            |
| ---------------------------- | ------------------ |
| fortress / tvrđava           | **kale**           |
| square / trg                 | **meydan**         |
| street / ulica               | **cadde** (named main streets); **sokak** (small/side) |
| pedestrian street            | yaya caddesi       |
| park                         | park               |
| monastery / manastir         | manastır           |
| church / crkva               | kilise             |
| cathedral / saborna crkva    | katedral           |
| mosque / džamija             | cami               |
| museum / muzej               | müze               |
| gallery / galerija           | galeri             |
| viewpoint                    | manzara noktası    |
| river                        | nehir              |
| bridge / most                | köprü              |
| restaurant / restoran        | restoran           |
| kafana                       | **kafana**         | (Serbian institution — keep the word, gloss once as "geleneksel meyhane / lokanta" in body copy) |
| cuisine                      | mutfak             |
| pastry / dessert (šnit)      | tatlı              |
| coffee / kafa                | kahve              |
| city centre                  | şehir merkezi      |
| old town                     | eski şehir         |
| view                         | manzara            |
| panoramic view               | panoramik manzara  |
| free entry                   | ücretsiz giriş     |
| open daily                   | her gün açık       |
| tip / advice                 | ipucu / öneri      |
| best time to visit           | ziyaret için en iyi zaman |
| crowded                      | kalabalık          |
| quiet                        | sakin              |
| historic                     | tarihi             |
| Ottoman-era                  | Osmanlı dönemi     |

## Tone

- Tourist-friendly, neutral register. Not formal (no `-ız/-iz` plurals where Turkish doesn't need them); not colloquial.
- Second person where the English uses it ("you'll see…" → "göreceksiniz" or "görebilirsiniz"; lean towards `-ebilir` softer modal when it's advice, plain `-acak` future when it's a fact).
- Keep sentences short. Don't pad — if the English sentence is 8 words, the Turkish should be roughly that scale.
- Don't invent facts. If the English is hedged ("often crowded in summer"), keep the hedge ("yaz aylarında genellikle kalabalık olur").

## Provenance

Every POI touched by an LLM-draft translation pass MUST have `provenance.translatedBy: "auto-draft"`. A future Turkish-fluent curator pass will flip these to `"curator"`. Do not change the value to `"curator"` from the model side.
