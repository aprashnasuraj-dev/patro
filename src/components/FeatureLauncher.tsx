import { useEffect, useMemo, useState } from "react";

type LaunchItem={href:string;ne:string;en:string;group:string;keywords:string;mark:string};

const ITEMS:LaunchItem[]=[
 {href:"/",ne:"आजको पात्रो",en:"Today · Calendar",group:"पात्रो · Calendar",keywords:"today calendar nepali date bs ad आज पात्रो मिति",mark:"आज"},
 {href:"/convert",ne:"मिति रूपान्तरण",en:"Date converter",group:"पात्रो · Calendar",keywords:"convert ad bs date रूपान्तरण",mark:"↔"},
 {href:"/time-machine",ne:"समययन्त्र",en:"Time Machine",group:"इतिहास · History",keywords:"history timeline time machine नेपाल इतिहास",mark:"◷"},
 {href:"/on-this-day",ne:"आज इतिहासमा",en:"On This Day",group:"इतिहास · History",keywords:"on this day events history आज इतिहास",mark:"◉"},
 {href:"/rashifal",ne:"राशिफल",en:"Horoscope",group:"ज्योतिष · Astrology",keywords:"rashifal horoscope rashi राशिफल",mark:"☾"},
 {href:"/jyotish/china",ne:"जन्मपत्रो",en:"Birth chart",group:"ज्योतिष · Astrology",keywords:"kundali janma patro birth chart ज्योतिष जन्मपत्रो",mark:"✦"},
 {href:"/jyotish/matchmaking",ne:"गुण मिलान",en:"Matchmaking",group:"ज्योतिष · Astrology",keywords:"matchmaking guna विवाह मिलान",mark:"♡"},
 {href:"/tools/astro",ne:"खगोलीय पात्रो",en:"Astronomy calendar",group:"खगोल · Astronomy",keywords:"astronomy moon nasa tithi ग्रह चन्द्र खगोल",mark:"◐"},
 {href:"/samachar",ne:"समाचार",en:"Samachar · News",group:"मिडिया · Media",keywords:"news samachar समाचार headlines",mark:"न्यू"},
 {href:"/fm",ne:"एफएम / रेडियो",en:"FM · Radio",group:"मिडिया · Media",keywords:"fm radio रेडियो station stream",mark:"♪"},
 {href:"/tv",ne:"लाइभ टिभी",en:"Live TV",group:"मिडिया · Media",keywords:"tv television live channel टिभी",mark:"▶"},
 {href:"/samudaya",ne:"समुदाय पात्रो",en:"Community calendars",group:"समुदाय · Community",keywords:"community calendar samudaya समुदाय",mark:"◎"},
 {href:"/nepal-sambat/mandala",ne:"नेपाल संवत्",en:"Nepal Sambat",group:"समुदाय · Community",keywords:"nepal sambat newar नेपाल संवत् नेवार",mark:"ने"},
 {href:"/samudaya/lhosar",ne:"ल्होसार पात्रो",en:"Lhosar calendar",group:"समुदाय · Community",keywords:"lhosar tamang gurung sherpa ल्होसार",mark:"ल्हो"},
 {href:"/samudaya/tharu",ne:"थारु पात्रो",en:"Tharu calendar",group:"समुदाय · Community",keywords:"tharu calendar थारु पात्रो",mark:"था"},
 {href:"/samudaya/mithila",ne:"मिथिला पात्रो",en:"Mithila calendar",group:"समुदाय · Community",keywords:"mithila maithili calendar मिथिला मैथिली",mark:"मि"},
 {href:"/samudaya/kirat",ne:"किरात पात्रो",en:"Kirat calendar",group:"समुदाय · Community",keywords:"kirat rai limbu calendar किरात",mark:"कि"},
 {href:"/samudaya/hijri",ne:"हिजरी पात्रो",en:"Hijri calendar",group:"समुदाय · Community",keywords:"hijri islamic calendar हिजरी",mark:"हि"},
 {href:"/samudaya/chakra",ne:"समुदाय चक्र",en:"Community chakra",group:"समुदाय · Community",keywords:"community chakra festival समुदाय चक्र",mark:"च"},
 {href:"/tools/nepali-typing",ne:"नेपाली टाइपिङ",en:"Nepali typing",group:"भाषा · Language",keywords:"typing roman unicode nepali नेपाली टाइपिङ",mark:"ने"},
 {href:"/tools/preeti-converter",ne:"प्रीति रूपान्तरण",en:"Preeti converter",group:"भाषा · Language",keywords:"preeti unicode converter प्रीति",mark:"प्री"},
 {href:"/tools/spell-check",ne:"नेपाली हिज्जे जाँच",en:"Nepali spell check",group:"भाषा · Language",keywords:"spell check spelling नेपाली हिज्जे",mark:"✓"},
 {href:"/tools/voice-typing",ne:"आवाजबाट नेपाली टाइपिङ",en:"Voice typing",group:"भाषा · Language",keywords:"voice speech typing बोलि आवाज",mark:"◉"},
 {href:"/tools/ocr",ne:"नेपाली OCR",en:"Nepali OCR",group:"भाषा · Language",keywords:"ocr image text scan फोटो अक्षर",mark:"OCR"},
 {href:"/tools/read-aloud",ne:"पढेर सुनाउनुहोस्",en:"Read aloud",group:"भाषा · Language",keywords:"tts speak read aloud सुनाउनुहोस्",mark:"🔊"},
 {href:"/tools/bstoad",ne:"वि.सं. → ई.सं.",en:"BS → AD",group:"मिति · Date tools",keywords:"bs ad converter bikram sambat",mark:"वि"},
 {href:"/tools/adtobs",ne:"ई.सं. → वि.सं.",en:"AD → BS",group:"मिति · Date tools",keywords:"ad bs converter gregorian",mark:"AD"},
 {href:"/tools/calc",ne:"दिन गणना",en:"Date calculator",group:"मिति · Date tools",keywords:"days between dates add subtract date calculator दिन गणना",mark:"±"},
 {href:"/tools/age",ne:"उमेर गणक",en:"Age calculator",group:"मिति · Date tools",keywords:"age birthday years months days उमेर जन्मदिन",mark:"उ"},
 {href:"/tools/clock",ne:"विश्व घडी",en:"World clock",group:"मिति · Date tools",keywords:"world clock timezone kathmandu tokyo time घडी समय",mark:"◷"},
 {href:"/tools/forex",ne:"विदेशी मुद्रा",en:"Forex rates",group:"पैसा · Money",keywords:"forex currency nrb exchange rate विदेशी मुद्रा",mark:"$"},
 {href:"/tools/gold",ne:"सुनचाँदी हिसाब",en:"Gold calculator",group:"पैसा · Money",keywords:"gold silver tola gram jewellery सुन चाँदी",mark:"Au"},
 {href:"/tools/emi",ne:"कर्जा EMI",en:"Loan EMI calculator",group:"पैसा · Money",keywords:"loan emi interest repayment कर्जा ब्याज",mark:"EMI"},
 {href:"/tools/vat",ne:"भ्याट र प्रतिशत",en:"VAT & percentage",group:"पैसा · Money",keywords:"vat percentage percent change भ्याट प्रतिशत",mark:"%"},
 {href:"/tools/units",ne:"नेपाली नाप–तौल",en:"Traditional units",group:"नाप · Measures",keywords:"tola lal mana pathi muri haat units नाप तौल",mark:"नाप"},
 {href:"/tools/words",ne:"अंकलाई शब्दमा",en:"Amount in words",group:"भाषा · Language",keywords:"amount words cheque lakh crore अंक शब्द",mark:"अ"},
 {href:"/tools/landconverter",ne:"जग्गा नाप रूपान्तरण",en:"Nepali land converter",group:"उपकरण · Tools",keywords:"ropani aana paisa dam bigha kattha dhur जग्गा",mark:"रो"},
 {href:"/tools/incometax",ne:"आयकर गणक",en:"Income tax",group:"उपकरण · Tools",keywords:"tax salary nepal आयकर कर",mark:"रु"},
 {href:"/tools/nepaliqr",ne:"नेपाली QR",en:"QR generator",group:"उपकरण · Tools",keywords:"qr code generator नेपाली",mark:"QR"},
 {href:"/tools/fuelprice",ne:"इन्धन मूल्य",en:"Fuel prices",group:"उपकरण · Tools",keywords:"noc fuel petrol diesel इन्धन",mark:"⛽"},
 {href:"/tools/tithi-reminder",ne:"तिथि रिमाइन्डर",en:"Tithi reminder",group:"विशेष · Featured",keywords:"tithi reminder shraddha birthday तिथि श्राद्ध",mark:"त"},
 {href:"/tools/sait",ne:"साइत · शुभ समय",en:"Sait · Auspicious time",group:"विशेष · Featured",keywords:"sait auspicious शुभ साइत विवाह",mark:"शु"},
 {href:"/tools/baby-names",ne:"नक्षत्र अनुसार बच्चाको नाम",en:"Baby names",group:"विशेष · Featured",keywords:"baby names nakshatra pada initials नक्षत्र पद नाम",mark:"ना"},
 {href:"/tools/janmadin-akhbar",ne:"जन्मदिन अखबार",en:"Birthday newspaper",group:"विशेष · Featured",keywords:"birthday newspaper history जन्मदिन अखबार",mark:"📰"},
 {href:"/tools/future-letter",ne:"भविष्यको चिठी",en:"Future letter",group:"विशेष · Featured",keywords:"future letter private encrypted चिठी भविष्य",mark:"✉"},
 {href:"/tools/name-check",ne:"कागजात नाम जाँच",en:"Document name check",group:"भाषा · Language",keywords:"name document citizenship passport kyc transliteration spelling नाम नागरिकता राहदानी KYC",mark:"नाम"},
 {href:"/tools/patro-bot",ne:"पात्रो बोट",en:"Patro Bot",group:"विशेष · Featured",keywords:"bot assistant calendar प्रश्न पात्रो",mark:"Bot"}
];

function isTypingTarget(target:EventTarget|null){return target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement||(target instanceof HTMLElement&&target.isContentEditable)}

export function FeatureLauncher(){
 const[open,setOpen]=useState(false);
 const[query,setQuery]=useState("");
 useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setOpen(value=>!value);return}if(event.key==="/"&&!isTypingTarget(event.target)&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();setOpen(true);return}if(event.key==="Escape")setOpen(false)};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[]);
 useEffect(()=>{if(!open)setQuery("")},[open]);
 const results=useMemo(()=>{const needle=query.trim().toLocaleLowerCase();if(!needle)return ITEMS.slice(0,14);return ITEMS.filter(item=>`${item.ne} ${item.en} ${item.group} ${item.keywords}`.toLocaleLowerCase().includes(needle)).slice(0,24)},[query]);
 return <><button className="ap-feature-launcher-button" type="button" onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-label="सबै सुविधा खोज्नुहोस् · Search all features"><span aria-hidden="true">⌕</span><strong>खोज</strong><kbd>⌘K</kbd></button>{open?<div className="ap-launcher-backdrop" role="presentation" onMouseDown={()=>setOpen(false)}><section className="ap-launcher" role="dialog" aria-modal="true" aria-label="आफ्नै पात्रो सुविधा खोज" onMouseDown={event=>event.stopPropagation()}><header className="ap-launcher-search"><span aria-hidden="true">⌕</span><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder="पात्रो, तिथि, रेडियो, OCR…" aria-label="सुविधा खोज्नुहोस्"/><button type="button" onClick={()=>setOpen(false)} aria-label="बन्द गर्नुहोस्">×</button></header><div className="ap-launcher-hint"><span>सबै सुविधा एउटै ठाउँमा</span><small>नाम, category वा काम लेख्नुहोस् · Type a tool, category or task</small></div><div className="ap-launcher-results">{results.length?results.map(item=><a key={item.href} href={item.href} className="ap-launcher-item"><span className="ap-launcher-orb" aria-hidden="true">{item.mark}</span><span><small>{item.group}</small><strong>{item.ne}</strong><em>{item.en}</em></span><b aria-hidden="true">→</b></a>):<div className="ap-launcher-empty"><strong>मिल्ने सुविधा भेटिएन</strong><span>अर्को शब्द प्रयोग गर्नुहोस् वा सबै उपकरण खोल्नुहोस्।</span><a href="/tools">सबै उपकरण</a></div>}</div><footer><span>छिटो खोल्न <kbd>Ctrl/⌘ K</kbd> वा <kbd>/</kbd></span><a href="/tools">सबै उपकरण हेर्नुहोस् →</a></footer></section></div>:null}</>
}
