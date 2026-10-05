import { useEffect, useMemo, useState } from "react";
import { neDigits } from "../nepaliDate";

type Lang = "ne" | "en";
type Moment = { title: string; summary: string; year: string; href: string };

const pick = (o: any, keys: string[]) => { for (const k of keys) { const v = o?.[k]; if (typeof v === "string" && v.trim()) return v.trim(); } return ""; };

function toMoment(row: any, language: Lang, source: "day" | "machine"): Moment | null {
  const title = language === "en" ? pick(row, ["title_en", "title", "title_ne"]) : pick(row, ["title_ne", "title", "title_en"]);
  if (!title) return null;
  const summary = language === "en" ? pick(row, ["summary_en", "summary", "description", "summary_ne"]) : pick(row, ["summary_ne", "summary", "description_ne", "description", "summary_en"]);
  const rawYear = row?.bs_year ?? row?.year_bs ?? row?.ad_year ?? row?.year;
  const isBs = row?.bs_year != null || row?.year_bs != null;
  const year = rawYear == null || rawYear === "" ? "" : language === "en" ? `${isBs ? "BS " : ""}${rawYear}` : `${isBs ? "वि.सं. " : "ई. "}${neDigits(rawYear)}`;
  return { title, summary, year, href: source === "day" ? "/on-this-day" : "/time-machine" };
}

/** "इतिहासमा आज" — rotates through events on today's date (falls back to major Time Machine moments). */
export function HomeHistoryCard({ language, todayAd }: { language: Lang; todayAd: string }) {
  const [items, setItems] = useState<Moment[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fromToday, setFromToday] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const get = (url: string) => fetch(url, { signal: controller.signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    (async () => {
      const today = await get(`/api/v1/on-this-day?date=${encodeURIComponent(todayAd)}`);
      let list = (today?.items || []).map((row: any) => toMoment(row, language, "day")).filter(Boolean) as Moment[];
      let isToday = true;
      if (list.length < 2) {
        const machine = await get("/api/v1/time-machine?limit=800");
        const major = (machine?.items || []).filter((row: any) => Number(row?.importance) >= 4);
        // Stable daily selection so the card changes each day but not on every reload.
        const seed = Number(todayAd.replace(/-/g, "")) || 0;
        const chosen = major.length ? Array.from({ length: Math.min(6, major.length) }, (_, i) => major[(seed * 7 + i * 131) % major.length]) : [];
        const extra = chosen.map((row: any) => toMoment(row, language, "machine")).filter(Boolean) as Moment[];
        if (!list.length) isToday = false;
        list = [...list, ...extra];
      }
      if (!controller.signal.aborted) { setItems(list.slice(0, 8)); setIndex(0); setFromToday(isToday); }
    })();
    return () => controller.abort();
  }, [todayAd, language]);

  const reduceMotion = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  useEffect(() => {
    if (items.length < 2 || paused || reduceMotion) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % items.length), 9000);
    return () => window.clearInterval(timer);
  }, [items.length, paused, reduceMotion]);

  if (!items.length) return null;
  const item = items[index % items.length];
  const l = (ne: string, en: string) => (language === "en" ? en : ne);
  const go = (step: number) => setIndex((i) => (i + step + items.length) % items.length);

  return <section className="rh-card hx-card" aria-roledescription="carousel" aria-label={l("इतिहासमा आज", "Today in history")}
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <header className="rh-card-head"><div><span className="rh-kicker">{fromToday ? l("इतिहासमा आज", "On this day") : l("समययन्त्रबाट", "From the Time Machine")}</span>
      <h2>{l("इतिहासको एक क्षण", "A moment in history")}</h2></div></header>
    <article className="hx-item" aria-live={paused ? "polite" : "off"} key={index}>
      {item.year ? <span className="hx-year">{item.year}</span> : null}
      <h3>{item.title}</h3>
      {item.summary ? <p>{item.summary}</p> : null}
    </article>
    <footer className="hx-foot">
      {items.length > 1 ? <div className="hx-nav">
        <button type="button" onClick={() => go(-1)} aria-label={l("अघिल्लो घटना", "Previous event")}>‹</button>
        <span className="hx-count">{language === "en" ? `${index + 1} / ${items.length}` : `${neDigits(index + 1)} / ${neDigits(items.length)}`}</span>
        <button type="button" onClick={() => go(1)} aria-label={l("अर्को घटना", "Next event")}>›</button>
      </div> : <span />}
      <a href={item.href}>{l("पूरा समयरेखा", "Full timeline")} →</a>
    </footer>
  </section>;
}
