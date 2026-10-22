import type { PatroFeature, FeatureGroupId } from "./catalog";
import { getFeatureAvailability, getFeaturesForGroup } from "./catalog";
import { l } from "../useUiLanguage";
import { FEATURE_REFERENCE_GUIDES } from "./feature-reference-guides";

type Lang = "ne" | "en";
type Props = {
  feature: PatroFeature;
  language: Lang;
  group: FeatureGroupId;
  onNavigate: (feature: PatroFeature) => void;
};
const DESIGN: Record<FeatureGroupId,{symbol:string;captionNe:string;captionEn:string;stepsNe:[string,string,string];stepsEn:[string,string,string];metricNe:string;metricEn:string}> = {
  panchang: {
    symbol:"☀",captionNe:"सूर्योदयबाट सुरु हुने नेपालको दिन",captionEn:"A Nepal day beginning at sunrise",
    stepsNe:["मिति छान्नुहोस्","तिथि तथा समय हेर्नुहोस्","स्रोत र गणना छुट्याउनुहोस्"],
    stepsEn:["Choose your date","Explore the elements and timings","Distinguish source from calculation"],
    metricNe:"नेपाल समय · NPT",metricEn:"Nepal Standard Time · NPT"
  },
  muhurat: {
    symbol:"✺",captionNe:"दिनमानका आधारमा समय-अन्वेषण",captionEn:"An exploration of daylight-based time",
    stepsNe:["मिति र अवधि छान्नुहोस्","स्थानीय समयखण्ड हेर्नुहोस्","प्रकाशित साइत पुष्टि गर्नुहोस्"],
    stepsEn:["Choose date and range","Explore local time windows","Verify published Muhurat"],
    metricNe:"स्थान · काठमाडौं",metricEn:"Location · Kathmandu"
  },
  jyotish: {
    symbol:"✧",captionNe:"आफ्नो विद्यमान जन्मपत्रोबाट",captionEn:"From your existing birth chart",
    stepsNe:["विद्यमान चिना खोल्नुहोस्","समय तथा स्थान जाँच्नुहोस्","सम्बन्धित गणना बुझ्नुहोस्"],
    stepsEn:["Open your existing chart","Verify birth time and place","Explore the calculation"],
    metricNe:"अर्को प्रोफाइल चाहिँदैन",metricEn:"No additional profile"
  },
  planets: {
    symbol:"◎",captionNe:"आकाशीय गति, ग्रह र समय",captionEn:"Celestial motion, planets and time",
    stepsNe:["गणना मिति छान्नुहोस्","चाहिएको घटना खोज्नुहोस्","पद्धति र सीमाहरू पढ्नुहोस्"],
    stepsEn:["Choose an evaluation date","Find your selected event","Read the method and limits"],
    metricNe:"उपकरणमा स्थानीय गणना",metricEn:"Locally calculated in your browser"
  },
  "nepal-calendar": {
    symbol:"▦",captionNe:"नेपालका संवत् र समुदाय",captionEn:"Nepal's calendar traditions",
    stepsNe:["संवत् वा समुदाय छान्नुहोस्","विद्यमान पात्रो खोल्नुहोस्","स्थानीय स्रोत हेर्नुहोस्"],
    stepsEn:["Choose a calendar or community","Open the existing calendar","Review local sources"],
    metricNe:"परम्परा अलग, स्रोत स्पष्ट",metricEn:"Distinct traditions, clear sources"
  }
};
export const FEATURE_SYMBOL: Record<string,string> = {
  F001:"☾",
  F002:"◐",
  F003:"◷",
  F004:"✧",
  F005:"✺",
  F006:"◇",
  F007:"☉",
  F008:"◒",
  F009:"◉",
  F010:"⌁",
  F011:"≋",
  F012:"◷",
  F013:"☀",
  F014:"☽",
  F015:"◴",
  F016:"◶",
  F017:"◵",
  F018:"✦",
  F019:"✳",
  F020:"◐",
  F021:"✴",
  F022:"✧",
  F023:"◇",
  F024:"✴",
  F025:"☼",
  F026:"☾",
  F027:"✧",
  F028:"✦",
  F029:"✳",
  F030:"◇",
  F031:"◉",
  F032:"◎",
  F033:"♄",
  F034:"☽",
  F035:"✧",
  F036:"△",
  F037:"☉",
  F038:"♂",
  F039:"◇",
  F040:"☾",
  F041:"◯",
  F042:"◷",
  F043:"✿",
  F044:"◎",
  F045:"✺",
  F046:"◎",
  F047:"↗",
  F048:"✧",
  F049:"⊙",
  F050:"◇",
  F051:"↺",
  F052:"☉",
  F053:"◎",
  F054:"✴",
  F069:"☽",
  F070:"◉",
  F071:"◐",
  F072:"☼",
  F073:"☀",
  F074:"☼",
  F075:"☾",
  F076:"◎",
  F077:"☉",
  F078:"↺",
  F079:"✿",
  F055:"✦",
  F056:"⌂",
  F057:"◇",
  F058:"▦",
  F059:"✴",
  F060:"✧",
  F061:"✷",
  F062:"◇",
  F063:"✳",
  F064:"☀",
  F065:"✴",
  F066:"☼",
  F067:"◷",
  F068:"☾",
  F080:"▦",
  F081:"✺",
  F082:"☀",
  F083:"◷",
  F084:"✴",
  F085:"✿",
  F086:"◒",
  F087:"▤",
  F088:"◐",
  F089:"✧",
  F090:"⌂",
  F091:"♫"
};
function stateCopy(feature:PatroFeature, language:Lang) {
  const state=getFeatureAvailability(feature);
  if(state==="existing")return {
    label:l(language,"विद्यमान सुविधा","Existing AafnaiPatro tool"),
    title:l(language,"उही भरपर्दो उपकरण, नयाँ प्रवेशमार्ग","The same tool, easier to find"),
    body:l(language,"तपाईंलाई यही सुविधा भएको विद्यमान पेजमा लैजान्छ। गणना, सेटिङ वा सुरक्षित विवरणको अर्को प्रति यहाँ बनाइएको छैन।","Opens the existing feature without duplicating its engine, settings or saved details."),
    action:l(language,"मूल उपकरण खोल्नुहोस्","Open existing tool")
  };
  if(state==="reference")return {
    label:l(language,"स्रोत जाँच बाँकी","Source review pending"),
    title:l(language,"परम्पराको जानकारी र गणना फरक राखिएको छ","Reference first; no invented results"),
    body:l(language,"यस विषयको नियम वा प्रकाशित मिति पुष्टि नभएसम्म यहाँ कुनै निश्चित व्यक्तिगत नतिजा, साइत वा पर्व-मिति देखाइँदैन। उपलब्ध सन्दर्भ र सम्बन्धित उपकरण मात्र अन्वेषण गर्नुहोस्।","Until its rules or published dates have been verified, this experience will not invent a definitive personal result, Muhurat or festival date. Explore the available context and related tools."),
    action:l(language,"सम्बन्धित स्रोत हेर्नुहोस्","Explore related sources")
  };
  return {
    label:l(language,"ब्राउजरमा गणना","Calculated in your browser"),
    title:l(language,"तपाईंले छानेको सुविधा तल खुल्छ","Explore your selected feature below"),
    body:l(language,"आफ्नै पात्रोको हालको गणना विधिमा आधारित यो दृश्य प्राविधिक तथा स्रोत समीक्षा पूरा नभएसम्म पूर्वावलोकनकै रूपमा बुझ्नुहोस्।","This view uses AafnaiPatro's existing calculation method and remains a preview until numerical and source validation is complete."),
    action:l(language,"गणना कार्यक्षेत्र हेर्नुहोस्","Explore calculation workspace")
  };
}

export function FeatureExperience({feature,language,group,onNavigate}:Props){
  const theme=DESIGN[group];
  const copy=stateCopy(feature,language);
  const state=getFeatureAvailability(feature);
  const guide=state==="reference" ? FEATURE_REFERENCE_GUIDES[feature.id] : undefined;
  const next=getFeaturesForGroup(group).filter(item=>item.id!==feature.id).slice(0,3);
  const label=l(language,feature.titleNe,feature.titleEn);
  return <section className={"ap-pj-experience ap-pj-experience--"+group} aria-label={label} data-feature-id={feature.id}>
    <div className="ap-pj-experience-top">
      <div className="ap-pj-experience-art" aria-hidden="true">
        <div className="ap-pj-experience-orbit ap-pj-experience-orbit--outer"/>
        <div className="ap-pj-experience-orbit ap-pj-experience-orbit--inner"/>
        <div className="ap-pj-experience-orbit ap-pj-experience-orbit--center">{FEATURE_SYMBOL[feature.id]||theme.symbol}</div>
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
      <div><h4>{l(language,"यो किन फरक छ?","What makes this distinct?")}</h4><p>{l(language,guide.contextNe,guide.contextEn)}</p></div>
      <div><h4>{l(language,"मिति वा नतिजा देखाउनुअघि","Before dates or results can be published")}</h4><p>{l(language,guide.nextNe,guide.nextEn)}</p></div>
    </div>}
    <div className="ap-pj-experience-next">
      <span>{l(language,"योसँग सम्बन्धित","You may also explore")}</span>
      <div>{next.map(item=><a key={item.id} href={item.href} onClick={()=>onNavigate(item)}>{l(language,item.titleNe,item.titleEn)} <span aria-hidden="true">↗</span></a>)}</div>
    </div>
  </section>;
}
