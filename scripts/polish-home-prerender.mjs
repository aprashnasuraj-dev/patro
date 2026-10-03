import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root=process.cwd();
const targets=[resolve(root,"dist/index.html"),resolve(root,"dist/today/index.html")];

const shell=`<main class="seo-prerender ap-prerender-home" data-seo-prerender="true">
  <header class="ap-prerender-header"><a href="/" aria-label="आफ्नै पात्रो"><b>आ</b><span><strong>आफ्नै पात्रो</strong><small>AAFNAI PATRO</small></span></a><nav><a href="/rashifal">राशिफल</a><a href="/convert">मिति रूपान्तरण</a><a href="/tools">उपकरण</a></nav></header>
  <section class="ap-prerender-hero">
    <span>आज · नेपाली पात्रो</span>
    <h1>आजको नेपाली पात्रो</h1>
    <p>नेपाली मिति, तिथि, नेपाल संवत्, चाडपर्व र सार्वजनिक बिदा स्पष्ट रूपमा हेर्नुहोस्।</p>
    <div class="ap-prerender-actions"><a href="/rashifal">आजको राशिफल</a><a href="/convert">मिति रूपान्तरण</a><a href="/tools/nepali-typing">नेपाली टाइपिङ</a><a href="/me">आफ्नै ठाउँ</a></div>
  </section>
  <section class="ap-prerender-calendar" aria-label="नेपाली पात्रो महिना">
    <header><span>नेपाली पात्रो</span><h2>यो महिना</h2><p>BS · AD · नेपाल संवत् · तिथि · चाडपर्व · बिदा</p></header>
    <div class="ap-prerender-week"><span>आइत</span><span>सोम</span><span>मंगल</span><span>बुध</span><span>बिही</span><span>शुक्र</span><span>शनि</span></div>
  </section>
</main>`;

const critical=`<style data-aafnai-prerender-style>
.ap-prerender-home{max-width:1180px;margin:0 auto;padding:16px 14px 48px;font-family:"Mukta","Noto Sans Devanagari",system-ui,sans-serif;color:#17211b;background:#f5f7f4}.ap-prerender-home *{box-sizing:border-box}.ap-prerender-header{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:66px;padding:8px 4px 16px}.ap-prerender-header>a{display:flex;align-items:center;gap:10px;color:#17211b;text-decoration:none}.ap-prerender-header b{display:grid;place-items:center;width:44px;height:44px;border-radius:13px;background:#176f3b;color:#fff;font-size:25px}.ap-prerender-header strong,.ap-prerender-header small{display:block}.ap-prerender-header strong{font-size:21px}.ap-prerender-header small{font-size:10px;letter-spacing:.12em;color:#55625a}.ap-prerender-header nav{display:flex;gap:18px}.ap-prerender-header nav a{color:#334139;text-decoration:none;font-weight:700}.ap-prerender-hero,.ap-prerender-calendar{background:#fff;border:1px solid #dbe2dc;border-radius:14px}.ap-prerender-hero{padding:24px;background:linear-gradient(145deg,#fff,#eef7f1)}.ap-prerender-hero>span,.ap-prerender-calendar header>span{color:#0e4a27;font-size:13px;font-weight:800}.ap-prerender-hero h1{margin:4px 0 6px;font-size:clamp(34px,7vw,52px);line-height:1.08}.ap-prerender-hero p{margin:0;color:#55625a;font-size:17px;line-height:1.55}.ap-prerender-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:18px}.ap-prerender-actions a{padding:11px 10px;border:1px solid #dbe2dc;border-radius:10px;color:#17211b;text-align:center;text-decoration:none;font-weight:700}.ap-prerender-calendar{margin-top:14px;padding:18px}.ap-prerender-calendar h2{margin:2px 0;font-size:26px}.ap-prerender-calendar p{margin:0;color:#55625a}.ap-prerender-week{display:grid;grid-template-columns:repeat(7,1fr);margin-top:14px;border:1px solid #dbe2dc;border-radius:10px;overflow:hidden}.ap-prerender-week span{padding:9px 2px;text-align:center;background:#f5f7f4;font-weight:800}.ap-prerender-week span:last-child{color:#c0182f}@media(max-width:680px){.ap-prerender-home{padding:8px 7px 32px}.ap-prerender-header{min-height:58px;padding-bottom:10px}.ap-prerender-header b{width:40px;height:40px}.ap-prerender-header strong{font-size:19px}.ap-prerender-header nav{display:none}.ap-prerender-hero{padding:16px}.ap-prerender-hero h1{font-size:34px}.ap-prerender-hero p{font-size:15px}.ap-prerender-actions{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:13px}.ap-prerender-actions a{font-size:13px;padding:9px 5px}.ap-prerender-calendar{padding:14px}.ap-prerender-week span{font-size:11px;padding:7px 0}}
</style>`;

function replaceRoot(html,file){
  const rootStart=html.indexOf('<div id="root">');
  if(rootStart<0)throw new Error(`homepage prerender root missing: ${file}`);
  const contentStart=rootStart+'<div id="root">'.length;
  const rootEnd=html.indexOf("</div>",contentStart);
  if(rootEnd<0)throw new Error(`homepage prerender root closing tag missing: ${file}`);
  let output=html.slice(0,contentStart)+shell+html.slice(rootEnd);
  output=output.replace(/<style data-aafnai-prerender-style>[\s\S]*?<\/style>/g,"");
  output=output.replace("</head>",critical+"\n</head>");
  return output;
}

let written=0;
for(const file of targets){
  let html;
  try{html=await readFile(file,"utf8")}catch{continue}
  await writeFile(file,replaceRoot(html,file),"utf8");
  written++;
}
if(written!==targets.length)throw new Error(`Expected to polish ${targets.length} primary calendar prerenders; wrote ${written}`);
console.log("Primary calendar prerenders polished into clean calendar-first first paint without visible SEO keyword blocks.");
