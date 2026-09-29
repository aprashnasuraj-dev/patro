import { FormEvent, useEffect, useState } from "react";
import { Info, BookOpenText, ShieldCheck, Scale, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { applyRouteSeo } from "../seo";

type PageKey="about"|"sources"|"privacy"|"terms"|"contact";
const PAGES:Record<PageKey,{title:string;en:string;description:string;icon:typeof Info}>={
  about:{title:"हाम्रो बारेमा",en:"About Mero Patro",description:"नेपालको मिति, परम्परा र दैनिक उपयोगलाई एउटै भरोसायोग्य अनुभवमा जोड्ने वेब एप।",icon:Info},
  sources:{title:"स्रोत र शुद्धता",en:"Sources & accuracy",description:"कुन डेटा अभिलेखबाट आउँछ, कुन गणना हो र कहाँ सीमाहरू छन् भन्ने स्पष्ट विवरण।",icon:BookOpenText},
  privacy:{title:"गोपनीयता नीति",en:"Privacy",description:"स्थानीय डाटा, सिङ्क, मिडिया स्ट्रिम र सम्पर्क फाराम कसरी व्यवहार हुन्छ।",icon:ShieldCheck},
  terms:{title:"सेवाका सर्तहरू",en:"Terms",description:"मेरो पात्रो प्रयोग गर्दा लागू हुने आधारभूत सर्त र जिम्मेवारी।",icon:Scale},
  contact:{title:"सम्पर्क",en:"Contact",description:"समस्या, सुझाव वा स्रोत-सुधारको जानकारी सुरक्षित फारामबाट पठाउनुहोस्।",icon:MessageSquare}
};

export function TrustPage({ page }:{page:PageKey}){
  const meta=PAGES[page],Icon=meta.icon;
  useEffect(()=>applyRouteSeo("/"+page),[page]);
  return <main className="mp-page mp-trust">
    <nav className="mp-breadcrumb" aria-label="Breadcrumb"><a href="/">मेरो पात्रो</a><span>/</span><span>{meta.title}</span></nav>
    <header className="mp-page-hero"><Icon size={28}/><p className="eyebrow">{meta.en}</p><h1>{meta.title}</h1><p>{meta.description}</p></header>
    {page==="about"&&<About/>}{page==="sources"&&<Sources/>}{page==="privacy"&&<Privacy/>}{page==="terms"&&<Terms/>}{page==="contact"&&<Contact/>}
  </main>;
}

function About(){return <div className="mp-prose"><section><h2>किन मेरो पात्रो?</h2><p>मेरो पात्रोले Bikram Sambat, AD, तिथि, चाडपर्व, राशिफल, खगोलीय जानकारी, मिडिया र व्यक्तिगत मिति-सम्झनालाई एउटै उत्पादनमा प्रस्तुत गर्छ। लक्ष्य सजिलो प्रयोग, स्पष्ट स्रोत र गोपनीयता-मैत्री अनुभव हो।</p></section><section><h2>उत्पादन सिद्धान्त</h2><p>मिति र परम्परागत व्याख्यालाई तथ्य/गणना/स्रोतको सन्दर्भसँग छुट्टै चिनाइन्छ। निजी नोट, परिवारका मिति र म्यादसम्बन्धी डाटा पहिले प्रयोगकर्ताकै उपकरणमा रहन्छ।</p></section></div>}
function Sources(){return <div className="mp-prose"><section><h2>पात्रो र मिति</h2><p>BS↔AD रूपान्तरण र ऐतिहासिक पात्रो तह versioned archive/table स्रोतबाट चल्छ। जहाँ भविष्यको तालिका स्वतन्त्र स्रोतबीच फरक हुन सक्छ, UI ले provisional confidence देखाउँछ।</p></section><section><h2>तिथि र खगोलीय गणना</h2><p>तिथि, सूर्य/चन्द्र longitude र illumination सम्बन्धी भाग गणनात्मक engine बाट आउँछन्; ऐतिहासिक archive र गणनात्मक परिणामलाई एउटै दाबीको रूपमा मिसाइँदैन।</p></section><section><h2>मिडिया र बाह्य स्रोत</h2><p>रेडियो/टिभी स्ट्रिम सार्वजनिक वा broadcaster-provided स्रोतबाट index हुन्छन्। उपलब्धता तेस्रो-पक्ष स्ट्रिममा निर्भर हुन्छ। इन्धन मूल्य Nepal Oil Corporation स्रोत वा पछिल्लो source-verified snapshot बाट देखाइन्छ।</p></section><section><h2>त्रुटि रिपोर्ट</h2><p>मिति, चाडपर्व, स्ट्रिम वा स्रोतमा त्रुटि देखिएमा <a href="/contact">सम्पर्क फाराम</a> प्रयोग गर्नुहोस्।</p></section></div>}
function Privacy(){return <div className="mp-prose"><section><h2>स्थानीय डाटा</h2><p>नोट, पारिवारिक मिति, due date, कागजात म्याद, festival planning, मनपर्ने मिडिया र UI preferences जस्ता सुविधा browser storage मा रहन सक्छन्। मौजुदा storage keys/data shapes upgrade पछि पनि जोगाइन्छन्।</p></section><section><h2>साइन इन र सिङ्क</h2><p>स्थानीय व्यक्तिगत डाटा स्वचालित रूपमा Google खातामा पठाइँदैन। प्रयोगकर्ताले साइन इन/सिङ्क सक्षम गरेपछि मात्र समर्थित डाटा सिङ्क हुन्छ।</p></section><section><h2>टिभी र रेडियो</h2><p>प्ले गर्दा public third-party stream वा हाम्रो relay endpoint मा network request हुन सक्छ। broadcaster/stream provider का आफ्नै privacy नियम लागू हुन सक्छन्।</p></section><section><h2>सम्पर्क फाराम</h2><p>नाम, इमेल र सन्देश support follow-up का लागि Supabase मा सुरक्षित रूपमा भण्डारण हुन्छ। यो डाटा विज्ञापनका लागि बेचिँदैन।</p></section></div>}
function Terms(){return <div className="mp-prose"><section><h2>जानकारीको प्रयोग</h2><p>पात्रो, खगोलीय र ज्योतिष सामग्री जानकारी/परम्परागत सन्दर्भका लागि हो। कानुनी, वित्तीय वा चिकित्सकीय निर्णयका लागि आधिकारिक स्रोत जाँच गर्नुहोस्।</p></section><section><h2>तेस्रो-पक्ष स्ट्रिम</h2><p>रेडियो/टिभी स्ट्रिमको उपलब्धता, अधिकार र निरन्तरता सम्बन्धित सार्वजनिक स्रोत वा broadcaster मा निर्भर हुन्छ। मृत वा परिवर्तन भएका स्ट्रिम हटाउन/सुधार्न सकिन्छ।</p></section><section><h2>सेवा परिवर्तन</h2><p>विश्वसनीयता, सुरक्षा वा स्रोत परिवर्तनका कारण सुविधा/डेटा presentation सुधारिन सक्छ; मौजुदा व्यक्तिगत डाटा migration बिना हटाइँदैन।</p></section></div>}

function Contact(){
  const [state,setState]=useState<"idle"|"sending"|"sent"|"error">("idle");
  const [message,setMessage]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setState("sending");setMessage("");
    const fd=new FormData(event.currentTarget);
    const payload={name:String(fd.get("name")||""),email:String(fd.get("email")||""),message:String(fd.get("message")||""),company:String(fd.get("company")||"")};
    try{
      const response=await fetch("/api/v1/contact",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(String(body?.error||"request_failed"));
      setState("sent");setMessage("सन्देश प्राप्त भयो। आवश्यक परेमा हामी तपाईंलाई इमेलबाट सम्पर्क गर्नेछौं।");event.currentTarget.reset();
    }catch{setState("error");setMessage("सन्देश पठाउन सकिएन। केहीबेरपछि फेरि प्रयास गर्नुहोस्।");}
  }
  return <section className="mp-contact-card">{state==="sent"?<div className="mp-contact-success"><CheckCircle2 size={28}/><strong>धन्यवाद</strong><p>{message}</p><button onClick={()=>setState("idle")}>अर्को सन्देश</button></div>:<form onSubmit={submit}><label>नाम<input name="name" required maxLength={120} autoComplete="name"/></label><label>इमेल<input name="email" type="email" required maxLength={254} autoComplete="email"/></label><label className="mp-honeypot" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off"/></label><label>सन्देश<textarea name="message" required minLength={5} maxLength={5000} rows={7}/></label><button type="submit" disabled={state==="sending"}><Send size={17}/>{state==="sending"?"पठाउँदै…":"सन्देश पठाउनुहोस्"}</button>{state==="error"&&<p role="alert" className="mp-form-error">{message}</p>}</form>}</section>
}
