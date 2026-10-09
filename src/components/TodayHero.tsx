import { HomePanchang, type HomePanchangData } from "./HomePanchang";
import { l } from "../useUiLanguage";
import { compactNepalSambat } from "../nepalSambatCompact";
export type TodayHeroProps={language:"ne"|"en";date:string;bsLabel:string;adLabel:string;ns:string;panchang:HomePanchangData;events:Array<{name:string}>};
/** Shared between edge HTML and the interactive homepage. */
export function TodayHero({language,date,bsLabel,adLabel,ns,panchang,events}:TodayHeroProps){
 return <section className="rh-hero"><div className="rh-hero-copy"><span className="rh-kicker">{l(language,"आज · काठमाडौं समय","Today · Nepal time")}</span><h1 id="rh-today-title">{bsLabel}</h1><p>{adLabel}</p><div className="hp-ns"><span>{l(language,"नेपाल संवत्","Nepal Sambat")}</span><strong lang="ne">{compactNepalSambat(ns,language)||"—"}</strong></div><div className="hp-today-events">{events.slice(0,2).map((event,index)=><a href={`/date/${date}`} key={index}>{event.name}</a>)}</div></div><HomePanchang date={date} language={language} panchang={panchang}/></section>;
}
