# Five-group feature coverage and route policy

The feature catalog contains exactly 91 obligations, arranged into five user-facing groups. Groups are ordinary product language; no competitor/source references are exposed in the frontend.

## Group A — दैनिक पञ्चाङ्ग · Daily Panchang (26)

Scope: daily Panchang summary; Tithi/Paksha; transitions; Nakshatra/Pada; Yoga; Karana/Vishti; Sun/Moon Rashi; Amanta/Purnimanta; Adhika/Kshaya Masa; Kshaya/Vriddhi Tithi; element timeline; 12/24/24+ display; sunrise/sunset; moonrise/moonset/illumination; Rahu Kalam; Yamaganda; Gulika; Abhijit Muhurta; Brahma Muhurta; Choghadiya; Panchak; Ganda Moola; Bhadra/Vishti; Abhijit Nakshatra; Sankranti; annual Shraddha Tithi.

Canonical hub: `/panchang`. Primary CTA from home is “आजको पञ्चाङ्ग / Today's Panchang”; calendar day routes link to the full Panchang view for the selected date. Existing `/date/*` and `/calendar/*` routes remain under their current owner.

## Group B — शुभ साइत र मुहूर्त · Auspicious Timing (14)

Scope: marriage/Vivah dates; Griha Pravesh; vehicle purchase; property registration; Bratabandha/Namakaran/business Sait; Sarvarthasiddhi; Amritsiddhi; Dwipushkar; Tripushkar; Ravi Pushya; Guru Pushya; Ravi Yoga; personalized auspicious-time entry link; Ekadashi Parana.

Canonical hub: `/muhurat`. Existing Sait remains the functional source for current supported categories. Existing `/mytime` remains the owner of personalised live ranking; the new hub only links to it. No code in the My Time feature is to be changed.

## Group C — ज्योतिष गणक · Jyotish Calculators (19)

Scope: Janma Kundali; Prashna Kundali; Pancha Pakshi; Gemstone; Rudraksha; Kalasarpa Yoga; Shani Sadesati; Janmarashi/Moon sign; Birthstar/Nakshatra; Lagna/Ascendant; Surya Rashi/Sun sign; Mangal Dosha; Guna Milan; daily Rashifal; Sahasra Purna Chandrodaya/1000 full moons; Vedic Time/Ghati-Pala; baby-name/Nakshatra naming; natal planetary positions; Dasha periods.

Canonical hub: `/jyotish`. Existing `/janmapatro`, `/janmapatro/milan.html`, `/rashifal`, and `/tools/baby-names` must be reused as canonical destinations. No duplicate Kundali or birth-profile implementation.

## Group D — ग्रह र खगोलीय घटना · Planets & Astronomy (20)

Scope: current sidereal planetary table; Rashi ingress; Nakshatra ingress; conjunction; angular aspects; retrograde/direct stations; combustion/rising; Gochar by natal Moon or Lagna; upcoming planet events; Moon phase/new/full moon; solar eclipse and local visibility; lunar eclipse and local visibility; equinoxes; solstices; planetary positions; Graha Asta/Uday; Graha Vakri/Margi; Hindu seasons; a shared planetary-event catalog.

Canonical hub: `/planets`. Existing `/moon` and `/eclipse` remain under the Day Atlas Worker. The new hub links to those paths rather than shadowing them.

## Group E — नेपाली संवत्, संस्कार र क्षेत्रीय पात्रो · Nepal Calendars & Traditions (12)

Scope: Nepali Panchang/BS calendar; Nepal Sambat; Tamil Panchangam; Gowri Nalla Neram; Tamil calendar/Karthigai; Tamil festivals/Kanda Sashti; Malayalam Panchangam; Bengali Panjika; Gujarati Samvat/Amanta calendar; Kumbha Mela; community calendars (Lhosar, Tharu, Mithila, Kirat, Hijri); devotional lyrics/gallery discovery.

Canonical hub: `/nepal-calendar`. Nepal BS and Nepal Sambat stay prominent. Regional systems are clearly labelled by tradition and are not presented as Nepal-government dates.

## Exactly 91 feature-entry rule

Group counts: 26 + 14 + 19 + 20 + 12 = **91**.

A feature can use one of five implementation dispositions:

1. **Reuse** — link to the existing canonical, working page/function. No copy/duplicate route.
2. **Enhance** — add discoverability and missing presentation to the existing page without changing its core behavior.
3. **Browser tool** — a genuine, lazy-loaded calculation in the browser with a functional input/result state.
4. **Static explainer** — reviewed educational content with source/method, suitable for indexing only if it adds real value.
5. **Deferred with reason** — only for rule data that lacks validated source material; show no fake calculator result and record a release-blocking/open decision as appropriate.

A catalog card is not feature completion. Each row must point to real functional code or a current canonical function and must have a test reference.

## Route ownership rules

- Keep `/`, `/tools`, `/tools/astro`, `/rashifal`, `/janmapatro`, `/janmapatro/milan.html`, `/tools/baby-names`, `/tools/sait`, `/tools/tithi-reminder`, `/moon`, `/eclipse`, `/date/*`, `/calendar/*`, and community routes alive.
- Add the missing hubs as new routes only after checking the exact/legacy route lists in the main SPA router and the Worker router.
- Use a single route catalog as the source for group listings, home cards, search/filter, static prerender inventory and sitemap URLs; don't hand-maintain five separate lists.
- Group hubs link existing features to existing canonical routes; aliases redirect/canonicalize instead of duplicating content.
- Query parameters hold transient UI state only and do not become canonical URLs or sitemap entries.
- No new route may match a generic route fallback unless the feature route is registered earlier and its calculation component exists.
- The `/tools` directory must provide a route from all five groups to every applicable feature; `/panchang` and the home quick-tools section cross-link the relevant daily calculation features.
