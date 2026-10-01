import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import type { ApodPayload, CosmicDayPayload, SyncPayload, TithiPayload } from "./types";
import { HeroCanvas } from "./components/HeroCanvas";
import { CosmicHero } from "./components/CosmicHero";
import { DateTravelExperience } from "./components/DateTravelExperience";
import { LunarPhaseDial } from "./components/LunarPhaseDial";
import { CalendarGrid } from "./components/CalendarGrid";
import { CosmicExperience } from "./components/CosmicExperience";
import { ReadAloudButton } from "./patro-tools-integration/ReadAloudButton";
import { CommunityHomeLine } from "./community/CommunityHomeLine";
import { DailyDirectAnswer } from "./components/seo/DailyDirectAnswer";

type FeatureLink = { path: string; title: string; subtitle: string; group: string };
const FEATURE_LINKS: FeatureLink[] = [
  { path: "/jyotish/rashifal", title: "आफ्नै राशिफल", subtitle: "दैनिक · साप्ताहिक · मासिक राशिफल", group: "आफ्नै ज्योतिष" },
  { path: "/jyotish/china", title: "आफ्नै चिना", subtitle: "जन्मपत्रिका, ग्रहस्थिति, दशा र ३६ गुण मिलान", group: "आफ्नै ज्योतिष" },
  { path: "/aaja", title: "आफ्नै आज", subtitle: "आजको मिति, तिथि र दैनिक पात्रो", group: "दैनिक" },
  { path: "/tools/tithi", title: "आफ्नै तिथि", subtitle: "तिथि रिमाइन्डर र आगामी तिथि", group: "आफ्नै टुल्स" },
  { path: "/tools/diaspora", title: "आफ्नै विदेश पात्रो", subtitle: "विदेशमा बस्दा नेपाल समय र पात्रो सन्दर्भ", group: "आफ्नै टुल्स" },
  { path: "/tools", title: "आफ्नै उपकरण", subtitle: "सबै उपयोगी टुल्स एउटै ठाउँमा", group: "आफ्नै टुल्स" },
  { path: "/tools/card", title: "आफ्नै कार्ड", subtitle: "मिति, पात्रो र चाडपर्व शेयर कार्ड", group: "आफ्नै टुल्स" },
  { path: "/tools/family", title: "आफ्नै परिवार", subtitle: "निजी परिवार मिति र साझा घटनाहरू", group: "आफ्नै टुल्स" },
  { path: "/settings/holidays", title: "आफ्नै बिदा सेटिङ", subtitle: "जिल्ला, audience र बिदा preference", group: "आफ्नै टुल्स" },
  { path: "/settings/notifications", title: "आफ्नै सूचना", subtitle: "निजी reminder र notification controls", group: "आफ्नै टुल्स" },
  { path: "/tools/my-data", title: "आफ्नै डेटा", subtitle: "निजी डेटा export वा remove", group: "आफ्नै टुल्स" },
  { path: "/time-machine", title: "आफ्नै समययन्त्र", subtitle: "नेपालको ऐतिहासिक समयरेखा", group: "खोज" },
  { path: "/samachar", title: "आफ्नै समाचार", subtitle: "नेपाली समाचार डेस्क", group: "खोज" },
  { path: "/fm", title: "आफ्नै रेडियो", subtitle: "नेपाल र विश्वका रेडियो स्टेशन", group: "खोज" },
  { path: "/explore", title: "सबै आफ्नै सुविधा", subtitle: "पात्रो, डायरी, मिडिया र उपकरणको पूर्ण सूची", group: "खोज" },
  { path: "/tv", title: "आफ्नै लाइभ टिभी", subtitle: "देश, भाषा र विषय अनुसार लाइभ च्यानल", group: "खोज" },
  { path: "/on-this-day", title: "आफ्नै आज इतिहासमा", subtitle: "आजकै मितिका ऐतिहासिक घटना", group: "खोज" },
  { path: "/jyotish", title: "आफ्नै ज्योतिष", subtitle: "चिना, राशिफल र ज्योतिष उपकरण", group: "आफ्नै ज्योतिष" },
  { path: "/tools/api", title: "आफ्नै Developers", subtitle: "Public API र integration documentation", group: "आफ्नै टुल्स" }
];

const LEGACY_TOOL_PATHS = new Set(["/tithi", "/diaspora", "/card", "/family", "/developers", "/my-data"]);

const FEATURE_EXACT = new Set([
  ...FEATURE_LINKS.map((x) => x.path),
  ...LEGACY_TOOL_PATHS,
  "/offline", "/convert", "/search", "/notes", "/planner", "/data-trust", "/nepal-sambat", "/astrology"
]);

function matchesFeaturePath(path: string) {
  return FEATURE_EXACT.has(path) ||
    ["/family/", "/settings/", "/calendar/", "/date/", "/festival/", "/jyotish/"].some((p) => path.startsWith(p));
}

function FeatureFrame() {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const path = window.location.pathname;
  const q = new URLSearchParams({ path });
  if (window.location.search) q.set("search", window.location.search);
  const title = FEATURE_LINKS.find((x) => x.path === path)?.title || "MeroPatro";

  return (
    <div className="feature-route-shell">
      <header className="feature-route-bar">
        <a className="feature-home-link" href="/">← MeroPatro</a>
        <strong>{title}</strong>
        <ReadAloudButton
          className="secondary-button feature-read-aloud"
          getText={() => frameRef.current?.contentDocument?.body?.innerText || title}
          label="सुन्नुहोस्"
        />
        <span className="free-pill">Free</span>
      </header>
      <iframe ref={frameRef} className="feature-frame" src={"/api/v1/compat/page?" + q.toString()} title={title} />
    </div>
  );
}

type Loadable<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

function todayInKathmandu(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return get("year") + "-" + get("month") + "-" + get("day");
}

function isoFromDate(date: Date): string {
  return (
    date.getUTCFullYear() +
    "-" +
    String(date.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getUTCDate()).padStart(2, "0")
  );
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function initialDate(today: string) {
  const param = new URLSearchParams(window.location.search).get("date");
  if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return today;
  const date = parseIso(param);
  if (Number.isNaN(date.getTime())) return today;
  return param;
}

export default function App() {
  if (matchesFeaturePath(window.location.pathname)) return <FeatureFrame />;

  const today = useMemo(todayInKathmandu, []);
  const [selectedDate, setSelectedDate] = useState(() => initialDate(today));
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = parseIso(initialDate(today));
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  });

  const [sync, setSync] = useState<Loadable<SyncPayload>>({ data: null, error: null, loading: true });
  const [apod, setApod] = useState<Loadable<ApodPayload>>({ data: null, error: null, loading: true });
  const [tithi, setTithi] = useState<Loadable<TithiPayload>>({ data: null, error: null, loading: true });
  const [cosmic, setCosmic] = useState<Loadable<CosmicDayPayload>>({ data: null, error: null, loading: true });
  const [health, setHealth] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    const controller = new AbortController();
    api.health(controller.signal)
      .then(() => setHealth("online"))
      .catch((error) => {
        if (error?.name !== "AbortError") setHealth("offline");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setSync((state) => ({ ...state, loading: true, error: null }));
    setApod((state) => ({ ...state, loading: true, error: null }));
    setTithi((state) => ({ ...state, loading: true, error: null }));
    setCosmic((state) => ({ ...state, loading: true, error: null }));

    api.sync(selectedDate, controller.signal)
      .then((data) => setSync({ data, error: null, loading: false }))
      .catch((error) => {
        if (error?.name !== "AbortError") setSync({ data: null, error: error.message, loading: false });
      });

    api.apod(selectedDate, controller.signal)
      .then((data) => setApod({ data, error: null, loading: false }))
      .catch((error) => {
        if (error?.name !== "AbortError") setApod({ data: null, error: error.message, loading: false });
      });

    api.tithi(selectedDate, 27.7172, 85.324, controller.signal)
      .then((data) => setTithi({ data, error: null, loading: false }))
      .catch((error) => {
        if (error?.name !== "AbortError") setTithi({ data: null, error: error.message, loading: false });
      });

    api.cosmic(selectedDate, controller.signal)
      .then((data) => setCosmic({ data, error: null, loading: false }))
      .catch((error) => {
        if (error?.name !== "AbortError") setCosmic({ data: null, error: error.message, loading: false });
      });

    return () => controller.abort();
  }, [selectedDate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("date", selectedDate);
    window.history.replaceState(null, "", window.location.pathname + "?" + params.toString());
    document.title = `MeroPatro · ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(parseIso(selectedDate))}`;
  }, [selectedDate]);

  function chooseDate(iso: string) {
    setSelectedDate(iso);
    const d = parseIso(iso);
    setMonthCursor(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
  }

  function shiftSelected(days: number) {
    const d = parseIso(selectedDate);
    d.setUTCDate(d.getUTCDate() + days);
    const next = isoFromDate(d);
    if (next < "1826-04-11" || next > "2037-04-13") return;
    chooseDate(next);
  }

  const effectiveApod = apod.data || cosmic.data?.apod || null;
  const cosmicLoading = cosmic.loading || tithi.loading;

  return (
    <div className="app-shell">
      <HeroCanvas
        imageUrl={effectiveApod?.hdurl || effectiveApod?.url || null}
        loading={apod.loading}
      />

      <main className="app-content cosmic-app-content">
        <CosmicHero
          sync={sync.data}
          tithi={tithi.data}
          cosmic={cosmic.data}
          apod={effectiveApod}
          health={health}
          selectedDate={selectedDate}
          today={today}
          loading={cosmicLoading}
          onDateChange={chooseDate}
          onPreviousDay={() => shiftSelected(-1)}
          onNextDay={() => shiftSelected(1)}
          onToday={() => chooseDate(today)}
        />

        <DailyDirectAnswer selectedDate={selectedDate} today={today} sync={sync.data} />

        <CommunityHomeLine selectedDate={selectedDate} />

        <nav className="home-quick-launch glass-panel" aria-label="Quick access">
          <a href="/jyotish/rashifal"><span>आफ्नै ज्योतिष</span><strong>आफ्नै राशिफल</strong><small>दैनिक · साप्ताहिक · मासिक</small></a>
          <a href="/tools/typingtools"><span>आफ्नै टुल्स</span><strong>आफ्नै नेपाली टाइपिङ</strong><small>Roman → Unicode सुझाव र Preeti converter</small></a>
          <a href="/fm"><span>सुन्नुहोस्</span><strong>आफ्नै रेडियो</strong><small>नेपाल र विश्वका स्टेशन</small></a>
          <a href="/tv"><span>हेर्नुहोस्</span><strong>आफ्नै लाइभ टिभी</strong><small>प्ले गर्न मिल्ने च्यानल</small></a>
        </nav>

        {sync.error && (
          <div className="inline-error cosmic-top-error" role="alert">
            <strong>Calendar synchronization failed.</strong>
            <span>{sync.error}</span>
          </div>
        )}

        <DateTravelExperience selectedDate={selectedDate} today={today} onDateChange={chooseDate} />

        <section className="dashboard-grid" aria-label="Astronomical calendar dashboard">
          <LunarPhaseDial data={tithi.data} loading={tithi.loading} error={tithi.error} />
          <CalendarGrid
            month={monthCursor}
            selectedDate={selectedDate}
            today={today}
            onMonthChange={setMonthCursor}
            onSelectDate={chooseDate}
          />
        </section>

        <CosmicExperience
          data={cosmic.data}
          apod={effectiveApod}
          tithi={tithi.data}
          loading={cosmic.loading}
          error={cosmic.error}
        />

        <section className="feature-hub glass-panel" aria-label="MeroPatro features">
          <div className="section-heading">
            <div>
              <p className="eyebrow">सबै सुविधा निःशुल्क</p>
              <h2>आफ्नै पात्रो · सुविधाहरू</h2>
              <p className="subheading">पात्रो, आफ्नै ज्योतिष, दैनिक जीवन र खोज उपकरण एउटै ठाउँमा।</p>
            </div>
          </div>
          <div className="feature-grid">
            {FEATURE_LINKS.map((item) => (
              <a className="feature-link" href={item.path} key={item.path}>
                <span className="feature-group">{item.group}</span>
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
              </a>
            ))}
          </div>
        </section>

        <footer className="app-footer">
          <span>आफ्नै पात्रो</span>
          <span aria-hidden="true">·</span>
          <span>AD · BS · NS · तिथि · खगोलीय पात्रो</span>
          <span aria-hidden="true">·</span>
          <span>नेपाली पात्रो, तिथि, चाडपर्व र आफ्नै राशिफल</span>
        </footer>
      </main>
    </div>
  );
}
