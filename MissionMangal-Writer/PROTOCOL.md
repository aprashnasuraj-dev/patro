# PROTOCOL — read completely, follow exactly

## 0. Ground rules
- Work only inside this Drive folder. Never edit `batches/`, `examples/`, `_admin/`, `_tools/`.
- One topic at a time, end to end. Never batch-generate shallow text. Quality beats speed.
- Do not invent facts, sources, URLs, quotes, dates or numbers. Every URL you cite must be one you actually opened.
- If you cannot create files in Drive, **stop at once** and tell the owner in one sentence. Do not paste articles into chat instead.

## 1. Pick work
Open `batches/`, find the lowest `batch-XXXX.json` without `output/done/batch-XXXX.done.json`. For each topic use the fields exactly as given: `slug` (never change), `question`, `category`, `title_suggestion`, `keywords`, `target_words` (1200), `ymyl`.

## 2. Research (before writing)
- Collect **at least 5 reliable, directly relevant sources** (minimum 3 if the topic is niche). Open each page and read it.
- Prefer: government and agency sites (NASA, NOAA, USGS, WHO, CDC, NIH), universities, museums, encyclopedias, reputable science/engineering publishers, standards bodies, the topic's primary documents. Use Wikipedia only as one background source, never as the main one.
- Reject: forums, content farms, AI-generated pages, sites with no author/publisher, and anything that only matches keywords (e.g. an article about a person called Hurricane when the topic is storms).
- If you cannot find 3 reliable on-topic sources: do **not** write. Save `output/rejected/<slug>.json` = `{"slug":"...","reason":"..."}` and continue.
- Save notes to `output/research/<slug>.json` (format in `examples/research/`): per source `n, url, title, publisher, reliability, notes[]` where notes are short facts **in your own words**. No long quotes.
- `ymyl: true` topics (health, medical devices, money): use only government/medical-body/peer-reviewed sources, state limits clearly, never give personal medical, legal or financial advice.

## 3. Write the article — `output/articles/<slug>.json`
Follow `ARTICLE_SCHEMA.json` and the style of `examples/*.json`.
- **Length:** 1,000+ words counting section paragraphs + FAQ (aim 1,200–1,500). Count with code, not by eye.
- **Opening:** section 1 is `The short answer`. Answer the question in its first two sentences, then say what the article covers.
- **Structure:** 8–10 `sections` with specific H2s (short answer · definition/background · how or why it works · evidence/examples · everyday relevance · common misconceptions · limits/open questions · why it matters). Paragraphs ≤ 120 words, 2–3 per section.
- **Citations:** put `[n]` after each sentence that relies on source *n*. Numbers follow order of first citation (1,2,3…). Every listed source must be cited at least once; every `[n]` must exist in `sources`.
- **Originality:** paraphrase. Never copy 8+ consecutive words from a source. At most one short quote (< 15 words) per source, in quotation marks. Add your own explanation, analogies and structure — do not merely summarise one page.
- **Voice:** clear, calm, specific, human. No hype, no filler openings ("In today's world…"), no "in conclusion", no "delve", no "it is important to note", no emoji, no bullet-point walls inside paragraphs.
- **Uncertainty:** where experts disagree or evidence is thin, say so plainly.
- **Fields:** `title` ≤ 60 characters (start from `title_suggestion`, improve if needed, keep the main keyword first); `meta_description` 110–160 characters, unique, includes the keyword, no clickbait; `h1` = the question; `key_takeaways` exactly 4; `faq` 4–6 real follow-up questions with 35–70 word cited answers; `keywords` 4–8; `author` "Suraj Dahal"; `published` today's date (YYYY-MM-DD); `canonical_url` and `slug` and `id` exactly as given; `category` as given.
- `sources[]`: `n, title, publisher, url (https), published_at (or null), retrieved_at (today)`.
- Add `word_count` and `reading_minutes` (= round(words/220)).

## 4. Hero image — `output/images/<slug>-hero.<png|jpg|webp>`
- 1200×630 px, ≤ 400 KB if possible, no text unless essential, no logos, no real people's faces, no trademarks.
- Either (a) an **original image you generate** that clearly illustrates the topic, or (b) an **openly licensed** image (CC0, public domain, CC BY, CC BY-SA from Wikimedia Commons, NASA, NOAA, USGS) with exact credit.
- Add to the article JSON: `"image":{"file":"<slug>-hero.png","alt":"20–160 chars describing the image","caption":"","credit":"who made it / source","license":"e.g. CC0 (original illustration) or CC BY-SA 4.0","width":1200,"height":630}`. If (b), also add `"source_url"`.
- If you cannot create or upload an image, set `"image": null`, finish the article, and list the slug under `image_pending` in the done file.

## 5. Verify before uploading (use code)
1. JSON parses and matches `ARTICLE_SCHEMA.json`.
2. Word count ≥ 1,000. Title ≤ 60. Meta 110–160. Slug unchanged and ≤ 60 chars, lowercase a–z 0–9 and hyphens.
3. Every `[n]` exists; every source is cited; all URLs start with `https://`.
4. Every section has at least one `[n]` citation, and no paragraph states a fact without one. Pure explanation or framing paragraphs (analogies, "what this means") may omit `[n]` but must contain no sourced facts or numbers. No copied 8-word runs from your research notes.
5. Image file exists, dimensions 1200×630, `image.file` matches the uploaded file name.
Fix, then re-check. Only then upload.

## 6. Upload (same Drive folder)
Upload exactly three files per topic: `output/articles/<slug>.json`, `output/images/<slug>-hero.<ext>`, `output/research/<slug>.json`. After uploading, open the folder listing and confirm all three exist and are not empty.

## 7. Finish a batch
Create `output/done/batch-XXXX.done.json`:
`{"batch":1,"completed":["slug",…],"rejected":[{"slug":"…","reason":"…"}],"image_pending":["slug",…],"finished":"YYYY-MM-DD"}`
Then say one line in chat ("Batch 0001 done: 9 written, 1 rejected") and immediately start the next batch. Never ask the owner questions unless you cannot write to Drive.

## 8. Resume rule
If interrupted, restart at step 1: the first batch without a done file; inside it, skip every slug that already has an article file.
