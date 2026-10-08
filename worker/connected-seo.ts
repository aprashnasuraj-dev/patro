import guides from "../seo/guides.json";
type SeoMeta={title:string;description:string;canonicalPath?:string;index?:boolean};
type SeoEnv={PUBLIC_SITE_URL?:unknown};

const BRAND="आफ्नै पात्रो";
const BRAND_EN="Aafnai Patro";
const DEFAULT_DESCRIPTION="नेपाली पात्रो, बिक्रम संवत् मिति, तिथि, चाडपर्व, समुदाय पात्रो, उपयोगी उपकरण, रेडियो, टिभी र समाचार।";

const TOOL_META:Record<string,[string,string]>={
 astro:["खगोलीय पात्रो · Astronomical Calendar","तिथि, चन्द्र अवस्था, खगोलीय गणना र NASA-सन्दर्भसहितको नेपाली astronomy calendar अनुभव।"],
 "nepali-typing":["नेपाली टाइपिङ · Nepali Typing","Roman Nepali बाट Unicode देवनागरी टाइप गर्नुहोस्, स्थानीय सुझावसहित।"],
 "preeti-converter":["Preeti ↔ Unicode Converter","Preeti लाई Unicode र Unicode लाई Preeti मा एउटै browser tool बाट रूपान्तरण गर्नुहोस्।"],
 bstoad:["BS → AD Date Converter","बिक्रम संवत् मितिलाई Gregorian AD मा विश्वसनीय पात्रो डेटासहित रूपान्तरण गर्नुहोस्।"],
 adtobs:["AD → BS Date Converter","Gregorian AD मितिलाई बिक्रम संवत् BS मा रूपान्तरण गर्नुहोस्।"],
 calc:["दिन गणना · Date Calculator","दुई मितिबीचको दिन गणना गर्नुहोस् वा चयन गरिएको मितिमा दिन थप्नुहोस् वा घटाउनुहोस्।"],
 age:["उमेर गणक · Age Calculator","ठ्याक्कै वर्ष, महिना, दिन, कुल दिन र अर्को जन्मदिन गणना गर्नुहोस्।"],
 clock:["विश्व घडी · World Clock","नेपाल समयसँग विश्वका समय क्षेत्र तुलना गर्नुहोस् र call-home समय योजना बनाउनुहोस्।"],
 forex:["विदेशी मुद्रा · Nepal Forex Rates","नेपाल राष्ट्र बैंक सन्दर्भ डेटाबाट विदेशी मुद्रा buying र selling rates हेर्नुहोस्।"],
 gold:["सुनचाँदी हिसाब · Gold Calculator","तपाईंले दिएको विश्वसनीय दर प्रयोग गरी तोला र ग्राममा सुनचाँदी हिसाब गर्नुहोस्।"],
 emi:["कर्जा EMI · Loan Calculator","मासिक EMI, कुल ब्याज र repayment schedule गणना गर्नुहोस्।"],
 vat:["भ्याट र प्रतिशत · VAT Calculator","VAT थप्ने/हटाउने, प्रतिशत र percentage change छिटो गणना गर्नुहोस्।"],
 units:["नेपाली नाप–तौल · Traditional Units","तोला–लाल, माना–पाथी–मुरी, हात र metric equivalents रूपान्तरण गर्नुहोस्।"],
 words:["अंकलाई शब्दमा · Amount in Words","रकमलाई cheque-ready नेपाली र English lakh–crore शब्दमा बदल्नुहोस्।"],
 incometax:["नेपाल आयकर गणक · Income Tax","FY 2083/84 salary tax र supported deductions को reference estimate निकाल्नुहोस्।"],
 landconverter:["नेपाली जग्गा नाप · Land Converter","रोपनी–आना–पैसा–दाम, बिघा–कट्ठा–धुर र square feet रूपान्तरण गर्नुहोस्।"],
 nepaliqr:["नेपाली QR Generator","नेपाली वा English text बाट browser भित्रै private UTF-8 QR code बनाउनुहोस्।"],
 fuelprice:["NOC इन्धन मूल्य · Fuel Prices","नेपाल आयल निगमका petrol, diesel, kerosene, LPG र aviation-fuel references हेर्नुहोस्।"],
 "tithi-reminder":["तिथि रिमाइन्डर · Tithi Reminder","श्राद्ध, तिथि जन्मदिन र अन्य lunar-date reminders तथा calendar feed बनाउनुहोस्।"],
 sait:["साइत · शुभ समय Finder","आधिकारिक र गणनात्मक साइतलाई स्रोत र confidence स्पष्ट राखेर अन्वेषण गर्नुहोस्।"],
 "baby-names":["नक्षत्र अनुसार बच्चाको नाम","नक्षत्र अक्षर, नेपाली बच्चाको नाम, न्वारन, पास्नी र परिवार timeline helpers अन्वेषण गर्नुहोस्।"],
 "janmadin-akhbar":["जन्मदिन अखबार · Birthday Newspaper","जन्म मिति, पात्रो र इतिहासबाट share-ready जन्मदिन अखबार बनाउनुहोस्।"],
 "future-letter":["भविष्यको चिठी · Future Letter","चयन गरिएको मिति वा तिथि जन्मदिनमा खुल्ने निजी भविष्यको चिठी लेख्नुहोस्।"],
 "spell-check":["नेपाली हिज्जे जाँच · Spell Check","स्थानीय नियम र सुझाव प्रयोग गरी नेपाली पाठको हिज्जे जाँच गर्नुहोस्।"],
 "voice-typing":["आवाजबाट नेपाली टाइपिङ","browser speech recognition प्रयोग गरेर आवाजबाट नेपाली Unicode टाइप गर्नुहोस्।"],
 ocr:["नेपाली OCR · Image to Text","तस्बिरबाट नेपाली र English Unicode text browser भित्रै निकाल्नुहोस्।"],
 "name-check":["कागजात नाम जाँच · Document Name Check","नागरिकता, राहदानी, प्रमाणपत्र वा KYC का नेपाली/English नामको हिज्जे र transliteration तुलना गर्नुहोस्।"],
 "read-aloud":["पढेर सुनाउनुहोस् · Nepali Read Aloud","उपलब्ध browser speech voices प्रयोग गरी नेपाली पाठ सुन्नुहोस्।"],
 "patro-bot":["पात्रो बोट · Patro Bot","मिति, तिथि, पात्रो र reminders सम्बन्धी छोटा प्रश्न सोध्नुहोस्।"]
};

const EXACT:Record<string,SeoMeta>={
 "/":{title:"आजको नेपाली पात्रो, तिथि र चाडपर्व",description:"आजको नेपाली मिति, तिथि, चाडपर्व, बिदा, नेपाल संवत्, सूर्योदय–सूर्यास्त र मासिक पात्रो।"},
 "/tools":{title:"२९ नेपाली उपकरण · Nepali Tools",description:"मिति, भाषा, finance, जग्गा, QR, OCR, तिथि, साइत र अन्य नेपाली utilities एउटै ठाउँमा।"},
 "/convert":{title:"BS ↔ AD मिति रूपान्तरण · Date Converter",description:"बिक्रम संवत् र Gregorian मिति दुवैतर्फ Aafnai Patro calendar data प्रयोग गरी रूपान्तरण गर्नुहोस्।"},
 "/rashifal":{title:"राशिफल · Rashifal",description:"दैनिक, साप्ताहिक र मासिक राशिफल तथा पात्रो-सन्दर्भित Vedic astrology अनुभव।"},
 "/samachar":{title:"नेपाली समाचार · Samachar",description:"वर्गीकृत नेपाली समाचार discovery, प्रमुख स्रोत र original source links सहित।"},
 "/fm":{title:"नेपाली FM / रेडियो",description:"नेपाल र विश्वका उपलब्ध FM तथा internet radio stations खोज्नुहोस् र चलाउनुहोस्।"},
 "/tv":{title:"Live TV Explorer",description:"देश, भाषा र category अनुसार playable public live TV channels खोज्नुहोस् र हेर्नुहोस्।"},
 "/time-machine":{title:"नेपाल Time Machine",description:"वर्ष अनुसार नेपाल र विश्व इतिहासका उल्लेखनीय क्षणहरू immersive timeline मा अन्वेषण गर्नुहोस्।"},
 "/on-this-day":{title:"आज इतिहासमा · On This Day",description:"चयन गरिएको calendar day सँग सम्बन्धित ऐतिहासिक घटनाहरू र स्रोतहरू अन्वेषण गर्नुहोस्।"},
 "/samudaya":{title:"समुदाय पात्रो · Community Calendars",description:"नेपाल संवत्, ल्होसार, थारु, मिथिला, किरात, हिजरी र समुदाय चक्र एउटै suite मा।"},
 "/nepal-sambat/mandala":{title:"नेपाल संवत् मण्डल · Nepal Sambat",description:"नेपाल संवत् मिति, तिथि, observances र festival context अन्वेषण गर्नुहोस्।"},
 "/samudaya/lhosar":{title:"ल्होसार पात्रो · Lhosar Calendar",description:"ल्होसार calendar, समुदाय मिति र festival context अन्वेषण गर्नुहोस्।"},
 "/samudaya/tharu":{title:"थारु पात्रो · Tharu Calendar",description:"थारु समुदायका calendar dates, observances र festival context अन्वेषण गर्नुहोस्।"},
 "/samudaya/mithila":{title:"मिथिला पात्रो · Mithila Calendar",description:"मिथिला/मैथिली calendar dates, observances र festivals अन्वेषण गर्नुहोस्।"},
 "/samudaya/kirat":{title:"किरात पात्रो · Kirat Calendar",description:"किरात calendar dates, observances र festival context अन्वेषण गर्नुहोस्।"},
 "/samudaya/hijri":{title:"हिजरी पात्रो · Hijri Calendar",description:"Hijri/Islamic calendar dates र नेपाल-सन्दर्भित observances अन्वेषण गर्नुहोस्।"},
 "/samudaya/chakra":{title:"समुदाय चक्र · Community Chakra",description:"नेपालका समुदाय पात्रो र observances लाई एउटै aggregate experience मा हेर्नुहोस्।"},
 "/janmadin":{title:"मेरो असली जन्मदिन · Three Birthdays",description:"AD, BS र तिथि जन्मदिन र नेपालका सांस्कृतिक पात्रो, निजी गणना यस उपकरणमा।"},
 "/janmapatro":{title:"जन्मपत्रो · Nepali Birth Chart",description:"जन्म मिति, सही समय र स्थानका आधारमा लग्न, ग्रहस्थिति, नक्षत्र, दशा र चन्द्र कुण्डली गणना गर्नुहोस्।"},
 "/janmapatro/milan.html":{title:"३६ गुण मिलान · Guna Milan",description:"जन्म विवरण वा नक्षत्र-अक्षरमा आधारित नामबाट परम्परागत अष्टकूट ३६ गुण मिलान हेर्नुहोस्।"},
 "/jyotish/china":{title:"जन्मपत्रो · Birth Chart",description:"जन्म मिति, समय र स्थानका आधारमा जन्मपत्रो तथा ग्रहस्थिति अन्वेषण गर्नुहोस्।"},
 "/jyotish/matchmaking":{title:"गुण मिलान · Matchmaking",description:"जन्म विवरणका आधारमा Vedic matchmaking र गुण मिलान सन्दर्भ अन्वेषण गर्नुहोस्।"},
 "/developers":{title:"Aafnai Patro API · Developers",description:"Aafnai Patro public APIs, calendar endpoints र integration guidance हेर्नुहोस्।"}
};

const ALIAS_CANONICAL:Record<string,string>={
 "/tools/convert":"/convert",
 "/tools/tax":"/tools/incometax",
 "/tools/land":"/tools/landconverter",
 "/tools/qr":"/tools/nepaliqr",
 "/tools/fuel":"/tools/fuelprice",
 "/tools/preetitounicode":"/tools/preeti-converter",
 "/tools/unicodetopreeti":"/tools/preeti-converter",
 "/tools/preeti-to-unicode":"/tools/preeti-converter",
 "/tools/unicode-to-preeti":"/tools/preeti-converter",
 "/astro":"/tools/astro",
 "/jyotish/rashifal":"/rashifal",
 "/jyotish/china":"/janmapatro",
 "/jyotish/matchmaking":"/janmapatro/milan.html",
 "/jyotish/janma-patro":"/janmapatro"
};

const PRIVATE_PREFIXES=["/me","/admin","/family","/my-data","/my-diary","/notes","/planner","/settings"];
const PRIVATE_TOOL_PATHS=new Set(["/tools/family","/tools/my-data","/tools/card","/tools/tithi"]);

function cleanPath(pathname:string){return pathname.replace(/\/+$/,"")||"/"}
function canonicalPath(path:string){return ALIAS_CANONICAL[path]||path}
function isPrivate(path:string){return PRIVATE_TOOL_PATHS.has(path)||PRIVATE_PREFIXES.some(prefix=>path===prefix||path.startsWith(prefix+"/"))}

export function connectedRouteMeta(pathname:string):SeoMeta{
 const path=cleanPath(pathname);
 const canonical=canonicalPath(path);
 const guide=guides.find(row=>canonical==="/guides/"+row.slug);
 if(guide)return{title:guide.title,description:guide.description,canonicalPath:canonical,index:true};
 if(canonical==="/guides")return{title:"नेपाली उपकरण प्रयोग निर्देशिका · Practical Guides",description:"मिति, Preeti, नेपाली टाइपिङ, आवाज र उमेर गणनाका व्यावहारिक निर्देशिका।",canonicalPath:canonical,index:true};
 if(canonical.startsWith("/guides/"))return{title:"निर्देशिका भेटिएन",description:"यो निर्देशिका उपलब्ध छैन।",canonicalPath:canonical,index:false};
 if(isPrivate(path))return{title:"आफ्नै ठाउँ · My Space",description:"Aafnai Patro को निजी account र personal calendar space।",canonicalPath:canonical,index:false};
 if(EXACT[canonical])return{...EXACT[canonical],canonicalPath:canonical,index:true};
 const tool=canonical.match(/^\/tools\/([^/]+)$/)?.[1];
 if(tool&&TOOL_META[tool])return{title:TOOL_META[tool][0],description:TOOL_META[tool][1],canonicalPath:canonical,index:true};
 const calendar=canonical.match(/^\/calendar\/(\d{4})\/(\d{1,2})$/);
 if(calendar)return{title:`नेपाली पात्रो ${calendar[1]}/${String(calendar[2]).padStart(2,"0")}`,description:`वि.सं. ${calendar[1]} सालको महिना ${calendar[2]}: तिथि, चाडपर्व, बिदा र AD/BS date context।`,canonicalPath:canonical,index:true};
 if(canonical.startsWith("/date/"))return{title:"नेपाली मिति विवरण · Date Details",description:"चयन गरिएको मितिको बिक्रम संवत्, तिथि, नेपाल संवत्, चाडपर्व र पात्रो context।",canonicalPath:canonical,index:true};
 return{title:`${BRAND} · ${BRAND_EN}`,description:DEFAULT_DESCRIPTION,canonicalPath:canonical,index:true};
}

function escapeHtml(value:string){
 return value.replace(/[&<>"']/g,(ch)=>{
  if(ch==="&")return "&amp;";
  if(ch==="<")return "&lt;";
  if(ch===">")return "&gt;";
  if(ch==='"')return "&quot;";
  return "&#39;";
 });
}

export function rewriteConnectedSeo(request:Request,response:Response,env:SeoEnv){
 if(request.method!=="GET")return response;
 const contentType=response.headers.get("content-type")||"";
 if(!contentType.includes("text/html"))return response;
 const HTMLRewriterCtor=(globalThis as any).HTMLRewriter;
 if(!HTMLRewriterCtor)return response;
 const incoming=new URL(request.url);
 const path=cleanPath(incoming.pathname);
 const meta=connectedRouteMeta(path);
 const base=String(env.PUBLIC_SITE_URL||incoming.origin).replace(/\/+$/,"");
 const canonical=base+(meta.canonicalPath||path);
 const fullTitle=`${meta.title} | ${BRAND}`;
 const indexable=meta.index!==false&&response.status<400;
 const robots=indexable?"index, follow, max-image-preview:large":"noindex, nofollow";
 const image=base+"/og-default.png";
 const schema=JSON.stringify({"@context":"https://schema.org","@type":"WebPage",name:fullTitle,description:meta.description,url:canonical,inLanguage:["ne","en"],isPartOf:{"@type":"WebSite",name:BRAND,alternateName:BRAND_EN,url:base+"/"}}).replace(/</g,"\\u003c");
 const headBlock=
  `<meta name="description" content="${escapeHtml(meta.description)}">`+
  `<meta name="robots" content="${robots}">`+
  `<meta property="og:type" content="website">`+
  `<meta property="og:site_name" content="${BRAND}">`+
  `<meta property="og:locale" content="ne_NP">`+
  `<meta property="og:title" content="${escapeHtml(fullTitle)}">`+
  `<meta property="og:description" content="${escapeHtml(meta.description)}">`+
  `<meta property="og:url" content="${escapeHtml(canonical)}">`+
  `<meta property="og:image" content="${escapeHtml(image)}">`+
  `<meta name="twitter:card" content="summary_large_image">`+
  `<meta name="twitter:title" content="${escapeHtml(fullTitle)}">`+
  `<meta name="twitter:description" content="${escapeHtml(meta.description)}">`+
  `<meta name="twitter:image" content="${escapeHtml(image)}">`+
  `<link rel="canonical" href="${escapeHtml(canonical)}">`+
  `<script id="patro-edge-webpage-schema" type="application/ld+json">${schema}</script>`;
 return new HTMLRewriterCtor()
  .on("title",{element(el:any){el.setInnerContent(fullTitle)}})
  .on('meta[name="description"]',{element(el:any){el.remove()}})
  .on('meta[name="robots"]',{element(el:any){el.remove()}})
  .on('meta[property^="og:"]',{element(el:any){el.remove()}})
  .on('meta[name^="twitter:"]',{element(el:any){el.remove()}})
  .on('link[rel="canonical"]',{element(el:any){el.remove()}})
  .on('link[rel="alternate"][hreflang]',{element(el:any){el.remove()}})
  .on("head",{element(el:any){el.append(headBlock,{html:true})}})
  .transform(response);
}

export const CONNECTED_TOOL_SEO_COUNT=Object.keys(TOOL_META).length;
