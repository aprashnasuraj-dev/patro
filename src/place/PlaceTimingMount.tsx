import { lazy, Suspense, useEffect, useState } from 'react';
import { PLACE_EVENT, PLACE_KEY, readPlace } from './place';
const Card=lazy(()=>import('./PlaceTimingCard'));
export function PlaceTimingMount({path,date}:{path:string;date?:string}) {
 const [place,setPlace]=useState(readPlace);
 useEffect(()=>{const refresh=()=>setPlace(readPlace());const storage=(e:StorageEvent)=>{if(e.key===PLACE_KEY)refresh();};window.addEventListener(PLACE_EVENT,refresh);window.addEventListener('storage',storage);return()=>{window.removeEventListener(PLACE_EVENT,refresh);window.removeEventListener('storage',storage);};},[]);
 if(!place||!(/^\/(?:today)?$/.test(path)||/^\/date\/\d{4}-\d{2}-\d{2}$/.test(path)||path==='/tools/astro'||path.startsWith('/festivals/')))return null;
 const selected=date||path.match(/^\/date\/(.+)$/)?.[1]||new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kathmandu'});
 return <Suspense fallback={null}><Card date={selected} place={place}/></Suspense>;
}
