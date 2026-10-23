import { useEffect, useState } from "react";
import { l } from "../../useUiLanguage";
import { addIsoDays, calculateLocalDay, formatLocalTime, todayInNepal, validIsoDate } from "./shared";
import { MuhuratDayRibbon } from "./MuhuratDayRibbon";
import { FeatureGlyph } from "../FeatureGlyph";
import "./workspace.css";

type Props = { language: "ne" | "en"; selectedFeatureId?: string | null };
type MuhuratWindow = { date: string; sunrise: Date; sunset: Date; abhijit: { start: Date; end: Date }; rahu: { start: Date; end: Date }; yama: { start: Date; end: Date }; gulika: { start: Date; end: Date } };


export function MuhuratWorkspace({language}:Props){
  const [start,setStart]=useState(()=>{const from=typeof window!=="undefined"?new URLSearchParams(window.location.search).get("date"):null;return from&&validIsoDate(from)?from:todayInNepal()});
  const [days,setDays]=useState(7);
  const [showCautions,setShowCautions]=useState(true);
  const [windows,setWindows]=useState<MuhuratWindow[]>([]);
  const [windowsLoading,setWindowsLoading]=useState(false);
  const [windowsError,setWindowsError]=useState(false);
  useEffect(()=>{
    let active=true;
    if(!validIsoDate(start)){
      setWindows([]);
      setWindowsError(true);
      setWindowsLoading(false);
      return()=>{active=false;};
    }
    setWindows([]);
    setWindowsError(false);
    setWindowsLoading(true);
    (async()=>{
      try{
        const out:MuhuratWindow[]=[];
        for(let i=0;i<days;i++){
          if(!active)return;
          const date=addIsoDays(start,i);
          try{
            const r=calculateLocalDay(date);
            out.push({date,sunrise:r.day.sunrise,sunset:r.day.sunset,abhijit:r.windows.abhijit,rahu:r.windows.rahu,yama:r.windows.yamaganda,gulika:r.windows.gulika});
          }catch{
            // A day without local sunrise stays unavailable; never synthesize a time.
          }
          // Yield on mobile before calculating the next pair of civil days.
          if((i+1)%2===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
        }
        if(active)setWindows(out);
      }catch{
        if(active)setWindowsError(true);
      }finally{
        if(active)setWindowsLoading(false);
      }
    })();
    return()=>{active=false;};
  },[start,days]);

  return <div className="ap-pjw-root">
    <div className="ap-pjw-datebar">
      <label><span>{l(language,"सुरु मिति","Start date")}</span><input type="date" value={start} onChange={(event)=>setStart(event.target.value)}/></label>
      <label><span>{l(language,"खोज अवधि","Search window")}</span><select className="ap-pjw-select" value={days} onChange={(event)=>setDays(Number(event.target.value))}>{[1,3,7,14,30].map((n)=><option value={n} key={n}>{l(language,n+" दिन",n+" days")}</option>)}</select></label>
      <button className="ap-pjw-secondary" type="button" onClick={()=>setStart(todayInNepal())}>{l(language,"आज","Today")}</button>
    </div>
    <section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"स्थानीय दिनमानबाट निकालिएका समयखण्ड","Local daylight-based windows")}</h3><small>{l(language,"काठमाडौं · नेपाल समय","Kathmandu · Nepal time")}</small></div>
      <p className="ap-pjw-section-note">{l(language,"यो खोजले स्थानीय सूर्योदय र सूर्यास्तबाट अभिजित मुहूर्त तथा पारम्परिक सावधानी समयखण्ड निकाल्छ। यसले विवाह वा अन्य अनुष्ठानको आधिकारिक साइत आफैं घोषणा गर्दैन।", "This finder calculates Abhijit Muhurta and traditional caution intervals from local sunrise and sunset. It does not independently declare an official marriage or ritual date.")}</p>
      {windows[0] && <MuhuratDayRibbon day={windows[0]} language={language} showCautions={showCautions}/>}
      {windowsLoading?<p className="ap-pjw-section-note" role="status">{l(language,"स्थानीय समयखण्ड गणना हुँदैछन्…","Calculating local timing windows…")}</p>:windowsError?<p className="ap-pjw-error" role="alert">{l(language,"यो मिति गणना गर्न सकिएन। मान्य मिति छानेर पुनः प्रयास गर्नुहोस्।","This date could not be calculated. Choose a valid date and try again.")}</p>:windows.length===0?<div className="ap-pjw-empty">{l(language,"यस मितिमा सूर्योदय गणना उपलब्ध छैन।","No sunrise calculation is available for this date.")}</div>:<div className="ap-pjw-event-table-wrap"><table className="ap-pjw-event-table"><thead><tr><th scope="col">{l(language,"मिति","Date")}</th><th scope="col">{l(language,"सूर्योदय","Sunrise")}</th><th scope="col">{l(language,"अभिजित मुहूर्त","Abhijit Muhurta")}</th>{showCautions&&<><th scope="col">{l(language,"राहुकाल","Rahu Kalam")}</th><th scope="col">{l(language,"यमगण्ड","Yamaganda")}</th><th scope="col">{l(language,"गुलिक","Gulika")}</th></>}</tr></thead><tbody>{windows.map((item)=><tr key={item.date}><td><a href={"/date/"+item.date}>{new Intl.DateTimeFormat(language==="ne"?"ne-NP-u-nu-deva":"en-GB",{timeZone:"Asia/Kathmandu",day:"2-digit",month:"short",weekday:"short"}).format(new Date(item.date+"T12:00:00Z"))}</a></td><td>{formatLocalTime(item.sunrise,language)}</td><td><strong>{formatLocalTime(item.abhijit.start,language)} – {formatLocalTime(item.abhijit.end,language)}</strong></td>{showCautions&&<><td>{formatLocalTime(item.rahu.start,language)} – {formatLocalTime(item.rahu.end,language)}</td><td>{formatLocalTime(item.yama.start,language)} – {formatLocalTime(item.yama.end,language)}</td><td>{formatLocalTime(item.gulika.start,language)} – {formatLocalTime(item.gulika.end,language)}</td></>}</tr>)}</tbody></table></div>}
      <div className="ap-pjw-action-row"><label className="ap-pjw-check"><input type="checkbox" checked={showCautions} onChange={(event)=>setShowCautions(event.target.checked)}/><span>{l(language,"सावधानी समय पनि देखाउनुहोस्","Include caution intervals")}</span></label><a className="ap-pjw-primary" href="/tools/sait">{l(language,"साइत गणक खोल्नुहोस्","Open Sait finder")} ↗</a></div>
    </section>    <section className="ap-pjw-card">
      <div className="ap-pjw-subhead"><h3>{l(language,"जीवनका मुख्य साइत","Major life-event timing")}</h3></div>
      <p className="ap-pjw-section-note">{l(language,"उपलब्ध प्रकाशित मिति वा हालको साइत नियम जाँच्न विद्यमान उपकरण प्रयोग गर्नुहोस्। नयाँ पेजले पुरानो नियम वा जन्मपत्रो प्रतिस्थापन गर्दैन।","Use the existing tool to review published dates and currently supported Sait rules. This page does not replace the existing rules or birth chart.")}</p>
      <div className="ap-pjw-link-grid">
        <a className="ap-pjw-link-card" href="/tools/sait"><strong className="ap-pjw-icon-label"><FeatureGlyph featureId="F055" symbol="rings" size="inline"/>{l(language,"विवाह, गृह प्रवेश र सवारी साधन","Marriage, home entry and vehicle purchase")}</strong><small>{l(language,"उपलब्ध साइत नियम र स्रोतसहितको हालको उपकरण।","Existing Sait tool with supported categories and sources.")}</small><span>{l(language,"साइत खोल्नुहोस्","Open Sait")} ↗</span></a>
        <a className="ap-pjw-link-card" href="/tools/tithi-reminder"><strong className="ap-pjw-icon-label"><FeatureGlyph featureId="F068" symbol="moon-calendar" size="inline"/>{l(language,"तिथि रिमाइन्डर","Tithi reminder")}</strong><small>{l(language,"सामान्य तिथि-सूचना रिमाइन्डर; पारणको साइत गणना होइन।","General Tithi reminder; it does not calculate ritual Parana windows.")}</small><span>{l(language,"रिमाइन्डर खोल्नुहोस्","Open reminders")} ↗</span></a>
        <a className="ap-pjw-link-card" href="/janmapatro"><strong className="ap-pjw-icon-label"><FeatureGlyph featureId="F027" symbol="chart" size="inline"/>{l(language,"जन्मपत्रो","Birth chart")}</strong><small>{l(language,"जन्म समय र स्थानमा आधारित विद्यमान जन्मपत्रो।","Existing natal chart based on birth time and place.")}</small><span>{l(language,"जन्मपत्रो खोल्नुहोस्","Open birth chart")} ↗</span></a>
        <a className="ap-pjw-link-card" href="/mytime"><strong className="ap-pjw-icon-label"><FeatureGlyph featureId="F067" symbol="personal-time" size="inline"/>{l(language,"मेरो समय","My Time")}</strong><small>{l(language,"विद्यमान व्यक्तिगत समय अनुभव।","Existing personalized time experience.")}</small><span>{l(language,"खोल्नुहोस्","Open")} ↗</span></a>
      </div>
    </section>
    <p className="ap-pjw-method">{l(language,"यहाँ देखिएका घडी-समयहरू स्थानीय सूर्योदय र सूर्यास्तबाट ब्राउजरमै गणना हुन्छन्। परम्परागत नियमका लागि स्रोत र स्थानअनुसार पुष्टि आवश्यक रहन्छ।","The displayed windows are calculated in your browser from local sunrise and sunset. Tradition-specific dates still require source- and location-based verification.")}</p>
  </div>;
}
