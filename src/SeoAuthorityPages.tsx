import { useEffect } from "react";

function setMeta(title:string,description:string,canonical:string){
  useEffect(()=>{
    document.title=title;
    const desc=document.querySelector('meta[name="description"]');if(desc)desc.setAttribute("content",description);
    const link=document.querySelector('link[rel="canonical"]');if(link)link.setAttribute("href",canonical);
  },[title,description,canonical]);
}

export function MethodologyPage(){
  setMeta("नेपाली पात्रो पद्धति · Aafnai Patro Methodology","Aafnai Patro ले Bikram Sambat, AD, तिथि, चाडपर्व र स्रोत सत्यापन कसरी सम्हाल्छ भन्ने पद्धति।","https://aafnaipatro.com/methodology");
  return <main className="ap-page"><article className="ap-calendar-card"><header className="ap-section-head"><div><span className="ap-eyebrow">पद्धति · Methodology</span><h1>नेपाली पात्रोका तथ्य कसरी तयार र जाँच गरिन्छ?</h1></div></header><p><strong>एक मात्र स्रोत-संरचना:</strong> Aafnai Patro ले calendar archive को एउटै canonical dataset बाट BS, AD, Nepal Sambat र उपलब्ध Panchang fields पढ्छ। SEO का लागि दोस्रो date table बनाइँदैन।</p><h2>वि.सं. महिनाको लम्बाइ</h2><p>Bikram Sambat महिनाको दिन संख्या वर्षअनुसार फरक हुन सक्छ। त्यसैले 29–32 दिनको अनुमान hardcode गरेर conversion गरिँदैन; उपलब्ध archive record बाट वास्तविक महिनाका दिन र AD mapping लिइन्छ।</p><h2>आजको मिति</h2><p>“आज” नेपाल समय <strong>Asia/Kathmandu (UTC+5:45)</strong> मा resolve हुन्छ। यसले midnight boundary लाई browser को local timezone मा निर्भर हुन दिँदैन।</p><h2>तिथि, चाडपर्व र साइत</h2><p>Static SEO copy ले हराएको तिथि, बिदा, festival वा sait अनुमान गर्दैन। उपलब्ध archived/verified fact मात्र देखाइन्छ। स्थानअनुसार समय रूपान्तरण गर्दा absolute transition timestamp उपलब्ध भएमा मात्र timezone conversion गरिन्छ।</p><h2>स्रोत र सुधार</h2><p>प्रत्येक उपलब्ध तथ्यको source/verification metadata जोगाइन्छ। कुनै factual mismatch भेटिएमा <a href="/corrections">Corrections</a> पृष्ठ र <a href="/contact">Contact</a> मार्फत correction workflow चलाइन्छ।</p><nav aria-label="सम्बन्धित पृष्ठ"><a href="/today">आजको नेपाली मिति</a> · <a href="/convert">मिति परिवर्तन</a> · <a href="/sources">स्रोतहरू</a></nav></article></main>;
}

export function CorrectionsPage(){
  setMeta("पात्रो सुधार र Correction Log · Aafnai Patro","Aafnai Patro calendar corrections, verification policy and public correction workflow.","https://aafnaipatro.com/corrections");
  return <main className="ap-page"><article className="ap-calendar-card"><header className="ap-section-head"><div><span className="ap-eyebrow">विश्वसनीयता · Trust</span><h1>Correction Log र तथ्य सुधार नीति</h1></div></header><p><strong>नियम:</strong> तथ्य परिवर्तन हुँदा पुरानो मान चुपचाप मेटाएर नयाँ दाबी बनाइँदैन। Source, verification date र correction reason उपलब्ध भएमा तिनलाई सँगै राख्ने नीति हो।</p><h2>हालको सार्वजनिक log</h2><p>यस build मा छुट्टै verified correction entry उपलब्ध छैन। खाली सूचीलाई invented history ले भरिँदैन। नयाँ verified correction भएपछि यही canonical URL मा मिति, प्रभावित record, source र verification note देखाइनेछ।</p><h2>गल्ती रिपोर्ट गर्नुहोस्</h2><p>मिति, तिथि, बिदा वा चाडपर्वमा समस्या देखेमा सम्बन्धित URL र reference source सहित <a href="/contact">सम्पर्क पृष्ठ</a> बाट पठाउनुहोस्।</p><nav aria-label="सम्बन्धित पृष्ठ"><a href="/methodology">पद्धति</a> · <a href="/sources">स्रोतहरू</a> · <a href="/today">आजको पात्रो</a></nav></article></main>;
}
