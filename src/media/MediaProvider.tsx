import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { MediaItem } from "./catalog";

type Health = "idle" | "loading" | "live" | "retrying" | "error";
interface PlayerState {
  item: MediaItem | null;
  playing: boolean;
  muted: boolean;
  volume: number;
  health: Health;
  retryCount: number;
  sleepEndsAt: number | null;
}
interface MediaContextValue extends PlayerState {
  play: (item: MediaItem) => Promise<void>;
  pause: () => void;
  toggle: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setSleepMinutes: (minutes: number | null) => void;
  analyser: AnalyserNode | null;
}
const MediaContext=createContext<MediaContextValue|null>(null);

function proxied(url: string) {
  const remote = url.startsWith("http://") || url.startsWith("https://");
  return remote ? "/api/v1/media/proxy?url=" + encodeURIComponent(url) : url;
}
function isHls(url: string) {
  return /\.m3u8(?:$|\?)/i.test(url);
}
function emit(state: Pick<PlayerState,"item"|"playing"|"muted"|"health">) {
  window.dispatchEvent(new CustomEvent("patro:media-status",{detail:{
    active:state.playing,title:state.item?.name || "Media",muted:state.muted,health:state.health
  }}));
}

export function MediaProvider({children}:{children:ReactNode}) {
  const audioRef=useRef<HTMLAudioElement|null>(null);
  const hlsRef=useRef<import("hls.js").default|null>(null);
  const contextRef=useRef<AudioContext|null>(null);
  const gainRef=useRef<GainNode|null>(null);
  const analyserRef=useRef<AnalyserNode|null>(null);
  const sourceRef=useRef<MediaElementAudioSourceNode|null>(null);
  const retryTimer=useRef<number|null>(null);
  const retryAction=useRef<(()=>void)|null>(null);
  const [analyser,setAnalyser]=useState<AnalyserNode|null>(null);
  const [state,setState]=useState<PlayerState>({item:null,playing:false,muted:false,volume:.78,health:"idle",retryCount:0,sleepEndsAt:null});

  useEffect(()=>{
    const audio=new Audio(); audio.preload="none"; audio.crossOrigin="anonymous"; audioRef.current=audio;
    const onPause=()=>setState((s)=>({...s,playing:false}));
    const queueRecovery=()=>{
      if(!retryAction.current)return;
      setState((s)=>{
        const count=Math.min(s.retryCount+1,6);
        if(count>=6)return {...s,health:"error",retryCount:count};
        const delay=Math.min(30000,1000*2**(count-1));
        if(retryTimer.current)window.clearTimeout(retryTimer.current);
        retryTimer.current=window.setTimeout(()=>retryAction.current?.(),delay);
        return {...s,health:"retrying",retryCount:count};
      });
    };
    let stallTimer:number|null=null;
    const onWaiting=()=>{
      setState((s)=>({...s,health:s.playing?"retrying":"loading"}));
      if(stallTimer)window.clearTimeout(stallTimer);
      stallTimer=window.setTimeout(queueRecovery,8000);
    };
    const onPlaying=()=>{
      if(stallTimer)window.clearTimeout(stallTimer);
      stallTimer=null;
      setState((s)=>({...s,playing:true,health:"live",retryCount:0}));
    };
    const onError=()=>queueRecovery();
    audio.addEventListener("playing",onPlaying); audio.addEventListener("pause",onPause); audio.addEventListener("waiting",onWaiting); audio.addEventListener("stalled",onWaiting); audio.addEventListener("error",onError);
    return ()=>{
      if(retryTimer.current) window.clearTimeout(retryTimer.current);
      if(stallTimer) window.clearTimeout(stallTimer);
      retryAction.current=null;
      hlsRef.current?.destroy(); audio.pause(); audio.src="";
      audio.removeEventListener("playing",onPlaying); audio.removeEventListener("pause",onPause); audio.removeEventListener("waiting",onWaiting); audio.removeEventListener("stalled",onWaiting); audio.removeEventListener("error",onError);
      void contextRef.current?.close();
    };
  },[]);

  const ensureAudioGraph=useCallback(async()=>{
    const audio=audioRef.current; if(!audio) return;
    if(!contextRef.current){
      const AudioCtx=window.AudioContext || (window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(!AudioCtx) return;
      const ctx=new AudioCtx(), gain=ctx.createGain(), analyserNode=ctx.createAnalyser();
      analyserNode.fftSize=256; analyserNode.smoothingTimeConstant=.82;
      const source=ctx.createMediaElementSource(audio);
      source.connect(gain); gain.connect(analyserNode); analyserNode.connect(ctx.destination);
      contextRef.current=ctx; gainRef.current=gain; analyserRef.current=analyserNode; sourceRef.current=source; setAnalyser(analyserNode);
    }
    if(contextRef.current.state==="suspended") await contextRef.current.resume();
  },[]);

  const scheduleRetry=useCallback((action:()=>void)=>{
    setState((s)=>{
      const count=Math.min(s.retryCount+1,6), delay=Math.min(30000,1000*2**(count-1));
      if(retryTimer.current) window.clearTimeout(retryTimer.current);
      retryAction.current=action;
      retryTimer.current=window.setTimeout(()=>retryAction.current?.(),delay);
      return {...s,retryCount:count,health:"retrying"};
    });
  },[]);

  const play=useCallback(async(item:MediaItem)=>{
    const audio=audioRef.current; if(!audio) return;
    if(retryTimer.current) window.clearTimeout(retryTimer.current);
    hlsRef.current?.destroy(); hlsRef.current=null;
    setState((s)=>({...s,item,health:"loading",retryCount:0}));
    await ensureAudioGraph();
    const url=proxied(item.streamUrl);
    const start=async()=>{
      retryAction.current=()=>void start();
      try{
        const hlsMedia=item.codec.toLowerCase().includes("hls") || item.mediaType==="hls" || isHls(url);
        if(hlsMedia){
          const {default:Hls}=await import("hls.js");
          if(!Hls.isSupported()){
            audio.src=url; audio.load();
          }else{
          const hls=new Hls({enableWorker:true,lowLatencyMode:true,maxBufferLength:20});
          hlsRef.current=hls; hls.loadSource(url); hls.attachMedia(audio);
          hls.on(Hls.Events.ERROR,(_event,data)=>{
            if(!data.fatal)return;
            if(data.type===Hls.ErrorTypes.NETWORK_ERROR){hls.startLoad();scheduleRetry(()=>void start());}
            else if(data.type===Hls.ErrorTypes.MEDIA_ERROR)hls.recoverMediaError();
            else {hls.destroy();scheduleRetry(()=>void start());}
          });
          await new Promise<void>((resolve)=>hls.on(Hls.Events.MANIFEST_PARSED,()=>resolve()));
          }
        }else{
          audio.src=url; audio.load();
        }
        audio.muted=state.muted; audio.volume=1;
        if(gainRef.current) gainRef.current.gain.setTargetAtTime(state.volume,contextRef.current?.currentTime || 0,.08);
        await audio.play();
      }catch{
        scheduleRetry(()=>void start());
      }
    };
    await start();
  },[ensureAudioGraph,scheduleRetry,state.muted,state.volume]);

  const pause=useCallback(()=>{
    if(retryTimer.current)window.clearTimeout(retryTimer.current);
    retryAction.current=null;
    audioRef.current?.pause();
  },[]);
  const toggle=useCallback(()=>{
    const a=audioRef.current;if(!a)return;
    if(a.paused){void a.play().catch(()=>retryAction.current?.());}
    else{
      if(retryTimer.current)window.clearTimeout(retryTimer.current);
      retryAction.current=null;
      a.pause();
    }
  },[]);
  const setMuted=useCallback((muted:boolean)=>{if(audioRef.current)audioRef.current.muted=muted;setState((s)=>({...s,muted}));},[]);
  const setVolume=useCallback((volume:number)=>{const value=Math.max(0,Math.min(1,volume));if(gainRef.current&&contextRef.current)gainRef.current.gain.setTargetAtTime(value,contextRef.current.currentTime,.08);setState((s)=>({...s,volume:value}));},[]);
  const setSleepMinutes=useCallback((minutes:number|null)=>setState((s)=>({...s,sleepEndsAt:minutes?Date.now()+minutes*60000:null})),[]);

  useEffect(()=>{emit(state);},[state.item,state.playing,state.muted,state.health]);
  useEffect(()=>{
    const timer=window.setInterval(()=>setState((s)=>{
      if(s.sleepEndsAt && Date.now()>=s.sleepEndsAt){audioRef.current?.pause();return {...s,sleepEndsAt:null,playing:false};}
      return s;
    }),1000); return ()=>window.clearInterval(timer);
  },[]);
  useEffect(()=>{
    const onMute=()=>setMuted(!audioRef.current?.muted);
    const onToggle=()=>toggle();
    window.addEventListener("patro:toggle-mute",onMute); window.addEventListener("patro:toggle-player",onToggle);
    return()=>{window.removeEventListener("patro:toggle-mute",onMute);window.removeEventListener("patro:toggle-player",onToggle);};
  },[setMuted,toggle]);

  useEffect(()=>{
    if(!("mediaSession" in navigator)||!state.item)return;
    navigator.mediaSession.metadata=new MediaMetadata({title:state.item.name,artist:state.item.nameNe,album:"Mero Patro Live"});
    navigator.mediaSession.setActionHandler("play",()=>void audioRef.current?.play());
    navigator.mediaSession.setActionHandler("pause",()=>audioRef.current?.pause());
    navigator.mediaSession.setActionHandler("stop",()=>{audioRef.current?.pause();if(audioRef.current)audioRef.current.currentTime=0;});
  },[state.item]);

  const value=useMemo<MediaContextValue>(()=>({...state,play,pause,toggle,setMuted,setVolume,setSleepMinutes,analyser}),[state,play,pause,toggle,setMuted,setVolume,setSleepMinutes,analyser]);
  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
}

export function useMedia(){
  const value=useContext(MediaContext);
  if(!value)throw new Error("useMedia must be used inside MediaProvider");
  return value;
}
