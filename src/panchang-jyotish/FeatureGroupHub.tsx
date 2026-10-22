import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import type { FeatureGroupId, PatroFeature } from "./catalog";
import { FEATURE_GROUPS, getFeaturesForGroup } from "./catalog";
import { useUiLanguage, l } from "../useUiLanguage";
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
  const [activeFeature, setActiveFeature] = useState<string | null>(() => featureFromHash(groupId));
  const features = useMemo(() => getFeaturesForGroup(groupId), [groupId]);
  const Workspace = WORKSPACES[groupId];
  const matches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return features;
    return features.filter((item) =>
      [item.titleNe, item.titleEn, item.descriptionNe, item.descriptionEn, item.id]
        .some((value) => value.toLocaleLowerCase().includes(q))
    );
  }, [features, query]);

  useEffect(() => {
    const sync = () => setActiveFeature(featureFromHash(groupId));
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [groupId]);

  useEffect(() => {
    document.title = l(language, group.titleNe + " | आफ्नै पात्रो", group.titleEn + " | Aafnai Patro");
  }, [group, language]);

  function openFeature(item: PatroFeature) {
    if (!isLocalFeature(item, groupId)) return;
    const hash = item.href.split("#")[1];
    if (hash) {
      if (window.location.hash !== "#" + hash) window.history.replaceState(null, "", window.location.pathname + window.location.search + "#" + hash);
      setActiveFeature(item.id);
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
        <div className="ap-pj-orb" aria-hidden="true">{group.icon}</div>
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

      <section className="ap-pj-workspace" id="ap-pj-workspace" aria-label={l(language, "गणना कार्यक्षेत्र", "Calculation workspace")}>
        <header className="ap-pj-section-head">
          <div>
            <span className="ap-pj-eyebrow">{l(language, "छानिएको समूह", "Selected group")}</span>
            <h2>{activeFeature ? (features.find((item) => item.id === activeFeature)?.titleNe && language === "ne"
              ? features.find((item) => item.id === activeFeature)!.titleNe
              : features.find((item) => item.id === activeFeature)?.titleEn) : l(language, "आजबाट सुरु गर्नुहोस्", "Start with today")}</h2>
          </div>
          {activeFeature && <button type="button" className="ap-pj-clear" onClick={() => { setActiveFeature(null); if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search); }}>{l(language, "सारांश", "Overview")}</button>}
        </header>
        <Suspense fallback={<div className="ap-pj-loading" role="status">{l(language, "गणक तयार हुँदैछ…", "Preparing calculator…")}</div>}>
          <Workspace language={language} selectedFeatureId={activeFeature} />
        </Suspense>
      </section>

      <section className="ap-pj-directory">
        <div className="ap-pj-section-head">
          <div>
            <span className="ap-pj-eyebrow">{l(language, "समूहभित्रका सुविधा", "Features in this group")}</span>
            <h2>{l(language, "गणक र जानकारी", "Calculators and guides")}</h2>
            <p>{l(language, "आफूलाई चाहिएको सुविधा खोज्नुहोस्। उपलब्ध गणना ब्राउजरमै चल्छ; प्रमाणित प्रकाशन र परम्परागत नियम छुट्टै चिनाइन्छ।", "Find the feature you need. Available calculations run in your browser; published dates and tradition-specific rules are identified separately.")}</p>
          </div>
          <div className="ap-pj-count">{matches.length} / {features.length}</div>
        </div>
        <label className="ap-pj-search">
          <span aria-hidden="true">⌕</span>
          <span className="ap-pj-sr-only">{l(language, "सुविधा खोज्नुहोस्", "Search features")}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={l(language, "तिथि, नक्षत्र, साइत, ग्रह… खोज्नुहोस्", "Search Tithi, Nakshatra, Muhurat, planets…")} />
          {query && <button type="button" onClick={() => setQuery("")} aria-label={l(language, "खोज हटाउनुहोस्", "Clear search")}>×</button>}
        </label>
        {matches.length ? <div className="ap-pj-grid">
          {matches.map((item) => {
            const local = isLocalFeature(item, groupId);
            return <a
              className={"ap-pj-feature-card" + (activeFeature === item.id ? " is-active" : "")}
              key={item.id}
              href={item.href}
              onClick={() => openFeature(item)}
              aria-current={activeFeature === item.id ? "true" : undefined}
            >
              <span className="ap-pj-feature-mark" aria-hidden="true">{item.id.slice(1)}</span>
              <span className="ap-pj-feature-copy">
                <strong>{l(language, item.titleNe, item.titleEn)}</strong>
                <small>{l(language, item.descriptionNe, item.descriptionEn)}</small>
              </span>
              <span className="ap-pj-feature-arrow" aria-hidden="true">{local ? "↓" : "↗"}</span>
            </a>;
          })}
        </div> : <div className="ap-pj-empty">{l(language, "यस खोजसँग मिल्ने सुविधा भेटिएन।", "No features match this search.")}</div>}
      </section>

      <section className="ap-pj-related">
        <h2>{l(language, "आफ्नै पात्रोका अन्य सुविधा", "More from Aafnai Patro")}</h2>
        <div>
          {FEATURE_GROUPS.filter((item) => item.id !== groupId).map((item) => <a href={item.href} key={item.id}><span>{item.icon}</span><strong>{l(language, item.titleNe, item.titleEn)}</strong><small>{l(language, item.descriptionNe, item.descriptionEn)}</small></a>)}
        </div>
      </section>
    </main>
  );
}
