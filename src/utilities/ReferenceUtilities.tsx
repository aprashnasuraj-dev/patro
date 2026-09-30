import { useEffect, useMemo, useState, type ReactNode } from "react";

export type ReferenceUtilityId = "calc" | "age" | "clock" | "forex" | "gold" | "emi" | "vat" | "units" | "words";

const REFERENCE_UTILITY_IDS = new Set<ReferenceUtilityId>(["calc","age","clock","forex","gold","emi","vat","units","words"]);
export function isReferenceUtilityId(value: unknown): value is ReferenceUtilityId {
  return typeof value === "string" && REFERENCE_UTILITY_IDS.has(value as ReferenceUtilityId);
}

const DAY = 86_400_000;
function parseDate(value: string) {
  const [y,m,d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y,m-1,d));
  return Number.isFinite(date.getTime()) ? date : null;
}
function isoDate(date: Date) {
  return [date.getUTCFullYear(),String(date.getUTCMonth()+1).padStart(2,"0"),String(date.getUTCDate()).padStart(2,"0")].join("-");
}
function todayKathmandu() {
  const parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const get=(type:string)=>parts.find(x=>x.type===type)?.value||"";
  return get("year")+"-"+get("month")+"-"+get("day");
}
function daysInMonth(year:number, month0:number) {
  return new Date(Date.UTC(year,month0+1,0)).getUTCDate();
}
function addMonthsClamped(date: Date, months: number) {
  const y=date.getUTCFullYear(), m=date.getUTCMonth(), d=date.getUTCDate();
  const target=new Date(Date.UTC(y,m+months,1));
  target.setUTCDate(Math.min(d,daysInMonth(target.getUTCFullYear(),target.getUTCMonth())));
  return target;
}
function addYearsClamped(date: Date, years: number) {
  const target=new Date(Date.UTC(date.getUTCFullYear()+years,date.getUTCMonth(),1));
  target.setUTCDate(Math.min(date.getUTCDate(),daysInMonth(target.getUTCFullYear(),target.getUTCMonth())));
  return target;
}
function calendarDifference(a: Date,b: Date) {
  let start=a,end=b,sign=1;
  if(start>end){start=b;end=a;sign=-1;}
  let years=end.getUTCFullYear()-start.getUTCFullYear();
  let anchor=addYearsClamped(start,years);
  if(anchor>end){years--;anchor=addYearsClamped(start,years);}
  let months=0;
  while(months<11){
    const next=addMonthsClamped(anchor,months+1);
    if(next>end)break;
    months++;
  }
  anchor=addMonthsClamped(anchor,months);
  const days=Math.floor((end.getTime()-anchor.getTime())/DAY);
  return {years,months,days,totalDays:Math.floor((end.getTime()-start.getTime())/DAY),sign};
}
function money(value:number){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"NPR",maximumFractionDigits:2}).format(Number.isFinite(value)?value:0);}

function Panel({title,eyebrow,children}:{title:string;eyebrow:string;children:ReactNode}) {
  return <section className="ref-tool-card">
    <header><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><span className="ref-tool-local">Runs on device</span></header>
    <div className="ref-tool-body">{children}</div>
  </section>;
}
function DateCalculator(){
  const today=useMemo(todayKathmandu,[]);
  const plus100=useMemo(()=>{const d=parseDate(today)!;d.setUTCDate(d.getUTCDate()+100);return isoDate(d);},[today]);
  const [from,setFrom]=useState(today),[to,setTo]=useState(plus100),[base,setBase]=useState(today),[offset,setOffset]=useState("100");
  const diff=useMemo(()=>{const a=parseDate(from),b=parseDate(to);return a&&b?calendarDifference(a,b):null;},[from,to]);
  const shifted=useMemo(()=>{const d=parseDate(base);if(!d)return null;d.setUTCDate(d.getUTCDate()+(Number(offset)||0));return isoDate(d);},[base,offset]);
  return <Panel eyebrow="मिति र समय · Dates & time" title="दिन गणना · Date calculator">
    <div className="ref-tool-section"><h3>दुई मितिबीचको अन्तर · Days between dates</h3><div className="ref-tool-grid two">
      <label>सुरु मिति · From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
      <label>अन्तिम मिति · To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
    </div>{diff&&<div className="ref-result"><strong>{diff.totalDays.toLocaleString("en-IN")} days</strong><span>{diff.years} years · {diff.months} months · {diff.days} days · {Math.floor(diff.totalDays/7)} weeks {diff.totalDays%7} days{diff.sign<0?" · second date is earlier":""}</span></div>}</div>
    <div className="ref-tool-section"><h3>दिन जोड्नुहोस् वा घटाउनुहोस् · Add or subtract days</h3><div className="ref-tool-grid two">
      <label>आधार मिति · Start date<input type="date" value={base} onChange={e=>setBase(e.target.value)}/></label>
      <label>दिन · Days<input type="number" value={offset} onChange={e=>setOffset(e.target.value)} placeholder="100"/></label>
    </div>{shifted&&<div className="ref-result"><strong>{shifted}</strong><span>{Number(offset)>=0?"+":""}{Number(offset)||0} days</span></div>}</div>
  </Panel>;
}
function AgeCalculator(){
  const today=useMemo(todayKathmandu,[]);
  const [birth,setBirth]=useState("1995-01-01"),[asOf,setAsOf]=useState(today);
  const result=useMemo(()=>{
    const b=parseDate(birth),a=parseDate(asOf);if(!b||!a||b>a)return null;
    const d=calendarDifference(b,a);
    let next=new Date(Date.UTC(a.getUTCFullYear(),b.getUTCMonth(),Math.min(b.getUTCDate(),daysInMonth(a.getUTCFullYear(),b.getUTCMonth()))));
    if(next<a) next=new Date(Date.UTC(a.getUTCFullYear()+1,b.getUTCMonth(),Math.min(b.getUTCDate(),daysInMonth(a.getUTCFullYear()+1,b.getUTCMonth()))));
    return {...d,nextBirthday:isoDate(next),nextIn:Math.ceil((next.getTime()-a.getTime())/DAY)};
  },[birth,asOf]);
  return <Panel eyebrow="मिति र समय · Dates & time" title="उमेर गणक · Age calculator">
    <div className="ref-tool-grid two"><label>जन्म मिति · Date of birth<input type="date" value={birth} onChange={e=>setBirth(e.target.value)}/></label><label>यो मितिसम्म · As of<input type="date" value={asOf} onChange={e=>setAsOf(e.target.value)}/></label></div>
    {result?<div className="ref-result ref-result-large"><strong>{result.years} years {result.months} months {result.days} days</strong><span>{result.totalDays.toLocaleString("en-IN")} days lived in this interval · next birthday {result.nextBirthday} ({result.nextIn} days)</span></div>:<p className="ref-tool-note">Birth date must be on or before the comparison date.</p>}
  </Panel>;
}

const CITIES=[
  ["Kathmandu","Asia/Kathmandu"],["Tokyo","Asia/Tokyo"],["Delhi","Asia/Kolkata"],["Dubai","Asia/Dubai"],["Doha","Asia/Qatar"],
  ["Seoul","Asia/Seoul"],["London","Europe/London"],["New York","America/New_York"],["Toronto","America/Toronto"],["Sydney","Australia/Sydney"]
] as const;
function formatInZone(date:Date,tz:string,opts?:Intl.DateTimeFormatOptions){
  return new Intl.DateTimeFormat("en-GB",{timeZone:tz,weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:false,...opts}).format(date);
}
function WorldClock(){
  const [now,setNow]=useState(()=>new Date()),[planMinutes,setPlanMinutes]=useState(18*60);
  useEffect(()=>{const id=window.setInterval(()=>setNow(new Date()),1000);return()=>window.clearInterval(id);},[]);
  const plan=useMemo(()=>{
    const ktm=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
    const base=parseDate(ktm)!;base.setUTCHours(0,0,0,0);
    const utc=base.getTime()+(planMinutes-345)*60_000;
    return new Date(utc);
  },[now,planMinutes]);
  return <Panel eyebrow="मिति र समय · Dates & time" title="विश्व घडी · World clock">
    <div className="ref-clock-grid">{CITIES.map(([city,tz])=><article key={tz}><span>{city}</span><strong>{new Intl.DateTimeFormat("en-GB",{timeZone:tz,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(now)}</strong><small>{new Intl.DateTimeFormat("en-GB",{timeZone:tz,weekday:"short",day:"2-digit",month:"short"}).format(now)}</small></article>)}</div>
    <div className="ref-tool-section"><h3>घर फोन गर्ने समय · Plan a call home</h3><label>Nepal time: <strong>{String(Math.floor(planMinutes/60)).padStart(2,"0")}:{String(planMinutes%60).padStart(2,"0")}</strong><input type="range" min="0" max="1425" step="15" value={planMinutes} onChange={e=>setPlanMinutes(Number(e.target.value))}/></label>
      <div className="ref-call-grid">{CITIES.filter(x=>x[1]!=="Asia/Kathmandu").map(([city,tz])=>{const hour=Number(new Intl.DateTimeFormat("en-GB",{timeZone:tz,hour:"2-digit",hour12:false}).format(plan).slice(0,2));const sleep=hour>=22||hour<7;return <span className={sleep?"is-sleep":""} key={tz}><b>{city}</b>{formatInZone(plan,tz,{weekday:undefined,day:undefined,month:undefined})}{sleep?" · likely sleeping":""}</span>})}</div>
    </div>
  </Panel>;
}

type FxRow={asset:string;as_of:string;buy:number;sell:number;per:number;source_label:string;source_url:string};
function ForexTool(){
  const [rows,setRows]=useState<FxRow[]>([]),[error,setError]=useState(""),[currency,setCurrency]=useState("USD"),[amount,setAmount]=useState("100"),[direction,setDirection]=useState<"foreign-to-npr"|"npr-to-foreign">("foreign-to-npr");
  useEffect(()=>{
    const c=new AbortController();
    const load=async()=>{
      try{
        const live=await fetch("/api/v1/markets/latest?kind=forex",{signal:c.signal,headers:{Accept:"application/json"}});
        const body=await live.json();
        if(!live.ok||!Array.isArray(body?.items))throw new Error(body?.error||"Forex API unavailable");
        setRows(body.items);setError("");return;
      }catch(error){
        if((error as any)?.name==="AbortError")return;
      }
      try{
        const fallback=await fetch("/data/market/forex-latest.json",{signal:c.signal,headers:{Accept:"application/json"}});
        const body=await fallback.json();
        if(!fallback.ok||!Array.isArray(body?.items))throw new Error("Forex fallback unavailable");
        setRows(body.items);setError("Live D1 endpoint unavailable — showing the latest verified migration snapshot.");
      }catch(error){
        if((error as any)?.name!=="AbortError")setError("Forex data unavailable. No unverified rates are shown.");
      }
    };
    void load();
    return()=>c.abort();
  },[]);
  const row=rows.find(x=>x.asset===currency)||rows[0];
  const result=useMemo(()=>{if(!row)return null;const a=Math.max(0,Number(amount)||0),per=Number(row.per)||1;return direction==="foreign-to-npr"?a*Number(row.buy)/per:a/(Number(row.sell)/per);},[row,amount,direction]);
  const preferred=["USD","EUR","GBP","AUD","CAD","JPY","CNY","INR","AED","QAR","SAR","KRW"];
  return <Panel eyebrow="पैसा र बजार · Money & markets" title="विदेशी मुद्रा · Forex rates">
    {error&&<p className="ref-tool-warning">{error}</p>}
    <div className="ref-tool-grid three"><label>रकम · Amount<input type="number" min="0" step="any" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Currency<select value={currency} onChange={e=>setCurrency(e.target.value)}>{rows.filter(r=>preferred.includes(r.asset)).map(r=><option key={r.asset}>{r.asset}</option>)}</select></label><label>Direction<select value={direction} onChange={e=>setDirection(e.target.value as typeof direction)}><option value="foreign-to-npr">Foreign → NPR</option><option value="npr-to-foreign">NPR → Foreign</option></select></label></div>
    {row&&result!=null&&<div className="ref-result ref-result-large"><strong>{direction==="foreign-to-npr"?money(result):result.toLocaleString("en-IN",{maximumFractionDigits:4})+" "+row.asset}</strong><span>{row.per} {row.asset} = NPR {direction==="foreign-to-npr"?row.buy:row.sell} · {direction==="foreign-to-npr"?"NRB buying":"NRB selling"} rate · {row.as_of}</span></div>}
    {rows.length>0&&<div className="ref-table-wrap"><table><thead><tr><th>Currency</th><th>Per</th><th>Buy</th><th>Sell</th></tr></thead><tbody>{rows.filter(r=>preferred.includes(r.asset)).sort((a,b)=>preferred.indexOf(a.asset)-preferred.indexOf(b.asset)).map(r=><tr key={r.asset}><td><strong>{r.asset}</strong></td><td>{r.per}</td><td>{r.buy}</td><td>{r.sell}</td></tr>)}</tbody></table></div>}
    {row&&<p className="ref-tool-note">Source: {row.source_label}. Latest migrated snapshot is served from Cloudflare D1; no rate is fabricated when data is unavailable.</p>}
  </Panel>;
}

function GoldTool(){
  const TOLA_G=11.6638038;
  const [rate,setRate]=useState(""),[weight,setWeight]=useState("1"),[unit,setUnit]=useState<"tola"|"lal"|"g"|"10g">("tola"),[making,setMaking]=useState("0"),[tax,setTax]=useState("0");
  const result=useMemo(()=>{
    const r=Math.max(0,Number(rate)||0),w=Math.max(0,Number(weight)||0);
    const tola=unit==="tola"?w:unit==="lal"?w/100:unit==="g"?w/TOLA_G:w*10/TOLA_G;
    const metal=tola*r,mc=metal*(Number(making)||0)/100,tx=(metal+mc)*(Number(tax)||0)/100;
    return{tola,grams:tola*TOLA_G,metal,making:mc,tax:tx,total:metal+mc+tx};
  },[rate,weight,unit,making,tax]);
  return <Panel eyebrow="पैसा र बजार · Money & markets" title="सुनचाँदी हिसाब · Gold calculator">
    <p className="ref-tool-warning">The current verified market dataset contains NRB forex and NEPSE, but no verified live gold/silver feed. Enter a current trusted per-tola rate; MeroPatro will calculate weight, making charge and tax without inventing a price.</p>
    <div className="ref-tool-grid three"><label>प्रति तोला दर · Rate per tola (Rs)<input type="number" min="0" step="any" value={rate} onChange={e=>setRate(e.target.value)} placeholder="Enter verified current rate"/></label><label>तौल · Weight<input type="number" min="0" step="any" value={weight} onChange={e=>setWeight(e.target.value)}/></label><label>Unit<select value={unit} onChange={e=>setUnit(e.target.value as typeof unit)}><option value="tola">तोला · Tola</option><option value="lal">लाल · Lal</option><option value="g">ग्राम · Gram</option><option value="10g">10 gram units</option></select></label></div>
    <div className="ref-tool-grid two" style={{marginTop:12}}><label>Making charge %<input type="number" min="0" step="any" value={making} onChange={e=>setMaking(e.target.value)}/></label><label>Tax / other charge %<input type="number" min="0" step="any" value={tax} onChange={e=>setTax(e.target.value)}/></label></div>
    <div className="ref-result ref-result-large"><strong>{rate?money(result.total):"Enter a rate"}</strong><span>{result.tola.toFixed(4)} tola · {result.grams.toFixed(3)} g{rate?" · metal "+money(result.metal)+" · making "+money(result.making)+" · tax "+money(result.tax):""}</span></div>
  </Panel>;
}

function EmiCalculator(){
  const [principal,setPrincipal]=useState("2500000"),[rate,setRate]=useState("11"),[years,setYears]=useState("10");
  const result=useMemo(()=>{const P=Math.max(0,Number(principal)||0),R=Math.max(0,Number(rate)||0),n=Math.max(1,Math.round((Number(years)||0)*12)),r=R/1200;const emi=r?P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1):P/n,total=emi*n,interest=total-P;let bal=P;const schedule=[] as {year:number,principal:number,interest:number,balance:number}[];for(let yr=1;yr<=Math.ceil(n/12);yr++){let pp=0,ii=0;for(let m=0;m<12&&bal>0.005;m++){const it=bal*r,pr=Math.min(Math.max(0,emi-it),bal);ii+=it;pp+=pr;bal-=pr;}schedule.push({year:yr,principal:pp,interest:ii,balance:Math.max(0,bal)});}return{emi,total,interest,n,schedule};},[principal,rate,years]);
  return <Panel eyebrow="पैसा र बजार · Money" title="कर्जा EMI · Loan EMI">
    <div className="ref-tool-grid three"><label>कर्जा रकम · Loan amount (Rs)<input type="number" min="0" step="1000" value={principal} onChange={e=>setPrincipal(e.target.value)}/></label><label>वार्षिक ब्याजदर · Rate %<input type="number" min="0" step="0.01" value={rate} onChange={e=>setRate(e.target.value)}/></label><label>अवधि · Years<input type="number" min="0.5" step="0.5" value={years} onChange={e=>setYears(e.target.value)}/></label></div>
    <div className="ref-result ref-result-large"><strong>{money(result.emi)} / month</strong><span>Total interest {money(result.interest)} · total payment {money(result.total)} · {result.n} instalments</span></div>
    <div className="ref-table-wrap"><table><thead><tr><th>Year</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead><tbody>{result.schedule.map(r=><tr key={r.year}><td>{r.year}</td><td>{money(r.principal)}</td><td>{money(r.interest)}</td><td>{money(r.balance)}</td></tr>)}</tbody></table></div>
  </Panel>;
}
function VatPercent(){
  const [amount,setAmount]=useState("1000"),[rate,setRate]=useState("13"),[mode,setMode]=useState<"add"|"included">("add"),[percent,setPercent]=useState("15"),[percentAmount,setPercentAmount]=useState("1000"),[oldValue,setOldValue]=useState("100"),[newValue,setNewValue]=useState("150");
  const a=Number(amount)||0,r=Number(rate)||0,base=mode==="add"?a:a/(1+r/100),vat=base*r/100,total=base+vat;
  const p=Number(percent)||0,pa=Number(percentAmount)||0,old=Number(oldValue)||0,next=Number(newValue)||0,change=old?((next-old)/old)*100:0;
  return <Panel eyebrow="पैसा र बजार · Money" title="भ्याट र प्रतिशत · VAT & percent">
    <div className="ref-tool-section"><h3>VAT calculator</h3><div className="ref-tool-grid three"><label>Amount<input type="number" step="any" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>VAT rate %<input type="number" step="any" value={rate} onChange={e=>setRate(e.target.value)}/></label><label>Mode<select value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="add">Add VAT</option><option value="included">VAT included</option></select></label></div><div className="ref-result"><strong>{money(total)}</strong><span>Before tax {money(base)} + VAT {money(vat)}</span></div></div>
    <div className="ref-tool-section"><h3>Percent & change</h3><div className="ref-tool-grid four"><label>Percent<input type="number" step="any" value={percent} onChange={e=>setPercent(e.target.value)}/></label><label>Of amount<input type="number" step="any" value={percentAmount} onChange={e=>setPercentAmount(e.target.value)}/></label><label>Old value<input type="number" step="any" value={oldValue} onChange={e=>setOldValue(e.target.value)}/></label><label>New value<input type="number" step="any" value={newValue} onChange={e=>setNewValue(e.target.value)}/></label></div><div className="ref-result"><strong>{(pa*p/100).toLocaleString("en-IN",{maximumFractionDigits:2})}</strong><span>{p}% of {pa}; plus {(pa*(1+p/100)).toFixed(2)}, minus {(pa*(1-p/100)).toFixed(2)} · change {change>=0?"+":""}{change.toFixed(2)}%</span></div></div>
  </Panel>;
}

type UnitCategory="weight"|"grain"|"length";
const UNIT_GROUPS:Record<UnitCategory,{id:string;label:string;factor:number}[]>={
  weight:[{id:"tola",label:"तोला · Tola",factor:11.6638038},{id:"lal",label:"लाल · Lal",factor:0.116638038},{id:"g",label:"ग्राम · Gram",factor:1},{id:"kg",label:"किलोग्राम · Kilogram",factor:1000},{id:"oz",label:"आउन्स · Ounce",factor:28.3495231},{id:"lb",label:"पाउन्ड · Pound",factor:453.59237}],
  grain:[{id:"mana",label:"माना · Mana",factor:0.56826125},{id:"pathi",label:"पाथी · Pathi",factor:4.54609},{id:"muri",label:"मुरी · Muri",factor:90.9218},{id:"l",label:"लिटर · Litre",factor:1},{id:"ml",label:"मिलिलिटर · Millilitre",factor:0.001}],
  length:[{id:"haat",label:"हात · Haat",factor:0.4572},{id:"in",label:"इन्च · Inch",factor:0.0254},{id:"ft",label:"फिट · Foot",factor:0.3048},{id:"m",label:"मिटर · Metre",factor:1},{id:"km",label:"किलोमिटर · Kilometre",factor:1000},{id:"mi",label:"माइल · Mile",factor:1609.344}]
};
function TraditionalUnits(){
  const [category,setCategory]=useState<UnitCategory>("weight"),[unit,setUnit]=useState("tola"),[value,setValue]=useState("1");
  const units=UNIT_GROUPS[category];
  useEffect(()=>{if(!units.some(x=>x.id===unit))setUnit(units[0].id);},[category,unit,units]);
  const selected=units.find(x=>x.id===unit)||units[0],base=(Number(value)||0)*selected.factor;
  return <Panel eyebrow="नाप · Measures" title="नाप–तौल · Traditional units">
    <div className="ref-tool-tabs">{(["weight","grain","length"] as UnitCategory[]).map(c=><button key={c} className={category===c?"active":""} onClick={()=>setCategory(c)}>{c==="weight"?"तौल · Weight":c==="grain"?"माना–पाथी · Grain":"लम्बाइ · Length"}</button>)}</div>
    <div className="ref-tool-grid two"><label>परिमाण · Amount<input type="number" step="any" value={value} onChange={e=>setValue(e.target.value)}/></label><label>एकाइ · Unit<select value={unit} onChange={e=>setUnit(e.target.value)}>{units.map(x=><option value={x.id} key={x.id}>{x.label}</option>)}</select></label></div>
    <div className="ref-unit-grid">{units.map(x=><div key={x.id}><span>{x.label}</span><strong>{(base/x.factor).toLocaleString("en-IN",{maximumFractionDigits:6})}</strong></div>)}</div>
    <p className="ref-tool-note">Mana = 1 imperial pint, pathi = 8 mana, muri = 20 pathi; haat = 18 inches. Local customary measures can vary by place.</p>
  </Panel>;
}

const NW="शून्य एक दुई तीन चार पाँच छ सात आठ नौ दश एघार बाह्र तेह्र चौध पन्ध्र सोह्र सत्र अठार उन्नाइस बीस एक्काइस बाइस तेइस चौबिस पच्चिस छब्बिस सत्ताइस अट्ठाइस उनन्तिस तिस एकतिस बत्तिस तेत्तिस चौंतिस पैंतिस छत्तिस सैंतिस अठतिस उनन्चालिस चालिस एकचालिस बयालिस त्रिचालिस चवालिस पैंतालिस छयालिस सतचालिस अठचालिस उनन्चास पचास एकाउन्न बाउन्न त्रिपन्न चउन्न पचपन्न छपन्न सन्ताउन्न अन्ठाउन्न उनन्साठी साठी एकसट्ठी बयसट्ठी त्रिसट्ठी चौंसट्ठी पैंसट्ठी छयसट्ठी सतसट्ठी अठसट्ठी उनन्सत्तरी सत्तरी एकहत्तर बहत्तर त्रिहत्तर चौहत्तर पचहत्तर छयहत्तर सतहत्तर अठहत्तर उनासी असी एकासी बयासी त्रियासी चौरासी पचासी छयासी सतासी अठासी उनान्नब्बे नब्बे एकानब्बे बयानब्बे त्रियानब्बे चौरानब्बे पन्चानब्बे छयानब्बे सन्तानब्बे अन्ठानब्बे उनान्सय".split(" ");
function neWords(n:number):string{if(!n)return NW[0];const parts:string[]=[];for(const [v,w] of [[1e11,"खर्ब"],[1e9,"अर्ब"],[1e7,"करोड"],[1e5,"लाख"],[1e3,"हजार"],[100,"सय"]] as [number,string][])if(n>=v){const q=Math.floor(n/v);parts.push((q>=100?neWords(q):NW[q])+" "+w);n%=v;}if(n)parts.push(NW[n]);return parts.join(" ");}
const EO="zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" "),ETN=["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];
function en2(n:number){return n<20?EO[n]:ETN[Math.floor(n/10)]+(n%10?"-"+EO[n%10]:"");}
function enWords(n:number):string{if(!n)return"zero";const parts:string[]=[];for(const [v,w] of [[1e7,"crore"],[1e5,"lakh"],[1e3,"thousand"],[100,"hundred"]] as [number,string][])if(n>=v){const q=Math.floor(n/v);parts.push((q>=100?enWords(q):en2(q))+" "+w);n%=v;}if(n)parts.push((parts.length?"and ":"")+en2(n));return parts.join(" ");}
function titleCase(s:string){return s.replace(/\b[a-z]/g,c=>c.toUpperCase()).replace(/\bAnd\b/g,"and");}
function AmountWords(){
  const [amount,setAmount]=useState("125050.75");
  const parsed=useMemo(()=>{const raw=amount.replace(/[, ]/g,"");if(!/^\d{1,13}(\.\d{0,2})?$/.test(raw))return null;const [ip,fp=""]=raw.split(".");return{rupees:parseInt(ip,10),paisa:fp?parseInt((fp+"0").slice(0,2),10):0};},[amount]);
  const ne=parsed?neWords(parsed.rupees)+" रुपैयाँ"+(parsed.paisa?" "+neWords(parsed.paisa)+" पैसा":"")+" मात्र":"";
  const en=parsed?titleCase(enWords(parsed.rupees))+" Rupees"+(parsed.paisa?" and "+titleCase(enWords(parsed.paisa))+" Paisa":"")+" Only":"";
  const copy=async(text:string)=>{try{await navigator.clipboard.writeText(text);}catch{}};
  return <Panel eyebrow="भाषा र पाठ · Language & text" title="अंकलाई शब्दमा · Amount in words">
    <label className="ref-tool-wide">रकम (रु.) · Amount (Rs)<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
    {parsed?<><div className="ref-result ref-result-large"><span>नेपालीमा · In Nepali</span><strong>{ne}</strong><button onClick={()=>void copy(ne)}>Copy Nepali</button></div><div className="ref-result ref-result-large"><span>अङ्ग्रेजीमा · In English</span><strong>{en}</strong><button onClick={()=>void copy(en)}>Copy English</button></div></>:<p className="ref-tool-warning">Enter an amount up to 13 digits and at most 2 decimal places.</p>}
    <p className="ref-tool-note">For cheques, vouchers and documents using the lakh–crore numbering system.</p>
  </Panel>;
}

export function ReferenceUtilityTools({tool}:{tool:ReferenceUtilityId}){
  if(tool==="calc")return <DateCalculator/>;
  if(tool==="age")return <AgeCalculator/>;
  if(tool==="clock")return <WorldClock/>;
  if(tool==="forex")return <ForexTool/>;
  if(tool==="gold")return <GoldTool/>;
  if(tool==="emi")return <EmiCalculator/>;
  if(tool==="vat")return <VatPercent/>;
  if(tool==="units")return <TraditionalUnits/>;
  return <AmountWords/>;
}
