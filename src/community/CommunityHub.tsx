import { useEffect } from "react";
import { COMMUNITY_OPTIONS } from "./preferences";
import { applyRouteSeo } from "../seo";

const COPY: Record<string,string> = {
  "nepal-sambat":"नेपाल संवत्, तिथि, पर्व र सांस्कृतिक सन्दर्भ।",
  lhosar:"ल्होसार परम्परा, पर्व मिति र समुदाय सन्दर्भ।",
  tharu:"थारु समुदायका पर्व, मिति र सांस्कृतिक पात्रो।",
  mithila:"मिथिला/मैथिली तिथि, पर्व र सांस्कृतिक पात्रो।",
  kirat:"किरात समुदायका पर्व, चक्र र मिति सन्दर्भ।",
  hijri:"नेपाल सन्दर्भमा हिजरी मिति र इस्लामिक पात्रो अनुभव।"
};

export function CommunityHub(){
  useEffect(()=>applyRouteSeo("/samudaya"),[]);
  return <main className="community-hub-page">
    <section className="community-hub-hero">
      <span>COMMUNITY PATRO · 6</span>
      <h1>समुदाय पात्रो</h1>
      <p>नेपालका विविध समुदायका छ वटा पात्रो अनुभव एउटै प्रवेशद्वारबाट खोल्नुहोस्। प्रत्येक अनुभवले आफ्नै मिति, पर्व र सांस्कृतिक सन्दर्भ जोगाउँछ।</p>
    </section>
    <section className="community-hub-grid" aria-label="छ समुदाय पात्रो">
      {COMMUNITY_OPTIONS.map((item,index)=><a href={item.href} key={item.id}>
        <i aria-hidden="true">{String(index+1).padStart(2,"0")}</i>
        <strong>{item.dev}</strong><span>{item.en}</span><p>{COPY[item.id]}</p><b aria-hidden="true">→</b>
      </a>)}
    </section>
    <section className="community-hub-foot">
      <a href="/">← पात्रो</a><a href="/tools">आफ्नै टुल्स →</a>
    </section>
  </main>;
}
