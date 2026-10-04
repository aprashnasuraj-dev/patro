import { useEffect, useMemo, useState } from "react";
import { setPageTitle, toNepaliDigits } from "../title";
import { GOCHAR, periodForRashi, RASHIS, rashiBySlug, TONE_LABEL, todayNepal, type Rashi, type RashifalTone } from "./localRashifal";
import "./rashifal.css";

const PREF_KEY="aafnai:rashifal:rashi";
type Period="daily"|"weekly"|"monthly";
const PERIODS:{id:Period;label:string;days:number;caption:string}[]=[
  {id:"daily",label:"दैनिक",days:1,caption:"आजको चन्द्र गोचर"},
  {id:"weekly",label:"साप्ताहिक",days:7,caption:"आजदेखि ७ दिन"},
  {id:"monthly",label:"मासिक",days:30,caption:"आजदेखि ३० दिन"}
];

function dateLabel(iso:string){
  return new Intl.DateTimeFormat("ne-NP",{timeZone:"Asia/Kathmandu",month:"short",day:"numeric",weekday:"short"}).format(new Date(`${iso}T06:15:00Z`));
}
function toneClass(tone:RashifalTone){return `is-${tone}`}
function signFromStored(value:string|null){return RASHIS.find(r=>r.slug===value)||null}

export function RashifalPage({initialSign}:{initialSign?:string}={}){
  const today=useMemo(todayNepal,[]);
  const routeSign=useMemo(()=>rashiBySlug(initialSign),[initialSign]);
  const[period,setPeriod]=useState<Period>("daily");
  const[selected,setSelected]=useState<Rashi|null>(routeSign);
  const[remember,setRemember]=useState(false);
  const[personalOnly,setPersonalOnly]=useState(Boolean(routeSign));

  useEffect(()=>{
    setPageTitle(routeSign?`${routeSign.ne} राशिफल`:"राशिफल");
    if(routeSign){setSelected(routeSign);setPersonalOnly(true);return}
    try{
      const saved=signFromStored(localStorage.getItem(PREF_KEY));
      if(saved){setSelected(saved);setRemember(true)}
    }catch{}
  },[routeSign]);
  useEffect(()=>{
    if(!remember||!selected)return;
    try{localStorage.setItem(PREF_KEY,selected.slug)}catch{}
  },[remember,selected]);

  const periodInfo=PERIODS.find(item=>item.id===period)||PERIODS[0];
  const moonToday=periodForRashi(0,today,1).days[0].moonRashi;
  const visible=personalOnly&&selected?[selected]:RASHIS;

  const choose=(slug:string)=>{
    const sign=signFromStored(slug);
    setSelected(sign);
    if(!sign){setPersonalOnly(false);if(remember){setRemember(false);try{localStorage.removeItem(PREF_KEY)}catch{}}}
  };
  const toggleRemember=(next:boolean)=>{
    setRemember(next);
    if(!next){try{localStorage.removeItem(PREF_KEY)}catch{}}
    else if(selected){try{localStorage.setItem(PREF_KEY,selected.slug)}catch{}}
  };

  return <main className="rf-page ap-page">
    <header className="rf-hero">
      <div><span className="rf-kicker">परम्परागत चन्द्र गोचर</span><h1>{routeSign?`${routeSign.ne} राशिफल`:"राशिफल"}</h1><p>आजको चन्द्र राशिलाई जन्मराशिबाट पर्ने भावसँग मिलाएर तयार गरिएको स्थानीय, निर्धार्य गोचर व्याख्या। इन्टरनेट नहुँदा पनि चल्छ।</p></div>
      <div className="rf-moon"><small>आज चन्द्रमा</small><b>{RASHIS[moonToday].symbol} {RASHIS[moonToday].ne}</b><span>{RASHIS[moonToday].en}</span></div>
    </header>

    <section className="rf-controls" aria-label="राशिफल छनोट">
      <div className="rf-periods" role="tablist" aria-label="अवधि">
        {PERIODS.map(item=><button type="button" role="tab" aria-selected={period===item.id} className={period===item.id?"is-active":""} onClick={()=>setPeriod(item.id)} key={item.id}>{item.label}</button>)}
      </div>
      <div className="rf-personal">
        <label><span>मेरो राशि <small>(ऐच्छिक)</small></span><select value={selected?.slug||""} onChange={event=>choose(event.target.value)}><option value="">राशि छान्नुहोस्</option>{RASHIS.map(r=><option value={r.slug} key={r.slug}>{r.symbol} {r.ne} · {r.en}</option>)}</select></label>
        <label className="rf-check"><input type="checkbox" checked={remember} disabled={!selected} onChange={event=>toggleRemember(event.target.checked)}/><span>यो ब्राउजरमा सम्झनुहोस्</span></label>
        {selected?<button type="button" className="rf-focus" aria-pressed={personalOnly} onClick={()=>setPersonalOnly(value=>!value)}>{personalOnly?"सबै राशि हेर्नुहोस्":"मेरो राशि मात्र"}</button>:null}
      </div>
      <p className="rf-period-caption"><b>{periodInfo.label}</b> · {periodInfo.caption}</p>
    </section>

    <section className={`rf-grid${personalOnly&&selected?" is-personal":""}`} aria-live="polite">
      {visible.map(rashi=>{
        const summary=periodForRashi(rashi.index,today,periodInfo.days);
        const current=summary.days[0];
        const personal=selected?.index===rashi.index;
        return <article className={`rf-card ${toneClass(current.tone)}${personal?" is-saved":""}`} key={rashi.slug}>
          <header><span className="rf-symbol" aria-hidden="true">{rashi.symbol}</span><div><h2>{rashi.ne}</h2><small>{rashi.en}</small></div><span className={`rf-tone ${toneClass(current.tone)}`}>{TONE_LABEL[current.tone].ne}</span></header>
          <p className="rf-reading">{current.ne}</p>
          <p className="rf-house">चन्द्र गोचर · जन्मराशिबाट {toNepaliDigits(current.house)} औँ भाव</p>
          {period!=="daily"?<div className="rf-counts" aria-label={`${periodInfo.label} सार`}><span className="is-good">अनुकूल <b>{toNepaliDigits(summary.counts.good)}</b></span><span className="is-mid">सामान्य <b>{toNepaliDigits(summary.counts.mid)}</b></span><span className="is-bad">सतर्क <b>{toNepaliDigits(summary.counts.bad)}</b></span></div>:null}
          {period!=="daily"&&personal?<details className="rf-timeline"><summary>{periodInfo.label} दिन-दिनै हेर्नुहोस्</summary><div>{summary.days.map(day=><div key={day.date}><time>{dateLabel(day.date)}</time><span className={toneClass(day.tone)}>{TONE_LABEL[day.tone].ne}</span><p>{day.ne}</p></div>)}</details>:null}
          {!personalOnly?<a className="rf-sign-link" href={`/rashifal/${rashi.slug}`}>{rashi.ne} मात्र हेर्नुहोस् →</a>:null}
        </article>
      })}
    </section>

    <section className="rf-method">
      <h2>यो कसरी गणना हुन्छ?</h2>
      <p>आफ्नै पात्रोले चन्द्रमाको निरयण (sidereal) स्थिति स्थानीय रूपमा गणना गर्छ। त्यसपछि चन्द्रमा तपाईंको जन्मराशिबाट कुन भावमा छ भन्ने आधारमा परम्परागत १२ गोचर व्याख्यामध्ये निश्चित पाठ देखाइन्छ। एउटै मिति र राशि दिएमा नतिजा सधैं एउटै हुन्छ; कुनै AI ले भविष्यवाणी लेख्दैन।</p>
      <div className="rf-legend">{GOCHAR.map((item,index)=><span className={toneClass(item.tone)} key={index}>{toNepaliDigits(index+1)} भाव · {TONE_LABEL[item.tone].ne}</span>)}</div>
      <p className="rf-disclaimer"><strong>नोट:</strong> यो सांस्कृतिक/परम्परागत ज्योतिषीय सामग्री हो, वैज्ञानिक भविष्यवाणी वा स्वास्थ्य, कानुनी, आर्थिक वा अन्य पेशागत सल्लाह होइन।</p>
    </section>
  </main>;
}

export default RashifalPage;
