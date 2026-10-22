import { useMemo, useState } from "react";
import { l } from "../../useUiLanguage";
import { getFeatureById } from "../catalog";
import "./workspace.css";

type Props={language:"ne"|"en";selectedFeatureId?:string|null};
const SYSTEMS=[
{id:"F082",ne:"तमिल पञ्चाङ्गम्",en:"Tamil Panchangam",descriptionNe:"तमिल पात्रोमा सौर महिना र तिथि/नक्षत्रका स्थानीय प्रयोग समावेश हुन सक्छन्। मिति देखाउनुअघि स्थानीय प्रकाशित स्रोतसँग मिलान आवश्यक छ।",descriptionEn:"Tamil calendars can combine solar months with local Tithi/Nakshatra conventions. Dates require comparison with a local published source before being displayed."},
{id:"F083",ne:"गौरी नल्ला नेरम",en:"Gowri Nalla Neram",descriptionNe:"यो तमिल परम्परासँग सम्बन्धित समय-विभाजन हो; यसको नियमलाई नेपालका समयखण्डसँग नजोडी छुट्टै परम्पराको रूपमा राखिन्छ।",descriptionEn:"This is a timing practice from the Tamil tradition and should remain distinct from Nepal's day-window conventions."},
{id:"F084",ne:"तमिल पात्रो र कार्तिगै",en:"Tamil Calendar & Karthigai",descriptionNe:"महिना र पर्वको नियम स्रोतसहित पुष्टि भएपछि मात्र मिति देखाउनुपर्छ।",descriptionEn:"Dates should appear only after the month and festival rules are supported by sources."},
{id:"F085",ne:"तमिल पर्व",en:"Tamil Festivals & Kanda Sashti",descriptionNe:"क्षेत्र, परम्परा र प्रकाशित पञ्चाङ्गको आधार स्पष्ट भएपछि मात्र गणना वा प्रकाशन गर्नुपर्छ।",descriptionEn:"Calculation or publication requires a declared region, tradition and supporting Panchang source."},
{id:"F086",ne:"मलयालम पात्रो",en:"Malayalam Panchangam",descriptionNe:"मलयालम सौर महिनाको प्रणालीलाई वि.सं. वा नेपाल संवत्को अर्को नामजस्तो प्रस्तुत गरिँदैन।",descriptionEn:"The Malayalam solar-month system is not treated as another label for Bikram Sambat or Nepal Sambat."},
{id:"F087",ne:"बंगाली पञ्जिका",en:"Bengali Panjika",descriptionNe:"बंगाली पञ्जिकाका स्थानीय नियम र प्रकाशित स्रोत छुट्टै अभिलेख आवश्यक हुन्छ।",descriptionEn:"Bengali Panjika requires its own local rules and published-source records."},
{id:"F088",ne:"गुजराती संवत्",en:"Gujarati Samvat / Amanta",descriptionNe:"अमान्त महिनाको पद्धति पूर्णिमान्त नामकरणसँग अलग देखाइन्छ।",descriptionEn:"The Amanta month system is kept distinct from Purnimanta month naming."},
{id:"F089",ne:"कुम्भ मेला",en:"Kumbha Mela dates",descriptionNe:"आयोजनका मिति आधिकारिक आयोजक वा मान्य स्रोतबाट पुष्टि गरेपछि मात्र प्रकाशन गर्नुपर्छ।",descriptionEn:"Event dates are published only after verification from organizers or an accepted source."},
{id:"F091",ne:"भक्तिगीत र सांस्कृतिक सामग्री",en:"Devotional & cultural library",descriptionNe:"सांस्कृतिक सामग्रीलाई पात्रो-गणना तथ्यबाट अलग राखी स्रोत र भाषासहित व्यवस्थित गरिन्छ।",descriptionEn:"Cultural content is organized separately from calendar calculations, with source and language metadata."}
] as const;
const CALENDAR_LINKS=[
{href:"/",ne:"बिक्रम संवत् पात्रो",en:"Bikram Sambat Calendar",descNe:"दैनिक नेपाली मिति, चाडपर्व र बिदा।",descEn:"Daily Nepali dates, festivals and holidays."},
{href:"/nepal-sambat/mandala",ne:"नेपाल संवत्",en:"Nepal Sambat",descNe:"नेपाल संवत् र समुदायका पर्वको विद्यमान पात्रो।",descEn:"Existing Nepal Sambat calendar and community observances."},
{href:"/samudaya",ne:"समुदाय पात्रो",en:"Community calendars",descNe:"समुदायअनुसारका पात्रो र पर्व।",descEn:"Calendars and observances by community."},
{href:"/samudaya/lhosar",ne:"ल्होसार",en:"Lhosar",descNe:"समुदायको परम्परासँग सम्बन्धित ल्होसार पात्रो।",descEn:"Lhosar calendar linked to community traditions."},
{href:"/samudaya/tharu",ne:"थारु पात्रो",en:"Tharu calendar",descNe:"थारु समुदायको विद्यमान पात्रो।",descEn:"Existing Tharu community calendar."},
{href:"/samudaya/mithila",ne:"मिथिला पात्रो",en:"Mithila calendar",descNe:"मिथिला/मैथिली समुदायका मिति र पर्व।",descEn:"Mithila/Maithili dates and observances."},
{href:"/samudaya/kirat",ne:"किरात पात्रो",en:"Kirat calendar",descNe:"किरात समुदायका पर्व र चक्र।",descEn:"Kirat community observances and cycles."},
{href:"/samudaya/hijri",ne:"हिजरी पात्रो",en:"Hijri calendar",descNe:"हिजरी मिति र चन्द्र-दर्शनसँग सम्बन्धित अनिश्चितता।",descEn:"Hijri dates and moon-sighting uncertainty."}
] as const;

export function RegionalWorkspace({language,selectedFeatureId}:Props){
  const [query,setQuery]=useState("");
  const [showMethods,setShowMethods]=useState(false);
  const selected=selectedFeatureId?getFeatureById(selectedFeatureId):null;
  const visible=useMemo(()=>SYSTEMS.filter(item=>[item.ne,item.en,item.descriptionNe,item.descriptionEn].some(value=>value.toLowerCase().includes(query.trim().toLowerCase()))),[query]);
  return <div className="ap-pjw-root">
    <section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"नेपालका मुख्य पात्रो","Core calendars for Nepal")}</h3><small>{l(language,"विद्यमान पात्रो जोडिएको","Existing calendar routes")}</small></div>
      <p className="ap-pjw-section-note">{l(language,"आफ्नै पात्रोमा वि.सं. र नेपाल संवत् प्राथमिक छन्। क्षेत्रीय पात्रोहरू आ-आफ्नो परम्परा र नियमअनुसार देखाइन्छन्; सबै प्रणालीलाई एउटै तिथि वा महिनाको गणनामा मिसाइँदैन।","Aafnai Patro keeps Bikram Sambat and Nepal Sambat prominent. Regional calendars are represented under their own traditions and rules rather than merged into a single Tithi or month calculation.")}</p>
      <div className="ap-pjw-link-grid">{CALENDAR_LINKS.map(item=><a className="ap-pjw-link-card" href={item.href} key={item.href}><strong>{l(language,item.ne,item.en)}</strong><small>{l(language,item.descNe,item.descEn)}</small><span>{l(language,"पात्रो खोल्नुहोस्","Open calendar")} ↗</span></a>)}</div>
    </section>
    <section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"क्षेत्रीय पात्रो र सांस्कृतिक सन्दर्भ","Regional calendars and cultural references")}</h3><small>{l(language,"स्रोत-पुष्टि आवश्यक","Source verification required")}</small></div>
      <label className="ap-pj-search"><span aria-hidden="true">⌕</span><span className="ap-pj-sr-only">{l(language,"क्षेत्रीय पात्रो खोज्नुहोस्","Search regional calendars")}</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={l(language,"तमिल, बंगाली, मलयालम, कुम्भ…","Tamil, Bengali, Malayalam, Kumbha…")}/>{query&&<button type="button" onClick={()=>setQuery("")} aria-label={l(language,"खोज हटाउनुहोस्","Clear search")}>×</button>}</label>
      <div className="ap-pjw-link-grid">{visible.map(item=><article className="ap-pjw-link-card" key={item.id}><strong>{l(language,item.ne,item.en)}</strong><small>{l(language,item.descriptionNe,item.descriptionEn)}</small><span>{l(language,"नियम र मिति पुष्टि आवश्यक","Rule/date verification required")}</span></article>)}</div>
      {selected&&<p className="ap-pjw-method">{l(language,selected.descriptionNe,selected.descriptionEn)}</p>}
    </section>
    <section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"पात्रो गणना विधि","Calendar calculation methods")}</h3><button type="button" className="ap-pjw-secondary" onClick={()=>setShowMethods(value=>!value)}>{showMethods?l(language,"लुकाउनुहोस्","Hide"):l(language,"विधि हेर्नुहोस्","Show methods")}</button></div>
      {showMethods&&<div className="ap-pjw-root">
        <p className="ap-pjw-section-note">{l(language,"वि.सं. मितिका लागि विद्यमान नेपाली मिति रूपान्तरण र प्रमाणित अभिलेख प्रयोग हुन्छ। नेपाल संवत्का लागि विद्यमान समुदाय-पात्रो स्रोत प्रयोग हुन्छ। क्षेत्रीय प्रणालीमा आधिकारिक प्रकाशन, नियम-संस्करण र परम्परागत स्थानीय समयक्षेत्र अलगसँग अभिलेख हुनुपर्छ।", "Bikram Sambat uses the existing Nepali date-conversion/archive layer. Nepal Sambat uses the existing community-calendar sources. Regional systems require their own official publications, rule versions and local timezone records.")}</p>
        <a className="ap-pjw-secondary" href="/sources">{l(language,"स्रोत र पात्रो विधि","Sources and calendar methods")} ↗</a>
      </div>}
    </section>
  </div>;
}
