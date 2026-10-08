import EclipsePanel from './EclipsePanel';
import SunCompass from './SunCompass';
import FestivalWindowsPanel from './FestivalWindowsPanel';
import { useEffect, useState } from 'react';
import { KATHMANDU } from '../patro-tools/core/types';
import { placeTiming, formatPlaceInstant } from './timing';
import type { SavedPlace } from './place';
export default function PlaceTimingCard({date,place}:{date:string;place:SavedPlace}) {
 const [data,setData]=useState<ReturnType<typeof placeTiming>|null>(null),[nepal,setNepal]=useState<ReturnType<typeof placeTiming>|null>(null),[error,setError]=useState('');
 useEffect(()=>{setError('');setData(null);try{setNepal(placeTiming(date,KATHMANDU));setData(placeTiming(date,place));}catch{setError('यस ठाउँ/दिनमा सूर्योदय वा सूर्यास्त नहुन सक्छ। स्थानीय गणना उपलब्ध छैन; नेपालको आधिकारिक विवरण माथि कायम छ।');}},[date,place]);
 return <section className="patro-tool-card place-timing-card" style={{maxWidth:1000,margin:'16px auto',padding:20,overflowWrap:'anywhere'}}><h2>तपाईंको ठाउँमा · At your place</h2><p>नेपालको आधिकारिक मिति र समय माथि पहिले देखाइएको छ। तल अतिरिक्त खगोलीय गणना हो / Additional computed timing: {date} · {place.name} ({place.tz}).</p>
 {error?<p role="status">{error}</p>:data&&nepal?<>{data.polarFallback?<p>Polar fallback: Kathmandu reference, approved rule; these are not local sunrise times.</p>:null}<div style={{overflowX:'auto'}}><table><caption>काठमाडौं तुलना · Kathmandu comparison</caption><thead><tr><th>विवरण / Detail</th><th>काठमाडौं NPT</th><th>{place.name}</th></tr></thead><tbody>{([['सूर्योदय / Sunrise','sunrise'],['सूर्यास्त / Sunset','sunset'],['चन्द्रोदय / Moonrise','moonrise'],['तिथि सुरु / Tithi starts','tithiStart'],['तिथि अन्त / Tithi ends','tithiEnds']] as const).map(([label,key])=><tr key={key}><th>{label}</th><td>{formatPlaceInstant(nepal[key],KATHMANDU.tz)}</td><td>{formatPlaceInstant(data[key],place.tz)}</td></tr>)}<tr><th>तिथि / Paksha</th><td>{nepal.tithiInPaksha} · {nepal.paksha}</td><td>{data.tithiInPaksha} · {data.paksha}</td></tr></tbody></table></div>{data.tithi!==nepal.tithi?<p>तिथि यहाँको सूर्योदयमा फरक पर्छ / Tithi differs at local sunrise. Official Nepal dates remain unchanged.</p>:null}</>:<p role="status">स्थानीय गणना हुँदैछ…</p>}
 <EclipsePanel date={date} place={place}/>
 <SunCompass date={date} place={place}/>
 <FestivalWindowsPanel date={date} place={place}/>
 <a href="/tools/my-place">स्थान बदल्नुहोस् · Change place</a></section>;
}
