import { useEffect, useMemo, useState } from "react";
import { setPageTitle, toNepaliDigits } from "../title";
import { l, useUiLanguage } from "../useUiLanguage";
import "./time-machine.css";

type Row = Record<string, any>;
const CACHE_KEY = "patro.time-machine.v3";
const API_LIMIT = 160;

function titleOf(item: Row, language: "ne" | "en") {
  return String(language === "en" ? (item.event_en || item.title_en || item.title || item.name_en || item.event_ne || item.title_ne) : (item.event_ne || item.title_ne || item.name_ne || item.headline_ne || item.title || item.name || item.event_en) || "").trim();
}
function bodyOf(item: Row, language: "ne" | "en") {
  return String(language === "en" ? (item.summary_en || item.description_en || item.summary || item.description || item.detail || item.summary_ne) : (item.summary_ne || item.description_ne || item.detail_ne || item.summary || item.description || item.detail || item.details || item.body || item.event_en) || "").trim();
}
function yearOf(item: Row) {
  const raw = item.year_bs || item.bs_year || item.year || item.ad_year || String(item.date || item.ad_date || "").slice(0, 4);
  const value = Number(String(raw).replace(/[^0-9]/g, ""));
  return Number.isFinite(value) ? value : 0;
}
function categoryOf(item: Row) { return String(item.category_ne || item.category || item.type || "").trim(); }
function placeOf(item: Row) { return String(item.place_ne || item.place || item.location || "").trim(); }
function sourceOf(item: Row) { return String(item.source_title || item.source || "").trim(); }
function rowKey(item: Row, index = 0) { return String(item.id || item.key || `${yearOf(item)}|${titleOf(item, "en")}|${index}`); }
function mergeRows(current: Row[], incoming: Row[]) {
  const map = new Map<string, Row>();
  current.forEach((item, index) => map.set(rowKey(item, index), item));
  incoming.forEach((item, index) => map.set(rowKey(item, index), item));
  return [...map.values()];
}
function readCache(): Row[] { try { const data = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); return Array.isArray(data?.items) ? data.items : []; } catch { return []; } }
function writeCache(items: Row[]) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ saved_at: new Date().toISOString(), items: items.slice(0, 500) })); } catch {} }
async function fetchArchive(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal, credentials: "same-origin", headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(String(response.status));
  const body = await response.json();
  return Array.isArray(body?.items) ? body.items as Row[] : [];
}

export function TimeMachineExperience() {
  const language = useUiLanguage();
  const [items, setItems] = useState<Row[]>(readCache);
  const [yearItems, setYearItems] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(!items.length);
  const [yearLoading, setYearLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [category, setCategory] = useState("");
  const [focus, setFocus] = useState(0);

  useEffect(() => { setPageTitle(language === "en" ? "Time Machine" : "समययन्त्र"); }, [language]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(!items.length);
    fetchArchive(`/api/v1/time-machine?limit=${API_LIMIT}`, controller.signal)
      .then((rows) => {
        setItems((current) => { const merged = mergeRows(current, rows); writeCache(merged); return merged; });
        setOffline(false);
      })
      .catch(() => { const cached = readCache(); setOffline(Boolean(cached.length)); if (!items.length) setItems(cached); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const numericYear = year.trim();
    if (!/^\d{3,4}$/.test(numericYear)) { setYearItems(null); setYearLoading(false); return; }
    const controller = new AbortController();
    setYearLoading(true);
    fetchArchive(`/api/v1/time-machine?year=${encodeURIComponent(numericYear)}&limit=${API_LIMIT}`, controller.signal)
      .then((rows) => {
        setYearItems(rows);
        if (rows.length) setItems((current) => { const merged = mergeRows(current, rows); writeCache(merged); return merged; });
        setOffline(false);
      })
      .catch(() => {
        const cached = readCache().filter((item) => yearOf(item) === Number(numericYear));
        setYearItems(cached);
        setOffline(Boolean(cached.length));
      })
      .finally(() => setYearLoading(false));
    return () => controller.abort();
  }, [year]);

  const activeItems = year && yearItems !== null ? yearItems : items;
  const categories = useMemo(() => [...new Set(activeItems.map(categoryOf).filter(Boolean))].sort(), [activeItems]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const y = Number(year);
    return activeItems.filter((item) => {
      if (year && yearOf(item) !== y) return false;
      if (category && categoryOf(item) !== category) return false;
      if (!q) return true;
      return `${titleOf(item, language)} ${bodyOf(item, language)} ${placeOf(item)} ${sourceOf(item)} ${categoryOf(item)}`.toLowerCase().includes(q);
    }).sort((a, b) => yearOf(a) - yearOf(b));
  }, [activeItems, query, year, category, language]);
  const years = useMemo(() => [...new Set(filtered.map(yearOf).filter(Boolean))].sort((a, b) => a - b), [filtered]);
  const focusedYear = years[Math.min(focus, Math.max(0, years.length - 1))] || 0;
  const visible = focusedYear ? filtered.filter((item) => yearOf(item) === focusedYear) : filtered.slice(0, 12);

  useEffect(() => { setFocus((value) => Math.min(value, Math.max(0, years.length - 1))); }, [years.length]);

  return <main className="tm-page" id="main-content">
    <section className="tm-hero">
      <div className="tm-orbit" aria-hidden="true"><span>नेपाल</span><i/><i/><i/></div>
      <div className="tm-hero-copy"><span>{l(language, "इतिहास · अभिलेखित स्रोत", "History · sourced archive")}</span><h1>{l(language, "समययन्त्र", "Time Machine")}</h1><p>{l(language, "वर्षको सूची मात्र होइन—समयरेखा घुमाएर नेपालका अभिलेखित क्षण, स्थान र स्रोत अन्वेषण गर्नुहोस्।", "Move through the timeline to explore sourced moments, places and records from Nepal's history—not just a year list.")}</p></div>
      <a href="/on-this-day">{l(language, "आज इतिहासमा →", "On this day →")}</a>
    </section>

    {offline ? <div className="tm-offline">{l(language, "नेटवर्क उपलब्ध छैन—यस यन्त्रमा सुरक्षित पछिल्लो टाइमलाइन देखाइएको छ।", "Network unavailable—the last timeline saved on this device is shown.")}</div> : null}

    <section className="tm-controls" aria-label={l(language, "इतिहास फिल्टर", "History filters")}>
      <label><span>{l(language, "खोज", "Search")}</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={l(language, "घटना, स्थान, व्यक्ति…", "Event, place, person…")}/></label>
      <label><span>{l(language, "वर्ष", "Year")}</span><input inputMode="numeric" value={year} onChange={(e) => { setYear(e.target.value.replace(/[^0-9]/g, "").slice(0,4)); setFocus(0); }} placeholder="2008"/></label>
      <label><span>{l(language, "वर्ग", "Category")}</span><select value={category} onChange={(e) => { setCategory(e.target.value); setFocus(0); }}><option value="">{l(language, "सबै", "All")}</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      {(query || year || category) ? <button type="button" onClick={() => { setQuery(""); setYear(""); setYearItems(null); setCategory(""); setFocus(0); }}>{l(language, "फिल्टर हटाउनुहोस्", "Clear filters")}</button> : null}
    </section>

    {(loading && !items.length) || yearLoading ? <div className="tm-state">{l(language, "टाइमलाइन लोड हुँदैछ…", "Loading timeline…")}</div> : null}
    {!loading && !yearLoading && !filtered.length ? <div className="tm-state">{l(language, "यो खोजका लागि अभिलेख भेटिएन।", "No archive entries match this search.")}</div> : null}

    {!yearLoading && years.length ? <section className="tm-stage">
      <div className="tm-year-display"><small>{l(language, "फोकस वर्ष", "Focus year")}</small><strong>{language === "en" ? focusedYear : toNepaliDigits(focusedYear)}</strong><span>{visible.length} {l(language, "अभिलेख", "records")}</span></div>
      <div className="tm-rail-wrap"><button type="button" onClick={() => setFocus((value) => Math.max(0, value - 1))} disabled={focus <= 0} aria-label={l(language, "अघिल्लो वर्ष", "Previous year")}>‹</button><div className="tm-rail" role="list">{years.map((value, index) => <button role="listitem" type="button" key={value} className={index === focus ? "is-active" : ""} onClick={() => setFocus(index)}><span>{language === "en" ? value : toNepaliDigits(value)}</span><i/></button>)}</div><button type="button" onClick={() => setFocus((value) => Math.min(years.length - 1, value + 1))} disabled={focus >= years.length - 1} aria-label={l(language, "अर्को वर्ष", "Next year")}>›</button></div>
      <div className="tm-scenes">{visible.map((item, index) => <article className="tm-scene" key={rowKey(item,index)}><div className="tm-scene-number">{String(index + 1).padStart(2, "0")}</div><div><div className="tm-meta">{[categoryOf(item), placeOf(item)].filter(Boolean).map((meta) => <span key={meta}>{meta}</span>)}</div><h2>{titleOf(item, language) || l(language, "ऐतिहासिक घटना", "Historical event")}</h2>{bodyOf(item, language) ? <p>{bodyOf(item, language)}</p> : null}<footer>{sourceOf(item) ? <small>{l(language, "स्रोत", "Source")}: {sourceOf(item)}</small> : <small>{l(language, "स्रोत विवरण उपलब्ध छैन", "Source label unavailable")}</small>}{item.source_url ? <a href={item.source_url} target="_blank" rel="noopener noreferrer">{l(language, "मूल स्रोत ↗", "Open source ↗")}</a> : null}</footer></div></article>)}</div>
    </section> : null}

    <aside className="tm-integrity"><b>{l(language, "अभिलेख अखण्डता", "Archive integrity")}</b><p>{l(language, "यो दृश्य API मा रहेका अभिलेख मात्र देखाउँछ। खाली ठाउँ भर्न नयाँ ऐतिहासिक दाबी सिर्जना गर्दैन।", "This view shows only records present in the archive API. It does not invent historical claims to fill gaps.")}</p></aside>
  </main>;
}
