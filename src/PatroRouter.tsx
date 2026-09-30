import { lazy, Suspense, useEffect, useState } from "react";
import { PATRO_TOOL_SLUGS } from "./patro-tools-integration/toolSlugs";
import { SeoMeta } from "./components/seo/SeoMeta";

const App = lazy(() => import("./App"));
const MediaSuite = lazy(() => import("./media/MediaSuite").then((m) => ({ default: m.MediaSuite })));
const JanmaPatroSuite = lazy(() => import("./jyotish/JanmaPatroSuite").then((m) => ({ default: m.JanmaPatroSuite })));
const UtilitySuite = lazy(() => import("./utilities/UtilitySuite").then((m) => ({ default: m.UtilitySuite })));
const NepaliTools = lazy(() => import("./features/nepali-tools/NepaliTools").then((m) => ({ default: m.NepaliTools })));
const FeatureHub = lazy(() => import("./components/FeatureHub").then((m) => ({ default: m.FeatureHub })));
const MyDiary = lazy(() => import("./components/MyDiary").then((m) => ({ default: m.MyDiary })));
const TrustPage = lazy(() => import("./components/TrustPages").then((m) => ({ default: m.TrustPage })));
const NotFound = lazy(() => import("./components/NotFound").then((m) => ({ default: m.NotFound })));
const PatroToolsShell = lazy(() => import("./patro-tools-integration/PatroToolsShell").then((m) => ({ default: m.PatroToolsShell })));
const CommunityPreferences = lazy(() => import("./community/CommunityPreferences").then((m) => ({ default: m.CommunityPreferences })));
const CommunityAdmin = lazy(() => import("./community/CommunityAdmin").then((m) => ({ default: m.CommunityAdmin })));
const FamilyPage = lazy(() => import("./components/NativeProtectedPages").then((m) => ({ default: m.FamilyPage })));
const MyDataPage = lazy(() => import("./components/NativeProtectedPages").then((m) => ({ default: m.MyDataPage })));
const NotificationSettingsPage = lazy(() => import("./components/NativeProtectedPages").then((m) => ({ default: m.NotificationSettingsPage })));
const HolidaySettingsPage = lazy(() => import("./components/NativeProtectedPages").then((m) => ({ default: m.HolidaySettingsPage })));
const DevelopersPage = lazy(() => import("./components/NativeProtectedPages").then((m) => ({ default: m.DevelopersPage })));
const OfflinePage = lazy(() => import("./components/NativeProtectedPages").then((m) => ({ default: m.OfflinePage })));
const RouteAlias = lazy(() => import("./components/NativeProtectedPages").then((m) => ({ default: m.RouteAlias })));

const NATIVE_PATHS = new Set([
  "/astro","/fm","/tv","/tools","/explore","/my-diary","/about","/sources","/privacy","/terms","/contact","/404",
  "/jyotish/janma-patro","/jyotish/matchmaking","/settings/community","/admin/community-suites",
  "/aaja","/tithi","/diaspora","/card","/family","/family/join","/my-data","/settings/holidays","/settings/notifications","/offline","/developers"
]);

function isNativePath(path: string) {
  return NATIVE_PATHS.has(path) || path.startsWith("/tools/");
}

function currentPath() {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

function RouteFallback() {
  return (
    <main
      role="status"
      aria-live="polite"
      style={{
        minHeight: "55vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      Loading…
    </main>
  );
}

export function PatroRouter() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onPop = () => setPath(currentPath());
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const normalized = url.pathname.replace(/\/+$/, "") || "/";
      if (!isNativePath(normalized)) return;
      event.preventDefault();
      window.history.pushState(null, "", url.pathname + url.search + url.hash);
      setPath(normalized);
      window.dispatchEvent(new Event("patro:navigation"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("popstate", onPop);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onClick);
    };
  }, []);

  const renderRoute = () => {
    if (path === "/aaja") return <RouteAlias to="/" />;
    if (path === "/tithi") return <RouteAlias to="/tools/tithi-reminder" />;
    if (path === "/diaspora") return <RouteAlias to="/tools/clock" />;
    if (path === "/card") return <RouteAlias to="/tools/janmadin-akhbar" />;
    if (path === "/family" || path === "/family/join" || path === "/tools/family") return <FamilyPage />;
    if (path === "/my-data" || path === "/tools/my-data") return <MyDataPage />;
    if (path === "/settings/notifications") return <NotificationSettingsPage />;
    if (path === "/settings/holidays") return <HolidaySettingsPage />;
    if (path === "/developers" || path === "/tools/api") return <DevelopersPage />;
    if (path === "/offline") return <OfflinePage />;
    if (path === "/tools/tithi") return <RouteAlias to="/tools/tithi-reminder" />;
    if (path === "/tools/diaspora") return <RouteAlias to="/tools/clock" />;
    if (path === "/tools/card") return <RouteAlias to="/tools/janmadin-akhbar" />;
    if (path === "/settings/community") return <CommunityPreferences />;
    if (path === "/admin/community-suites") return <CommunityAdmin />;
    if (path === "/explore") return <FeatureHub />;
    if (path === "/about") return <TrustPage page="about" />;
    if (path === "/sources") return <TrustPage page="sources" />;
    if (path === "/privacy") return <TrustPage page="privacy" />;
    if (path === "/terms") return <TrustPage page="terms" />;
    if (path === "/contact") return <TrustPage page="contact" />;
    if (path === "/404") return <NotFound />;
    if (path === "/my-diary") return <MyDiary />;
    if (path === "/fm") return <MediaSuite kind="radio" />;
    if (path === "/tv") return <MediaSuite kind="tv" />;

    const patroToolSlug = path.startsWith("/tools/") ? path.slice("/tools/".length) : "";
    if (PATRO_TOOL_SLUGS.has(patroToolSlug)) return <PatroToolsShell slug={patroToolSlug} />;
    if (path === "/tools/nepali-typing" || path === "/tools/type") return <NepaliTools mode="typing" />;
    if (path === "/tools/preeti" || path === "/tools/preeti-converter" || path === "/tools/preeti-to-unicode" || path === "/tools/preetitounicode") return <NepaliTools mode="preeti-to-unicode" />;
    if (path === "/tools/unicode-to-preeti" || path === "/tools/unicodetopreeti") return <NepaliTools mode="unicode-to-preeti" />;
    if (path === "/tools/janma") return <JanmaPatroSuite />;
    if (path === "/tools" || path.startsWith("/tools/")) return <UtilitySuite key={path} />;
    if (path === "/jyotish/janma-patro" || path === "/jyotish/matchmaking") return <JanmaPatroSuite />;
    return <App />;
  };

  return <><SeoMeta path={path} /><Suspense fallback={<RouteFallback />}>{renderRoute()}</Suspense></>;
}
