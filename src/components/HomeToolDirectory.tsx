import { HUB_COPY, HUB_GROUP_TITLE, toolGroups, TOOL_EN } from "../tool-directory";
import { toNepaliDigits } from "../title";
import { l } from "../useUiLanguage";
export function HomeToolDirectory({language}:{language:"ne"|"en"}) {
  return <section className="home-directory" aria-labelledby="home-tools-title">
    <header><h2 id="home-tools-title">{l(language,"आफ्नो कामका उपकरण","Find a tool for your task")}</h2><p>{l(language,"मिति, भाषा, ज्योतिष, हिसाब र दैनिक कामका उपकरण।","Tools for dates, language, Jyotish, calculations and everyday tasks.")}</p></header>
    <a className="home-astronomy-entry" href="/tools/astro">{l(language,"खगोलीय पात्रो खोल्नुहोस्","Open the astronomical calendar")}</a>
    <nav className="home-specialists" aria-label={l(language,"पञ्चाङ्ग र ज्योतिष","Panchang and Jyotish")}>{Object.entries(HUB_COPY).map(([href,item])=><a href={href} key={href}>{l(language,item.titleNe,item.titleEn)}</a>)}</nav>
    <div className="home-tool-groups">{toolGroups.map((group)=><details key={group.name}><summary>{l(language,group.name,HUB_GROUP_TITLE[group.name]||group.name)}<span>{language==="ne"?toNepaliDigits(group.items.length):group.items.length}</span></summary><ul>{group.items.map(item=><li key={item.href}><a href={item.href}><strong>{language==="en"?TOOL_EN[item.href]?.title||item.title:item.title}</strong><small>{language==="en"?TOOL_EN[item.href]?.desc||item.desc:item.desc}</small></a></li>)}</ul></details>)}</div>
    <a href="/tools">{l(language,"सबै उपकरण र विवरण हेर्नुहोस्","Browse the full tools catalogue")}</a>
  </section>;
}
