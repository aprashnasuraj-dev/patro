import { useEffect, useMemo, useState } from "react";
import { neDigits } from "../nepaliDate";

type Lang = "ne" | "en";
type Moment = { title: string; summary: string; year: string; href: string; importance: number; highlight: boolean };

const pick = (o: any, keys: string[]) => { for (const k of keys) { const v = o?.[k]; if (typeof v === "string" && v.trim()) return v.trim(); } return ""; };

function toMoment(row: any, language: Lang): Moment | null {
  const title = language === "en" ? pick(row, ["title_en", "title", "title_ne", "event_en", "event_ne"]) : pick(row, ["title_ne", "title", "event_ne", "title_en", "event_en"]);
  if (!title) return null;
  const summary = language === "en" ? pick(row, ["summary_en", "summary", "description", "event_en", "summary_ne"]) : pick(row, ["summary_ne", "summary", "description_ne", "description", "event_ne", "summary_en"]);
  const rawYear = row?.bs_year ?? row?.year_bs ?? row?.ad_year ?? row?.year;
  const isBs = row?.bs_year != null || row?.year_bs != null;
  const year = rawYear == null || rawYear === "" ? "" : language === "en" ? `${isBs ? "BS " : ""}${rawYear}` : `${isBs ? "वि.सं. " : "ई. "}${neDigits(rawYear)}`;
  return {
    title,
    summary,
    year,
    href: "/on-this-day",
    importance: Number(row?.importance || 0),
    highlight: row?.highlight === true || String(row?.highlight).toLowerCase() === "true",
  };
}

/** Home history uses only the exact Gregorian month/day from the D1 On This Day archive. */
export function HomeHistoryCard({ language, todayAd }: { language: Lang; todayAd: string }) {
  const [items, setItems] = useState<Moment[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoaded(false);
    fetch(`/api/v1/on-this-day?date=${encodeURIComponent(todayAd)}`, { signal: controller.signal, headers: { accept: "application/json" } })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("history_unavailable")))
      .then((payload) => {
        const list = (payload?.items || []).map((row: any) => toMoment(row, language)).filter(Boolean) as Moment[];
        list.sort((a, b) => Number(b.highlight) - Number(a.highlight) || b.importance - a.importance || b.year.localeCompare(a.year));
        if (!controller.signal.aborted) { setItems(list.slice(0, 10)); setIndex(0); setLoaded(true); }
      })
      .catch(() => { if (!controller.signal.aborted) { setItems([]); setLoaded(true); } });
    return () => controller.abort();
  }, [todayAd, language]);

  const reduceMotion = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  useEffect(() => {
    if (items.length < 2 || paused || reduceMotion) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % items.length), 9000);
    return () => window.clearInterval(timer);
  }, [items.length, paused, reduceMotion]);

  const l = (ne: string, en: string) => (language === "en" ? en : ne);
  const go = (step: number) => setIndex((i) => (i + step + items.length) % items.length);

  return <section className="rh-card hx-card" aria-roledescription={items.length > 1 ? "carousel" : undefined} aria-label={l("आज इतिहासमा", "Today in history")}
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <header className="rh-card-head"><div><span className="rh-kicker">{l("आज इतिहासमा", "On this day")}</span>
      <h2>{l("आजकै मितिका घटना", "Events from this date")}</h2></div></header>
    {!loaded ? <p className="rh-muted">{l("इतिहास अभिलेख खोल्दैछ…", "Loading the historical archive…")}</p> : items.length ? (() => {
      const item = items[index % items.length];
      return <article className="hx-item" aria-live={paused ? "polite" : "off"} key={index}>
        {item.year ? <span className="hx-year">{item.year}</span> : null}
        <h3>{item.title}</h3>
        {item.summary ? <p>{item.summary}</p> : null}
      </article>;
    })() : <p className="rh-muted">{l("आजको मितिका लागि प्रकाशित इतिहास अभिलेख भेटिएन।", "No published archive entry is available for this date yet.")}</p>}
    <footer className="hx-foot">
      {items.length > 1 ? <div className="hx-nav">
        <button type="button" onClick={() => go(-1)} aria-label={l("अघिल्लो घटना", "Previous event")}>‹</button>
        <span className="hx-count">{language === "en" ? `${index + 1} / ${items.length}` : `${neDigits(index + 1)} / ${neDigits(items.length)}`}</span>
        <button type="button" onClick={() => go(1)} aria-label={l("अर्को घटना", "Next event")}>›</button>
      </div> : <span />}
      <a href="/on-this-day">{l("सबै घटना हेर्नुहोस्", "See all events")} →</a>
    </footer>
  </section>;
}
