const BRAND="MeroPatro";
const BASE="https://patro-blush.vercel.app";
const TOOLS=[
  {slug:"date-converter",title:"BS ↔ AD Date Converter",description:"Convert Bikram Sambat and Gregorian dates while preserving the existing calendar conversion engine.",how:["Choose BS → AD or AD → BS.","Enter a complete valid date.","Review the converted date and source/confidence information."],open:"/tools/app?tool=date"},
  {slug:"land-converter",title:"Nepali Land Converter",description:"Convert Ropani–Aana–Paisa–Dam, Bigha–Kattha–Dhur and square feet with the existing exact land-unit engine.",how:["Choose the land-unit system.","Enter the available measurements.","Copy the exact converted values."],open:"/tools/app?tool=land"},
  {slug:"income-tax",title:"Income Tax Calculator",description:"Estimate FY 2083/84 personal salary tax using the existing policy-driven calculator and supported deductions.",how:["Enter annual salary and eligible deductions.","Select the relevant SSF contribution status.","Review annual tax, monthly average and band breakdown."],open:"/tools/app?tool=tax"},
  {slug:"qr",title:"Devanagari QR Generator",description:"Create a private UTF-8 QR code from Nepali or English text directly in the browser.",how:["Enter Nepali or English text.","Generate the QR code locally.","Save or scan the generated code."],open:"/tools/app?tool=qr"},
  {slug:"fuel-price",title:"NOC Fuel Price Tracker",description:"View the latest available Nepal Oil Corporation fuel-price reference by depot group.",how:["Open the tracker.","Choose a depot/price zone when available.","Check effective date and live/snapshot freshness."],open:"/tools/app?tool=fuel"},
  {slug:"preeti-converter",title:"Preeti Converter",description:"Convert Preeti → Unicode and Unicode → Preeti from one converter while keeping both directions together.",how:["Choose the conversion direction.","Paste the source text.","Review and copy the converted result."],open:"/tools/app?tool=font"},
  {slug:"nepali-typing",title:"Nepali Typing",description:"Type Roman Nepali and choose Unicode Devanagari suggestions from the local typing dictionary.",how:["Type Roman Nepali words.","Choose the desired Unicode suggestion.","Copy or download the completed Nepali text."],open:"/api/v1/nepali-typing"},
  {slug:"tithi",title:"तिथि · Tithi",description:"Work with tithi reminders, lunar-date derivation and recurrence tools.",how:["Open the Tithi workspace.","Choose the relevant lunar rule/date.","Save or review the calculated recurrence."],open:"/tithi"},
  {slug:"diaspora",title:"Diaspora",description:"Use timezone-aware Nepal calendar context while living abroad.",how:["Open Diaspora mode.","Choose your timezone/location context.","Review Nepal-time calendar information."],open:"/diaspora"},
  {slug:"card",title:"कार्ड · Share Cards",description:"Create shareable Nepali calendar, date and festival cards.",how:["Choose the card content.","Review the generated card.","Save or share the result."],open:"/card"},
  {slug:"family",title:"परिवार · Family",description:"Manage private family dates and shared household events.",how:["Open Family.","Add or review important dates.","Keep private information synced only when you choose."],open:"/family"},
  {slug:"api",title:"API · Developers",description:"Explore MeroPatro API endpoints and integration guidance.",how:["Review the API documentation.","Choose the endpoint you need.","Integrate using the documented request format."],open:"/developers"},
  {slug:"my-data",title:"मेरो डेटा · My Data",description:"Review, export or remove private information associated with MeroPatro.",how:["Open My Data.","Review locally stored/synced information.","Export or remove data as needed."],open:"/my-data"}
] as const;
const TOOL_MAP=new Map(TOOLS.map(x=>[x.slug,x]));
const LEGACY:Record<string,string>={date:"date-converter",land:"land-converter",tax:"income-tax",qr:"qr",fuel:"fuel-price",font:"preeti-converter"};
const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
function shell(title:string,description:string,canonical:string,body:string){
 return '<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>'+esc(title)+' · '+BRAND+'</title><meta name="description" content="'+esc(description)+'"><link rel="canonical" href="'+esc(canonical)+'">'+
 '<meta property="og:type" content="website"><meta property="og:site_name" content="'+BRAND+'"><meta property="og:title" content="'+esc(title)+' · '+BRAND+'">'+
 '<meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+esc(canonical)+'"><meta name="theme-color" content="#176f3b">'+
 '<style>:root{--g:#176f3b;--ink:#111827;--muted:#4b5563;--line:#e5e7eb;--bg:#f7f7f5}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,"Noto Sans Devanagari",system-ui,sans-serif}.wrap{width:min(1080px,calc(100% - 28px));margin:auto}.top{border-bottom:1px solid var(--line);background:#fff}.top .wrap{height:64px;display:flex;align-items:center;justify-content:space-between}.top a{color:var(--g);font-weight:800;text-decoration:none}main{padding:38px 0 70px}.hero h1{font-size:clamp(32px,6vw,52px);margin:8px 0}.hero p{color:var(--muted);max-width:760px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:24px}.card{display:grid;grid-template-columns:1fr auto;gap:14px;padding:18px;border:1px solid var(--line);border-radius:14px;background:#fff;color:inherit;text-decoration:none}.card:hover{border-color:#b8d7c2;background:#f7fbf8}.card strong{display:block}.card span{display:block;color:var(--muted);font-size:13px;margin-top:4px}.arrow{color:var(--g);font-size:20px}.how{margin-top:24px;border:1px solid var(--line);border-radius:14px;background:#fff;padding:20px}.how h2{margin-top:0}.open{display:inline-flex;margin-top:18px;background:var(--g);color:#fff;padding:11px 16px;border-radius:10px;text-decoration:none;font-weight:800}.crumb{font-size:13px;color:var(--muted)}.crumb a{color:var(--g)}@media(max-width:650px){.grid{grid-template-columns:1fr}}</style></head><body><header class="top"><div class="wrap"><a href="/">MeroPatro</a><a href="/tools">Tools</a></div></header><main class="wrap">'+body+'</main></body></html>';
}
export function toolsResponse(path:string,url:URL){
 if(path==="/tools-hub"||(path==="/explore"&&url.searchParams.get("view")==="tools"))return new Response(null,{status:301,headers:{location:"/tools"}});
 if(path==="/tools"&&url.searchParams.has("tool")){
   const slug=LEGACY[String(url.searchParams.get("tool")||"").toLowerCase()];
   return new Response(null,{status:301,headers:{location:slug?"/tools/"+slug:"/tools"}});
 }
 if(path==="/tools"){
   const body='<div class="hero"><div class="crumb">MeroPatro / Tools</div><h1>उपयोगी Tools</h1><p>मिति, भूमि, कर, QR, इन्धन, Preeti, नेपाली टाइपिङ र अन्य उपयोगी उपकरण एउटै ठाउँमा।</p></div><div class="grid">'+TOOLS.map(x=>'<a class="card" href="/tools/'+esc(x.slug)+'"><div><strong>'+esc(x.title)+'</strong><span>'+esc(x.description)+'</span></div><b class="arrow">→</b></a>').join("")+'</div>';
   return new Response(shell("उपयोगी Tools","MeroPatro का मिति, भूमि, कर, QR, इन्धन, Preeti, नेपाली टाइपिङ र अन्य उपयोगी उपकरण।",BASE+"/tools",body),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=60, s-maxage=600"}});
 }
 const m=path.match(/^\/tools\/([^/]+)$/);if(!m)return null;
 const item=TOOL_MAP.get(m[1] as any);if(!item)return null;
 const body='<div class="hero"><div class="crumb"><a href="/tools">Tools</a> / '+esc(item.title)+'</div><h1>'+esc(item.title)+'</h1><p>'+esc(item.description)+'</p><a class="open" href="'+esc(item.open)+'">यो tool खोल्नुहोस्</a></div><section class="how"><h2>कसरी प्रयोग गर्ने</h2><ol>'+item.how.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ol></section>';
 return new Response(shell(item.title,item.description,BASE+"/tools/"+item.slug,body),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=60, s-maxage=600"}});
}
