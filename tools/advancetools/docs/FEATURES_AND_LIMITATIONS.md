# Engines, features and limits

## 1. Knitting and crochet

The catalogue in `src/catalog.mjs` is the authoring source. Each calculator has its own form, original explanation, worked example, unit labels and limitations. The arithmetic is in `src/engines/knitting.mjs`.

| Group | Included tools |
|---|---|
| Gauge and dimensions | Cast-on, rows, finished width/height, stitch gauge, row gauge, stitch-gauge adjustment, row-gauge adjustment, repeat count |
| Yarn use and budget | Substitution by length, skein count, length from mass, mass from length, swatch scaling, blanket yardage, scarf yardage, sweater-area estimate, yarn cost |
| Garment planning | Percentage ease, body stitches, sleeve taper schedule, eight-stitch raglan rounds, neckline pickup |
| Socks and hats | Sock cast-on, heel flap plan, toe decreases, hat cast-on, segmented crown decreases |
| Construction and crochet | Blanket cast-on, square layout, border area, increase/decrease distribution, buttonholes, ribbing alignment, foundation chains, square growth |
| Time and units | Active project time, centimetres/inches, yards/metres, ounces/grams |
| References | Needle sizes, non-steel crochet hook sizes, yarn category explanation, printable gauge worksheet |

There are 41 calculators and 3 charts. All sizing inputs are cm unless labelled otherwise; yarn length is metres; gauge is per **10 cm**, not per four inches.

### Mechanisms

- Cast-on preserves approximate target width while adjusting to a repeat multiple plus edge count. Minimum count is one complete repeat plus edges.
- Gauge adjustment scales by `new gauge / old gauge`; this preserves width only. It does not reconstruct a whole garment pattern.
- Distribution splits a total into event groups whose sizes differ by at most one. The schedule lists intervals/groups, not cumulative row numbers.
- Yarn estimation uses measured yarn consumed per swatch area. Sweater fabric uses one body rectangle and two sleeve trapezoids. It is an estimate, not a yarn manufacturer's pattern quantity.
- Borders use outer rectangle area minus inner area, accounting for corners without inventing decorative shaping.
- Decrease rules state how many stitches are removed per event, and show a reachable final count when rounding matters.

### Counterexamples and boundaries

Equal yarn length does not imply the same gauge, stretch or drape. Equal category numbers do not guarantee substitution. A correctly calculated 105 cm sweater circumference can still fit poorly because neckline, shoulders, sleeves and fabric recovery are outside that body-count calculation.

The heel-flap tool does not make a complete heel turn. The raglan tool assumes eight increases per event. Sleeve paired decreases can overshoot odd differences; the final count is shown. Negative ease is bounded, counts and repeat inputs are constrained, and zero gauge is rejected.

There are no copied knitting patterns. The worksheet and calculation PDFs are original; references use common factual labels, not proprietary artwork. Manufacturer millimetre labels take precedence over US lettering conventions.

## 2. Instrument chords

`src/engines/chords.mjs` defines eleven exact tunings, twelve root pitch classes and fourteen qualities. Eleven × twelve × fourteen = **1,848** detail pages, each with valid diagrams found at build time.

### Instruments

Mandolin GDAE; Irish bouzouki GDAD and GDAE; charango GCEAE; cavaquinho DGBD; baritone ukulele DGBE; tenor banjo CGDA; Irish tenor banjo GDAE; guitar DADGAD, open D and drop D.

These are explicit setups, not all variants of each instrument. Five-string banjo drone fingering and Greek bouzouki configurations are not mislabelled as these tunings.

### Chord qualities

Major, minor, dominant seventh, major seventh, minor seventh, sus2, sus4, diminished, augmented, diminished seventh, half-diminished seventh, sixth, minor sixth and add ninth.

### Search algorithm

For each course, enumerate mute or frets whose pitch class belongs to the chord. Search the Cartesian product with early fret-span pruning. Require every chord pitch class, reject non-chord tones, and rank by fret height/span, muting, and bass-root preference. The browser supports maximum fret 1–18 and span 1–5; the default is frets 0–12 with span 4.

A maximum six-string search can approach a few thousand candidate combinations in normal configurations. This is client-side work, not server computation. The exhaustive test checks every generated shape's exact pitch-class set and default fret span.

### Counterexample

Every note can be correct while a shape is awkward or impossible for a particular hand. The algorithm does not certify finger assignments or barre feasibility. It intentionally does not put invented finger numbers on diagrams: the numbers are fret numbers.

Doubled courses are represented by one pitch. Charango's middle octave-paired course and octave-strung bouzouki variations are described; the sound preview does not claim to reproduce their full spectrum. Synthesized triangle-wave audio is a pitch check, not a sampled instrument. Enharmonic display names can differ from theoretical chord spelling.

## 3. Workshop reference

`src/engines/workshop.mjs` lists 56 common metric diameter/pitch combinations and 43 Unified combinations (22 UNC and 21 UNF). The 99 references are not an exhaustive standards catalogue.

### Formulas

For nominal diameter D and pitch P in mm:

- Cut-tap shortcut: `D − P`.
- Selectable conventional thread percentage: `D − 1.2990381057 × P × percent / 100`.
- Basic pitch-diameter estimate: `D − 0.6495190528 × P`.
- External minor-diameter estimate: `D − 1.226869322 × P`.
- Approximate tensile stress area: `π/4 × (D − 0.9382 × P)^2`.
- TPI conversion: `25.4 / P`.
- Engagement turns: axial length / pitch.

The percentage model is not a recommendation to choose a particular percentage for every material. It is bounded to 40–85% and labelled as an estimate. A four-decimal display does not mean the tool or measurement has four-decimal physical accuracy.

### Fits

The fit calculator uses **entered limits**:

- Minimum clearance = hole minimum − shaft maximum.
- Maximum clearance = hole maximum − shaft minimum.
- All positive: clearance; all negative: interference; overlapping or zero-boundary: transition/boundary.

No ISO H7/g6 tables are invented or bundled. A user can enter limits from a licensed drawing or standard, but those are not supplied by this package.

### Counterexample

The D − P drill shortcut can be a reasonable starting estimate for a cutting tap yet be unsuitable for a forming tap. Correct engagement turns do not establish safe axial load: material, fit, stripping, bolt grade and geometry are absent. Custom clearance allowance is not an official close/normal/loose class.

Other tools compute spindle RPM, milling feed, engagement turns and a custom clearance hole. Final machining decisions require actual tool/manufacturer recommendations and available drill tolerances.

## 4. Legacy converters

All mapping code is shipped locally with licenses. The interface converts explicit selected source encodings; it does not claim automatic encoding detection.

| Encoding | Mechanism | What is tested | Limit |
|---|---|---|---|
| Kruti Dev 010 → Unicode | Adapted MIT mapping, bounded i-matra and reph reordering | Ordinary word, pre-base i, conjunct and reph fixtures | Kruti layouts and damaged extraction vary |
| Bijoy/Sutonny MJ → Unicode | MIT upstream TypeScript core transpiled to browser JavaScript | Ordinary words, conjuncts, reph and high-byte variants | Mixed English/legacy runs require separation |
| FM Abhaya → Unicode | MIT longest-match mapping and pre-rules | Six upstream full-sentence fixtures | Other Sinhala font encodings are different |
| Bamini → Unicode | MIT inverse mapping, longest match, ambiguity retention | Tamil sample and vowel sequences; ambiguous symbol remains visible | Some legacy symbols have multiple possible Tamil meanings |
| Zawgyi ↔ Unicode | Google Myanmar Tools Apache-2.0 phase rules | Ordinary words and selected Unicode round trips | Not proof of round-trip identity for every legacy variant |

100,000 characters per conversion; plain .txt files under 400 KB; UTF-8 and Windows-1252 byte decoding. No text autosave, document upload or mapping CDN calls. The copy action falls back to selecting output if the Clipboard API is unavailable.

The Kruti source contains edge-case bugs in its original reph/index handling; only its mapping was reused and the JavaScript logic was rewritten with bounds checks. The Bamini source has multiple Tamil sequences mapped to `*`; this package retains that symbol and reports candidates instead of guessing.

**Counterexample:** ASCII `K` could be English text or a Bengali character in a Bijoy font run. No plain-text converter can infer the original font with certainty from that character alone. Paste only the selected legacy run. This package does not extract font runs from DOCX/PDF or perform OCR.

No proprietary font binaries are bundled. Source mapping licenses do not grant rights to distribute the original fonts. TXT conversion preserves text rather than formatting; output needs review against the original document.

## 5. Printable paper

The original generator emits vector line/circle/text instructions, then renders the same geometry to SVG and a minimal PDF 1.4 document. No PDF service or browser canvas rasterization is used.

- Graph, dot, isometric, hexagonal, five-line music staff, handwriting, ruled and weekly planner.
- A4 210 × 297 mm, A5 148 × 210 mm, US Letter 215.9 × 279.4 mm.
- Portrait/landscape; spacing 2–50 mm; margin 5–40 mm; line weight 0.05–1 mm; strict six-digit colour; opacity 0.1–1.
- Graph/dot spacing = adjacent guide distance.
- Hex spacing = opposite-flat distance. Complete hexagons remain inside margins; shared edges are deduplicated.
- Music spacing = line-to-line distance within a five-line staff; systems have extra separation.
- Handwriting spacing = top guide to baseline, with a dashed middle guide.
- Planner spacing = horizontal task-slot interval, with seven weekday columns.

PDF opacity is blended against the white page. Page dimensions are exact to the emitted PDF precision. Export complexity is capped at 50,000 elements.

**Counterexample:** a correct 5 mm PDF grid printed with “fit to page” can become smaller than 5 mm. Always print at actual size. Printer margins and driver scaling remain outside the generator.

## Cross-cutting design

- Static explanatory content, links, chord diagrams and reference tables appear in HTML before JavaScript runs.
- Browser inputs are constrained; pasted converter output uses textarea values, not HTML interpolation.
- SVG labels derive from controlled chord data; colours are validated. No arbitrary script enters generated SVG.
- Downloads use local Blobs; URL objects are released after download.
- Tool pages share content-hashed modules and CSS. No backend, account, database or recurring API quota is introduced.
- AdSense adapter is separate, disabled, and requires an explicit CMP consent event. It is not a CMP implementation.
