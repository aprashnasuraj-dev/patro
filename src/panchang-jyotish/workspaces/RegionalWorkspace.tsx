import { useState } from "react";
import { l } from "../../useUiLanguage";
import { FeatureGlyph } from "../FeatureGlyph";
import "./workspace.css";

type Props={language:"ne"|"en";selectedFeatureId?:string|null};
const CALENDAR_LINKS=[
{href:"/",featureId:"F080",ne:"बिक्रम संवत् पात्रो",en:"Bikram Sambat Calendar",descNe:"दैनिक नेपाली मिति, चाडपर्व र बिदा।",descEn:"Daily Nepali dates, festivals and holidays."},
{href:"/nepal-sambat/mandala",featureId:"F081",ne:"नेपाल संवत्",en:"Nepal Sambat",descNe:"नेपाल संवत् र समुदायका पर्वको विद्यमान पात्रो।",descEn:"Existing Nepal Sambat calendar and community observances."},
{href:"/samudaya",featureId:"F090",ne:"समुदाय पात्रो",en:"Community calendars",descNe:"समुदायअनुसारका पात्रो र पर्व।",descEn:"Calendars and observances by community."},
{href:"/samudaya/lhosar",featureId:"F090",ne:"ल्होसार",en:"Lhosar",descNe:"समुदायको परम्परासँग सम्बन्धित ल्होसार पात्रो।",descEn:"Lhosar calendar linked to community traditions."},
{href:"/samudaya/tharu",featureId:"F090",ne:"थारु पात्रो",en:"Tharu calendar",descNe:"थारु समुदायको विद्यमान पात्रो।",descEn:"Existing Tharu community calendar."},
{href:"/samudaya/mithila",featureId:"F090",ne:"मिथिला पात्रो",en:"Mithila calendar",descNe:"मिथिला/मैथिली समुदायका मिति र पर्व।",descEn:"Mithila/Maithili dates and observances."},
{href:"/samudaya/kirat",featureId:"F090",ne:"किरात पात्रो",en:"Kirat calendar",descNe:"किरात समुदायका पर्व र चक्र।",descEn:"Kirat community observances and cycles."},
{href:"/samudaya/hijri",featureId:"F090",ne:"हिजरी पात्रो",en:"Hijri calendar",descNe:"हिजरी मिति र चन्द्र-दर्शनसँग सम्बन्धित अनिश्चितता।",descEn:"Hijri dates and moon-sighting uncertainty."}
] as const;

export function RegionalWorkspace({language}:Props){
  const [showMethods,setShowMethods]=useState(false);
  return <div className="ap-pjw-root">
    <section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3 className="ap-pjw-icon-label"><FeatureGlyph featureId="F080" size="inline"/>{l(language,"नेपालका मुख्य पात्रो","Core calendars for Nepal")}</h3><small>{l(language,"उपलब्ध पात्रो","Available calendars")}</small></div>
      <p className="ap-pjw-section-note">{l(language,"नेपाली र क्षेत्रीय पात्रोका आ-आफ्नै मिति तथा चलन हुन्छन्। आफ्नो समुदाय र परम्पराअनुसार उपयुक्त पात्रो खोल्नुहोस्।","Nepali and regional calendars follow their own date systems and customs. Choose the calendar that matches your community and tradition.")}</p>
      <div className="ap-pjw-link-grid">{CALENDAR_LINKS.map(item=><a className="ap-pjw-link-card" href={item.href} key={item.href}><strong className="ap-pjw-icon-label"><FeatureGlyph featureId={item.featureId} size="inline"/>{l(language,item.ne,item.en)}</strong><small>{l(language,item.descNe,item.descEn)}</small><span>{l(language,"पात्रो खोल्नुहोस्","Open calendar")} ↗</span></a>)}</div>
    </section>

    <section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3 className="ap-pjw-icon-label"><FeatureGlyph featureId="F080" size="inline"/>{l(language,"मिति कसरी निकालिन्छ?","How are dates determined?")}</h3><button type="button" className="ap-pjw-secondary" aria-expanded={showMethods} aria-controls="ap-pjw-calendar-methods" onClick={()=>setShowMethods(value=>!value)}>{showMethods?l(language,"लुकाउनुहोस्","Hide"):l(language,"विधि हेर्नुहोस्","Show methods")}</button></div>
      {showMethods&&<div className="ap-pjw-root" id="ap-pjw-calendar-methods">
        <p className="ap-pjw-section-note">{l(language,"वि.सं. र नेपाल संवत्का मिति सम्बन्धित पात्रो स्रोतअनुसार देखाइन्छन्। क्षेत्रीय पर्वका लागि आफ्नो समुदाय वा आयोजकले प्रकाशित गरेको मिति पनि जाँच्नुहोस्।", "Bikram Sambat and Nepal Sambat dates follow their respective calendar sources. For regional observances, also check dates published by your community or event organizer.")}</p>
        <a className="ap-pjw-secondary" href="/sources">{l(language,"स्रोत र पात्रो विधि","Sources and calendar methods")} ↗</a>
      </div>}
    </section>
  </div>;
}
