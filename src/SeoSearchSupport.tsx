import intentCatalog from "../seo/search-intents.json";
import "./seo-search-support.css";

type Faq={q:string;a:string};
type IntentMeta={title:string;description:string;steps?:string[];faqs?:Faq[]};
type IntentCatalog={core:Record<string,IntentMeta>;tools:Record<string,IntentMeta>};
const catalog=intentCatalog as IntentCatalog;
const pages:Record<string,IntentMeta>={...catalog.core,...catalog.tools};

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
      <nav className="ap-search-related" aria-label="सम्बन्धित tools">{related.map(([href,label])=><a href={href} key={href}>{label}</a>)}</nav>
    </div>
  </section>
}
