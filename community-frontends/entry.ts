// One engine bundle shared by all community pages (inlined into each portable HTML file).
export { SUITES } from '../src/patro-tools/communities/registry';
export { suiteCalendar, upcoming, resolveFestival } from '../src/patro-tools/communities/shared/resolve';
export { lhoFor } from '../src/patro-tools/communities/lhosar/lho';
export { ANIMALS, elementOf, eraYear } from '../src/patro-tools/communities/shared/cycles';
export { prayerTimes, qibla, NEPAL_CITIES, ramadanDay } from '../src/patro-tools/communities/hijri/prayer';
export { hijriOf, HIJRI_MONTHS, expectedMonthStart, crescentLikely, tabularFromIso } from '../src/patro-tools/communities/hijri/calendar';
export { devanagariToTirhuta } from '../src/patro-tools/communities/mithila/tirhuta';
export { devanagariToLimbu } from '../src/patro-tools/communities/kirat/limbu';
export { yeleYear, yeleNewYear } from '../src/patro-tools/communities/kirat/yele';
export { devanagariToNewa } from '../src/patro-tools/nepal-sambat/newa-script';
export { LHOSAR_GREETINGS } from '../src/patro-tools/communities/lhosar/data';
export { SAKELA_NAMES, KIRAT_SEASONAL } from '../src/patro-tools/communities/kirat/data';
export { sunriseSunset, moonPhaseAngle, addDays } from '../src/patro-tools/core/astro';
export { festivalsOfYear as nsFestivalsOfYear, nsFromAd, formatNs } from '../src/patro-tools/nepal-sambat/engine';
export { FESTIVALS as HINDU_FESTIVALS, nextFestivalDate } from '../src/patro-tools/festivals/festivals';
