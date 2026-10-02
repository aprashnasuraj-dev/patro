const CONFIG_KEY="patro.morning.v1";
const NEPAL_SIX_UTC_HOUR=0;
const NEPAL_SIX_UTC_MINUTE=15;
let timer:number|undefined;

type MorningConfig={enabled:boolean;name:string};

function readConfig():MorningConfig{
  try{const value=JSON.parse(localStorage.getItem(CONFIG_KEY)||"{}");return{enabled:value?.enabled===true,name:String(value?.name||"").trim().slice(0,80)}}catch{return{enabled:false,name:""}}
}
function writeConfig(config:MorningConfig){localStorage.setItem(CONFIG_KEY,JSON.stringify(config));return config}
function nextSixNepal(now=new Date()){
  const target=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),NEPAL_SIX_UTC_HOUR,NEPAL_SIX_UTC_MINUTE,0,0));
  if(target.getTime()<=now.getTime())target.setUTCDate(target.getUTCDate()+1);
  return target;
}
async function post(type:string,config?:MorningConfig){
  const registration=await navigator.serviceWorker?.ready;if(!registration?.active)return false;
  registration.active.postMessage({type,...(config?{config}:{})});return true;
}
function armForeground(){
  if(timer)clearTimeout(timer);
  const config=readConfig();if(!config.enabled)return;
  const delay=Math.max(1000,nextSixNepal().getTime()-Date.now());
  timer=window.setTimeout(async()=>{await post("CHECK_MORNING");armForeground()},delay);
}

export async function enableLocalMorningGreeting(name=""){
  if(!("Notification" in window))return{ok:false,reason:"unsupported" as const};
  const permission=Notification.permission==="granted"?"granted":await Notification.requestPermission();
  if(permission!=="granted")return{ok:false,reason:"permission" as const};
  const config=writeConfig({enabled:true,name:name.trim().slice(0,80)});
  await post("MORNING_CONFIG",config);
  const registration:any=await navigator.serviceWorker?.ready;
  if(registration?.periodicSync?.register){try{await registration.periodicSync.register("aafnai-morning",{minInterval:12*60*60*1000})}catch{}}
  await post("CHECK_MORNING");armForeground();
  return{ok:true,reason:"enabled" as const,periodic:Boolean(registration?.periodicSync)};
}

export async function disableLocalMorningGreeting(){
  const config=writeConfig({enabled:false,name:""});await post("MORNING_CONFIG",config);if(timer)clearTimeout(timer);
  return true;
}

export function getLocalMorningGreeting(){return readConfig()}

export function startLocalMorningScheduler(){
  const sync=()=>{const config=readConfig();if(config.enabled){void post("MORNING_CONFIG",config).then(()=>post("CHECK_MORNING"));armForeground()}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",sync,{once:true});else sync();
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")sync()});
}
