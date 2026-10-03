import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const file=resolve(process.cwd(),"dist/index.html");
let html=await readFile(file,"utf8");
const rootStart=html.indexOf('<div id="root">');
if(rootStart<0)throw new Error("homepage prerender root missing");
const contentStart=rootStart+'<div id="root">'.length;
const rootEnd=html.indexOf("</div>",contentStart);
if(rootEnd<0)throw new Error("homepage prerender root closing tag missing");

const shell=`<main class="seo-prerender ap-prerender-home" data-seo-prerender="true">
  <header class="ap-prerender-header"><a href="/" aria-label="आफ्नै पात्रो"><b>आ</b><span><strong>आफ्नै पात्रो</strong><small>AAFNAI PATRO</small></span></a><nav><a href="/rashifal">राशिफल</a><a href="/convert">मिति रूपान्तरण</a><a href="/tools">उपकरण</a></nav></header>
  <section class="ap-prerender-hero">
    <span>आज · नेपाली पात्रो</span>
    <h1>आफ्नै पात्रो · Nepali Calendar</h1>
    <p>आजको नेपाली मिति, तिथि, नेपाल संवत्, चाडपर्व, सार्वजनिक बिदा र दैनिक पात्रो एउटै स्पष्ट अनुभवमा।</p>
    <div class="ap-prerender-actions"><a href="/rashifal">आजको राशिफल</a><a href="/convert">BS ↔ AD</a><a href="/tools/nepali-typing">नेपाली टाइपिङ</a><a href="/me">आफ्नै ठाउँ</a></div>
  </section>
  <section class="ap-prerender-calendar" aria-label="नेपाली पात्रो महिना">
    <header><span>नेपाली पात्रो</span><h2>यो महिना</h2><p>BS · AD · नेपाल संवत् · तिथि · चाडपर्व · बिदा</p></header>
    <div class="ap-prerender-week"><span>आइत</span><span>सोम</span><span>मंगल</span><span>बुध</span><span>बिही</span><span>शुक्र</span><span>शनि</span></div>
  </section>
  <section class="ap-prerender-copy"><h2>आज कति गते?</h2><p>नेपाल समयअनुसार आजको Bikram Sambat मिति र सम्बन्धित पात्रो जानकारी आफ्नै पात्रोको मुख्य पृष्ठमा देखिन्छ। Nepali calendar, Nepal calendar, Nepali date today र aaja kati gate खोजका लागि यही मुख्य पात्रो हो।</p><nav aria-label="मुख्य पात्रो लिङ्क"><a href="/today">आजको मिति</a> · <a href="/convert">मिति रूपान्तरण</a> · <a href="/tools">सबै उपकरण</a> · <a href="/tools/astro">खगोलीय पात्रो</a> · <a href="/samudaya">समुदाय पात्रो</a></nav></section>
</main>`;

html=html.slice(0,contentStart)+shell+html.slice(rootEnd);
const critical=`<style data-aafnai-prerender-style>
.ap-prerender-home{max-width:1180px;margin:0 auto;padding:16px 14px 48px;font-family:"Mukta","Noto Sans Devanagari",system-ui,sans-serif;color:#17211b;background:#f5f7f4}.ap-prerender-home *{box-sizing:border-box}.ap-prerender-header{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:66px;padding:8px 4px 16px}.ap-prerender-header>a{display:flex;align-items:center;gap:10px;color:#17211b;text-decoration:none}.ap-prerender-header b{display:grid;place-items:center;width:44px;height:44px;border-radius:13px;background:#176f3b;color:#fff;font-size:25px}.ap-prerender-header strong,.ap-prerender-header small{display:block}.ap-prerender-header strong{font-size:21px}.ap-prerender-header small{font-size:10px;letter-spacing:.12em;color:#55625a}.ap-prerender-header nav{display:flex;gap:18px}.ap-prerender-header nav a{color:#334139;text-decoration:none;font-weight:700}.ap-prerender-hero,.ap-prerender-calendar,.ap-prerender-copy{background:#fff;border:1px solid #dbe2dc;border-radius:14px}.ap-prerender-hero{padding:24px;background:linear-gradient(145deg,#fff,#eef7f1)}.ap-prerender-hero>span,.ap-prerender-calendar header>span{color:#0e4a27;font-size:13px;font-weight:800}.ap-prerender-hero h1{margin:4px 0 6px;font-size:clamp(34px,7vw,52px);line-height:1.08}.ap-prerender-hero p{margin:0;color:#55625a;font-size:17px;line-height:1.55}.ap-prerender-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:18px}.ap-prerender-actions a{padding:11px 10px;border:1px solid #dbe2dc;border-radius:10px;color:#17211b;text-align:center;text-decoration:none;font-weight:700}.ap-prerender-calendar{margin-top:14px;padding:18px}.ap-prerender-calendar h2{margin:2px 0;font-size:26px}.ap-prerender-calendar p{margin:0;color:#55625a}.ap-prerender-week{display:grid;grid-template-columns:repeat(7,1fr);margin-top:14px;border:1px solid #dbe2dc;border-radius:10px;overflow:hidden}.ap-prerender-week span{padding:9px 2px;text-align:center;background:#f5f7f4;font-weight:800}.ap-prerender-week span:last-child{color:#c0182f}.ap-prerender-copy{margin-top:14px;padding:18px;color:#55625a}.ap-prerender-copy h2{margin:0 0 5px;color:#17211b}.ap-prerender-copy p{margin:0 0 8px;line-height:1.55}.ap-prerender-copy a{color:#0e4a27;font-weight:700}.ap-prerender-copy nav{font-size:14px}@media(max-width:680px){.ap-prerender-home{padding:8px 7px 32px}.ap-prerender-header{min-height:58px;padding-bottom:10px}.ap-prerender-header b{width:40px;height:40px}.ap-prerender-header strong{font-size:19px}.ap-prerender-header nav{display:none}.ap-prerender-hero{padding:16px}.ap-prerender-hero h1{font-size:34px}.ap-prerender-hero p{font-size:15px}.ap-prerender-actions{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:13px}.ap-prerender-actions a{font-size:13px;padding:9px 5px}.ap-prerender-calendar{padding:14px}.ap-prerender-week span{font-size:11px;padding:7px 0}.ap-prerender-copy{padding:14px;font-size:14px}}
</style>`;
if(!html.includes("data-aafnai-prerender-style"))html=html.replace("</head>",critical+"\n</head>");
await writeFile(file,html,"utf8");
console.log("Homepage prerender polished into a branded calendar-first first paint.");
