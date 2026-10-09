import { useEffect, useRef } from "react";
import { CalendarDays, CloudSun, Compass, Home, Languages, Menu, Moon, Radio, Search, Settings, Star, Sun, Tv, X } from "lucide-react";
import { GoogleAuthButton } from "../auth/GoogleAuthButton";

const LINKS = [
  ["/", "आजको पात्रो", "Today's calendar", CalendarDays],
  ["/rashifal", "राशिफल", "Horoscope", Star],
  ["/convert", "मिति रूपान्तरण", "Date converter", Compass],
  ["/tools", "सबै उपकरण", "All tools", Menu],
  ["/jyotish/china", "जन्मपत्रो / ज्योतिष", "Birth chart", Sun],
  ["/tools/astro", "खगोलीय पात्रो", "Astronomy calendar", Moon],
  ["/samudaya", "समुदाय पात्रो", "Community calendars", CalendarDays],
  ["/on-this-day", "आज इतिहासमा", "On this day", Compass],
  ["/time-machine", "समययन्त्र", "Time Machine", Compass],
  ["/samachar", "समाचार", "News", Home],
  ["/fm", "रेडियो", "Radio", Radio],
  ["/tv", "लाइभ टिभी", "Live TV", Tv],
  ["/#home-weather", "मौसम पूर्वानुमान", "Weather forecast", CloudSun],
  ["/me/notes", "मेरो टिपोट", "My notes", Star],
] as const;

export function MobileMenu({ language, theme, path, onClose, onLanguage, onTheme }: {
  language: "ne" | "en"; theme: "light" | "dark"; path: string;
  onClose: () => void; onLanguage: () => void; onTheme: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const ne = language === "ne";
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const close = () => onClose();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const items = [...(panel.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),select,input') || [])].filter(item => item.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", close); window.addEventListener("patro:navigation", close);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", close); window.removeEventListener("patro:navigation", close);
      previous?.focus();
    };
  }, [onClose]);
  return <div className="hp-menu-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside id="hp-mobile-menu" className="hp-menu-panel" role="dialog" aria-modal="true" aria-label={ne ? "आफ्नै पात्रो मेनु" : "Aafnai Patro menu"} ref={panel}>
      <header><div><span className="hp-menu-brand"><img src="/aafnai-logo.png" alt="" width="36" height="36" /></span><strong>{ne ? "आफ्नै पात्रो" : "Aafnai Patro"}<small>{ne ? "तपाईंको दिन, तपाईंको पात्रो" : "Your day, your calendar"}</small></strong></div><button type="button" onClick={onClose} aria-label={ne ? "मेनु बन्द गर्नुहोस्" : "Close menu"}><X size={22}/></button></header>
      <div className="hp-menu-account"><div><b>{ne ? "आफ्नै ठाउँ" : "My space"}</b><small>{ne ? "टिपोट र व्यक्तिगत सामग्री एउटै खातामा" : "Your notes and personal records in one account"}</small></div><GoogleAuthButton language={language}/></div>
      <button className="hp-menu-search" type="button" onClick={() => { onClose(); requestAnimationFrame(() => window.dispatchEvent(new Event("patro:open-search"))); }}><Search size={20}/>{ne ? "सुविधा खोज्नुहोस्…" : "Search features…"}<span>→</span></button>
      <nav aria-label={ne ? "सबै सुविधा" : "All features"}>{LINKS.map(([href, nepali, english, Icon]) => <a href={href} key={href} onClick={event => { onClose(); if (href === "/#home-weather" && document.getElementById("home-weather")) { event.preventDefault(); requestAnimationFrame(() => document.getElementById("home-weather")?.scrollIntoView({ block: "start", behavior: "smooth" })); } }} aria-current={path === href ? "page" : undefined}><Icon size={20} aria-hidden="true"/><span>{ne ? nepali : english}</span></a>)}</nav>
      <div className="hp-menu-settings"><button type="button" onClick={()=>{onClose();window.dispatchEvent(new Event("patro:install"))}}><span aria-hidden="true"><img src="/aafnai-logo.png" alt="" width="20" height="20" /></span><span>{ne?"एप इन्स्टल गर्नुहोस्":"Install app"}</span></button><button type="button" onClick={onLanguage}><Languages size={19}/><span>{ne ? "भाषा · English" : "Language · नेपाली"}</span></button><button type="button" onClick={onTheme}>{theme === "light" ? <Moon size={19}/> : <Sun size={19}/>}<span>{theme === "light" ? ne ? "डार्क मोड" : "Dark mode" : ne ? "लाइट मोड" : "Light mode"}</span></button><a href="/me/settings" onClick={onClose}><Settings size={19}/>{ne ? "सेटिङ" : "Settings"}</a></div>
      <footer><a href="/about" onClick={onClose}>{ne ? "हाम्रो बारेमा" : "About"}</a><a href="/privacy" onClick={onClose}>{ne ? "गोपनीयता" : "Privacy"}</a><a href="/contact" onClick={onClose}>{ne ? "सम्पर्क" : "Contact"}</a></footer>
    </aside>
  </div>;
}
