import { useState } from 'react';
import { readPlace, savePlace, deviceZone, type SavedPlace } from './place';
import { PLACE_CITIES, WEATHER_CITY_IDS } from './cities';
export default function PlacePage() {
 const [saved,setSaved]=useState(readPlace), [draft,setDraft]=useState<SavedPlace|null>(readPlace), [query,setQuery]=useState(''), [status,setStatus]=useState('');
 const cities=PLACE_CITIES.filter(c=>c.name.toLowerCase().includes(query.toLowerCase()));
 let suggested: SavedPlace | undefined; try { const i=WEATHER_CITY_IDS.indexOf(localStorage.getItem('patro.weather.city.v1')||''); suggested=i>=0?{...PLACE_CITIES[i],source:'weather'}:undefined; } catch {}
 function locate() { if(!navigator.geolocation){setStatus('Geolocation unavailable. Choose a city.');return;} navigator.geolocation.getCurrentPosition(p=>{setDraft({name:'मेरो स्थान / My location',lat:p.coords.latitude,lon:p.coords.longitude,tz:deviceZone(),source:'geolocation'});setStatus('उपकरणको समयक्षेत्र प्रयोग भयो; सुरक्षित गर्नुअघि सही IANA zone पक्का गर्नुहोस्।');},()=>setStatus('स्थान अनुमति/जानकारी उपलब्ध भएन; शहर छान्नुहोस्।'),{timeout:10000,maximumAge:300000}); }
 return <main className="ap-page"><h1>मेरो ठाउँ · My place</h1><p>नेपालको आधिकारिक मिति सधैं पहिले रहन्छ। थप स्थानीय गणना यस उपकरणमा मात्र राखिन्छ। हाल: {saved?.name||'काठमाडौं / Kathmandu'}</p>
 <label>शहर खोज्नुहोस् / Search city<input value={query} onChange={e=>setQuery(e.target.value)}/></label><label>शहर / City<select value={draft?.source==='city'?draft.name:''} onChange={e=>setDraft(PLACE_CITIES.find(c=>c.name===e.target.value)||null)}><option value="">छान्नुहोस् / Choose</option>{cities.map(c=><option key={c.name}>{c.name}</option>)}</select></label>
 <button type="button" onClick={locate}>📍 मेरो स्थान · Use location</button>{suggested?<button type="button" onClick={()=>setDraft(suggested!)}>मौसमको शहर · {suggested.name}</button>:null}
 {draft?<fieldset><legend>स्थान पक्का गर्नुहोस् / Confirm location</legend><p>{draft.name}: {draft.lat.toFixed(4)}, {draft.lon.toFixed(4)}</p><label>IANA time zone<input value={draft.tz} onChange={e=>setDraft({...draft,tz:e.target.value})}/></label><button type="button" onClick={()=>{try{savePlace(draft);setSaved(draft);setStatus('स्थानीय स्थान सुरक्षित भयो / Saved locally.');}catch{setStatus('स्थान सुरक्षित भएन। सही zone र browser storage जाँच्नुहोस्।');}}}>सुरक्षित गर्नुहोस् · Save</button></fieldset>:null}
 <button type="button" onClick={()=>{try{savePlace(null);setDraft(null);setSaved(null);setStatus('काठमाडौं default restored.');}catch{setStatus('Storage unavailable.');}}}>काठमाडौंमा फर्कनुहोस् · Reset</button><p role="status">{status}</p><a href="/tools/astro">खगोलीय पात्रो · Astronomy</a>
 </main>;
}
