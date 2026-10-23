import type { PatroFeature, FeatureGroupId } from "./catalog";
import { getFeatureAvailability, getPublicFeaturesForGroup } from "./catalog";
import { l } from "../useUiLanguage";
import { FEATURE_REFERENCE_GUIDES } from "./feature-reference-guides";
import { FeatureGlyph } from "./FeatureGlyph";

type Lang = "ne" | "en";
type Props = {
  feature: PatroFeature;
  language: Lang;
  group: FeatureGroupId;
  onNavigate: (feature: PatroFeature) => void;
};
const DESIGN: Record<FeatureGroupId,{captionNe:string;captionEn:string;stepsNe:[string,string,string];stepsEn:[string,string,string];metricNe:string;metricEn:string}> = {
  panchang: {
    captionNe:"सूर्योदयबाट सुरु हुने नेपालको दिन",captionEn:"A Nepal day beginning at sunrise",
    stepsNe:["मिति छान्नुहोस्","तिथि तथा समय हेर्नुहोस्","दिनको विवरण बुझ्नुहोस्"],
    stepsEn:["Choose a date","Review Tithi and daily timings","Explore the day's details"],
    metricNe:"नेपाल समय · NPT",metricEn:"Nepal Standard Time · NPT"
  },
  muhurat: {
    captionNe:"दिनमानका आधारमा समय-अन्वेषण",captionEn:"An exploration of daylight-based time",
    stepsNe:["मिति र अवधि छान्नुहोस्","स्थानीय समयखण्ड हेर्नुहोस्","प्रकाशित साइत पुष्टि गर्नुहोस्"],
    stepsEn:["Choose date and range","Explore local time windows","Verify published Muhurat"],
    metricNe:"स्थान · काठमाडौं",metricEn:"Location · Kathmandu"
  },
  jyotish: {
    captionNe:"तपाईंको जन्मपत्रोबाट",captionEn:"From your birth chart",
    stepsNe:["जन्मपत्रो खोल्नुहोस्","जन्म समय र स्थान हेर्नुहोस्","ग्रहस्थिति र गोचर बुझ्नुहोस्"],
    stepsEn:["Open your birth chart","Review birth time and place","Explore planetary positions and transits"],
    metricNe:"जन्मपत्रोमा आधारित",metricEn:"Based on your birth chart"
  },
  planets: {
    captionNe:"आकाशीय गति, ग्रह र समय",captionEn:"Celestial motion, planets and time",
    stepsNe:["गणना मिति छान्नुहोस्","चाहिएको घटना खोज्नुहोस्","पद्धति र सीमाहरू पढ्नुहोस्"],
    stepsEn:["Choose an evaluation date","Find your selected event","Read the method and limits"],
    metricNe:"खगोलीय जानकारी",metricEn:"Astronomical information"
  },
  "nepal-calendar": {
    captionNe:"नेपालका संवत् र समुदाय",captionEn:"Nepal's calendar traditions",
    stepsNe:["संवत् वा समुदाय छान्नुहोस्","पात्रो हेर्नुहोस्","स्थानीय परम्परा बुझ्नुहोस्"],
    stepsEn:["Choose a calendar or community","View the calendar","Explore local traditions"],
    metricNe:"परम्परा अलग, स्रोत स्पष्ट",metricEn:"Distinct traditions, clear sources"
  }
};
function stateCopy(feature:PatroFeature, language:Lang) {
  const state=getFeatureAvailability(feature);
  if(state==="existing")return {
    label:l(language,"उपकरण","Tool"),
    title:l(language,"यो सुविधा खोल्नुहोस्","Open this feature"),
    body:l(language,"यस सुविधाको प्रयोग गर्न सम्बन्धित पेज खोल्नुहोस्।","Open the related page to use this feature."),
    action:l(language,"खोल्नुहोस्","Open tool")
  };
  if(state==="reference")return {
    label:l(language,"थप जानकारी","More information"),
    title:l(language,"परम्परागत जानकारी","Traditional guidance"),
    body:l(language,"यस विषयको परम्परागत अर्थ स्थान र चलनअनुसार फरक हुन सक्छ। महत्त्वपूर्ण निर्णयअघि स्थानीय पात्रो पनि हेर्नुहोस्।","Traditional interpretations can vary by place and custom. Check a local calendar before making an important decision."),
    action:l(language,"थप जानकारी हेर्नुहोस्","Explore more information")
  };
  return {
    label:l(language,"गणना उपकरण","Calculator"),
    title:l(language,"आफ्नो नतिजा हेर्नुहोस्","Explore your results"),
    body:l(language,"मिति र स्थानअनुसार देखाइएका समयलाई मार्गदर्शनका रूपमा लिनुहोस्। पर्व वा संस्कारको अन्तिम निर्णयका लागि स्थानीय प्रकाशित पञ्चाङ्ग पनि हेर्नुहोस्।","Use the times shown for your selected date and place as a guide. Check a published local Panchang before making a final festival or observance decision."),
    action:l(language,"गणना हेर्नुहोस्","View calculation")
  };
}

export function FeatureExperience({feature,language,group,onNavigate}:Props){
  const theme=DESIGN[group];
  const copy=stateCopy(feature,language);
  const state=getFeatureAvailability(feature);
  const guide=FEATURE_REFERENCE_GUIDES[feature.id];
  const next=getPublicFeaturesForGroup(group).filter(item=>item.id!==feature.id).slice(0,3);
  const label=l(language,feature.titleNe,feature.titleEn);
  return <section className={"ap-pj-experience ap-pj-experience--"+group} aria-label={label} data-feature-id={feature.id}>
    <div className="ap-pj-experience-top">
      <div className="ap-pj-experience-art" aria-hidden="true">
        <div className="ap-pj-experience-orbit ap-pj-experience-orbit--outer"/>
        <div className="ap-pj-experience-orbit ap-pj-experience-orbit--inner"/>
        <div className="ap-pj-experience-orbit ap-pj-experience-orbit--center"><FeatureGlyph featureId={feature.id} size="hero" className="ap-pj-experience-glyph" /></div>
        <span className="ap-pj-experience-dot ap-pj-experience-dot--one"/>
        <span className="ap-pj-experience-dot ap-pj-experience-dot--two"/>
        <span className="ap-pj-experience-axis ap-pj-experience-axis--first"/>
        <span className="ap-pj-experience-axis ap-pj-experience-axis--second"/>
      </div>
      <div className="ap-pj-experience-intro">
        <div className="ap-pj-experience-topline"><span>{l(language, "आफ्नै पात्रो", "Aafnai Patro")}</span><span>{copy.label}</span></div>
        <p className="ap-pj-experience-kicker">{l(language,theme.captionNe,theme.captionEn)}</p>
        <h3>{label}</h3>
        <p>{l(language,feature.descriptionNe,feature.descriptionEn)}</p>
        <div className="ap-pj-experience-chips"><span>{l(language,theme.metricNe,theme.metricEn)}</span><span>{l(language,"नेपाली / English","Nepali / English")}</span></div>
      </div>
    </div>
    <div className="ap-pj-experience-bottom">
      <div className="ap-pj-experience-journey">
        <h4>{l(language,"यसरी प्रयोग गर्नुहोस्","How to explore")}</h4>
        <ol>{(language==="ne"?theme.stepsNe:theme.stepsEn).map((step,index)=><li key={step}><span aria-hidden="true">{index+1}</span><span>{step}</span></li>)}</ol>
      </div>
      <div className="ap-pj-experience-trust">
        <h4>{copy.title}</h4><p>{copy.body}</p>
        {state==="existing" ? <a className="ap-pj-experience-action" href={feature.href}>{copy.action}<span aria-hidden="true">↗</span></a> :
        state==="reference" ? <a className="ap-pj-experience-action" href="/sources">{copy.action}<span aria-hidden="true">↗</span></a> :
        <a className="ap-pj-experience-action" href="#ap-pj-calculator">{copy.action}<span aria-hidden="true">↓</span></a>}
      </div>
    </div>
    {guide && <div className="ap-pj-experience-reference" aria-label={l(language,"यस विषयबारे जानकारी","About this topic")}>
      <div><h4 className="ap-pj-reference-heading"><FeatureGlyph featureId={feature.id} symbol="document" size="inline" />{l(language,"यो जानकारी कसरी बुझ्ने?","How to understand this information")}</h4><p>{l(language,guide.contextNe,guide.contextEn)}</p></div>
      <div><h4 className="ap-pj-reference-heading"><FeatureGlyph featureId={feature.id} symbol="shield" size="inline" />{l(language,"महत्त्वपूर्ण निर्णय गर्नुअघि","Before making an important decision")}</h4><p>{l(language,guide.nextNe,guide.nextEn)}</p></div>
    </div>}
    <div className="ap-pj-experience-next">
      <span>{l(language,"योसँग सम्बन्धित","You may also explore")}</span>
      <div>{next.map(item=><a key={item.id} href={item.href} onClick={(event)=>{ const local=item.href.split("#")[0]===feature.href.split("#")[0]; if(local && !event.defaultPrevented && event.button===0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey){event.preventDefault();onNavigate(item);} }}><FeatureGlyph featureId={item.id} size="inline" />{l(language,item.titleNe,item.titleEn)} <span aria-hidden="true">↗</span></a>)}</div>
    </div>
  </section>;
}
