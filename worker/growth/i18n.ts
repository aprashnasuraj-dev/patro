/**
 * Locales for the global page families (moon, eclipse). Strings are written by hand for each language,
 * not machine-filled; have a native speaker review before launching a language (see STRATEGY-GLOBAL.md).
 *
 * Demand evidence (Oct 2026): DE "mond heute" ~150K/mo, "Vollmond"/"pleine lune" carry the same search
 * share in DE/FR as "full moon" in the US; Italy sends moongiant.com ~105K visits/mo; Spain's 2026 total
 * eclipse dwarfed every other sky search; "eclipse solaire 2027" +700%, "franja eclipse 2027" breakout.
 */
import type { GrowthCity } from "./cities";
import type { PhaseKey } from "./moon";

export type Lang = "en" | "de" | "fr" | "es" | "it";

export interface LocaleStrings {
  lang: Lang;
  intl: string;                 // Intl locale
  moonPath: string;             // today page
  fullMoonPath: (y: number) => string;
  eclipsePath: (iso: string) => string;
  eclipseHub: string;
  zones: Array<{ tz: string; label: string }>;
  cities: GrowthCity[];
  phases: Record<PhaseKey, string>;
  t: {
    brand: string; moonToday: string; fullMoons: string; eclipses: string;
    h1Today: (phase: string) => string;
    titleToday: (phase: string, lit: string, date: string) => string;
    descToday: (phase: string, lit: string, age: string, next: string) => string;
    todayIs: (phase: string, lit: string, age: string) => string;
    fullYes: string;
    fullNo: (date: string, time: string, days: number) => string;
    phase: string; illumination: string; age: string; days: string; distance: string; tithi: string; nextNew: string;
    nextPhases: string; riseSet: string; city: string; rise: string; set: string; riseNote: string;
    upcomingFull: string; calcTitle: string; calcBody: string;
    fullTitle: (y: number, n: number) => string; fullDesc: (y: number) => string; fullH1: (y: number) => string;
    fullNext: (date: string, time: string) => string; fullCount: (y: number, n: number) => string;
    date: string; name: string; hinduMonth: string; closest: string; farthest: string; blue: string; eclipseWord: (kind: string) => string;
    otherYears: string; namesNote: string; footer: string;
    // eclipse
    eclH1: (date: string, kind: string) => string; eclTitle: (date: string, kind: string) => string; eclDesc: (date: string, kind: string) => string;
    eclKind: Record<"total" | "annular" | "partial" | "hybrid", string>;
    eclIntro: (date: string, kind: string) => string;
    eclCols: { city: string; country: string; type: string; start: string; totality: string; max: string; end: string; coverage: string; sunAlt: string; duration: string };
    eclNotVisible: string; eclBelowHorizon: string; eclSafety: string; eclCityNote: string; eclTimesLocal: string;
    eclHubH1: string; eclHubTitle: string; eclHubDesc: string; eclHubIntro: string; eclGreatest: string; eclSolar: string; eclLunar: string;
  };
}

const c = (slug: string, name: string, region: string, lat: number, lon: number, tz: string, height = 0): GrowthCity =>
  ({ slug, name, region, country: "US", lat, lon, tz, height } as unknown as GrowthCity);

const PH = {
  en: { new: "New Moon", waxingCrescent: "Waxing Crescent", first: "First Quarter", waxingGibbous: "Waxing Gibbous", full: "Full Moon", waningGibbous: "Waning Gibbous", last: "Last Quarter", waningCrescent: "Waning Crescent" },
  de: { new: "Neumond", waxingCrescent: "Zunehmende Sichel", first: "Erstes Viertel", waxingGibbous: "Zunehmender Mond", full: "Vollmond", waningGibbous: "Abnehmender Mond", last: "Letztes Viertel", waningCrescent: "Abnehmende Sichel" },
  fr: { new: "Nouvelle lune", waxingCrescent: "Premier croissant", first: "Premier quartier", waxingGibbous: "Lune gibbeuse croissante", full: "Pleine lune", waningGibbous: "Lune gibbeuse décroissante", last: "Dernier quartier", waningCrescent: "Dernier croissant" },
  es: { new: "Luna nueva", waxingCrescent: "Luna creciente", first: "Cuarto creciente", waxingGibbous: "Gibosa creciente", full: "Luna llena", waningGibbous: "Gibosa menguante", last: "Cuarto menguante", waningCrescent: "Luna menguante" },
  it: { new: "Luna nuova", waxingCrescent: "Luna crescente", first: "Primo quarto", waxingGibbous: "Gibbosa crescente", full: "Luna piena", waningGibbous: "Gibbosa calante", last: "Ultimo quarto", waningCrescent: "Luna calante" },
} as const;

export const LOCALES: Record<Exclude<Lang, "en">, LocaleStrings> = {
  de: {
    lang: "de", intl: "de-DE", moonPath: "/de/mond", fullMoonPath: (y) => `/de/mond/vollmond/${y}`, eclipsePath: (d) => `/de/finsternis/${d}`, eclipseHub: "/de/finsternis",
    zones: [{ tz: "Europe/Berlin", label: "Deutschland, Österreich, Schweiz" }, { tz: "UTC", label: "UTC" }],
    cities: [c("berlin", "Berlin", "DE", 52.52, 13.405, "Europe/Berlin", 34), c("hamburg", "Hamburg", "DE", 53.5511, 9.9937, "Europe/Berlin", 6), c("muenchen", "München", "DE", 48.1351, 11.582, "Europe/Berlin", 519), c("koeln", "Köln", "DE", 50.9375, 6.9603, "Europe/Berlin", 53), c("frankfurt", "Frankfurt", "DE", 50.1109, 8.6821, "Europe/Berlin", 112), c("wien", "Wien", "AT", 48.2082, 16.3738, "Europe/Vienna", 190), c("zuerich", "Zürich", "CH", 47.3769, 8.5417, "Europe/Zurich", 408)],
    phases: PH.de,
    t: {
      brand: "Aafnai Patro", moonToday: "Mond heute", fullMoons: "Vollmond-Kalender", eclipses: "Finsternisse",
      h1Today: (p) => `Mondphase heute: ${p}`,
      titleToday: (p, l, d) => `Mond heute (${d}): ${p}, ${l} beleuchtet – Ist heute Vollmond?`,
      descToday: (p, l, a, n) => `Mondphase heute: ${p}, ${l} beleuchtet, Mondalter ${a} Tage. Nächster Vollmond: ${n}. Mondaufgang und Monduntergang für Berlin, Hamburg, München, Wien und Zürich.`,
      todayIs: (p, l, a) => `Der Mond ist heute <strong>${p}</strong>, zu ${l} beleuchtet und ${a} Tage alt.`,
      fullYes: "<strong>Ja – heute ist Vollmond.</strong> Für das Auge wirkt der Mond etwa eine Nacht vorher und nachher voll.",
      fullNo: (d, t, n) => `<strong>Nein – heute ist kein Vollmond.</strong> Der nächste Vollmond ist am <strong>${d}</strong> um ${t} Uhr (in etwa ${n} Tagen).`,
      phase: "Mondphase", illumination: "Beleuchtung", age: "Mondalter", days: "Tage", distance: "Entfernung zur Erde", tithi: "Hindu-Mondtag (Tithi)", nextNew: "Nächster Neumond",
      nextPhases: "Die nächsten Mondphasen", riseSet: "Mondaufgang und Monduntergang heute", city: "Stadt", rise: "Mondaufgang", set: "Monduntergang", riseNote: "Ortszeit. „—“ bedeutet: an diesem Tag kein Auf- bzw. Untergang.",
      upcomingFull: "Die nächsten Vollmonde", calcTitle: "So wird gerechnet", calcBody: "Phase, Beleuchtung und Entfernung werden für den aktuellen Moment mit einem astronomischen Modell (astronomy-engine, Genauigkeit etwa eine Bogenminute) berechnet. Hauptphasen sind exakte Zeitpunkte; ein Tag trägt ihren Namen, wenn der Zeitpunkt höchstens 12 Stunden entfernt ist.",
      fullTitle: (y, n) => `Vollmond ${y}: alle ${n} Termine mit Uhrzeit (MEZ/MESZ)`, fullDesc: (y) => `Alle Vollmonde ${y} mit genauer Uhrzeit für Deutschland, Österreich und die Schweiz, traditionellen Namen, Supermond, Blue Moon und Mondfinsternissen.`, fullH1: (y) => `Vollmond-Kalender ${y}`,
      fullNext: (d, t) => `Der nächste Vollmond ist am <strong>${d}</strong> um <strong>${t} Uhr</strong>.`, fullCount: (y, n) => `${y} gibt es <strong>${n} Vollmonde</strong>.`,
      date: "Datum", name: "Name", hinduMonth: "Hindu-Monat", closest: "Größter Vollmond des Jahres (erdnah)", farthest: "Kleinster Vollmond (erdfern)", blue: "Blue Moon", eclipseWord: (k) => ({ total: "Totale Mondfinsternis", partial: "Partielle Mondfinsternis", penumbral: "Halbschatten-Mondfinsternis" } as Record<string, string>)[k] || k,
      otherYears: "Andere Jahre", namesNote: "Traditionelle deutsche Monatsnamen des Vollmonds (z. B. Wolfsmond, Erntemond). Zeiten in MEZ/MESZ.", footer: "Berechnet mit astronomy-engine (Genauigkeit etwa eine Bogenminute), auf die Minute gerundet. <a href=\"/moon\">English</a> · <a href=\"/methodology\">Methodik</a>",
      eclH1: (d, k) => `${k} am ${d}: Uhrzeiten für Ihre Stadt`, eclTitle: (d, k) => `${k} ${d}: genaue Uhrzeiten, Bedeckung und Totalitätsdauer nach Stadt`, eclDesc: (d, k) => `${k} am ${d}: Beginn, Maximum, Ende und Bedeckungsgrad für Städte in Europa, Nordafrika und dem Nahen Osten.`,
      eclKind: { total: "Totale Sonnenfinsternis", annular: "Ringförmige Sonnenfinsternis", partial: "Partielle Sonnenfinsternis", hybrid: "Hybride Sonnenfinsternis" },
      eclIntro: (d, k) => `Die ${k} am ${d}: Die Tabelle zeigt für jede Stadt, wann die Finsternis beginnt, ihr Maximum erreicht und endet – in Ortszeit.`,
      eclCols: { city: "Stadt", country: "Land", type: "Art", start: "Beginn", totality: "Totalität", max: "Maximum", end: "Ende", coverage: "Bedeckung", sunAlt: "Sonnenhöhe", duration: "Dauer" },
      eclNotVisible: "Nicht sichtbar", eclBelowHorizon: "Sonne unter dem Horizont", eclSafety: "Niemals ungeschützt in die Sonne schauen. Nur zertifizierte Finsternisbrillen (ISO 12312-2) verwenden; ohne Schutz nur während der vollständigen Totalität.", eclCityNote: "Werte gelten für das Stadtzentrum. Nahe der Grenze der Totalitätszone ändert sich die Dauer schon über wenige Kilometer.", eclTimesLocal: "Alle Zeiten in Ortszeit der jeweiligen Stadt.",
      eclHubH1: "Sonnen- und Mondfinsternisse", eclHubTitle: "Sonnenfinsternis & Mondfinsternis: alle Termine 2026–2031", eclHubDesc: "Kommende Sonnen- und Mondfinsternisse mit Art, Datum und Sichtbarkeit; Uhrzeiten nach Stadt.", eclHubIntro: "Die nächsten Finsternisse weltweit. Öffnen Sie eine Sonnenfinsternis für Uhrzeiten in Ihrer Stadt.", eclGreatest: "Größte Finsternis", eclSolar: "Sonnenfinsternisse", eclLunar: "Mondfinsternisse",
    },
  },
  fr: {
    lang: "fr", intl: "fr-FR", moonPath: "/fr/lune", fullMoonPath: (y) => `/fr/lune/pleine-lune/${y}`, eclipsePath: (d) => `/fr/eclipse/${d}`, eclipseHub: "/fr/eclipse",
    zones: [{ tz: "Europe/Paris", label: "France, Belgique, Suisse" }, { tz: "America/Toronto", label: "Québec" }, { tz: "Africa/Casablanca", label: "Maroc" }, { tz: "Africa/Algiers", label: "Algérie, Tunisie" }],
    cities: [c("paris", "Paris", "FR", 48.8566, 2.3522, "Europe/Paris", 35), c("lyon", "Lyon", "FR", 45.764, 4.8357, "Europe/Paris", 173), c("marseille", "Marseille", "FR", 43.2965, 5.3698, "Europe/Paris", 12), c("toulouse", "Toulouse", "FR", 43.6047, 1.4442, "Europe/Paris", 146), c("bruxelles", "Bruxelles", "BE", 50.8503, 4.3517, "Europe/Brussels", 13), c("geneve", "Genève", "CH", 46.2044, 6.1432, "Europe/Zurich", 375), c("montreal", "Montréal", "QC", 45.5019, -73.5674, "America/Toronto", 36), c("casablanca", "Casablanca", "MA", 33.5731, -7.5898, "Africa/Casablanca", 27)],
    phases: PH.fr,
    t: {
      brand: "Aafnai Patro", moonToday: "Lune aujourd'hui", fullMoons: "Calendrier des pleines lunes", eclipses: "Éclipses",
      h1Today: (p) => `Phase de la lune aujourd'hui : ${p}`,
      titleToday: (p, l, d) => `Lune aujourd'hui (${d}) : ${p}, éclairée à ${l} – Est-ce la pleine lune ?`,
      descToday: (p, l, a, n) => `Phase de la lune aujourd'hui : ${p}, éclairée à ${l}, âge ${a} jours. Prochaine pleine lune : ${n}. Lever et coucher de lune à Paris, Lyon, Marseille, Bruxelles, Genève et Montréal.`,
      todayIs: (p, l, a) => `Aujourd'hui, la lune est en phase <strong>${p}</strong>, éclairée à ${l}, âgée de ${a} jours.`,
      fullYes: "<strong>Oui – c'est la pleine lune.</strong> À l'œil nu, elle paraît pleine environ une nuit avant et après.",
      fullNo: (d, t, n) => `<strong>Non – ce n'est pas la pleine lune ce soir.</strong> La prochaine pleine lune aura lieu le <strong>${d}</strong> à ${t} (dans environ ${n} jours).`,
      phase: "Phase", illumination: "Éclairement", age: "Âge de la lune", days: "jours", distance: "Distance à la Terre", tithi: "Jour lunaire hindou (tithi)", nextNew: "Prochaine nouvelle lune",
      nextPhases: "Prochaines phases de la lune", riseSet: "Lever et coucher de la lune aujourd'hui", city: "Ville", rise: "Lever", set: "Coucher", riseNote: "Heure locale. « — » : pas de lever ou de coucher ce jour-là.",
      upcomingFull: "Prochaines pleines lunes", calcTitle: "Méthode de calcul", calcBody: "La phase, l'éclairement et la distance sont calculés pour l'instant présent avec un modèle astronomique (astronomy-engine, précision d'environ une minute d'arc). Les phases principales sont des instants exacts ; un jour porte leur nom si l'instant se trouve à moins de 12 heures.",
      fullTitle: (y, n) => `Pleine lune ${y} : les ${n} dates et heures (heure de Paris)`, fullDesc: (y) => `Toutes les pleines lunes de ${y} avec l'heure exacte pour la France, la Belgique, la Suisse, le Québec et le Maghreb, la super lune, la lune bleue et les éclipses.`, fullH1: (y) => `Calendrier des pleines lunes ${y}`,
      fullNext: (d, t) => `La prochaine pleine lune aura lieu le <strong>${d}</strong> à <strong>${t}</strong> (heure de Paris).`, fullCount: (y, n) => `En ${y}, il y a <strong>${n} pleines lunes</strong>.`,
      date: "Date", name: "Remarque", hinduMonth: "Mois hindou", closest: "Super lune (la plus proche de l'année)", farthest: "Micro-lune (la plus lointaine)", blue: "Lune bleue", eclipseWord: (k) => ({ total: "Éclipse totale de Lune", partial: "Éclipse partielle de Lune", penumbral: "Éclipse pénombrale" } as Record<string, string>)[k] || k,
      otherYears: "Autres années", namesNote: "Heures de Paris (CET/CEST). Lune bleue = deuxième pleine lune d'un même mois calendaire.", footer: "Calculé avec astronomy-engine (précision d'environ une minute d'arc), arrondi à la minute. <a href=\"/moon\">English</a> · <a href=\"/methodology\">Méthodologie</a>",
      eclH1: (d, k) => `${k} du ${d} : les heures pour votre ville`, eclTitle: (d, k) => `${k} du ${d} : heures exactes, couverture et durée de la totalité par ville`, eclDesc: (d, k) => `${k} du ${d} : début, maximum, fin et pourcentage de couverture pour les villes d'Europe, du Maghreb et du Moyen-Orient.`,
      eclKind: { total: "Éclipse totale de Soleil", annular: "Éclipse annulaire de Soleil", partial: "Éclipse partielle de Soleil", hybrid: "Éclipse hybride de Soleil" },
      eclIntro: (d, k) => `${k} du ${d} : pour chaque ville, l'heure locale du début, du maximum et de la fin.`,
      eclCols: { city: "Ville", country: "Pays", type: "Type", start: "Début", totality: "Totalité", max: "Maximum", end: "Fin", coverage: "Couverture", sunAlt: "Hauteur du Soleil", duration: "Durée" },
      eclNotVisible: "Non visible", eclBelowHorizon: "Soleil sous l'horizon", eclSafety: "Ne regardez jamais le Soleil sans protection. Utilisez des lunettes d'éclipse certifiées (ISO 12312-2) ; sans protection seulement pendant la totalité complète.", eclCityNote: "Valeurs pour le centre-ville. Près de la limite de la bande de totalité, la durée change en quelques kilomètres.", eclTimesLocal: "Toutes les heures sont en heure locale de chaque ville.",
      eclHubH1: "Éclipses de Soleil et de Lune", eclHubTitle: "Éclipse solaire et éclipse lunaire : toutes les dates 2026–2031", eclHubDesc: "Prochaines éclipses de Soleil et de Lune avec type, date et visibilité ; heures par ville.", eclHubIntro: "Les prochaines éclipses dans le monde. Ouvrez une éclipse de Soleil pour les heures de votre ville.", eclGreatest: "Maximum de l'éclipse", eclSolar: "Éclipses de Soleil", eclLunar: "Éclipses de Lune",
    },
  },
  es: {
    lang: "es", intl: "es-ES", moonPath: "/es/luna", fullMoonPath: (y) => `/es/luna/luna-llena/${y}`, eclipsePath: (d) => `/es/eclipse/${d}`, eclipseHub: "/es/eclipse",
    zones: [{ tz: "Europe/Madrid", label: "España (península)" }, { tz: "Atlantic/Canary", label: "Canarias" }, { tz: "America/Mexico_City", label: "México" }, { tz: "America/Bogota", label: "Colombia, Perú" }, { tz: "America/Argentina/Buenos_Aires", label: "Argentina" }],
    cities: [c("madrid", "Madrid", "ES", 40.4168, -3.7038, "Europe/Madrid", 657), c("barcelona", "Barcelona", "ES", 41.3874, 2.1686, "Europe/Madrid", 12), c("sevilla", "Sevilla", "ES", 37.3891, -5.9845, "Europe/Madrid", 7), c("valencia", "Valencia", "ES", 39.4699, -0.3763, "Europe/Madrid", 15), c("ciudad-de-mexico", "Ciudad de México", "MX", 19.4326, -99.1332, "America/Mexico_City", 2240), c("bogota", "Bogotá", "CO", 4.711, -74.0721, "America/Bogota", 2640), c("buenos-aires", "Buenos Aires", "AR", -34.6037, -58.3816, "America/Argentina/Buenos_Aires", 25), c("lima", "Lima", "PE", -12.0464, -77.0428, "America/Lima", 150)],
    phases: PH.es,
    t: {
      brand: "Aafnai Patro", moonToday: "Luna hoy", fullMoons: "Calendario de lunas llenas", eclipses: "Eclipses",
      h1Today: (p) => `Fase lunar hoy: ${p}`,
      titleToday: (p, l, d) => `Luna hoy (${d}): ${p}, iluminada al ${l} – ¿Hay luna llena hoy?`,
      descToday: (p, l, a, n) => `Fase lunar hoy: ${p}, iluminada al ${l}, edad ${a} días. Próxima luna llena: ${n}. Salida y puesta de la luna en Madrid, Barcelona, Sevilla, Ciudad de México, Bogotá y Buenos Aires.`,
      todayIs: (p, l, a) => `Hoy la luna está en <strong>${p}</strong>, iluminada al ${l} y con ${a} días de edad.`,
      fullYes: "<strong>Sí, hoy hay luna llena.</strong> A simple vista parece llena aproximadamente una noche antes y después.",
      fullNo: (d, t, n) => `<strong>No, hoy no hay luna llena.</strong> La próxima luna llena será el <strong>${d}</strong> a las ${t} (dentro de unos ${n} días).`,
      phase: "Fase", illumination: "Iluminación", age: "Edad de la luna", days: "días", distance: "Distancia a la Tierra", tithi: "Día lunar hindú (tithi)", nextNew: "Próxima luna nueva",
      nextPhases: "Próximas fases lunares", riseSet: "Salida y puesta de la luna hoy", city: "Ciudad", rise: "Salida", set: "Puesta", riseNote: "Hora local. «—» significa que la luna no sale o no se pone ese día.",
      upcomingFull: "Próximas lunas llenas", calcTitle: "Cómo se calcula", calcBody: "La fase, la iluminación y la distancia se calculan para este momento con un modelo astronómico (astronomy-engine, precisión de aproximadamente un minuto de arco). Las fases principales son instantes exactos; un día lleva su nombre si el instante ocurre a menos de 12 horas.",
      fullTitle: (y, n) => `Luna llena ${y}: las ${n} fechas y horas (España y Latinoamérica)`, fullDesc: (y) => `Todas las lunas llenas de ${y} con la hora exacta para España, Canarias, México, Colombia y Argentina, superluna, luna azul y eclipses.`, fullH1: (y) => `Calendario de lunas llenas ${y}`,
      fullNext: (d, t) => `La próxima luna llena será el <strong>${d}</strong> a las <strong>${t}</strong> (hora peninsular).`, fullCount: (y, n) => `En ${y} hay <strong>${n} lunas llenas</strong>.`,
      date: "Fecha", name: "Nota", hinduMonth: "Mes hindú", closest: "Superluna (la más cercana del año)", farthest: "Microluna (la más lejana)", blue: "Luna azul", eclipseWord: (k) => ({ total: "Eclipse lunar total", partial: "Eclipse lunar parcial", penumbral: "Eclipse lunar penumbral" } as Record<string, string>)[k] || k,
      otherYears: "Otros años", namesNote: "Horas en España peninsular y en las zonas indicadas. Luna azul = segunda luna llena en un mismo mes.", footer: "Calculado con astronomy-engine (precisión de aproximadamente un minuto de arco), redondeado al minuto. <a href=\"/moon\">English</a> · <a href=\"/methodology\">Metodología</a>",
      eclH1: (d, k) => `${k} del ${d}: horarios para tu ciudad`, eclTitle: (d, k) => `${k} del ${d}: horas exactas, porcentaje y duración de la totalidad por ciudad`, eclDesc: (d, k) => `${k} del ${d}: inicio, máximo, fin y porcentaje de ocultación en ciudades de España, Marruecos, Egipto y el resto de Europa y Oriente Próximo.`,
      eclKind: { total: "Eclipse total de Sol", annular: "Eclipse anular de Sol", partial: "Eclipse parcial de Sol", hybrid: "Eclipse híbrido de Sol" },
      eclIntro: (d, k) => `${k} del ${d}: para cada ciudad, la hora local de inicio, máximo y final.`,
      eclCols: { city: "Ciudad", country: "País", type: "Tipo", start: "Inicio", totality: "Totalidad", max: "Máximo", end: "Fin", coverage: "Ocultación", sunAlt: "Altura del Sol", duration: "Duración" },
      eclNotVisible: "No visible", eclBelowHorizon: "Sol bajo el horizonte", eclSafety: "No mires nunca al Sol sin protección. Usa gafas de eclipse homologadas (ISO 12312-2); sin protección solo durante la totalidad completa.", eclCityNote: "Valores para el centro de la ciudad. Cerca del borde de la franja de totalidad, la duración cambia en pocos kilómetros.", eclTimesLocal: "Todas las horas son la hora local de cada ciudad.",
      eclHubH1: "Eclipses de Sol y de Luna", eclHubTitle: "Eclipse solar y eclipse lunar: todas las fechas 2026–2031", eclHubDesc: "Próximos eclipses de Sol y de Luna con tipo, fecha y visibilidad; horarios por ciudad.", eclHubIntro: "Los próximos eclipses en el mundo. Abre un eclipse de Sol para ver los horarios de tu ciudad.", eclGreatest: "Máximo del eclipse", eclSolar: "Eclipses de Sol", eclLunar: "Eclipses de Luna",
    },
  },
  it: {
    lang: "it", intl: "it-IT", moonPath: "/it/luna", fullMoonPath: (y) => `/it/luna/luna-piena/${y}`, eclipsePath: (d) => `/it/eclissi/${d}`, eclipseHub: "/it/eclissi",
    zones: [{ tz: "Europe/Rome", label: "Italia" }, { tz: "UTC", label: "UTC" }],
    cities: [c("roma", "Roma", "IT", 41.9028, 12.4964, "Europe/Rome", 21), c("milano", "Milano", "IT", 45.4642, 9.19, "Europe/Rome", 120), c("napoli", "Napoli", "IT", 40.8518, 14.2681, "Europe/Rome", 17), c("torino", "Torino", "IT", 45.0703, 7.6869, "Europe/Rome", 239), c("firenze", "Firenze", "IT", 43.7696, 11.2558, "Europe/Rome", 50), c("bologna", "Bologna", "IT", 44.4949, 11.3426, "Europe/Rome", 54), c("palermo", "Palermo", "IT", 38.1157, 13.3615, "Europe/Rome", 14)],
    phases: PH.it,
    t: {
      brand: "Aafnai Patro", moonToday: "Luna oggi", fullMoons: "Calendario lune piene", eclipses: "Eclissi",
      h1Today: (p) => `Fase lunare oggi: ${p}`,
      titleToday: (p, l, d) => `Luna oggi (${d}): ${p}, illuminata al ${l} – Stasera c'è la luna piena?`,
      descToday: (p, l, a, n) => `Fase lunare di oggi: ${p}, illuminata al ${l}, età ${a} giorni. Prossima luna piena: ${n}. Sorgere e tramonto della luna a Roma, Milano, Napoli, Torino e Palermo.`,
      todayIs: (p, l, a) => `Oggi la luna è <strong>${p}</strong>, illuminata al ${l} e ha ${a} giorni.`,
      fullYes: "<strong>Sì, oggi c'è la luna piena.</strong> A occhio nudo appare piena circa una notte prima e dopo.",
      fullNo: (d, t, n) => `<strong>No, stasera non c'è la luna piena.</strong> La prossima luna piena sarà il <strong>${d}</strong> alle ${t} (tra circa ${n} giorni).`,
      phase: "Fase", illumination: "Illuminazione", age: "Età della luna", days: "giorni", distance: "Distanza dalla Terra", tithi: "Giorno lunare indù (tithi)", nextNew: "Prossima luna nuova",
      nextPhases: "Prossime fasi lunari", riseSet: "Sorgere e tramonto della luna oggi", city: "Città", rise: "Sorge", set: "Tramonta", riseNote: "Ora locale. «—» significa che la luna non sorge o non tramonta quel giorno.",
      upcomingFull: "Prossime lune piene", calcTitle: "Come viene calcolato", calcBody: "Fase, illuminazione e distanza sono calcolate per questo momento con un modello astronomico (astronomy-engine, precisione di circa un primo d'arco). Le fasi principali sono istanti esatti; un giorno prende il loro nome se l'istante cade entro 12 ore.",
      fullTitle: (y, n) => `Luna piena ${y}: tutte le ${n} date e gli orari (ora italiana)`, fullDesc: (y) => `Tutte le lune piene del ${y} con l'orario esatto per l'Italia, superluna, luna blu ed eclissi.`, fullH1: (y) => `Calendario delle lune piene ${y}`,
      fullNext: (d, t) => `La prossima luna piena sarà il <strong>${d}</strong> alle <strong>${t}</strong>.`, fullCount: (y, n) => `Nel ${y} ci sono <strong>${n} lune piene</strong>.`,
      date: "Data", name: "Nota", hinduMonth: "Mese indù", closest: "Superluna (la più vicina dell'anno)", farthest: "Microluna (la più lontana)", blue: "Luna blu", eclipseWord: (k) => ({ total: "Eclissi lunare totale", partial: "Eclissi lunare parziale", penumbral: "Eclissi lunare di penombra" } as Record<string, string>)[k] || k,
      otherYears: "Altri anni", namesNote: "Orari in ora italiana (CET/CEST). Luna blu = seconda luna piena nello stesso mese.", footer: "Calcolato con astronomy-engine (precisione di circa un primo d'arco), arrotondato al minuto. <a href=\"/moon\">English</a> · <a href=\"/methodology\">Metodologia</a>",
      eclH1: (d, k) => `${k} del ${d}: gli orari per la tua città`, eclTitle: (d, k) => `${k} del ${d}: orari esatti, percentuale e durata della totalità per città`, eclDesc: (d, k) => `${k} del ${d}: inizio, massimo, fine e percentuale di copertura per le città d'Italia, d'Europa, del Nord Africa e del Medio Oriente.`,
      eclKind: { total: "Eclissi totale di Sole", annular: "Eclissi anulare di Sole", partial: "Eclissi parziale di Sole", hybrid: "Eclissi ibrida di Sole" },
      eclIntro: (d, k) => `${k} del ${d}: per ogni città, l'ora locale di inizio, massimo e fine.`,
      eclCols: { city: "Città", country: "Paese", type: "Tipo", start: "Inizio", totality: "Totalità", max: "Massimo", end: "Fine", coverage: "Copertura", sunAlt: "Altezza del Sole", duration: "Durata" },
      eclNotVisible: "Non visibile", eclBelowHorizon: "Sole sotto l'orizzonte", eclSafety: "Non guardare mai il Sole senza protezione. Usa occhiali per eclissi certificati (ISO 12312-2); senza protezione solo durante la totalità completa.", eclCityNote: "Valori per il centro città. Vicino al bordo della fascia di totalità la durata cambia in pochi chilometri.", eclTimesLocal: "Tutti gli orari sono nell'ora locale di ciascuna città.",
      eclHubH1: "Eclissi di Sole e di Luna", eclHubTitle: "Eclissi solare ed eclissi lunare: tutte le date 2026–2031", eclHubDesc: "Prossime eclissi di Sole e di Luna con tipo, data e visibilità; orari per città.", eclHubIntro: "Le prossime eclissi nel mondo. Apri un'eclissi di Sole per gli orari della tua città.", eclGreatest: "Massimo dell'eclissi", eclSolar: "Eclissi di Sole", eclLunar: "Eclissi di Luna",
    },
  },
};

export const EN_PHASES = PH.en;

/** German traditional full-moon names by calendar month (widely used in German almanacs). */
export const DE_FULL_MOON_NAMES = ["Wolfsmond", "Hornungmond", "Lenzmond", "Ostermond", "Wonnemond", "Brachmond", "Heumond", "Erntemond", "Herbstmond", "Weinmond", "Nebelmond", "Julmond"];

export function fmtTimeL(instant: Date | null | undefined, tz: string, intl: string, withDate = false) {
  if (!instant) return "—";
  return new Intl.DateTimeFormat(intl, { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: intl === "en-US" ? true : false, ...(withDate ? { day: "numeric", month: "short" } : {}) }).format(instant);
}
export function fmtDateL(instant: Date, tz: string, intl: string, long = true) {
  return new Intl.DateTimeFormat(intl, { timeZone: tz, weekday: long ? "long" : "short", day: "numeric", month: long ? "long" : "short", year: "numeric" }).format(instant);
}

/** hreflang set for the moon "today" page family. */
export function moonTodayAlternates() {
  return [{ lang: "en", path: "/moon" }, ...Object.values(LOCALES).map((l) => ({ lang: l.lang, path: l.moonPath })), { lang: "x-default", path: "/moon" }];
}
export function fullMoonAlternates(y: number) {
  return [{ lang: "en", path: `/moon/full-moon/${y}` }, ...Object.values(LOCALES).map((l) => ({ lang: l.lang, path: l.fullMoonPath(y) })), { lang: "x-default", path: `/moon/full-moon/${y}` }];
}
export function eclipseAlternates(iso: string) {
  return [{ lang: "en", path: `/eclipse/${iso}` }, ...Object.values(LOCALES).map((l) => ({ lang: l.lang, path: l.eclipsePath(iso) })), { lang: "x-default", path: `/eclipse/${iso}` }];
}
