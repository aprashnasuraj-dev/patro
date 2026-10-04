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
        if (!cached) setErrors((prev) => ({ ...prev, [item]: l(language, "यो अवधिको प्रकाशन अहिले उपलब्ध छैन।", "This period is currently unavailable.") }));
      }
    })).finally(() => setRefreshing(false));
    return () => controller.abort();
  }, [date, language]);

  const current = publications[period] || null;
  const readings = readingsOf(current);
  const stale = Boolean(current && !publicationCovers(current, date));

  const chooseSign = async (id: string) => {
    setSelectedSign(id);
    setPersonalized(null);
    setPersonalError("");
    if (remember) { try { localStorage.setItem(PREF_KEY, id); } catch {} }
    const cachedReading = readings.find((item) => signId(item) === id) || null;
    if (cachedReading) setPersonalized({ reading: cachedReading, source: "local-publication" });
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
