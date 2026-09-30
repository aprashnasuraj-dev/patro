const BRAND="MeroPatro";
const BASE="https://patro-blush.vercel.app";
const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
function page(title:string,description:string,path:string,body:string,extraScript=""){
  const canonical=BASE+path;
  return '<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>'+esc(title)+' · '+BRAND+'</title><meta name="description" content="'+esc(description)+'"><link rel="canonical" href="'+canonical+'">'+
  '<meta property="og:type" content="website"><meta property="og:site_name" content="'+BRAND+'"><meta property="og:title" content="'+esc(title)+' · '+BRAND+'"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+canonical+'"><meta name="theme-color" content="#176f3b">'+
  '<style>:root{--g:#176f3b;--ink:#111827;--muted:#4b5563;--line:#e5e7eb;--bg:#f7f7f5}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,"Noto Sans Devanagari",system-ui,sans-serif}.wrap{width:min(1040px,calc(100% - 28px));margin:auto}.top{background:#fff;border-bottom:1px solid var(--line)}.top .wrap{height:64px;display:flex;align-items:center;justify-content:space-between}.top a{color:var(--g);font-weight:800;text-decoration:none}main{padding:42px 0 70px}.hero h1{font-size:clamp(32px,6vw,50px);margin:8px 0}.hero p{max-width:760px;color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:24px}.card{display:block;background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px;text-decoration:none;color:inherit}.card:hover{border-color:#b6d3bf;background:#f8fbf9}.card strong{display:block}.card span{display:block;color:var(--muted);font-size:13px;margin-top:5px}.history-list{display:grid;gap:10px;margin-top:22px}.history-row{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px}.history-row h3{margin:0 0 5px}.history-row p{margin:0;color:var(--muted)}.status{margin-top:18px;color:var(--muted);font-size:13px}@media(max-width:760px){.grid{grid-template-columns:1fr}}</style></head><body><header class="top"><div class="wrap"><a href="/">MeroPatro</a><a href="/tools">Tools</a></div></header><main class="wrap">'+body+'</main>'+extraScript+'</body></html>';
}
export function dedicatedPage(path:string){
  if(path==="/jyotish"){
    const body='<section class="hero"><div>ज्योतिष</div><h1>ज्योतिष / चिना</h1><p>राशिफल, जन्मपत्रिका, ग्रह स्थिति र मिलानसम्बन्धी MeroPatro का ज्योतिष सुविधाहरू। यो पृष्ठ पात्रो गृहपृष्ठ होइन; ज्योतिषका लागि छुट्टै प्रवेशद्वार हो।</p></section>'+
    '<section class="grid">'+
    '<a class="card" href="/jyotish/rashifal"><strong>राशिफल</strong><span>दैनिक, साप्ताहिक र मासिक राशिफल हेर्नुहोस्।</span></a>'+
    '<a class="card" href="/jyotish/janma-patro"><strong>जन्मपत्रिका</strong><span>जन्म मिति, समय र स्थानबाट जन्मपत्रिका तयार गर्नुहोस्।</span></a>'+
    '<a class="card" href="/jyotish/matchmaking"><strong>कुण्डली मिलान</strong><span>दुई जन्म विवरणका आधारमा मिलान हेर्नुहोस्।</span></a>'+
    '</section>';
    return new Response(page("ज्योतिष / चिना","राशिफल, जन्मपत्रिका, ग्रह स्थिति र कुण्डली मिलानका लागि MeroPatro ज्योतिष केन्द्र।","/jyotish",body),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=60, s-maxage=600"}});
  }
  if(path==="/on-this-day"){
    const body='<section class="hero"><div>इतिहास</div><h1>आज इतिहासमा</h1><p>आजकै दिन नेपाल र विश्वमा भएका स्रोत-आधारित ऐतिहासिक घटना, जन्म र निधन हेर्नुहोस्।</p></section>'+
    '<div id="historyStatus" class="status">आजका ऐतिहासिक घटना लोड हुँदैछन्…</div><section id="historyList" class="history-list" aria-live="polite"></section>';
    const script=`<script>(async()=>{
      const s=document.getElementById("historyStatus"),l=document.getElementById("historyList");
      const text=(tag,value,className)=>{const el=document.createElement(tag);if(className)el.className=className;el.textContent=String(value??"");return el};
      try{
        const parts=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).map(p=>[p.type,p.value]));
        const month=Number(parts.month),day=Number(parts.day);
        const r=await fetch("/api/on-this-day?month="+month+"&day="+day,{headers:{accept:"application/json"}});
        if(!r.ok)throw new Error("HTTP "+r.status);
        const j=await r.json(),rows=Array.isArray(j.events)?j.events:[];
        s.textContent=rows.length?rows.length+" ऐतिहासिक घटना उपलब्ध छन्":"आजका लागि प्रकाशित घटना उपलब्ध छैन।";
        l.replaceChildren();
        for(const x of rows){
          const article=document.createElement("article");article.className="history-row";
          article.appendChild(text("h3",x.title_ne||x.title_en||"ऐतिहासिक घटना"));
          const summary=x.summary_ne||x.summary_en||"";
          if(summary)article.appendChild(text("p",summary));
          article.appendChild(text("small",(x.ad_year||"")+" · "+(x.source_name||"स्रोत समीक्षा")));
          l.appendChild(article);
        }
      }catch(e){
        s.textContent="इतिहास सूची अहिले उपलब्ध छैन। फेरि प्रयास गर्नुहोस्।";
        l.replaceChildren();
      }
    })()</script>`;
    return new Response(page("आज इतिहासमा","आजकै दिनका नेपाल र विश्व इतिहासका स्रोत-आधारित घटना, जन्म र निधन।","/on-this-day",body,script),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
  }
  return null;
}
