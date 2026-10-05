export type CalendarBackupEnv={CALENDAR_BACKUP?:any};

type BackupBundle={days?:any[];months?:Array<{year:number;month:number}>};
const BUNDLE_KEY="calendar/current-12-months.json";
let bundleCache:Promise<BackupBundle|null>|null=null;

async function objectJson(env:CalendarBackupEnv,key:string){
  const bucket=env.CALENDAR_BACKUP;if(!bucket?.get)return null;
  try{
    const object=await bucket.get(key);if(!object)return null;
    if(typeof object.json==="function")return await object.json();
    if(typeof object.text==="function")return JSON.parse(await object.text());
    return null;
  }catch{return null}
}
function rowsFrom(value:any){
  if(Array.isArray(value))return value;
  if(Array.isArray(value?.days))return value.days;
  if(Array.isArray(value?.items))return value.items;
  return [];
}
function rowAd(row:any){return String(row?.ad||row?.ad_date||row?.date||row?.payload?.ad||row?.payload?.ad_date||"").slice(0,10)}
function rowBs(row:any){return row?.bs||row?.payload?.bs||row?.calendars?.bikram_sambat_detail||null}
function normalized(row:any){
  if(!row||typeof row!=="object")return row;
  if(row.payload&&typeof row.payload==="object"&&(row.payload.ad||row.payload.bs))return {...row.payload,ad:row.payload.ad||row.ad_date};
  return row;
}
async function bundle(env:CalendarBackupEnv){
  if(!env.CALENDAR_BACKUP?.get)return null;
  if(!bundleCache)bundleCache=objectJson(env,BUNDLE_KEY).then(value=>value&&Array.isArray(value.days)?value:null).catch(()=>null);
  return bundleCache;
}
async function candidateRows(env:CalendarBackupEnv,keys:string[]){
  for(const key of keys){const value=await objectJson(env,key);const rows=rowsFrom(value);if(rows.length)return rows.map(normalized)}
  const common=await bundle(env);return rowsFrom(common).map(normalized);
}

export async function r2CalendarByAd(env:CalendarBackupEnv,date:string){
  const [year,month]=date.split("-");
  const rows=await candidateRows(env,[`calendar/ad/${date}.json`,`calendar/ad/${year}/${month}.json`]);
  return rows.find(row=>rowAd(row)===date)||null;
}

export async function r2CalendarByBs(env:CalendarBackupEnv,year:number,month:number,day?:number){
  const mm=String(month).padStart(2,"0");
  const rows=await candidateRows(env,[`calendar/bs/${year}/${mm}.json`,`calendar/bs/${year}/${month}.json`]);
  return rows.find(row=>{const bs=rowBs(row);return Number(bs?.year)===year&&Number(bs?.month)===month&&(day==null||Number(bs?.day)===day)})||null;
}

export async function r2CalendarMonth(env:CalendarBackupEnv,mode:"bs"|"ad",year:number,month:number){
  const mm=String(month).padStart(2,"0"),rows=await candidateRows(env,[`calendar/${mode}/${year}/${mm}.json`,`calendar/${mode}/${year}/${month}.json`]);
  if(mode==="bs")return rows.filter(row=>{const bs=rowBs(row);return Number(bs?.year)===year&&Number(bs?.month)===month});
  const prefix=`${year}-${mm}-`;return rows.filter(row=>rowAd(row).startsWith(prefix));
}

export async function r2CalendarRange(env:CalendarBackupEnv,start:string,end:string){
  const rows=await candidateRows(env,[]);
  return rows.filter(row=>{const ad=rowAd(row);return ad>=start&&ad<=end}).sort((a,b)=>rowAd(a).localeCompare(rowAd(b)));
}

export function clearCalendarBackupCache(){bundleCache=null}
