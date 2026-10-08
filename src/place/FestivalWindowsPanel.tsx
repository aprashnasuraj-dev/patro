import { ReminderActions } from './ReminderActions';
import { lazy, Suspense, useState } from 'react';
import { approved,RITUAL_CONFIG,RITUAL_WINDOWS } from './ritual-config';
import { festivalWindows,officialSait,sankrantiAfter } from './festival-windows';
import { formatPlaceInstant } from './timing';
import type { SavedPlace } from './place';
const Prayer=lazy(()=>import('../patro-tools/communities/react/PrayerTimesCard').then(m=>({default:m.PrayerTimesCard})));
export default function FestivalWindowsPanel({date,place}:{date:string;place:SavedPlace}) {
 const [slug,setSlug]=useState('laxmi-puja'),[clock,setClock]=useState(''),[status,setStatus]=useState(''),[ramadan,setRamadan]=useState(false);
 const entry=RITUAL_CONFIG[slug],ready=approved(entry?.reviewer)&&approved(RITUAL_WINDOWS.reviewer);
 let result:ReturnType<typeof festivalWindows>=[];try{if(ready)result=festivalWindows(slug,Number(date.slice(0,4)),place);}catch{}
 return <details><summary>चाडपर्वको स्थानीय समय · Festival timing</summary><p>नेपालको आधिकारिक sait उपलब्ध भएमा त्यही पहिले प्रयोग गर्नुहोस्। स्थानीय धार्मिक नियमले परम्परा अनुसार फरक पार्न सक्छ / Traditions may differ.</p>
 <label>नेपालको प्रकाशित NPT sait (HH:MM)<input type="time" value={clock} onChange={e=>setClock(e.target.value)}/></label><button type="button" disabled={!clock} onClick={()=>{try{setStatus(`${date} ${clock} NPT = ${officialSait(date,clock,place).local} (${place.tz}). यो तपाईंले दिएको समयको रूपान्तरण हो; आधिकारिक स्रोत पक्का गर्नुहोस्।`);}catch{setStatus('Invalid time');}}}>स्थानको घडीमा बदल्नुहोस् · Convert</button><p role="status">{status}</p>
 <label>पर्व / Festival<select value={slug} onChange={e=>setSlug(e.target.value)}>{Object.entries(RITUAL_CONFIG).map(([id,r])=><option key={id} value={id}>{r.name}</option>)}</select></label>
 {!ready?<p>धार्मिक नियम qualified reviewer को स्वीकृति पर्खिरहेका छन्; सार्वजनिक स्थानीय muhurta, parana वा fast-ending सिफारिस बन्द छ / Awaiting religious review.</p>:result.map((r,i)=><div key={i}><p>{r.title} — {formatPlaceInstant(r.start,place.tz)} → {formatPlaceInstant(r.end,place.tz)} · NPT {formatPlaceInstant(r.start,'Asia/Kathmandu')} → {formatPlaceInstant(r.end,'Asia/Kathmandu')} {r.fallback?'(estimate / fallback)':''}</p><ReminderActions event={{title:r.title,start:r.start,end:r.end,tz:place.tz,url:'https://aafnaipatro.com'+location.pathname}}/></div>)}
 <p>अर्को खगोलीय सङ्क्रान्ति / Next computed sidereal ingress: {formatPlaceInstant(sankrantiAfter(new Date(date+'T00:00:00Z')),place.tz)}</p>
 <label><input type="checkbox" checked={ramadan} onChange={e=>setRamadan(e.target.checked)}/> Ramadan sehri/iftar · existing prayer calculator</label>{ramadan?<Suspense fallback={null}><Prayer date={date} initialPlace={place}/></Suspense>:null}
 </details>;
}
