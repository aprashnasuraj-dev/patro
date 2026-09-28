import Hls from "hls.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { fuzzyMedia, MEDIA_CATALOG, type MediaItem, type MediaKind } from "./catalog";
import { useMedia } from "./MediaProvider";

function proxy(url: string) {
  const remote = url.startsWith("http://") || url.startsWith("https://");
  return remote ? "/api/v1/media/proxy?url=" + encodeURIComponent(url) : url;
}
function storedFavorites(){try{return new Set<string>(JSON.parse(localStorage.getItem("patro.media.favorites")||"[]") as string[]);}catch{return new Set<string>();}}

function TvPlayer({item}:{item:MediaItem}){
  const ref=useRef<HTMLVideoElement|null>(null); const hls=useRef<Hls|null>(null);
  const [health,setHealth]=useState("loading"),[low,setLow]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const video=ref.current;if(!video)return;let timer=0;let cancelled=false;
    const start=()=>{
      if(cancelled)return;hls.current?.destroy();hls.current=null;setHealth(retry?"retrying":"loading");
      const url=proxy(item.streamUrl);
      if(Hls.isSupported()){
        const engine=new Hls({enableWorker:true,lowLatencyMode:true,maxBufferLength:low?8:24,capLevelToPlayerSize:true});
        if(low)engine.autoLevelCapping=0;hls.current=engine;engine.loadSource(url);engine.attachMedia(video);
        engine.on(Hls.Events.MANIFEST_PARSED,()=>{setHealth("live");void video.play().catch(()=>undefined);});
        engine.on(Hls.Events.ERROR,(_e,d)=>{if(!d.fatal)return;setHealth("retrying");const next=Math.min(retry+1,6);setRetry(next);timer=window.setTimeout(start,Math.min(30000,1000*2**next));});
      }else{video.src=url;void video.play().then(()=>setHealth("live")).catch(()=>setHealth("error"));}
    };
    start();return()=>{cancelled=true;window.clearTimeout(timer);hls.current?.destroy();};
  },[item.id,item.streamUrl,low,retry]);
  const pip=async()=>{const video=ref.current;if(!video)return;if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await video.requestPictureInPicture();};
  const remote=()=>{const video=ref.current as (HTMLVideoElement & {webkitShowPlaybackTargetPicker?:()=>void;remote?:{prompt:()=>Promise<void>}})|null;if(!video)return;if(video.webkitShowPlaybackTargetPicker)video.webkitShowPlaybackTargetPicker();else void video.remote?.prompt().catch(()=>undefined);};
  return <div className="tv-stage"><video ref={ref} controls playsInline className={low?"audio-only-video":""} aria-label={item.name+" live stream"}/><div className="tv-overlay"><span><i className={"health-dot "+health}/>{health}</span><button onClick={()=>setLow((v)=>!v)} aria-pressed={low}>{low?"Video on":"Audio-only / low data"}</button><button onClick={pip}>PiP</button><button onClick={remote}>Cast / AirPlay</button></div></div>;
}

export function MediaSuite({kind}:{kind:MediaKind}){
  const media=useMedia(); const [query,setQuery]=useState(""),[filter,setFilter]=useState("All"),[selectedTv,setSelectedTv]=useState<MediaItem|null>(null);
  const [favorites,setFavorites]=useState<Set<string>>(storedFavorites),[drawer,setDrawer]=useState<MediaItem|null>(null),[report,setReport]=useState<MediaItem|null>(null);
  const base=MEDIA_CATALOG.filter((x)=>x.kind===kind),filters=useMemo(()=>["All",...Array.from(new Set(base.map((x)=>kind==="radio"?x.province:x.genre)))],[base,kind]);
  const items=useMemo(()=>fuzzyMedia(base,query).filter((x)=>filter==="All"||(kind==="radio"?x.province===filter:x.genre===filter)),[base,query,filter,kind]);
  const favorite=(id:string)=>{setFavorites((old)=>{const next=new Set(old);next.has(id)?next.delete(id):next.add(id);localStorage.setItem("patro.media.favorites",JSON.stringify([...next]));return next;});};
  return <main className="media-suite">
    <section className="media-hero"><div><p className="eyebrow">{kind==="radio"?"Nepal FM directory":"Nepal live television"}</p><h1>{kind==="radio"?"FM Radio · रेडियो":"Live TV · प्रत्यक्ष टिभी"}</h1><p>Persistent playback, stream health recovery, favorites and native device controls.</p></div>
      <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search station, district or genre…" aria-label="Search media"/></section>
    {selectedTv&&kind==="tv"&&<TvPlayer item={selectedTv}/>}
    <div className="media-filters" role="group" aria-label="Media categories">{filters.map((x)=><button className={filter===x?"active":""} key={x} onClick={()=>setFilter(x)}>{x}</button>)}</div>
    <section className="station-grid" aria-live="polite">{items.map((item)=><article className="station-card" key={item.id}>
      <div className="station-badge" aria-hidden="true">{item.kind==="radio"?"FM":"TV"}</div><div className="station-copy"><strong>{item.nameNe}</strong><span>{item.name}</span><small>{item.district} · {item.genre}</small></div>
      <button className="favorite-button" onClick={()=>favorite(item.id)} aria-label={(favorites.has(item.id)?"Remove ":"Add ")+item.name+" favorite"}>{favorites.has(item.id)?"★":"☆"}</button>
      <div className="station-actions">{kind==="radio"?<button onClick={()=>void media.play(item)}>{media.item?.id===item.id&&media.playing?"Playing":"Play"}</button>:<button onClick={()=>setSelectedTv(item)}>Watch</button>}<button onClick={()=>setDrawer(item)}>EPG</button><button onClick={()=>setReport(item)} aria-label={"Report broken stream for "+item.name}>!</button></div>
    </article>)}</section>
    {!items.length&&<div className="media-empty">No station matches this search. Clear the filter to see the full directory.</div>}
    {drawer&&<div className="media-modal-backdrop" onMouseDown={(e)=>{if(e.currentTarget===e.target)setDrawer(null);}}><section className="media-modal" role="dialog" aria-modal="true" aria-label={drawer.name+" programme guide"}><header><div><p className="eyebrow">Electronic Programme Guide</p><h2>{drawer.name}</h2></div><button onClick={()=>setDrawer(null)} aria-label="Close EPG">×</button></header><div className="epg-now"><span className="live-dot"/>LIVE NOW</div><p>Live programming is supplied by the broadcaster. The official schedule remains the authoritative source when programme times change.</p>{drawer.scheduleUrl||drawer.officialUrl?<a className="modal-primary" href={drawer.scheduleUrl||drawer.officialUrl} target="_blank" rel="noreferrer">Open official schedule</a>:<span>Continuous live channel</span>}</section></div>}
    {report&&<div className="media-modal-backdrop"><form className="media-modal" onSubmit={(e)=>{e.preventDefault();const form=new FormData(e.currentTarget);const payload={station:report.id,url:report.streamUrl,reason:String(form.get("reason")||"not-playing"),at:new Date().toISOString(),userAgent:navigator.userAgent};localStorage.setItem("patro.media.lastReport",JSON.stringify(payload));navigator.clipboard?.writeText(JSON.stringify(payload,null,2)).catch(()=>undefined);setReport(null);}}><header><div><p className="eyebrow">Broken link report</p><h2>{report.name}</h2></div><button type="button" onClick={()=>setReport(null)}>×</button></header><label>Issue<select name="reason"><option value="not-playing">Does not play</option><option value="buffering">Buffers repeatedly</option><option value="wrong-channel">Wrong channel</option><option value="audio-only">Audio/video issue</option></select></label><p>The diagnostic is saved locally and copied to your clipboard so it can be sent to support without silently transmitting device data.</p><button className="modal-primary" type="submit">Create diagnostic report</button></form></div>}
  </main>;
}
