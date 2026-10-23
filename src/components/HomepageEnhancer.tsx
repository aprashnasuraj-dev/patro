import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { adToBs } from "../../packages/core/src";
import { BS_MONTHS, toNepaliDigits } from "../title";
import { l, useUiLanguage } from "../useUiLanguage";
import "../homepage-interactions.css";

const BS_MIN_YEAR = 1883;
const BS_MAX_YEAR = 2093;

function cleanPath(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

function usePathname() {
  const [path, setPath] = useState(() => cleanPath(window.location.pathname));
  useEffect(() => {
    const sync = () => setPath(cleanPath(window.location.pathname));
    window.addEventListener("popstate", sync);
    window.addEventListener("patro:navigation", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("patro:navigation", sync);
    };
  }, []);
  return path;
}

function todayBs() {
  try {
    const ad = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kathmandu",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    return adToBs(ad);
  } catch {
    return { year: 2083, month: 6, day: 1 };
  }
}

function navigate(path: string) {
  const next = new URL(path, window.location.href);
  if (next.origin !== window.location.origin) {
    window.location.assign(next.toString());
    return;
  }
  history.pushState(null, "", next.pathname + next.search + next.hash);
  window.dispatchEvent(new Event("patro:navigation"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function HomepageEnhancer() {
  const path = usePathname();
  const language = useUiLanguage();
  const ne = language === "ne";
  const [navTarget, setNavTarget] = useState<HTMLElement | null>(null);
  const [quickTarget, setQuickTarget] = useState<HTMLElement | null>(null);
  const [monthTarget, setMonthTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const refresh = () => {
      setNavTarget(document.querySelector<HTMLElement>(".ap-nav"));
      setQuickTarget(document.querySelector<HTMLElement>(".rh-actions"));
      setMonthTarget(document.querySelector<HTMLElement>(".rh-month-actions"));
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { subtree: true, childList: true });
    return () => observer.disconnect();
  }, [path]);

  const current = useMemo(() => {
    const match = path.match(/^\/calendar\/(\d{4})\/(\d{1,2})$/);
    if (match) return { year: Number(match[1]), month: Number(match[2]) };
    const today = todayBs();
    return { year: today.year, month: today.month };
  }, [path]);

  const calendarSurface = path === "/" || path === "/today" || /^\/calendar\/\d{4}\/\d{1,2}$/.test(path);
  const years = useMemo(() => Array.from({ length: BS_MAX_YEAR - BS_MIN_YEAR + 1 }, (_, index) => BS_MIN_YEAR + index), []);

  const headerLinks = navTarget ? createPortal(<>
    <a className="hp-nav-extra" href="/jyotish/china" aria-label={l(language, "ज्योतिष खोल्नुहोस्", "Open Jyotish and birth chart")}>{l(language, "ज्योतिष", "Jyotish")}</a>
    <a className="hp-nav-extra" href="/time-machine" aria-label={l(language, "समययन्त्र खोल्नुहोस्", "Open Time Machine")}>{l(language, "समययन्त्र", "Time Machine")}</a>
    <a className="hp-nav-extra" href="/tools/astro" aria-label={l(language, "खगोलीय पात्रो खोल्नुहोस्", "Open astronomical calendar")}>{l(language, "खगोलीय पात्रो", "Astronomical calendar")}</a>
  </>, navTarget) : null;

  const quickLinks = calendarSurface && quickTarget ? createPortal(<>
    <a data-home-extra="jyotish" href="/jyotish/china" aria-label={l(language, "ज्योतिष", "Jyotish / Birth chart")}><b aria-hidden="true">{ne ? "ज्यो" : "✧"}</b><span>{l(language, "ज्योतिष", "Jyotish")}</span></a>
    <a data-home-extra="time-machine" href="/time-machine" aria-label={l(language, "समययन्त्र", "Time Machine")}><b aria-hidden="true">⌛</b><span>{l(language, "समययन्त्र", "Time Machine")}</span></a>
    <a data-home-extra="astronomy" href="/tools/astro" aria-label={l(language, "खगोलीय पात्रो", "Astronomical calendar")}><b aria-hidden="true">☾</b><span>{l(language, "खगोलीय पात्रो", "Astronomical calendar")}</span></a>
    <a data-home-extra="all-tools" href="/tools" aria-label={l(language, "सबै उपकरण", "All tools")}><b aria-hidden="true">⌘</b><span>{l(language, "सबै उपकरण", "All tools")}</span></a>
  </>, quickTarget) : null;

  const monthPicker = calendarSurface && monthTarget ? createPortal(
    <div className="hp-month-jump" role="group" aria-label={l(language, "वर्ष र महिना छान्नुहोस्", "Choose year and month")}>
      <label>
        <span>{l(language, "वर्ष", "Year")}</span>
        <select aria-label={l(language, "विक्रम संवत् वर्ष", "Bikram Sambat year")} value={current.year} onChange={(event) => navigate(`/calendar/${event.target.value}/${String(current.month).padStart(2, "0")}`)}>
          {years.map((year) => <option value={year} key={year}>{ne ? toNepaliDigits(year) : year}</option>)}
        </select>
      </label>
      <label>
        <span>{l(language, "महिना", "Month")}</span>
        <select aria-label={l(language, "विक्रम संवत् महिना", "Bikram Sambat month")} value={current.month} onChange={(event) => navigate(`/calendar/${current.year}/${String(event.target.value).padStart(2, "0")}`)}>
          {BS_MONTHS.map((month, index) => <option value={index + 1} key={month}>{ne ? month : ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"][index]}</option>)}
        </select>
      </label>
    </div>,
    monthTarget,
  ) : null;

  return <>{headerLinks}{quickLinks}{monthPicker}</>;
}
