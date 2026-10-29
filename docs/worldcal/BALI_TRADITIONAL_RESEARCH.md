# Bali Calendar traditional-workspace research note

Date: 2026-10-29

This note records the public cultural/academic basis for the Bali Calendar redesign. It is intentionally separate from operational release documentation.

## Research findings

### 1. Tika is a Wariga calendar surface, not a Gregorian month with Balinese labels

Bali Province's Ceraken cultural inventory describes Tika as a traditional calendar constructed from mathematical Wariga calculations and containing Wewaran, Wuku, Ingkel and other calendrical markers represented through symbols on a rectangular board, paper or cloth.

Source:
- Ceraken Kebudayaan Bali, "Tika": https://ceraken.baliprov.go.id/detail/tika-1656550642

Product implication:
- Wuku and Wewaran are structural UI dimensions.
- Gregorian dates are translation/navigation metadata.
- Ingkel is visible at the Wuku level instead of being buried in a detail page.
- The old circular Pawukon graphic is educational, not the main calendar.

### 2. Pawukon and Sasih/Saka must remain distinct layers

Academic descriptions of the Balinese calendar describe 30 Wuku of seven days (210 days total), multiple concurrent Wewaran cycles, and a separate Penanggal/Panglong/Pengalantaka lunar layer used to place Purnama and Tilem.

Sources:
- I Putu Cahya Prawira, "Pengembangan Aplikasi Kalender Saka Bali pada Sistem Operasi Machintos": https://download.garuda.kemdikbud.go.id/article.php?article=1759276&title=Pengembangan+Aplikasi+Kalender+Saka+Bali+pada+Sistem+Operasi+Machintos&val=905
- Kemdikbud Warisan Budaya, "Pengalantaka": https://budaya.data.kemdikbud.go.id/wbtb/objek/AA001031

Product implication:
- Pawukon/Tika, Palelintangan, Sasih/Saka and Gregorian are separate modes.
- Annual Sasih mapping remains fail-closed unless a complete authoritative source is available.
- Purnama/Tilem facts may be shown from published annual tables without pretending they are derived from the 210-day cycle.

### 3. Ingkel belongs on the print-like Wuku grid

Published research describes six Ingkel Pandakan, each lasting seven days:
Wong, Sato, Mina, Manuk, Taru and Buku. The source also describes domain-specific cautions associated with each Ingkel.

Sources:
- "Penentuan Hari Baik Perkawinan di Bali Berbasis Logika Fuzzy": https://download.garuda.kemdikbud.go.id/article.php?article=1769488&title=PENENTUAN+HARI+BAIK+PERKAWINAN+DI+BALI+BERBASIS+LOGIKA+FUZZY&val=922
- Wahana Matematika dan Sains, local-wisdom discussion of Ingkel and environmental practice: https://download.garuda.kemdikbud.go.id/article.php?article=2690147&title=INTEGRASI+KEARIFAN+LOKAL+KE+DALAM+KURIKULUM+ILMU+ALAMIAH+DASAR&val=1371

Product implication:
- The monthly Tika board ends with an INGKEL row.
- The selected-day panel explains the relevant Ingkel domain and caution.
- Ingkel is not converted into a generic red/green score.

### 4. "Good / bad day" is multi-factor and interpretation can differ

Kemdikbud's Pengalantaka heritage record describes the Balinese calendar as a guide for determining favorable/unfavorable time for ritual, marriage, agriculture, construction, maritime activity and other work. The same record explicitly notes that Pendewasaan interpretation can differ between calendar publishers.

The Wariga literature also treats Dewasa Ayu/Ala as a combination of factors rather than one universal binary value.

Product implication:
- AafnaiPatro shows source-backed factor cards such as Pewiwahan Saptawara, Pitra restrictions, Mertha Yoga and Ingkel.
- It does not produce a universal "85% good day" score.
- A neutral/not-evaluated state is first-class.
- Missing Sasih or annual Tika evidence is never filled with a guessed interpretation.

### 5. Palelintangan is a related but distinct visual system

The Spurlock Museum catalogues a Balinese Palelintangan chart and notes that Balinese calendar systems are used to assess favorable days for many activities and that ritual dates can involve the convergence of Pawukon and lunar/Saka calendars.

Source:
- Spurlock Museum, "Cloth Painting: Palelintangan, a Chart of Days, or Balinese Calendar": https://www.spurlock.illinois.edu/collections/search-collection/details.php?a=2002.17.0020

Product implication:
- Palelintangan is a separate 7 Saptawara x 5 Pancawara = 35-cell mode.
- The structural intersection and urip can be shown now.
- Deity, animal, tree, wayang or other symbolic interpretations are withheld until each field has an auditable source. Museum artwork is not copied.

### 6. Traditional day-boundary handling must be explicit

Academic work on Bali calendar applications notes a sunrise-based day boundary rather than silently using midnight for traditional calculations.

Source:
- "Rancang Bangun Aplikasi Kalender Bali Menggunakan Framework Flutter": https://download.garuda.kemdikbud.go.id/article.php?article=3457945&title=Rancang+Bangun+Aplikasi+Kalender+Bali+Menggunakan+Framework+Flutter&val=30165

Product implication:
- Otonan preserves the existing before/after-sunrise ambiguity handling.
- Unknown birth time shows both valid possibilities instead of choosing one silently.

## Visual reference supplied by the product owner

The supplied printed-calendar reference uses a highly practical structure:
- Wuku as vertical month columns.
- Saptawara/weekday labels as rows.
- A large Gregorian date inside each cell.
- Dense smaller Wariga/Wewaran markers around the date.
- An Ingkel row at the bottom.
- Side lists for important days and other calendrical information.

The redesign adopts that information architecture but does not copy the artwork or typography. The digital version uses original responsive styling, explicit legends and source/status semantics.

## Implemented architecture

- Canonical 210-day Pawukon resolver with non-naive Caturwara/Astawara/Sangawara behavior.
- Monthly print-inspired Tika as the primary face.
- Expandable complete 210-day Wuku overview.
- Full Wewaran day detail.
- Ingkel and Jejepan in the canonical Pawukon day model.
- Palelintangan 35-cell mode.
- Sasih/Saka mode with fail-closed annual readiness.
- Published Purnama/Tilem kept separate from calculated Pawukon.
- Source-backed Dewasa factor cards rather than a universal score.
- Otonan sunrise-boundary handling.
- Piodalan and rerainan layers.
- Dedicated PWA with remembered last Bali view and offline warming.
- Generic Nepal/tool promotion removed from the Bali calendar face.

## Counterexample / limitation

A visually traditional-looking calendar can still be wrong if its data model is Gregorian-first or if it reduces Wariga to naive modulo cycles or a single "good day" score. Conversely, a mathematically correct 210-day engine can still be a poor Bali calendar if users cannot see Wuku, Wewaran, Ingkel, lunar context and activity-specific Dewasa factors together.

Both engine correctness and information architecture are therefore release requirements.


## Palelintangan 35-cell source upgrade

The All Skies Encyclopaedia research index by Susanne M. Hoffmann and Youla Azkarrula publishes the full 5×7 Palelintangan table and traces its starting point to Alfred Maaß (1929), *Astrologische Kalender der Balinesen*. It also records Saptawara patron-deity associations and variant spellings from Museum Bali and other collections.

Source:
- https://ase.exopla.net/index.php/Balinese_(All_Terms)

Implemented:
- all 35 lintang names in the Pancawara × Saptawara matrix;
- Saptawara patron context;
- variant-sensitive caution in the product.

Not implemented yet:
- animal/tree/wayang/forecast fields unless a stable per-cell source is established.

This caution is material: historical cataloguing notes that the relationship between a pictured constellation and a 5-day × 7-day date can vary across Palalintangan manuscripts/paintings. A visually plausible symbol is therefore not sufficient evidence for a canonical per-cell value.

## Supported dynamic range

The product support boundary is 1929-01-01 through 2129-12-31.

Within this range the deterministic Pawukon/Wewaran/Ingkel/Palelintangan and Pawukon-recurring-event layers are calculated dynamically. Published/official annual lunar layers remain independent and fail closed when an authoritative year mapping is absent. The 1929–2129 boundary is a support/QA window, not a mathematical limit of the 210-day engine.

## My Bali Calendar retention layer

The first personal retention layer is browser-local and deliberately does not require an account.

Stored locally:
- named people / relationship;
- birth date;
- before/after/unknown sunrise-boundary assumption for Otonan;
- saved Bali dates and notes;
- last-visit timestamp.

Return experience:
- nearest personal Otonan on reopen;
- 7-day, 35-day and 210-day public-calendar horizons;
- direct links to the source-backed Otonan calculator and ICS reminder feed;
- one-tap save from a deep day.

Durability:
- IndexedDB primary storage;
- localStorage fallback;
- explicit JSON export/import for device migration or recovery.

Privacy:
- My Bali data is not required for public calendar computation;
- the first version does not upload the local memory object;
- future account sync, if added, must be opt-in and separate from the local-first default.


## Official 2026 Kemenag cross-check

Ditjen Bimas Hindu Kementerian Agama publishes an official 2026 Hindu holy-day schedule (letter B-253/DJ.VI/Dt.VI.1.3/BA.03/09/2025, dated 22 September 2025). It identifies:
- Siwa Ratri — 17 January 2026;
- Tawur Agung Kesanga — 18 March 2026;
- Nyepi Saka 1948 — 19 March 2026;
- Saraswati — 4 April and 31 October 2026;
- Pagerwesi — 8 April and 4 November 2026;
- Penampahan Galungan — 16 June 2026;
- Galungan — 17 June 2026;
- Umanis Galungan — 18 June 2026;
- Penampahan Kuningan — 26 June 2026;
- Kuningan — 27 June 2026.

Source:
- https://bimashindu.kemenag.go.id/storage/files/Hari%20Libur%20Nasional%2C%20Libur%20Fakultatif%2C%20dan%20Cuti%20Bersama%20Tahun%202026.pdf

Product implication:
- 2026 Nyepi provenance is upgraded from a media-calendar source to official.
- The deterministic Pawukon engine is regression-tested against the official Saraswati, Pagerwesi, Galungan and Kuningan dates.
- This official schedule validates named holy days; it does not by itself provide a complete annual Sasih/Purnama/Tilem mapping, so the 2026 Sasih projection remains fail-closed.
