import { useEffect } from "react";

function setMeta(title:string,description:string,canonical:string){
  useEffect(()=>{
    document.title=title;
    const desc=document.querySelector('meta[name="description"]');if(desc)desc.setAttribute("content",description);
    const link=document.querySelector('link[rel="canonical"]');if(link)link.setAttribute("href",canonical);
  },[title,description,canonical]);
}

export function MethodologyPage(){
  setMeta("नेपाली पात्रो पद्धति · Aafnai Patro Methodology","Aafnai Patro ले Bikram Sambat, AD, तिथि र चाडपर्वसम्बन्धी जानकारी कसरी तयार र जाँच गर्छ भन्ने विवरण।","https://aafnaipatro.com/methodology");
  return <main className="ap-page"><article className="ap-calendar-card"><header className="ap-section-head"><div><span className="ap-eyebrow">पद्धति · Methodology</span><h1>नेपाली पात्रोका तथ्य कसरी तयार र जाँच गरिन्छ?</h1></div></header><p>आफ्नै पात्रोमा देखिने BS, AD, नेपाल संवत् र पञ्चाङ्गसम्बन्धी विवरण एउटै संगत पात्रो अभिलेखबाट जोडिन्छन्, ताकि फरक पृष्ठमा एउटै मितिको फरक उत्तर नआओस्।</p><h2>वि.सं. महिनाको लम्बाइ</h2><p>Bikram Sambat महिनाको दिन संख्या वर्षअनुसार फरक हुन सक्छ। त्यसैले महिनाको दिन अनुमान गरेर मिति परिवर्तन गरिँदैन; सम्बन्धित वर्षको उपलब्ध पात्रो अभिलेखअनुसार मिति मिलाइन्छ।</p><h2>आजको मिति</h2><p>“आज” को मिति नेपाल समय <strong>Asia/Kathmandu (UTC+5:45)</strong> अनुसार तय हुन्छ। विदेशबाट प्रयोग गर्दा पनि नेपालको आजको मिति सही दिनमा देखियोस् भन्ने उद्देश्य हो।</p><h2>तिथि, चाडपर्व र साइत</h2><p>उपलब्ध नभएको तिथि, बिदा, चाडपर्व वा साइत अनुमान गरेर देखाइँदैन। स्थानअनुसार समय फरक पर्ने विवरणमा पर्याप्त समय-सन्दर्भ उपलब्ध हुँदा मात्र स्थानीय समय रूपान्तरण गरिन्छ।</p><h2>स्रोत र सुधार</h2><p>कुनै मिति वा पात्रो तथ्यमा फरक देखिएमा <a href="/corrections">सुधार पृष्ठ</a> हेर्नुहोस् वा <a href="/contact">सम्पर्क</a> मार्फत प्रमाणसहित जानकारी पठाउनुहोस्।</p><nav aria-label="सम्बन्धित पृष्ठ"><a href="/today">आजको नेपाली मिति</a> · <a href="/convert">मिति परिवर्तन</a> · <a href="/sources">स्रोतहरू</a></nav></article></main>;
}

export function CorrectionsPage(){
  setMeta("पात्रो सुधार · Aafnai Patro","Aafnai Patro को तथ्य-सुधार नीति र सार्वजनिक सुधार विवरण।","https://aafnaipatro.com/corrections");
  return <main className="ap-page"><article className="ap-calendar-card"><header className="ap-section-head"><div><span className="ap-eyebrow">विश्वसनीयता · Trust</span><h1>तथ्य सुधार र पारदर्शिता</h1></div></header><p>कुनै पात्रो तथ्य सच्याउनुपरेमा उपलब्ध प्रमाण, मिति र सुधारको कारणलाई आधार बनाइन्छ। उद्देश्य प्रयोगकर्ताले परिवर्तन भएको जानकारी स्पष्ट रूपमा बुझ्न सकून् भन्ने हो।</p><h2>सार्वजनिक सुधार विवरण</h2><p>हाल प्रकाशित गर्नुपर्ने छुट्टै सुधार विवरण छैन। भविष्यमा महत्त्वपूर्ण पात्रो तथ्य सच्याइएमा सम्बन्धित मिति, परिवर्तन र आधार यही पृष्ठमा स्पष्ट रूपमा राखिनेछ।</p><h2>गल्ती रिपोर्ट गर्नुहोस्</h2><p>मिति, तिथि, बिदा वा चाडपर्वमा समस्या देखेमा सम्बन्धित पृष्ठको ठेगाना र सम्भव भए आधिकारिक वा विश्वसनीय सन्दर्भसहित <a href="/contact">सम्पर्क पृष्ठ</a> बाट पठाउनुहोस्।</p><nav aria-label="सम्बन्धित पृष्ठ"><a href="/methodology">पद्धति</a> · <a href="/sources">स्रोतहरू</a> · <a href="/today">आजको पात्रो</a></nav></article></main>;
}
