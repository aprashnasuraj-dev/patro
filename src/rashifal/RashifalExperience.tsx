import { useEffect, useMemo, useState } from "react";
import { setPageTitle } from "../title";
import { l, useUiLanguage } from "../useUiLanguage";
import "./rashifal-experience.css";

type Period = "daily" | "weekly" | "monthly";
type Publication = {
  period?: Period;
  period_window?: { start_date?: string; end_date_exclusive?: string };
  window?: { start_date?: string; end_date_exclusive?: string };
  readings?: any[];
  items?: any[];
  engine_version?: string;
  schema_version?: string | number;
  source?: string;
};

const PERIODS: Period[] = ["daily", "weekly", "monthly"];
const CACHE_PREFIX = "patro.rashifal.publication.v2.";
const PREF_KEY = "patro.rashifal.sign.v1";
const SIGNS = [
  ["aries", "मेष", "Aries", "♈"], ["taurus", "वृष", "Taurus", "♉"], ["gemini", "मिथुन", "Gemini", "♊"],
  ["cancer", "कर्कट", "Cancer", "♋"], ["leo", "सिंह", "Leo", "♌"], ["virgo", "कन्या", "Virgo", "♍"],
  ["libra", "तुला", "Libra", "♎"], ["scorpio", "वृश्चिक", "Scorpio", "♏"], ["sagittarius", "धनु", "Sagittarius", "♐"],
  ["capricorn", "मकर", "Capricorn", "♑"], ["aquarius", "कुम्भ", "Aquarius", "♒"], ["pisces", "मीन", "Pisces", "♓"],
] as const;

function todayNepal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function cacheKey(period: Period) { return CACHE_PREFIX + period; }
function normalizePublication(value: any): Publication | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value.payload && typeof value.payload === "object" ? value.payload : value;
  return Array.isArray(candidate.readings) || Array.isArray(candidate.items) ? candidate : null;
}
function loadCached(period: Period): Publication | null {
  try { return normalizePublication(JSON.parse(localStorage.getItem(cacheKey(period)) || "null")?.data); } catch { return null; }
}
function storeCached(period: Period, data: Publication) {
  try { localStorage.setItem(cacheKey(period), JSON.stringify({ saved_at: new Date().toISOString(), data })); } catch {}
}
function publicationCovers(data: Publication | null, date: string) {
  if (!data) return false;
  const window = data.period_window || data.window;
  if (!window?.start_date || !window?.end_date_exclusive) return true;
  return window.start_date <= date && date < window.end_date_exclusive;
}
function readingsOf(data: Publication | null) { return (data?.readings || data?.items || []) as any[]; }
function signId(reading: any) { return String(reading?.sign?.id || reading?.sign || "").toLowerCase(); }
function signMeta(id: string) { return SIGNS.find((item) => item[0] === id) || null; }
function readingText(reading: any, language: "ne" | "en") {
  if (language === "en") return reading?.summary_en || reading?.text_en || reading?.reading_en || reading?.summary || reading?.text || reading?.reading || reading?.summary_ne || "";
  return reading?.summary_ne || reading?.text_ne || reading?.reading_ne || reading?.summary || reading?.text || reading?.reading || reading?.summary_en || "";
}
function periodLabel(period: Period, language: "ne" | "en") {
  return period === "daily" ? l(language, "दैनिक", "Daily") : period === "weekly" ? l(language, "साप्ताहिक", "Weekly") : l(language, "मासिक", "Monthly");
}
function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function fallbackWindow(period: Period, date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  if (period === "daily") return { start_date: date, end_date_exclusive: addDays(date, 1) };
  if (period === "weekly") {
    const mondayOffset = (value.getUTCDay() + 6) % 7;
    const start = addDays(date, -mondayOffset);
    return { start_date: start, end_date_exclusive: addDays(start, 7) };
  }
  const start = `${date.slice(0, 8)}01`;
  value.setUTCDate(1); value.setUTCMonth(value.getUTCMonth() + 1);
  return { start_date: start, end_date_exclusive: value.toISOString().slice(0, 10) };
}
const FALLBACK_NE = [
  "आज प्राथमिकता स्पष्ट राख्दा काम सहज बन्छ। हतारभन्दा क्रमबद्ध निर्णय, खुला संवाद र अधुरा काम पूरा गर्ने बानीले राम्रो परिणाम दिन सक्छ।",
  "स्थिर गति तपाईंको बल बन्न सक्छ। खर्च, समय र वचनमा सन्तुलन राख्नुहोस्; नजिकको व्यक्तिसँगको सानो संवादले गलतफहमी हटाउन मद्दत गर्न सक्छ।",
  "नयाँ सूचना र कुराकानीबाट अवसर देखिन सक्छ। धेरै कुरा एकैचोटि समात्नुभन्दा महत्त्वपूर्ण दुई काम रोजेर पूरा गर्नु उपयोगी हुन्छ।",
  "घर, परिवार वा व्यक्तिगत सीमामा ध्यान दिनुपर्ने समय हो। भावनात्मक प्रतिक्रिया दिनुअघि केही समय लिएर तथ्य र आवश्यकता छुट्याउनु फाइदाजनक हुन्छ।",
  "आत्मविश्वास उपयोगी छ, तर अरूको योगदानलाई ठाउँ दिँदा प्रभाव अझ बढ्छ। सिर्जनात्मक काम, प्रस्तुति वा नेतृत्वमा स्पष्ट उद्देश्य राख्नुहोस्।",
  "सानो सुधारले ठूलो फरक पार्न सक्छ। विवरण जाँच्नुहोस्, कामको सूची छोट्याउनुहोस् र शरीर तथा मनलाई पर्याप्त विश्राम दिने तालिका बनाउनुहोस्।",
  "सम्बन्ध र सहकार्यमा बराबरी खोज्नुहोस्। निर्णय टारिरहनुभन्दा विकल्पका फाइदा–बेफाइदा लेखेर समयसीमा तोक्नु उपयोगी हुन्छ।",
  "गहिरो ध्यान चाहिने कामका लागि राम्रो समय हो। गोप्य चिन्ता मनमै राख्नुभन्दा विश्वासिलो व्यक्तिसँग स्पष्ट कुरा गर्दा हलुका महसुस हुन सक्छ।",
  "दृष्टिकोण फराकिलो राख्नुहोस्। सिकाइ, यात्रा योजना वा नयाँ विचारमा उत्साह राम्रो छ, तर प्रतिबद्धता गर्नुअघि समय र स्रोत यथार्थ रूपमा जाँच्नुहोस्।",
  "अनुशासनले प्रगति देखाउँछ। जिम्मेवारी धेरै भए पनि सबै कुरा आफैं बोक्नुपर्दैन; काम बाँड्नु र सीमित लक्ष्य राख्नु प्रभावकारी हुन्छ।",
  "अलग ढंगले सोच्ने तपाईंको क्षमता उपयोगी हुन सक्छ। नयाँ प्रयोग गर्दा आधारभूत आवश्यकता र अरूलाई बुझिने स्पष्ट व्याख्या नछुटाउनुहोस्।",
  "संवेदनशीलता र कल्पनाशक्ति बल बन्न सक्छ। अस्पष्ट संकेतको अनुमान गर्नुको सट्टा सोधेर बुझ्नुहोस् र सिर्जनात्मक ऊर्जालाई ठोस काममा लगाउनुहोस्।",
];
const FALLBACK_EN = [
  "Clear priorities can make the period easier to manage. Favor ordered decisions over haste, communicate openly, and finish what is already in motion before adding more.",
  "A steady pace can be your advantage. Keep time, spending, and commitments balanced; a small honest conversation may clear up a lingering misunderstanding.",
  "Useful ideas may arrive through information and conversation. Instead of chasing everything at once, choose the two most important tasks and complete them well.",
  "Home, family, or personal boundaries may need attention. Before reacting emotionally, give yourself time to separate facts, needs, and assumptions.",
  "Confidence helps, but your influence grows when others have room to contribute. Keep a clear purpose in creative work, presentations, or leadership.",
  "Small improvements can have an outsized effect. Check details, shorten the task list, and leave enough room for physical and mental rest.",
  "Look for balance in relationships and collaboration. Rather than delaying a choice indefinitely, compare the trade-offs and give the decision a deadline.",
  "Focused work is favored. If a concern has been kept private for too long, a direct conversation with someone trustworthy may bring useful perspective.",
  "Keep the wider view in sight. Learning, travel plans, and new ideas can be energizing, but check the real time and resources required before committing.",
  "Discipline can produce visible progress. You do not have to carry every responsibility alone; delegation and a smaller set of goals may work better.",
  "Your unconventional thinking can be useful. When experimenting, keep basic needs covered and explain the idea clearly enough for others to follow.",
  "Sensitivity and imagination can be strengths. Ask rather than guessing at unclear signals, and channel creative energy into one concrete piece of work.",
];
function fallbackPublication(period: Period, date: string): Publication {
  const window = fallbackWindow(period, date);
  const periodNe = period === "daily" ? "आज" : period === "weekly" ? "यस साता" : "यस महिना";
  const periodEn = period === "daily" ? "Today" : period === "weekly" ? "This week" : "This month";
  return {
    period,
    period_window: window,
    engine_version: "aafnai-native-fallback-1",
    schema_version: 1,
    source: "native-bundle",
    readings: SIGNS.map(([id, ne, en], index) => ({
      sign: { id, name_ne: ne, name_en: en },
      summary_ne: `${periodNe}: ${FALLBACK_NE[index]}`,
      summary_en: `${periodEn}: ${FALLBACK_EN[index]}`,
    })),
  };
}
async function fetchPublication(period: Period, date: string, signal: AbortSignal) {
  const response = await fetch(`/api/v1/rashifal/universal?period=${period}&system=vedic&calendar=bs&date=${date}`, { signal, credentials: "same-origin", headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = normalizePublication(await response.json());
  if (!data) throw new Error("invalid_rashifal_publication");
  return data;
}

export function RashifalExperience() {
  const language = useUiLanguage();
  const date = useMemo(todayNepal, []);
  const [period, setPeriod] = useState<Period>("daily");
  const [publications, setPublications] = useState<Partial<Record<Period, Publication>>>(() => {
    const out: Partial<Record<Period, Publication>> = {};
    for (const item of PERIODS) { const cached = loadCached(item); if (cached) out[item] = cached; }
    return out;
  });
  const [errors, setErrors] = useState<Partial<Record<Period, string>>>({});
  const [refreshing, setRefreshing] = useState(true);
  const [remember, setRemember] = useState(() => { try { return Boolean(localStorage.getItem(PREF_KEY)); } catch { return false; } });
  const [selectedSign, setSelectedSign] = useState(() => { try { return localStorage.getItem(PREF_KEY) || ""; } catch { return ""; } });
  const [personalized, setPersonalized] = useState<any>(null);
  const [personalError, setPersonalError] = useState("");

  useEffect(() => { setPageTitle(language === "en" ? "Rashifal" : "राशिफल"); }, [language]);

  useEffect(() => {
    const controller = new AbortController();
    setRefreshing(true);
    Promise.allSettled(PERIODS.map(async (item) => {
      try {
        const data = await fetchPublication(item, date, controller.signal);
        storeCached(item, data);
        setPublications((prev) => ({ ...prev, [item]: data }));
        setErrors((prev) => ({ ...prev, [item]: "" }));
      } catch {
        const cached = loadCached(item);
        const usable = cached && publicationCovers(cached, date) ? cached : fallbackPublication(item, date);
        storeCached(item, usable);
        setPublications((prev) => ({ ...prev, [item]: usable }));
        setErrors((prev) => ({ ...prev, [item]: "" }));
      }
    })).finally(() => setRefreshing(false));
    return () => controller.abort();
  }, [date, language]);

  const current = publications[period] || null;
  const readings = readingsOf(current);
  const stale = Boolean(current && !publicationCovers(current, date));
  const nativeFallback = current?.source === "native-bundle";

  const chooseSign = async (id: string) => {
    setSelectedSign(id);
    setPersonalized(null);
    setPersonalError("");
    if (remember) { try { localStorage.setItem(PREF_KEY, id); } catch {} }
    const cachedReading = readings.find((item) => signId(item) === id) || null;
    if (cachedReading) setPersonalized({ reading: cachedReading, source: nativeFallback ? "native-bundle" : "local-publication" });
    try {
      const response = await fetch("/api/v1/rashifal/personalized", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sign: id, period, system: "vedic", calendar: "bs", date }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      if (body?.reading) setPersonalized({ ...body, source: "personalized-endpoint" });
    } catch {
      if (!cachedReading) setPersonalError(l(language, "व्यक्तिगत दृश्य अहिले उपलब्ध छैन।", "Personalized view is currently unavailable."));
    }
  };

  const toggleRemember = (value: boolean) => {
    setRemember(value);
    try {
      if (value && selectedSign) localStorage.setItem(PREF_KEY, selectedSign);
      if (!value) localStorage.removeItem(PREF_KEY);
    } catch {}
  };

  const personalizedReading = personalized?.reading || (selectedSign ? readings.find((item) => signId(item) === selectedSign) : null);
  const selectedMeta = signMeta(selectedSign);

  return <main className="rx-page" id="main-content">
    <section className="rx-hero">
      <div><span>{l(language, "ज्योतिष · प्रकाशित राशिफल", "Jyotish · Published Rashifal")}</span><h1>{l(language, "राशिफल", "Rashifal")}</h1><p>{l(language, "दैनिक, साप्ताहिक र मासिक प्रकाशन एउटै ठाउँमा। पछिल्लो सफल लोड यस यन्त्रमा सुरक्षित रहन्छ।", "Daily, weekly and monthly publications in one place. The last successful publication stays cached on this device.")}</p></div>
      <a href="/jyotish/china">{l(language, "जन्मपत्रो खोल्नुहोस् →", "Open birth chart →")}</a>
    </section>

    <nav className="rx-tabs" aria-label={l(language, "राशिफल अवधि", "Rashifal period")}>
      {PERIODS.map((item) => <button key={item} type="button" className={period === item ? "is-active" : ""} onClick={() => { setPeriod(item); setPersonalized(null); setPersonalError(""); }}>{periodLabel(item, language)}</button>)}
    </nav>

    {stale ? <div className="rx-status is-warning">{l(language, "नेटवर्क उपलब्ध नभएकाले यस यन्त्रमा सुरक्षित पछिल्लो प्रकाशन देखाइएको छ।", "Network is unavailable, so the last publication saved on this device is shown.")}</div> : null}
    {nativeFallback ? <div className="rx-status">{l(language, "सर्भर प्रकाशन उपलब्ध नभए पनि आफ्नै पात्रोको स्थानीय राशिफल निरन्तर उपलब्ध छ।", "Aafnai Patro's local Rashifal remains available even when the server publication is unavailable.")}</div> : null}
    {!current && refreshing ? <div className="rx-status">{l(language, "राशिफल लोड हुँदैछ…", "Loading Rashifal…")}</div> : null}
    {!current && errors[period] ? <div className="rx-status is-error">{errors[period]}</div> : null}

    {readings.length ? <section className="rx-grid" aria-label={`${periodLabel(period, language)} Rashifal`}>
      {readings.map((reading, index) => {
        const id = signId(reading); const meta = signMeta(id);
        const name = language === "en" ? (reading?.sign?.name_en || meta?.[2] || reading?.sign?.name || id) : (reading?.sign?.name_ne || meta?.[1] || reading?.sign?.name || id);
        return <article className="rx-card" key={id || index}><div className="rx-sign"><b aria-hidden="true">{meta?.[3] || "✦"}</b><h2>{name}</h2></div><p>{readingText(reading, language) || l(language, "यो राशिको पाठ प्रकाशनमा उपलब्ध छैन।", "No text is available for this sign in the publication.")}</p><button type="button" onClick={() => chooseSign(id)} disabled={!id}>{l(language, "मेरो राशि बनाउनुहोस्", "Use as my sign")}</button></article>;
      })}
    </section> : null}

    <section className="rx-personal">
      <div className="rx-personal-head"><div><span>{l(language, "वैकल्पिक", "Optional")}</span><h2>{l(language, "मेरो राशि", "My sign")}</h2><p>{l(language, "तपाईंले रोजेपछि मात्र व्यक्तिगत दृश्य खुल्छ। जन्म विवरण यस सुविधाले माग्दैन वा भण्डारण गर्दैन।", "Personalized view activates only after you choose. This feature does not request or store birth details.")}</p></div><label><input type="checkbox" checked={remember} onChange={(event) => toggleRemember(event.target.checked)} /> {l(language, "यो राशि यस यन्त्रमा सम्झनुहोस्", "Remember this sign on this device")}</label></div>
      <div className="rx-sign-picker">{SIGNS.map(([id, ne, en, glyph]) => <button type="button" key={id} className={selectedSign === id ? "is-selected" : ""} onClick={() => chooseSign(id)}><span>{glyph}</span>{language === "en" ? en : ne}</button>)}</div>
      {personalizedReading && selectedMeta ? <article className="rx-personal-result"><small>{periodLabel(period, language)} · {language === "en" ? selectedMeta[2] : selectedMeta[1]}</small><h3>{selectedMeta[3]} {language === "en" ? selectedMeta[2] : selectedMeta[1]}</h3><p>{readingText(personalizedReading, language)}</p></article> : null}
      {personalError ? <div className="rx-status is-error">{personalError}</div> : null}
    </section>

    <footer className="rx-note">{l(language, "राशिफल परम्परागत ज्योतिषीय व्याख्या हो; वैज्ञानिक निश्चितता वा स्वास्थ्य/कानुनी/आर्थिक निर्णयको विकल्प होइन।", "Rashifal is a traditional astrological interpretation, not scientific certainty or a substitute for health, legal or financial decisions.")}</footer>
  </main>;
}
