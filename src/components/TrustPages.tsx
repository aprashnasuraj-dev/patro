import { FormEvent, useEffect, useState } from "react";
import { Info, BookOpenText, ShieldCheck, Scale, MessageSquare, Send } from "lucide-react";
import { applyRouteSeo } from "../seo";

type PageKey="about"|"sources"|"privacy"|"terms"|"contact";
const SUPPORT_EMAIL="meroaafnaipatro@gmail.com";
const PAGES:Record<PageKey,{title:string;en:string;description:string;icon:typeof Info}>={
  about:{title:"हाम्रो बारेमा",en:"About आफ्नै पात्रो",description:"नेपालको मिति, परम्परा र दैनिक उपयोगलाई एउटै भरोसायोग्य अनुभवमा जोड्ने वेब एप।",icon:Info},
  sources:{title:"स्रोत र शुद्धता",en:"Sources & accuracy",description:"मिति, पञ्चाङ्ग, बजार र मिडिया जानकारी कहाँबाट आउँछ र कसरी प्रस्तुत गरिन्छ भन्ने स्पष्ट विवरण।",icon:BookOpenText},
  privacy:{title:"गोपनीयता नीति",en:"Privacy",description:"तपाईंको व्यक्तिगत जानकारी, सिङ्क, मिडिया र सम्पर्कसम्बन्धी गोपनीयता विवरण।",icon:ShieldCheck},
  terms:{title:"सेवाका सर्तहरू",en:"Terms",description:"आफ्नै पात्रो प्रयोग गर्दा लागू हुने आधारभूत सर्त र जिम्मेवारी।",icon:Scale},
  contact:{title:"सम्पर्क",en:"Contact",description:"समस्या, सुझाव वा तथ्य-सुधारको जानकारी फारामबाट वा इमेलमार्फत पठाउनुहोस्।",icon:MessageSquare}
};

export function TrustPage({ page }:{page:PageKey}){
  const meta=PAGES[page],Icon=meta.icon;
  useEffect(()=>applyRouteSeo("/"+page),[page]);
  return <main className="mp-page mp-trust">
    <nav className="mp-breadcrumb" aria-label="Breadcrumb"><a href="/">आफ्नै पात्रो</a><span>/</span><span>{meta.title}</span></nav>
    <header className="mp-page-hero"><Icon size={28}/><p className="eyebrow">{meta.en}</p><h1>{meta.title}</h1><p>{meta.description}</p></header>
    {page==="about"&&<About/>}{page==="sources"&&<Sources/>}{page==="privacy"&&<Privacy/>}{page==="terms"&&<Terms/>}{page==="contact"&&<Contact/>}
  </main>;
}

function About(){return <div className="mp-prose"><section><h2>किन आफ्नै पात्रो?</h2><p>आफ्नै पात्रोले Bikram Sambat, AD, तिथि, चाडपर्व, राशिफल, खगोलीय जानकारी, मिडिया र व्यक्तिगत मिति-सम्झनालाई एउटै अनुभवमा प्रस्तुत गर्छ। लक्ष्य छिटो, स्पष्ट र गोपनीयता-मैत्री सेवा दिनु हो।</p></section><section><h2>हामी केलाई प्राथमिकता दिन्छौँ?</h2><p>मिति र पञ्चाङ्ग जानकारीलाई सकेसम्म स्पष्ट सन्दर्भसहित देखाइन्छ। निजी नोट, परिवारका मिति र व्यक्तिगत सम्झनाजस्ता सुविधा तपाईंको नियन्त्रणमा रहने गरी डिजाइन गरिएको छ।</p></section></div>}
function Sources(){return <div className="mp-prose"><section><h2>पात्रो र मिति</h2><p>BS↔AD रूपान्तरण र पात्रो विवरण दीर्घकालीन क्यालेन्डर अभिलेखबाट तयार हुन्छ। धेरै टाढाको भविष्यका मितिमा विभिन्न प्रकाशित तालिकाबीच फरक पर्न सक्ने अवस्थामा त्यसलाई स्पष्ट रूपमा जानकारी गराइन्छ।</p></section><section><h2>तिथि र खगोलीय जानकारी</h2><p>तिथि, सूर्य–चन्द्र स्थिति र चन्द्र अवस्थासम्बन्धी विवरण खगोलीय गणनाबाट तयार हुन्छ। ऐतिहासिक अभिलेख र गणनाबाट निकालिएको जानकारी छुट्टाछुट्टै सन्दर्भमा प्रस्तुत गरिन्छ।</p></section><section><h2>मिडिया र बजार जानकारी</h2><p>रेडियो र टिभी स्ट्रिम सम्बन्धित सार्वजनिक प्रसारण स्रोतमा निर्भर हुन्छन्, त्यसैले उपलब्धता समयअनुसार बदलिन सक्छ। इन्धन मूल्य नेपाल आयल निगमबाट उपलब्ध पछिल्लो जानकारीका आधारमा देखाइन्छ।</p></section><section><h2>सुधार पठाउनुहोस्</h2><p>मिति, चाडपर्व, स्ट्रिम वा अन्य विवरणमा त्रुटि देखिएमा <a href="/contact">सम्पर्क पृष्ठ</a> बाट जानकारी पठाउनुहोस्।</p></section></div>}
function Privacy(){return <div className="mp-prose"><section><h2>तपाईंको व्यक्तिगत जानकारी</h2><p>नोट, पारिवारिक मिति, सम्झना, मनपर्ने मिडिया र केही प्राथमिकता तपाईंको ब्राउजरमा सुरक्षित रहन सक्छन्। यी सुविधाको उद्देश्य तपाईंलाई छिटो र व्यक्तिगत अनुभव दिनु हो।</p></section><section><h2>साइन इन र सिङ्क</h2><p>स्थानीय व्यक्तिगत जानकारी स्वचालित रूपमा Google खातामा पठाइँदैन। तपाईंले साइन इन गरी सिङ्क रोजेपछि मात्र समर्थित जानकारी खातासँग सिङ्क हुन्छ।</p></section><section><h2>टिभी र रेडियो</h2><p>टिभी वा रेडियो चलाउँदा सम्बन्धित प्रसारण सेवामा इन्टरनेट अनुरोध जान सक्छ। बाह्य प्रसारण सेवाका आफ्नै गोपनीयता नियम लागू हुन सक्छन्।</p></section><section><h2>सम्पर्क फाराम</h2><p>सम्पर्क फारामले तपाईंको आफ्नै इमेल एपमा तयार सन्देश खोल्छ। नाम, इमेल वा सन्देश फाराममार्फत आफ्नै पात्रोमा भण्डारण हुँदैन।</p></section></div>}
function Terms(){return <div className="mp-prose"><section><h2>जानकारीको प्रयोग</h2><p>पात्रो, खगोलीय र ज्योतिष सामग्री जानकारी तथा परम्परागत सन्दर्भका लागि हो। कानुनी, वित्तीय वा चिकित्सकीय निर्णयका लागि सम्बन्धित आधिकारिक स्रोत जाँच गर्नुहोस्।</p></section><section><h2>तेस्रो-पक्ष प्रसारण</h2><p>रेडियो र टिभी स्ट्रिमको उपलब्धता, अधिकार र निरन्तरता सम्बन्धित प्रसारक वा सार्वजनिक स्रोतमा निर्भर हुन्छ। उपलब्धता परिवर्तन भएमा सूची अद्यावधिक गर्न सकिन्छ।</p></section><section><h2>सेवा सुधार</h2><p>विश्वसनीयता, सुरक्षा र प्रयोग अनुभव सुधार गर्न सुविधा तथा प्रस्तुति समयअनुसार अद्यावधिक हुन सक्छन्। व्यक्तिगत जानकारीसम्बन्धी नियन्त्रण र गोपनीयता प्राथमिकतामा रहन्छ।</p></section></div>}

function Contact(){
  const [status,setStatus]=useState("");
  function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const fd=new FormData(event.currentTarget);
    const name=String(fd.get("name")||"").trim();
    const email=String(fd.get("email")||"").trim();
    const message=String(fd.get("message")||"").trim();
    const subject=`Aafnai Patro सम्पर्क — ${name || "Website feedback"}`;
    const body=[`नाम: ${name}`,`इमेल: ${email}`,"",message].join("\n");
    setStatus("तपाईंको इमेल एपमा सन्देश तयार गरिँदैछ…");
    window.location.href=`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  return <section className="mp-contact-card">
    <div className="mp-contact-direct"><strong>प्रत्यक्ष इमेल</strong><p>सहयोग, सुझाव वा तथ्य-सुधारका लागि <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p></div>
    <form onSubmit={submit}><label>नाम<input name="name" required maxLength={120} autoComplete="name"/></label><label>इमेल<input name="email" type="email" required maxLength={254} autoComplete="email"/></label><label>सन्देश<textarea name="message" required minLength={5} maxLength={5000} rows={7}/></label><button type="submit"><Send size={17}/>इमेल तयार गर्नुहोस्</button><p className="mp-contact-note">तपाईंको इमेल एप खुल्नेछ। पठाउनु अघि सन्देश फेरि जाँच गर्न सक्नुहुन्छ।</p>{status&&<p role="status" className="mp-contact-status">{status}</p>}</form>
  </section>
}