import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, MoreHorizontal } from "lucide-react";
import { useMedia } from "./MediaProvider";

function Visualizer(){
  const {analyser,playing}=useMedia();
  const ref=useRef<HTMLCanvasElement|null>(null);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas||!analyser)return;
    const ctx=canvas.getContext("2d");if(!ctx)return;
    const data=new Uint8Array(analyser.frequencyBinCount);let raf=0;
    const draw=()=>{const dpr=window.devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight;canvas.width=Math.max(1,Math.floor(w*dpr));canvas.height=Math.max(1,Math.floor(h*dpr));ctx.clearRect(0,0,canvas.width,canvas.height);analyser.getByteFrequencyData(data);const bars=32,bw=canvas.width/bars;for(let i=0;i<bars;i++){const v=data[Math.floor(i*data.length/bars)]/255;const bh=Math.max(2,v*canvas.height);ctx.fillStyle="rgba(56,189,248,"+(0.25+v*.7)+")";ctx.fillRect(i*bw,canvas.height-bh,Math.max(1,bw-2*dpr),bh);}raf=requestAnimationFrame(draw);};
    if(playing)draw();return()=>cancelAnimationFrame(raf);
  },[analyser,playing]);
  return <canvas ref={ref} className="media-visualizer" aria-hidden="true"/>;
}

export function GlobalMediaPlayer(){
  const media=useMedia(); const [open,setOpen]=useState(false);
  useEffect(()=>{const fn=()=>setOpen((v)=>!v);window.addEventListener("patro:toggle-player-panel",fn);return()=>window.removeEventListener("patro:toggle-player-panel",fn);},[]);
  if(!media.item)return null;
  const remaining=media.sleepEndsAt?Math.max(0,Math.ceil((media.sleepEndsAt-Date.now())/60000)):null;
  return <aside className={"global-media-player "+(open?"is-open":"")} aria-label="Persistent media player">
    <Visualizer/>
    <div className="global-player-main">
      <button className="player-round" onClick={media.toggle} aria-label={media.playing?"Pause":"Play"}>{media.playing?<Pause size={18}/>:<Play size={18}/>}</button>
      <div className="player-title"><strong>{media.item.name}</strong><span><i className={"health-dot "+media.health}/>{media.health==="live"?"Live":media.health} · {media.item.codec}{media.item.bitrateKbps?" · "+media.item.bitrateKbps+" kbps":""}</span></div>
      <button className="player-round" onClick={()=>media.setMuted(!media.muted)} aria-label={media.muted?"Unmute":"Mute"}>{media.muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>
      <input className="player-volume" type="range" min="0" max="1" step=".01" value={media.volume} onChange={(e)=>media.setVolume(Number(e.target.value))} aria-label="Player volume"/>
      <button className="player-more" onClick={()=>setOpen((v)=>!v)} aria-expanded={open} aria-label="Player options"><MoreHorizontal size={18}/></button>
    </div>
    {open&&<div className="player-options"><span>Sleep timer{remaining!=null?" · "+remaining+"m":""}</span>{[15,30,60,120].map((m)=><button key={m} onClick={()=>media.setSleepMinutes(m)}>{m<60?m+"m":m/60+"h"}</button>)}<button onClick={()=>media.setSleepMinutes(null)}>Off</button></div>}
  </aside>;
}
