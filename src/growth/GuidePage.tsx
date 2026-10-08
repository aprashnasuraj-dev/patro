import guides from "../../seo/guides.json";
import "./growth.css";
export function GuidePage({path}:{path:string}){
  const guide=guides.find(row=>path==="/guides/"+row.slug);
  if(path!=="/guides"&&!guide)return <main className="ap-page"><h1>निर्देशिका भेटिएन</h1><a href="/guides">सबै निर्देशिका</a></main>;
  return <main className="ap-page ap-guides"><nav aria-label="पृष्ठ मार्ग"><a href="/">पात्रो</a> · <a href="/guides">निर्देशिका</a></nav>
    <h1>{guide?.title||"नेपाली उपकरण प्रयोग निर्देशिका"}</h1><p>{guide?.description||"आफ्नो कामका लागि सही उपकरण छान्नुहोस् र चरणबद्ध तरिका पढ्नुहोस्।"}</p>
    {guide?<><a className="ap-growth-primary" href={guide.tool}>{guide.toolLabel}</a>{guide.sections.map(([heading,text])=><section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}<h2>सम्बन्धित निर्देशिका</h2><ul>{guide.related.map(slug=>{const row=guides.find(g=>g.slug===slug);return row?<li key={slug}><a href={"/guides/"+slug}>{row.title}</a></li>:null})}</ul></>:<div className="ap-guide-grid">{guides.map(row=><article key={row.slug}><h2><a href={"/guides/"+row.slug}>{row.title}</a></h2><p>{row.description}</p><a href={row.tool}>{row.toolLabel}</a></article>)}</div>}
  </main>;
}
