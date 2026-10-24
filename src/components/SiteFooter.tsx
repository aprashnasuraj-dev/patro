import { toNepaliDigits } from "../title";
import { l } from "../useUiLanguage";
import type { UiLanguage } from "../i18n";

const groups = [
  { ne: "पात्रो र अन्वेषण", en: "Calendars & discovery", links: [["/festivals","चाडपर्व","Festivals"],["/samudaya","समुदाय पात्रो","Community calendars"],["/time-machine","समययन्त्र","Time Machine"],["/on-this-day","इतिहासमा आज","On This Day"],["/fm","रेडियो","Radio"]] },
  { ne: "उपकरण र सहायता", en: "Tools & help", links: [["/tools","सबै उपकरण","All tools"],["/advancetools/","विशेष उपकरण","Advanced tools"],["/guides","प्रयोग निर्देशिका","Guides"],["/me","आफ्नै ठाउँ","My space"],["/contact","सम्पर्क","Contact"]] },
  { ne: "हाम्रो बारेमा", en: "About & policies", links: [["/about","हाम्रो परिचय","About us"],["/sources","स्रोत र शुद्धता","Sources & accuracy"],["/privacy","गोपनीयता नीति","Privacy"],["/terms","सेवाका सर्तहरू","Terms"]] }
] as const;
export function SiteFooter({ language }: { language: UiLanguage }) {
  const year = new Date().getFullYear();
  return <footer className="ap-footer home-footer">
    <div className="home-footer-brand"><a href="/">{l(language,"आफ्नै पात्रो","Aafnai Patro")}</a><p>{l(language,"तपाईंको दिन, तपाईंको पात्रो।","Your day, your calendar.")}</p><span>© {language === "ne" ? toNepaliDigits(year) : year}</span></div>
    {groups.map(group => <nav key={group.en} aria-label={l(language,group.ne,group.en)}><h2>{l(language,group.ne,group.en)}</h2>{group.links.map(([href,ne,en]) => <a key={href} href={href}>{l(language,ne,en)}</a>)}</nav>)}
    <div className="home-footer-actions"><label>{l(language,"भाषा","Language")}<select value={language} onChange={event => window.dispatchEvent(new CustomEvent("patro:set-language",{detail:event.target.value}))}><option value="ne" lang="ne">नेपाली</option><option value="en" lang="en">English</option></select></label><div id="home-install-entry"/><button type="button" onClick={() => window.dispatchEvent(new Event("patro:open-assistant"))}>{l(language,"पात्रो सहायक खोल्नुहोस्","Open calendar assistant")}</button></div>
  </footer>;
}
