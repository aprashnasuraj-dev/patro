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

type FeatureLink = { path: string; title: string; subtitle: string; group: string };
const FEATURE_LINKS: FeatureLink[] = [
  { path: "/jyotish/rashifal", title: "राशिफल · Rashifal", subtitle: "Daily, weekly, monthly · Vedic/Western · exact-birth with consent", group: "Jyotish" },
   { path: "/jyotish/janma-patro", title: "जन्मपत्रो · Kundali", subtitle: "Birth chart, planetary positions, Vimshottari Dasha and 36 Guna Milan", group: "Jyotish" },
  { path: "/aaja", title: "आज · Today", subtitle: "Daily Mero Patro dashboard and open/closed context", group: "Daily" },
  { path: "/tools/tithi", title: "तिथि · Tithi", subtitle: "Tithi reminders, lunar-date derivation and recurrence tools", group: "Tools" },
  { path: "/tools/diaspora", title: "Diaspora", subtitle: "Timezone-aware Nepal calendar context abroad", group: "Tools" },
  { path: "/tools", title: "Utilities · उपकरण", subtitle: "Open the complete tools directory", group: "Tools" },
  { path: "/tools/card", title: "Share Cards", subtitle: "Create calendar, date and festival cards for sharing", group: "Tools" },
  { path: "/tools/family", title: "Family", subtitle: "Private family dates and shared events", group: "Tools" },
  { path: "/settings/holidays", title: "Holiday Settings", subtitle: "Audience, district and closure preferences", group: "Tools" },
  { path: "/settings/notifications", title: "Notifications", subtitle: "Private push reminder controls", group: "Tools" },
  { path: "/tools/my-data", title: "My Data", subtitle: "Export or remove private account data", group: "Tools" },
  { path: "/time-machine", title: "Time Machine", subtitle: "Historical Nepal timeline", group: "Explore" },
  { path: "/samachar", title: "समाचार · Samachar", subtitle: "Nepali news desk", group: "Explore" },
  { path: "/fm", title: "मेरो पात्रो रेडियो", subtitle: "नेपाल र विश्वका रेडियो स्टेशन", group: "Explore" },
  { path: "/explore", title: "सबै सुविधा · All Features", subtitle: "पात्रो, डायरी, मिडिया र उपकरणको पूर्ण सूची", group: "Explore" },
  { path: "/tv", title: "लाइभ टिभी · Live TV", subtitle: "देश, भाषा र विषय अनुसार लाइभ च्यानल", group: "Explore" },
  { path: "/on-this-day", title: "आज इतिहासमा", subtitle: "On This Day history", group: "Explore" },
  { path: "/jyotish", title: "ज्योतिष · Jyotish", subtitle: "Jyotish tools and guidance", group: "Jyotish" },
  { path: "/tools/api", title: "Developers", subtitle: "Public API and embed documentation", group: "Tools" }
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
  const title = FEATURE_LINKS.find((x) => x.path === path)?.title || "Mero Patro";

  return (
    <div className="feature-route-shell">
      <header className="feature-route-bar">
        <a className="feature-home-link" href="/">← Mero Patro</a>
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
    document.title = `मेरो पात्रो · ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(parseIso(selectedDate))}`;
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

        <CommunityHomeLine selectedDate={selectedDate} />

        <nav className="home-quick-launch glass-panel" aria-label="Quick access">
          <a href="/jyotish/rashifal"><span>Jyotish</span><strong>राशिफल · Rashifal</strong><small>Daily · Weekly · Monthly</small></a>
          <a href="/tools/typingtools"><span>Tools</span><strong>Typing Tools · टाइपिङ टुल्स</strong><small>Preeti Converter + Roman → Unicode typing</small></a>
          <a href="/fm"><span>Listen</span><strong>FM Radio</strong><small>Nepal & global stations</small></a>
          <a href="/tv"><span>Watch</span><strong>Live TV</strong><small>Playable channels</small></a>
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

        <section className="feature-hub glass-panel" aria-label="Mero Patro features">
          <div className="section-heading">
            <div>
              <p className="eyebrow">All features are free</p>
              <h2>मेरो पात्रो · Features</h2>
              <p className="subheading">Calendar, Jyotish, daily-life and discovery tools in one place.</p>
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
          <span>मेरो पात्रो</span>
          <span aria-hidden="true">·</span>
          <span>AD · BS · NS · तिथि · खगोलीय पात्रो</span>
          <span aria-hidden="true">·</span>
          <span>नेपाली पात्रो, तिथि, चाडपर्व र राशिफल</span>
        </footer>
      </main>
    </div>
  );
}
