import { useEffect, useMemo, useRef, useState } from "react";
import { neDigits } from "../nepaliDate";
import { BS_MONTHS } from "../title";
import "./time-machine-atlas.css";

/** Eras in chronological order. Spans are the commonly cited ranges (AD). */
const ERAS: { id: string; ne: string; en: string; span: string; color: string }[] = [
  { id: "early_traditions", ne: "प्रारम्भिक परम्परा", en: "Early traditions", span: "प्रागैतिहासिक – ई. ४००", color: "#8c7a5b" },
  { id: "licchavi", ne: "लिच्छवि काल", en: "Licchavi", span: "लगभग ई. ४०० – ८७९", color: "#b5833a" },
  { id: "malla", ne: "मल्ल काल", en: "Malla", span: "लगभग ई. १२०० – १७६९", color: "#c0603a" },
  { id: "shah_pre_rana", ne: "शाह काल (राणाअघि)", en: "Early Shah", span: "ई. १७६८ – १८४६", color: "#a8433f" },
  { id: "rana", ne: "राणा शासन", en: "Rana rule", span: "ई. १८४६ – १९५१", color: "#7d4a8c" },
  { id: "democratic_transition_1951_1960", ne: "प्रजातन्त्रको उदय", en: "Democratic opening", span: "ई. १९५१ – १९६०", color: "#3f7cac" },
  { id: "panchayat", ne: "पञ्चायत काल", en: "Panchayat", span: "ई. १९६० – १९९०", color: "#5b6f8f" },
  { id: "constitutional_monarchy", ne: "संवैधानिक राजतन्त्र", en: "Constitutional monarchy", span: "ई. १९९० – २००६", color: "#2f8f83" },
  { id: "republic_transition", ne: "गणतन्त्र संक्रमण", en: "Republic transition", span: "ई. २००६ – २०१५", color: "#3d9a5f" },
  { id: "federal_republic", ne: "संघीय गणतन्त्र", en: "Federal republic", span: "ई. २०१५ – हालसम्म", color: "#d4a64a" },
  { id: "transitional", ne: "संक्रमणकालीन", en: "Transitional", span: "", color: "#7f8c86" },
];
const ERA_INDEX = Object.fromEntries(ERAS.map((era, index) => [era.id, index]));

const CATEGORY_NE: Record<string, string> = {
  politics_state: "राजनीति र राज्य", diplomacy_international: "कूटनीति", law_justice_rights: "कानुन र अधिकार",
  economy: "अर्थतन्त्र", science_exploration: "विज्ञान र अन्वेषण", disaster_environment: "विपद् र वातावरण",
  sports: "खेलकुद", religion_culture: "धर्म र संस्कृति", infrastructure_transport: "पूर्वाधार र यातायात",
  arts_literature_language: "कला, साहित्य र भाषा", education_media: "शिक्षा र सञ्चारमाध्यम",
  archaeology_epigraphy: "पुरातत्त्व र अभिलेख", society: "समाज", energy_communications: "ऊर्जा र सञ्चार",
  health: "स्वास्थ्य", world_context: "विश्व सन्दर्भ",
};
export function categoryLabel(id: string) {
  return CATEGORY_NE[id] || id.replace(/[_-]+/g, " ");
}

type Moment = {
  id: string; era: string; category: string; importance: number; disputed: boolean;
  adYear: number | null; bsYear: number | null; dateText: string; title: string; summary: string; sortKey: number;
};

function adYearText(year: number) {
  return year < 0 ? `ई.पू. ${neDigits(Math.abs(year))}` : `ई. ${neDigits(year)}`;
}

const AD_MONTHS_NE = ["जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"];
/** "1980-09-17" (BS) → "१७ पुस १९८०"; partial dates keep only what is known. Non-ISO text passes through. */
function prettyDate(text: string, calendar: "bs" | "ad"): string {
  const m = text.match(/^(-?\d{1,5})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if (!m) return text;
  const year = Number(m[1]), month = Number(m[2] || 0), day = Number(m[3] || 0);
  const months = calendar === "bs" ? BS_MONTHS : AD_MONTHS_NE;
  const yearText = calendar === "bs" ? neDigits(year) : adYearText(year);
  const monthName = month >= 1 && month <= 12 ? months[month - 1] : "";
  return [day ? neDigits(day) : "", monthName, yearText].filter(Boolean).join(" ");
}

function normalize(row: any, index: number): Moment | null {
  const title = String(row?.title_ne || row?.title_en || row?.title || "").trim();
  if (!title) return null;
  const adYear = Number.isFinite(Number(row?.ad_year)) && row?.ad_year !== null ? Number(row.ad_year) : null;
  const bsYear = Number.isFinite(Number(row?.bs_year)) && row?.bs_year !== null ? Number(row.bs_year) : null;
  const bsText = String(row?.bs_date_text || "").trim(), adText = String(row?.ad_date_text || "").trim();
  const dateText = (bsText && prettyDate(bsText, "bs")) || (adText && prettyDate(adText, "ad"))
    || (bsYear ? `वि.सं. ${neDigits(bsYear)}` : adYear !== null ? adYearText(adYear) : "");
  const month = Number(row?.ad_month) || 0, day = Number(row?.ad_day) || 0;
  return {
    id: String(row?.id || row?.key || index),
    era: ERA_INDEX[row?.era_id] !== undefined ? row.era_id : "transitional",
    category: String(row?.category || "society"),
    importance: Math.max(1, Math.min(5, Number(row?.importance) || 2)),
    disputed: row?.disputed === true || row?.disputed === "true",
    adYear, bsYear, dateText, title,
    summary: String(row?.summary_ne || row?.summary_en || row?.summary || "").trim(),
    sortKey: (adYear ?? (bsYear !== null ? bsYear - 57 : 0)) * 10000 + month * 100 + day,
  };
}

export function TimeMachineAtlas({ items, loading, error }: { items: any[]; loading: boolean; error: string }) {
  const [category, setCategory] = useState("all");
  const [majorOnly, setMajorOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [readout, setReadout] = useState<{ moment: Moment | null }>({ moment: null });
  const listRef = useRef<HTMLOListElement>(null);

  const moments = useMemo(() => items.map(normalize).filter(Boolean).sort((a, b) => a!.sortKey - b!.sortKey) as Moment[], [items]);
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of moments) counts.set(m.category, (counts.get(m.category) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [moments]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return moments.filter((m) => (category === "all" || m.category === category) && (!majorOnly || m.importance >= 4)
      && (!q || m.title.toLowerCase().includes(q) || m.summary.toLowerCase().includes(q) || String(m.adYear ?? "").includes(q) || String(m.bsYear ?? "").includes(q)));
  }, [moments, category, majorOnly, query]);
  const byEra = useMemo(() => ERAS.map((era) => ({ era, moments: visible.filter((m) => m.era === era.id) })).filter((group) => group.moments.length), [visible]);
  const eraCounts = useMemo(() => Object.fromEntries(ERAS.map((era) => [era.id, moments.filter((m) => m.era === era.id).length])), [moments]);
  const maxEraCount = Math.max(1, ...Object.values(eraCounts) as number[]);

  // Year dial follows the moment nearest the top of the viewport.
  useEffect(() => {
    const root = listRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    setReadout({ moment: null }); // filters changed: don't show a year that is no longer listed
    const byId = new Map(visible.map((m) => [m.id, m]));
    const observer = new IntersectionObserver((entries) => {
      const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      const id = top?.target.getAttribute("data-moment");
      if (id && byId.has(id)) setReadout({ moment: byId.get(id)! });
    }, { rootMargin: "-18% 0px -70% 0px" });
    root.querySelectorAll("[data-moment]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [visible]);

  const current = readout.moment || visible[visible.length - 1] || null;
  const currentEra = ERAS.find((era) => era.id === current?.era);
  const jump = (eraId: string) => {
    const target = document.getElementById(`tm-era-${eraId}`);
    if (!target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return <main className="tm" aria-labelledby="tm-title">
    <header className="tm-hero">
      <p className="tm-eyebrow">इतिहास · {neDigits(moments.length || 0)} अभिलेखित क्षण</p>
      <h1 id="tm-title">समययन्त्र</h1>
      <p className="tm-lede">लिच्छवि अभिलेखदेखि संघीय गणतन्त्रसम्म — नेपालको इतिहासमा समय यात्रा गर्नुहोस्। तल स्क्रोल गर्दा वर्ष-घडी साथै घुम्छ।</p>
    </header>

    <div className="tm-dial" aria-live="polite" style={{ ["--era" as any]: currentEra?.color || "#d4a64a" }}>
      <span className="tm-dial-year">{current ? (current.bsYear ? neDigits(current.bsYear) : current.adYear !== null ? adYearText(current.adYear) : "—") : "—"}</span>
      <span className="tm-dial-sub">{current?.bsYear && current.adYear !== null ? `वि.सं. · ${adYearText(current.adYear)}` : current?.bsYear ? "वि.सं." : ""}</span>
      <span className="tm-dial-era">{currentEra?.ne || ""}</span>
    </div>

    <nav className="tm-rail" aria-label="युग अनुसार जानुहोस्">
      {ERAS.filter((era) => eraCounts[era.id]).map((era) => <button key={era.id} type="button" onClick={() => jump(era.id)} aria-current={currentEra?.id === era.id ? "true" : undefined}
        style={{ ["--era" as any]: era.color, ["--fill" as any]: `${Math.max(14, Math.round(100 * eraCounts[era.id] / maxEraCount))}%` }}
        aria-label={`${era.ne}, ${era.span}, ${eraCounts[era.id]} घटना`}>
        <span className="tm-rail-name">{era.ne}</span><span className="tm-rail-bar" aria-hidden="true" /><span className="tm-rail-count">{neDigits(eraCounts[era.id])}</span>
      </button>)}
    </nav>

    <section className="tm-filters" aria-label="छान्नुहोस्">
      <label className="tm-search"><span className="sr-only">खोज्नुहोस्</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="घटना, व्यक्ति वा वर्ष खोज्नुहोस्…" /></label>
      <div className="tm-chips" role="group" aria-label="विषय">
        <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>सबै</button>
        {categories.map(([id, count]) => <button type="button" key={id} aria-pressed={category === id} onClick={() => setCategory(category === id ? "all" : id)}>{categoryLabel(id)} <small>{neDigits(count)}</small></button>)}
      </div>
      <label className="tm-major"><input type="checkbox" checked={majorOnly} onChange={(e) => setMajorOnly(e.target.checked)} /> प्रमुख घटना मात्र</label>
      <p className="tm-count" role="status">{neDigits(visible.length)} क्षण देखाइँदै</p>
    </section>

    {loading ? <p className="tm-state">समयरेखा तयार हुँदैछ…</p>
      : error ? <p className="tm-state is-error">{error}</p>
      : !visible.length ? <p className="tm-state">यो छनोटमा कुनै क्षण भेटिएन। अर्को विषय वा शब्द प्रयोग गर्नुहोस्।</p>
      : <ol className="tm-line" ref={listRef}>
        {byEra.map(({ era, moments: list }) => <li key={era.id} className="tm-era" id={`tm-era-${era.id}`} style={{ ["--era" as any]: era.color }}>
          <header className="tm-era-head"><h2>{era.ne}</h2><p>{era.en}{era.span ? ` · ${era.span}` : ""} · {neDigits(list.length)} क्षण</p></header>
          <ol className="tm-moments">
            {list.map((m) => <li key={m.id} data-moment={m.id} className={`tm-moment imp-${m.importance}${m.importance >= 4 ? " is-major" : ""}`}>
              <time className="tm-when">{m.dateText}</time>
              <article className="tm-card">
                <div className="tm-tags"><span className="tm-cat">{categoryLabel(m.category)}</span>{m.disputed ? <span className="tm-disputed" title="इतिहासकारहरूबीच मिति वा विवरणमा मतभेद छ">विवादित मिति</span> : null}</div>
                <h3>{m.title}</h3>
                {m.summary ? <p>{m.summary}</p> : null}
              </article>
            </li>)}
          </ol>
        </li>)}
      </ol>}
  </main>;
}
