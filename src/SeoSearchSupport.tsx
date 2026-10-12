import intentCatalog from "../seo/search-intents.json";
import "./seo-search-support.css";

type Faq={q:string;a:string};
type IntentMeta={title:string;description:string;steps?:string[];faqs?:Faq[]};
type IntentCatalog={core:Record<string,IntentMeta>;tools:Record<string,IntentMeta>};
const catalog=intentCatalog as IntentCatalog;
const pages:Record<string,IntentMeta>={...catalog.core,...catalog.tools};
const PRACTICAL_GUIDANCE:Record<string,{heading:string;details:string;links:[string,string][]}> = {
  "/fm": {heading:"नेपाली रेडियो अनलाइन सुन्ने तरिका",details:"स्टेशन खोजेर उपलब्ध live stream खोल्नुहोस्। कुनै रेडियो नचलेमा अर्को स्टेशन प्रयास गर्नुहोस्। प्रसारण उपलब्धता सम्बन्धित स्टेशन र इन्टरनेट जडानमा निर्भर हुन्छ।",links:[["/tv","Live TV"],["/today","आजको पात्रो"]]},
  "/tools/nepali-typing": {heading:"Roman बाट नेपाली Unicode टाइपिङ",details:"Roman Nepali शब्द लेख्नुहोस्, सही देवनागरी सुझाव छान्नुहोस् र पाठ copy गर्नुहोस्। उदाहरण: namaste → नमस्ते। Preeti font मा लेखिएको पाठको लागि छुट्टै converter प्रयोग गर्नुहोस्।",links:[["/tools/preeti-converter","Preeti to Unicode"],["/tools/voice-typing","Voice typing"]]},
  "/tools/bstoad": {heading:"BS मितिलाई AD मा कसरी बदल्ने?",details:"विक्रम संवत् वर्ष, महिना र गते छान्नुहोस्। नेपाली महिनाको लम्बाइ वर्षअनुसार बदलिने भएकाले 56 वा 57 वर्ष मात्र घटाएर सही Gregorian मिति निकाल्न सकिँदैन।",links:[["/tools/adtobs","AD to BS"],["/convert","दुवैतर्फको converter"]]}
};

const RELATED:[string,string][]=[
  ["/today","आज कति गते?"],
  ["/convert","मिति रूपान्तरण"],
  ["/tools/nepali-typing","नेपाली टाइपिङ"],
  ["/tools/preeti-converter","Preeti ↔ Unicode"],
  ["/tools/bstoad","BS → AD"],
  ["/tools/adtobs","AD → BS"],
  ["/tools/sait","शुभ साइत"],
  ["/tools","सबै tools"],
  ["/guides","प्रयोग निर्देशिका"]
];

function isPrimaryCalendarSurface(path:string){
  return path==="/"||path==="/today"||path.startsWith("/calendar/");
}

export function SeoSearchSupport({path}:{path:string}){
  // Keep direct display user-first: only practical guidance, FAQs and useful navigation belong here.
  // Search-query aliases remain machine-side and are never rendered as keyword/search copy.
  if(isPrimaryCalendarSurface(path))return null;
  const meta=pages[path];
  if(!meta)return null;
  const related=RELATED.filter(([href])=>href!==path).slice(0,9);
  return <section className="ap-search-support" aria-labelledby="search-support-title">
    <div className="ap-search-support-inner">
      <header className="ap-search-support-head">
        <span className="ap-search-support-kicker">आफ्नै पात्रो · उपयोगी जानकारी</span>
        <h2 id="search-support-title">{meta.title}</h2>
        <p>{meta.description}</p>
      </header>
      {meta.steps?.length?<div className="ap-search-support-panel"><h3>कसरी प्रयोग गर्ने?</h3><ol>{meta.steps.map(step=><li key={step}>{step}</li>)}</ol></div>:null}
      {meta.faqs?.length?<div className="ap-search-support-panel"><h3>धेरै सोधिने प्रश्न</h3><div className="ap-search-faqs">{meta.faqs.map(item=><details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div></div>:null}
      {PRACTICAL_GUIDANCE[path] ? <section className="ap-search-support-panel" aria-label="Practical tool guidance">
        <h3>{PRACTICAL_GUIDANCE[path].heading}</h3>
        <p>{PRACTICAL_GUIDANCE[path].details}</p>
        <nav className="ap-search-related" aria-label="More helpful pages">{PRACTICAL_GUIDANCE[path].links.map(([href,label])=><a href={href} key={href}>{label}</a>)}</nav>
      </section> : null}
      <nav className="ap-search-related" aria-label="सम्बन्धित tools">{related.map(([href,label])=><a href={href} key={href}>{label}</a>)}</nav>
    </div>
  </section>
}
