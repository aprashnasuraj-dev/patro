/** Same published filter and ordering as history-fast; old endpoint remains the fallback. */
export async function loadHistoryDay(date:string,signal?:AbortSignal,staticOnly=false):Promise<{items:any[]}>{
 const [,mm,dd]=date.split('-');
 try{
  const response=await fetch(`/data/on-this-day/month-${mm}.json`,{signal,headers:{accept:'application/json'}});
  if(!response.ok)throw Error('history_asset_missing');const doc=await response.json();
  if(doc.schema!==1||doc.table!=='on_this_day_events'||Number(doc.month)!==Number(mm)||!doc.days)throw Error('history_asset_invalid');
  const rows=doc.days[dd]??[];if(!Array.isArray(rows))throw Error('history_asset_invalid');
  return {items:rows.filter((r:any)=>r&&typeof r==='object'&&r.published!==false&&r.published!==0&&String(r.published??'true').toLowerCase()!=='false').sort((a:any,b:any)=>Number(Boolean(b.highlight))-Number(Boolean(a.highlight))||Number(b.importance||0)-Number(a.importance||0)||String(a.id??'').localeCompare(String(b.id??'')))};
 }catch(error){if(signal?.aborted||staticOnly)throw error;
  const response=await fetch(`/api/v1/on-this-day?date=${encodeURIComponent(date)}`,{signal,cache:'no-store',headers:{accept:'application/json'}});
  if(!response.ok)throw Error('history_unavailable');const doc=await response.json();if(!Array.isArray(doc.items))throw Error('history_invalid');return doc;
 }
}
