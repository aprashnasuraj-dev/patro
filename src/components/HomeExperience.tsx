import {loadHistoryDay} from "../history-client";
import { FormEvent, useEffect, useMemo, useState } from "react";

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type HistoryItem = Record<string, any>;

const COMMUNITY = [
  ["/nepal-sambat/mandala", "नेपाल संवत्", "Nepal Sambat", "नेवार समुदायको संवत्, तिथि र पर्व"],
  ["/samudaya/lhosar", "ल्होसार", "Lhosar", "तामाङ/गुरुङ/शेर्पा परम्पराका पर्व सन्दर्भ"],
  ["/samudaya/tharu", "थारु पात्रो", "Tharu", "थारु समुदायका मिति र पर्व"],
  ["/samudaya/mithila", "मिथिला पात्रो", "Mithila", "मैथिली/मिथिला तिथि र उत्सव"],
  ["/samudaya/kirat", "किरात पात्रो", "Kirat", "किरात समुदायका पर्व र चक्र"],
  ["/samudaya/hijri", "हिजरी पात्रो", "Hijri", "नेपाल-सन्दर्भित हिजरी मिति"],
] as const;

const QUICK = [
  ["/tools/astro", "☾", "खगोलीय पात्रो", "Astronomical calendar"],
  ["/time-machine", "⌛", "समययन्त्र", "Time Machine"],
  ["/samudaya", "◎", "समुदाय पात्रो", "Community calendars"],
  ["/tools", "✦", "आफ्नै टुल्स", "29 tools"],
] as const;

function pathNow() { return window.location.pathname.replace(/\/+$/, "") || "/"; }
function todayNepal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function historyTitle(item: HistoryItem) {
  return String(item.event_ne || item.title_ne || item.name_ne || item.headline_ne || item.title || item.name || item.event_en || item.event || "इतिहासमा आज");
}
function historyBody(item: HistoryItem) {
  return String(item.summary_ne || item.description_ne || item.detail_ne || item.summary || item.description || item.detail || item.details || item.body || item.event_en || "");
}
function historyYear(item: HistoryItem) {
  return String(item.year_bs || item.bs_year || item.year || item.ad_year || "");
}
function useHomeRoute() {
  const [path, setPath] = useState(pathNow);
  useEffect(() => {
    const sync = () => setPath(pathNow());
    addEventListener("popstate", sync);
    addEventListener("patro:navigation", sync);
    return () => { removeEventListener("popstate", sync); removeEventListener("patro:navigation", sync); };
  }, []);
  return path === "/" || path === "/today";
}

function InstallCard() {
  const [prompt, setPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || Boolean((navigator as any).standalone);
    setInstalled(Boolean(standalone));
    const before = (event: Event) => {
      event.preventDefault();
      setPrompt(event as DeferredInstallPrompt);
    };
    const done = () => { setInstalled(true); setPrompt(null); setStatus("App installed"); };
    addEventListener("beforeinstallprompt", before);
    addEventListener("appinstalled", done);
    return () => { removeEventListener("beforeinstallprompt", before); removeEventListener("appinstalled", done); };
  }, []);

  async function install() {
    if (installed) return;
    if (!prompt) {
      setStatus("Browser menu बाट ‘Install app’ वा ‘Add to Home Screen’ छान्नुहोस्।");
      return;
    }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setStatus("स्थापना हुँदैछ…");
    else setStatus("स्थापना रद्द भयो। पछि पनि गर्न सक्नुहुन्छ।");
    setPrompt(null);
  }

  function prepareOffline() {
    navigator.serviceWorker?.ready
      .then((registration) => {
        registration.active?.postMessage({ type: "WARM_OFFLINE" });
        setStatus("Offline सामग्री तयार गरिँदैछ…");
        setTimeout(() => setStatus("मुख्य पात्रो र स्थानीय टुलहरू offline प्रयोगका लागि तयार छन्।"), 1400);
      })
      .catch(() => setStatus("Offline setup यस browser मा उपलब्ध छैन।"));
  }

  return <article className="hx-install-card">
    <div className="hx-install-icon" aria-hidden="true"><img src="/aafnai-logo.png" alt="" width="48" height="48" style={{ objectFit: "contain" }} /></div>
    <div className="hx-install-copy">
      <span className="hx-kicker">APP · OFFLINE</span>
      <h2>{installed ? "आफ्नै पात्रो स्थापित छ" : "आफ्नै पात्रो App बनाउनुहोस्"}</h2>
      <p>मोबाइल/डेस्कटपमा install गरेर पात्रो र local tools छिटो खोल्नुहोस्। Nepali Typing र Preeti converter offline पनि चल्छन्।</p>
      {status && <small role="status">{status}</small>}
    </div>
    <div className="hx-install-actions">
      {!installed && <button type="button" className="hx-primary" onClick={install}>Install app</button>}
      <button type="button" className="hx-secondary" onClick={prepareOffline}>Offline तयार गर्नुहोस्</button>
    </div>
  </article>;
}

function DateSearch() {
  const [ad, setAd] = useState(todayNepal());
  const [bsY, setBsY] = useState("2083");
  const [bsM, setBsM] = useState("6");
  const [bsD, setBsD] = useState("16");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function go(path: string) {
    history.pushState(null, "", path);
    dispatchEvent(new Event("patro:navigation"));
    scrollTo({ top: 0, behavior: "smooth" });
  }
  function submitAd(event: FormEvent) {
    event.preventDefault();
    if (/^\d{4}-\d{2}-\d{2}$/.test(ad)) go(`/date/${ad}`);
  }
  async function submitBs(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const bs = `${Number(bsY)}-${String(Number(bsM)).padStart(2, "0")}-${String(Number(bsD)).padStart(2, "0")}`;
      const response = await fetch(`/api/v1/convert?bs=${encodeURIComponent(bs)}`, { headers: { accept: "application/json" } });
      const payload = await response.json().catch(() => ({}));
      const converted = String(payload?.ad || payload?.value?.ad || payload?.calendars?.gregorian_ad || "");
      if (!response.ok || !/^\d{4}-\d{2}-\d{2}$/.test(converted)) throw new Error("not_found");
      go(`/date/${converted}`);
    } catch {
      setError("यो वि.सं. मिति भेटिएन। वर्ष/महिना/गते जाँच्नुहोस्।");
    } finally { setBusy(false); }
  }

  return <section className="hx-search" aria-labelledby="hx-date-search-title">
    <div><span className="hx-kicker">DATE FINDER</span><h2 id="hx-date-search-title">मिति खोज्नुहोस्</h2><p>AD वा वि.सं. मिति छानेर सो दिनको तिथि, नेपाल संवत्, चाडपर्व र पञ्चाङ्ग खोल्नुहोस्।</p></div>
    <div className="hx-search-forms">
      <form onSubmit={submitAd}><label>English / AD<input type="date" value={ad} onChange={(e) => setAd(e.target.value)} /></label><button type="submit">खोल्नुहोस्</button></form>
      <form onSubmit={submitBs}><span>वि.सं. / BS</span><div className="hx-bs-fields"><label>वर्ष<input inputMode="numeric" value={bsY} onChange={(e) => setBsY(e.target.value.replace(/\D/g, "").slice(0, 4))} /></label><label>महिना<input inputMode="numeric" value={bsM} onChange={(e) => setBsM(e.target.value.replace(/\D/g, "").slice(0, 2))} /></label><label>गते<input inputMode="numeric" value={bsD} onChange={(e) => setBsD(e.target.value.replace(/\D/g, "").slice(0, 2))} /></label></div><button type="submit" disabled={busy}>{busy ? "खोज्दै…" : "खोल्नुहोस्"}</button></form>
    </div>
    {error && <p className="hx-error" role="alert">{error}</p>}
  </section>;
}

function HistoryPulse() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    loadHistoryDay(todayNepal(),controller.signal)
      .then((payload) => setItems(Array.isArray(payload?.items) ? payload.items.slice(0, 12) : []))
      .catch(() => setItems([]));
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (items.length < 2) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % items.length), 6000);
    return () => clearInterval(timer);
  }, [items.length]);
  const item = items[index];
  return <a className="hx-history" href="/on-this-day" aria-live="polite">
    <span className="hx-kicker">इतिहासमा आज · ON THIS DAY</span>
    {item ? <><strong>{historyYear(item) && <em>{historyYear(item)}</em>}{historyTitle(item)}</strong><p>{historyBody(item).slice(0, 190)}</p><small>{index + 1} / {items.length} · ६ सेकेन्डमा अर्को घटना</small></> : <><strong>आजको इतिहास अन्वेषण गर्नुहोस्</strong><p>नेपाल र विश्व इतिहासका अभिलेखित घटना हेर्नुहोस्।</p></>}
  </a>;
}

export function HomeExperience() {
  const visible = useHomeRoute();
  const communityCount = useMemo(() => COMMUNITY.length, []);
  if (!visible) return null;

  return <div className="hx-wrap" aria-label="Aafnai Patro homepage enhancements">
    <section className="hx-quick" aria-label="मुख्य अनुभव">
      {QUICK.map(([href, icon, ne, en]) => <a href={href} key={href}><span aria-hidden="true">{icon}</span><strong>{ne}</strong><small>{en}</small></a>)}
    </section>
    <InstallCard />
    <DateSearch />
    <HistoryPulse />
    <section className="hx-community" aria-labelledby="hx-community-title">
      <header><div><span className="hx-kicker">COMMUNITY PATRO · {communityCount}</span><h2 id="hx-community-title">नेपालका समुदाय पात्रो</h2><p>छ वटा सांस्कृतिक पात्रो अनुभव एउटै ठाउँमा—कुनै पनि tool हटाइएको छैन।</p></div><a href="/samudaya">सबै हेर्नुहोस् →</a></header>
      <div className="hx-community-grid">{COMMUNITY.map(([href, ne, en, desc]) => <a href={href} key={href}><b>{ne}</b><span>{en}</span><small>{desc}</small><i aria-hidden="true">→</i></a>)}</div>
    </section>
  </div>;
}
