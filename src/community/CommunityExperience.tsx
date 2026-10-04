import { formatDate } from "../nepaliDate";
import { useEffect, useMemo, useState } from "react";
import { SUITES, type SuiteId } from "../patro-tools/communities/registry";
import { suiteCalendar, upcoming } from "../patro-tools/communities/shared/resolve";
import { festivalsOfYear, formatNs, nsFromAd } from "../patro-tools/nepal-sambat/engine";
import { readCommunityPreferences, saveCommunityPreferences, communityFeedUrl, type CommunityId } from "./preferences";
import { applyRouteSeo } from "../seo";
import { l, useUiLanguage } from "../useUiLanguage";
import "./community-experience.css";

const SUITE_IDS: SuiteId[] = ["lhosar", "tharu", "mithila", "kirat", "hijri"];
const SUITE_ACCENTS: Record<SuiteId, string> = { lhosar: "☸", tharu: "◒", mithila: "◇", kirat: "◉", hijri: "☾" };

function todayNepal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function adYear(iso: string) { return Number(iso.slice(0, 4)); }
function prettyDate(iso: string, language: "ne" | "en") {
  return formatDate(iso, language, { weekday: "short" });
}
function confidenceLabel(value: string, language: "ne" | "en") {
  if (value === "announced") return l(language, "आधिकारिक घोषणा", "Announced");
  if (value === "expected") return l(language, "अनुमानित", "Expected");
  if (value === "confirmed") return l(language, "पुष्टि", "Confirmed");
  return l(language, "इञ्जिन गणना", "Engine-computed");
}
function holidayLabel(value: string | undefined, language: "ne" | "en") {
  if (!value || value === "none") return "";
  const map: Record<string, [string, string]> = { national: ["राष्ट्रिय बिदा", "National holiday"], community: ["समुदाय बिदा", "Community holiday"], women: ["महिला बिदा", "Women's holiday"], regional: ["क्षेत्रीय बिदा", "Regional holiday"], check: ["आधिकारिक सूचना जाँच्नुहोस्", "Check official notice"] };
  return map[value] ? l(language, map[value][0], map[value][1]) : value;
}
function sourcesFor(suite: (typeof SUITES)[SuiteId], keys: string[]) {
  return keys.map((key) => ({ key, url: suite.sources[key] })).filter((item) => Boolean(item.url));
}

function FeedToggle({ id }: { id: CommunityId }) {
  const language = useUiLanguage();
  const [selected, setSelected] = useState<CommunityId[]>(() => readCommunityPreferences());
  const active = selected.includes(id);
  const toggle = async () => {
    const next = active ? selected.filter((item) => item !== id) : [...selected, id];
    setSelected(next);
    const result = await saveCommunityPreferences(next);
    setSelected(result.communities);
  };
  return <div className="cx-feed-action"><button type="button" onClick={toggle} className={active ? "is-active" : ""}>{active ? l(language, "मेरो समुदाय फिडमा छ", "In my community feed") : l(language, "मेरो समुदाय फिडमा थप्नुहोस्", "Add to my community feed")}</button>{active ? <a href={communityFeedUrl(selected, todayNepal())}>{l(language, "ICS क्यालेन्डर खोल्नुहोस्", "Open ICS calendar")}</a> : null}</div>;
}

export function CommunitySuitePage({ suiteId }: { suiteId: SuiteId }) {
  const language = useUiLanguage();
  const today = useMemo(todayNepal, []);
  const [year, setYear] = useState(adYear(today));
  const suite = SUITES[suiteId];
  useEffect(() => { applyRouteSeo(`/samudaya/${suiteId}`); }, [suiteId]);
  const rows = useMemo(() => { try { return suiteCalendar(suite, year); } catch { return []; } }, [suite, year]);
  const nextRows = useMemo(() => { try { return upcoming(suite, today, 4); } catch { return []; } }, [suite, today]);
  return <main className="cx-page" id="main-content">
    <section className={`cx-hero cx-${suiteId}`}>
      <div className="cx-symbol" aria-hidden="true">{SUITE_ACCENTS[suiteId]}</div>
      <div><span>{l(language, "समुदाय पात्रो · नियम-आधारित", "Community calendar · rule-based")}</span><h1>{language === "en" ? suite.en : suite.dev}</h1><p>{l(language, `${suite.communities.join(" · ")} समुदायका पर्व र मिति गणना।`, `Rule-based festival and date calculations for ${suite.communities.join(" · ")}.`)}</p></div>
      <FeedToggle id={suiteId}/>
    </section>

    <section className="cx-next"><header><div><span>{l(language, "अर्को", "Next")}</span><h2>{l(language, "आगामी पर्व", "Upcoming observances")}</h2></div><a href="/settings/community">{l(language, "समुदाय प्राथमिकता", "Community preferences")}</a></header><div className="cx-next-grid">{nextRows.map((row) => <article key={`${row.festival.id}-${row.start}`}><small>{prettyDate(row.start, language)}</small><strong>{language === "en" ? row.festival.en : row.festival.dev}</strong><span>{confidenceLabel(row.confidence, language)}</span></article>)}</div></section>

    <section className="cx-calendar"><header><div><span>{l(language, "वार्षिक दृश्य", "Year view")}</span><h2>{year}</h2></div><div className="cx-year-actions"><button type="button" onClick={() => setYear((value) => value - 1)}>← {l(language, "अघिल्लो", "Previous")}</button><button type="button" onClick={() => setYear(adYear(today))}>{l(language, "यो वर्ष", "This year")}</button><button type="button" onClick={() => setYear((value) => value + 1)}>{l(language, "अर्को", "Next")} →</button></div></header>
      <div className="cx-event-list">{rows.filter((row) => !row.region).map((row) => {
        const sourceLinks = sourcesFor(suite, row.festival.sources || []);
        return <article className="cx-event" key={`${row.festival.id}-${row.start}`}><div className="cx-date"><b>{prettyDate(row.start, language)}</b>{row.end !== row.start ? <small>→ {prettyDate(row.end, language)}</small> : null}</div><div className="cx-event-copy"><h3>{language === "en" ? row.festival.en : row.festival.dev}</h3><p>{row.festival.summary}</p><div className="cx-badges"><span>{confidenceLabel(row.confidence, language)}</span>{holidayLabel(row.festival.holiday, language) ? <span>{holidayLabel(row.festival.holiday, language)}</span> : null}{row.festival.communities.slice(0, 3).map((name) => <span key={name}>{name}</span>)}</div>{row.festival.details?.length ? <ul>{row.festival.details.slice(0, 4).map((detail) => <li key={detail}>{detail}</li>)}</ul> : null}{sourceLinks.length ? <div className="cx-sources">{sourceLinks.slice(0, 3).map((source) => <a key={source.key} href={source.url} target="_blank" rel="noopener noreferrer">{l(language, "स्रोत", "Source")}: {source.key}</a>)}</div> : null}</div></article>;
      })}{!rows.length ? <div className="cx-empty">{l(language, "यस वर्षका मिति गणना हुन सकेनन्।", "Dates could not be calculated for this year.")}</div> : null}</div>
    </section>

    {suiteId === "hijri" ? <aside className="cx-method-note"><b>{l(language, "हिजरी मितिबारे", "About Hijri dates")}</b><p>{l(language, "चन्द्रदर्शनसँग सम्बन्धित मिति इञ्जिनले ‘अनुमानित’ भनेर छुट्टै देखाउँछ। आधिकारिक/स्थानीय घोषणा भए त्यसलाई प्राथमिकता दिनुपर्छ।", "Dates that depend on crescent visibility are explicitly marked expected. Official or local announcements take precedence when available.")}</p></aside> : null}
    <nav className="cx-suite-nav"><a href="/samudaya">← {l(language, "समुदाय", "Community")}</a><a href="/samudaya/chakra">{l(language, "समुदाय चक्र", "Community cycle")} →</a></nav>
  </main>;
}

export function NepalSambatPage() {
  const language = useUiLanguage();
  const today = useMemo(todayNepal, []);
  const current = useMemo(() => { try { return nsFromAd(today); } catch { return null; } }, [today]);
  const [year, setYear] = useState(current?.year || adYear(today) - 879);
  useEffect(() => { applyRouteSeo("/nepal-sambat/mandala"); }, []);
  const festivals = useMemo(() => { try { return festivalsOfYear(year); } catch { return []; } }, [year]);
  return <main className="cx-page" id="main-content">
    <section className="cx-hero cx-nepal-sambat"><div className="cx-symbol" aria-hidden="true">𑐣𑐾</div><div><span>{l(language, "नेपाल संवत् · चन्द्र पात्रो", "Nepal Sambat · lunar calendar")}</span><h1>{l(language, "नेपाल संवत् मण्डल", "Nepal Sambat Mandala")}</h1><p>{current ? formatNs(current, language === "en" ? "roman" : "dev", { weekday: true }) : l(language, "आजको नेपाल संवत् मिति गणना हुँदैछ।", "Calculating today's Nepal Sambat date.")}</p></div><FeedToggle id="nepal-sambat"/></section>
    <section className="cx-calendar"><header><div><span>{l(language, "संवत् वर्ष", "Sambat year")}</span><h2>{year}</h2></div><div className="cx-year-actions"><button type="button" onClick={() => setYear((v) => v - 1)}>←</button><button type="button" onClick={() => current && setYear(current.year)}>{l(language, "हाल", "Current")}</button><button type="button" onClick={() => setYear((v) => v + 1)}>→</button></div></header><div className="cx-event-list">{festivals.map((row) => <article className="cx-event" key={`${row.festival.id}-${row.start}`}><div className="cx-date"><b>{prettyDate(row.start, language)}</b>{row.end !== row.start ? <small>→ {prettyDate(row.end, language)}</small> : null}</div><div className="cx-event-copy"><h3>{language === "en" ? row.festival.en : row.festival.dev}</h3><p>{formatNs(row.ns, language === "en" ? "roman" : "dev")}</p><div className="cx-badges"><span>{confidenceLabel(row.confidence, language)}</span></div></div></article>)}</div></section>
    <aside className="cx-method-note"><b>{l(language, "गणना विधि", "Calculation method")}</b><p>{l(language, "नेपाल संवत् चन्द्र मिति काठमाडौं सूर्योदय, अमान्त चन्द्र महिना र पात्रो इञ्जिनबाट गणना हुन्छ। सम्पादकीय पुष्टि उपलब्ध हुँदा पुष्टि गरिएको मिति गणनाभन्दा माथि राखिन्छ।", "Lunar Nepal Sambat is computed from Kathmandu sunrise, amanta lunar months and the calendar engine. Editorially confirmed dates override computed dates when available.")}</p></aside>
    <nav className="cx-suite-nav"><a href="/samudaya">← {l(language, "समुदाय", "Community")}</a><a href="/samudaya/chakra">{l(language, "समुदाय चक्र", "Community cycle")} →</a></nav>
  </main>;
}

export function CommunityChakraPage() {
  const language = useUiLanguage();
  const today = useMemo(todayNepal, []);
  useEffect(() => { applyRouteSeo("/samudaya/chakra"); }, []);
  const groups = useMemo(() => SUITE_IDS.map((id) => {
    try { return { id, suite: SUITES[id], rows: upcoming(SUITES[id], today, 3) }; } catch { return { id, suite: SUITES[id], rows: [] }; }
  }), [today]);
  return <main className="cx-page" id="main-content"><section className="cx-hero cx-chakra"><div className="cx-symbol" aria-hidden="true">◎</div><div><span>{l(language, "एकीकृत दृश्य", "Unified view")}</span><h1>{l(language, "समुदाय चक्र", "Community Cycle")}</h1><p>{l(language, "पाँच नियम-आधारित समुदाय suite का नजिकका पर्व एउटै टाइमलाइनमा। नेपाल संवत् छुट्टै चन्द्र मण्डलमा उपलब्ध छ।", "Upcoming observances from five rule-based community suites in one timeline. Nepal Sambat remains available in its dedicated lunar Mandala.")}</p></div><a className="cx-ns-link" href="/nepal-sambat/mandala">{l(language, "नेपाल संवत् →", "Nepal Sambat →")}</a></section><section className="cx-chakra-grid">{groups.map(({ id, suite, rows }) => <article key={id}><header><span>{SUITE_ACCENTS[id]}</span><div><h2>{language === "en" ? suite.en : suite.dev}</h2><a href={`/samudaya/${id}`}>{l(language, "पूरा पात्रो", "Full calendar")} →</a></div></header>{rows.map((row) => <div className="cx-chakra-row" key={`${row.festival.id}-${row.start}`}><small>{prettyDate(row.start, language)}</small><b>{language === "en" ? row.festival.en : row.festival.dev}</b><span>{confidenceLabel(row.confidence, language)}</span></div>)}</article>)}</section><nav className="cx-suite-nav"><a href="/samudaya">← {l(language, "समुदाय", "Community")}</a><a href="/settings/community">{l(language, "प्राथमिकता", "Preferences")} →</a></nav></main>;
}
