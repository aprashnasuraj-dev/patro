import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import type { FeatureGroupId, PatroFeature } from "./catalog";
import { FEATURE_GROUPS, getFeaturesForGroup, getFeatureAvailability } from "./catalog";
import { useUiLanguage, l } from "../useUiLanguage";
import { FeatureExperience } from "./FeatureExperience";
import { FeatureGlyph } from "./FeatureGlyph";
import { WorkspaceErrorBoundary } from "./WorkspaceErrorBoundary";
import "./feature-experience.css";
import "./feature-group-hub.css";

const PanchangWorkspace = lazy(() => import("./workspaces/PanchangWorkspace").then((m) => ({ default: m.PanchangWorkspace })));
const MuhuratWorkspace = lazy(() => import("./workspaces/MuhuratWorkspace").then((m) => ({ default: m.MuhuratWorkspace })));
const JyotishWorkspace = lazy(() => import("./workspaces/JyotishWorkspace").then((m) => ({ default: m.JyotishWorkspace })));
const PlanetsWorkspace = lazy(() => import("./workspaces/PlanetsWorkspace").then((m) => ({ default: m.PlanetsWorkspace })));
const RegionalWorkspace = lazy(() => import("./workspaces/RegionalWorkspace").then((m) => ({ default: m.RegionalWorkspace })));

const WORKSPACES = {
  panchang: PanchangWorkspace,
  muhurat: MuhuratWorkspace,
  jyotish: JyotishWorkspace,
  planets: PlanetsWorkspace,
  "nepal-calendar": RegionalWorkspace
} as const;

function featureFromHash(group: FeatureGroupId): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  return getFeaturesForGroup(group).find((item) => item.href.split("#")[1] === hash)?.id ?? null;
}

function isLocalFeature(item: PatroFeature, group: FeatureGroupId) {
  const path = item.href.split("#")[0];
  return path === FEATURE_GROUPS.find((x) => x.id === group)?.href;
}

export function FeatureGroupHub({ groupId }: { groupId: FeatureGroupId }) {
  const language = useUiLanguage();
  const group = FEATURE_GROUPS.find((item) => item.id === groupId) ?? FEATURE_GROUPS[0];
  const [query, setQuery] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "existing" | "browser-preview">("all");
  const [workspaceRequested, setWorkspaceRequested] = useState(() => { const id = featureFromHash(groupId); const item = getFeaturesForGroup(groupId).find(feature => feature.id === id); return Boolean(item && getFeatureAvailability(item) === "browser-preview"); });
  const [activeFeature, setActiveFeature] = useState<string | null>(() => featureFromHash(groupId));
  const features = useMemo(() => getFeaturesForGroup(groupId), [groupId]);
  const selected = features.find(item => item.id === activeFeature) ?? null;
  const Workspace = WORKSPACES[groupId];
  const selectedAvailability = selected ? getFeatureAvailability(selected) : null;
  const showWorkspace = workspaceRequested && (!selected || selectedAvailability === "browser-preview");
  const matches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return features.filter((item) =>
      (availabilityFilter === "all" || getFeatureAvailability(item) === availabilityFilter) &&
      [item.titleNe, item.titleEn, item.descriptionNe, item.descriptionEn, item.id]
        .some((value) => value.toLocaleLowerCase().includes(q))
    );
  }, [features, query, availabilityFilter]);

  useEffect(() => {
    const sync = () => {
      const id = featureFromHash(groupId);
      setActiveFeature(id);
      setWorkspaceRequested(Boolean(id && getFeaturesForGroup(groupId).some(item => item.id === id && getFeatureAvailability(item) === "browser-preview")));
    };
    sync();
    // pushState does not emit hashchange; popstate is needed for Back/Forward.
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [groupId]);

  useEffect(() => {
    document.title = l(language, group.titleNe + " | आफ्नै पात्रो", group.titleEn + " | Aafnai Patro");
  }, [group, language]);

  function openFeature(item: PatroFeature) {
    if (!isLocalFeature(item, groupId)) return;
    const hash = item.href.split("#")[1];
    setAnnouncement(l(language, item.titleNe, item.titleEn));
    if (hash) {
      if (window.location.hash !== "#" + hash) {
        window.history.pushState(null, "", window.location.pathname + window.location.search + "#" + hash);
      }
      setActiveFeature(item.id);
      setWorkspaceRequested(getFeatureAvailability(item) === "browser-preview");
      window.setTimeout(() => document.getElementById("ap-pj-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
    }
  }

  return (
    <main className="ap-page ap-pj-page">
      <nav className="ap-pj-breadcrumbs" aria-label={l(language, "मार्ग", "Breadcrumb")}>
        <a href="/">{l(language, "आफ्नै पात्रो", "Aafnai Patro")}</a><span aria-hidden="true">›</span>
        <a href="/tools">{l(language, "उपकरण", "Tools")}</a><span aria-hidden="true">›</span>
        <span aria-current="page">{l(language, group.titleNe, group.titleEn)}</span>
      </nav>

      <section className="ap-pj-hero">
        <div className="ap-pj-orb" aria-hidden="true"><FeatureGlyph featureId={group.iconFeatureId} size="hero" /></div>
        <div className="ap-pj-hero-copy">
          <p className="ap-pj-eyebrow">{l(language, "आफ्नै पात्रो · उपयोगी गणक", "Aafnai Patro · Useful calculators")}</p>
          <h1>{l(language, group.titleNe, group.titleEn)}</h1>
          <p>{l(language, group.descriptionNe, group.descriptionEn)}</p>
          <div className="ap-pj-trust">
            <span>{l(language, "नेपालको समय र पात्रो", "Nepal time and calendar")}</span>
            <span>{l(language, "मोबाइलमैत्री", "Mobile friendly")}</span>
            <span>{l(language, "नेपाली / English", "Nepali / English")}</span>
          </div>
        </div>
        <a className="ap-pj-back" href="/tools">{l(language, "सबै उपकरण", "All tools")} ↗</a>
      </section>

      <p className="ap-pj-sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
      <section className="ap-pj-workspace" id="ap-pj-workspace" aria-label={l(language, "गणना कार्यक्षेत्र", "Calculation workspace")}>
        <header className="ap-pj-section-head">
          <div>
            <span className="ap-pj-eyebrow">{l(language, "छानिएको समूह", "Selected group")}</span>
            <h2>{selected ? l(language, selected.titleNe, selected.titleEn) : l(language, "आजबाट सुरु गर्नुहोस्", "Start with today")}</h2>
          </div>
          {activeFeature && <button type="button" className="ap-pj-clear" onClick={() => { setActiveFeature(null); setWorkspaceRequested(false); if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search); }}>{l(language, "सारांश", "Overview")}</button>}
        </header>
        {selected && <FeatureExperience feature={selected} group={groupId} language={language} onNavigate={openFeature} />}
        <div className="ap-pj-calculator" id="ap-pj-calculator">
          {showWorkspace ? <WorkspaceErrorBoundary language={language} resetKey={groupId + ":" + (activeFeature ?? "overview")}><Suspense fallback={<div className="ap-pj-loading" role="status" aria-live="polite">{l(language, "गणना कार्यक्षेत्र खुल्दैछ…", "Opening the calculation workspace…")}</div>}>
            <Workspace language={language} selectedFeatureId={activeFeature} />
          </Suspense></WorkspaceErrorBoundary> : <div className="ap-pj-launch-panel">
            <span aria-hidden="true" className="ap-pj-launch-emblem"><FeatureGlyph featureId={group.iconFeatureId} size="card" /></span>
            <div><h3>{selectedAvailability === "existing" ? l(language, "पहिलेकै उपकरण सुरक्षित छ", "Your existing tool is preserved") : l(language, "आफ्नो गणक सुरु गर्नुहोस्", "Start your calculator")}</h3>
            <p>{selectedAvailability === "existing" ? l(language, "सम्बन्धित मूल पेजमा जाँदा पुरानै कार्यप्रणाली प्रयोग हुन्छ।", "The original destination retains its own functionality.") : l(language, "उपकरण खोलेपछि मात्र आवश्यक गणना कोड डाउनलोड र चल्छ।", "Calculation code is downloaded and executed only after you open the tool.")}</p></div>
            {selectedAvailability === "existing" && selected ? <a className="ap-pjw-primary" href={selected.href}>{l(language, "मूल उपकरण खोल्नुहोस्", "Open original tool")} ↗</a> : <button type="button" className="ap-pjw-primary" onClick={() => setWorkspaceRequested(true)}>{l(language, "गणक खोल्नुहोस्", "Open calculator")} →</button>}
          </div>}
        </div>
      </section>

      <section className="ap-pj-directory">
        <div className="ap-pj-section-head">
          <div>
            <span className="ap-pj-eyebrow">{l(language, "समूहभित्रका सुविधा", "Features in this group")}</span>
            <h2>{l(language, "गणक र जानकारी", "Calculators and guides")}</h2>
            <p>{l(language, "आफूलाई चाहिएको सुविधा खोज्नुहोस्। उपलब्ध गणना ब्राउजरमै चल्छ; प्रमाणित प्रकाशन र परम्परागत नियम छुट्टै चिनाइन्छ।", "Find the feature you need. Available calculations run in your browser; published dates and tradition-specific rules are identified separately.")}</p>
          </div>
          <output className="ap-pj-count" aria-live="polite" aria-atomic="true" aria-label={l(language, "मिलेका सुविधा", "Matching features")}>{matches.length} / {features.length}</output>
        </div>
        <label className="ap-pj-search">
          <span aria-hidden="true" className="ap-pj-search-glyph"><FeatureGlyph featureId={group.iconFeatureId} symbol="search" size="inline" /></span>
          <span className="ap-pj-sr-only">{l(language, "सुविधा खोज्नुहोस्", "Search features")}</span>
          <input type="search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={l(language, "तिथि, नक्षत्र, साइत, ग्रह… खोज्नुहोस्", "Search Tithi, Nakshatra, Muhurat, planets…")} />
          {query && <button type="button" onClick={() => setQuery("")} aria-label={l(language, "खोज हटाउनुहोस्", "Clear search")}>×</button>}
        </label>
        <div className="ap-pj-filters" role="group" aria-label={l(language, "सुविधाको अवस्था अनुसार छान्नुहोस्", "Filter features by availability")}>
          {(["all", "existing", "browser-preview"] as const).map(state => <button type="button" key={state} aria-pressed={availabilityFilter === state} className={availabilityFilter === state ? "is-selected" : ""} onClick={() => setAvailabilityFilter(state)}>{state === "all" ? l(language, "सबै", "All") : state === "existing" ? l(language, "विद्यमान", "Existing") : l(language, "ब्राउजर गणक", "Browser tools")} <span>{state === "all" ? features.length : features.filter(item => getFeatureAvailability(item) === state).length}</span></button>)}
        </div>
        {matches.length ? <div className="ap-pj-grid">
          {matches.map((item) => {
            const local = isLocalFeature(item, groupId);
            return <a
              className={"ap-pj-feature-card" + (activeFeature === item.id ? " is-active" : "")}
              key={item.id}
              href={item.href}
              onClick={(event) => { if (local && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); openFeature(item); } }}
              aria-current={activeFeature === item.id ? "true" : undefined}
            >
              <span className="ap-pj-feature-mark" aria-hidden="true"><FeatureGlyph featureId={item.id} size="card" /></span>
              <span className="ap-pj-feature-copy">
                <strong>{l(language, item.titleNe, item.titleEn)}</strong>
                <small>{l(language, item.descriptionNe, item.descriptionEn)}</small><small className="ap-pj-feature-status">{getFeatureAvailability(item) === "existing" ? l(language, "विद्यमान सुविधा", "Existing feature") : l(language, "ब्राउजर गणना · नतिजा पुष्टि बाँकी", "Browser calculator · output verification pending")}</small>
              </span>
              <span className="ap-pj-feature-arrow" aria-hidden="true">{local ? "↓" : "↗"}</span>
            </a>;
          })}
        </div> : <div className="ap-pj-empty" role="status"><p>{l(language, "यस खोजसँग मिल्ने सुविधा भेटिएन।", "No features match this search.")}</p><button type="button" className="ap-pj-clear" onClick={() => { setQuery(""); setAvailabilityFilter("all"); }}>{l(language, "सबै सुविधा देखाउनुहोस्", "Show all features")}</button></div>}
      </section>

      <section className="ap-pj-related">
        <h2>{l(language, "आफ्नै पात्रोका अन्य सुविधा", "More from Aafnai Patro")}</h2>
        <div>
          {FEATURE_GROUPS.filter((item) => item.id !== groupId).map((item) => <a href={item.href} key={item.id}><span aria-hidden="true"><FeatureGlyph featureId={item.iconFeatureId} size="card" /></span><strong>{l(language, item.titleNe, item.titleEn)}</strong><small>{l(language, item.descriptionNe, item.descriptionEn)}</small></a>)}
        </div>
      </section>
    </main>
  );
}
