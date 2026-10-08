export type ShareEvent={title:string;start:Date;end:Date;tz:string;url:string;reminderMinutes?:number};
const escape=(s:string)=>s.replace(/\\/g,'\\\\').replace(/[,;]/g,'\\$&').replace(/\r?\n/g,'\\n');
const stamp=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
export function eventIcs(event:ShareEvent,uid:string,now=new Date()) {
 if(!Number.isFinite(event.start.getTime())||event.end<event.start)throw Error('Invalid event');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Aafnai Patro//Local Timing//EN',`X-WR-TIMEZONE:${escape(event.tz)}`,'BEGIN:VEVENT',`UID:${escape(uid)}@aafnaipatro.com`,`DTSTAMP:${stamp(now)}`,`DTSTART:${stamp(event.start)}`,`DTEND:${stamp(event.end)}`,`SUMMARY:${escape(event.title)}`,`URL:${event.url.replace(/[\r\n]/g,'')}`,'BEGIN:VALARM',`TRIGGER:-PT${event.reminderMinutes??30}M`,'ACTION:DISPLAY',`DESCRIPTION:${escape(event.title)}`,'END:VALARM','END:VEVENT','END:VCALENDAR'];
 return lines.join('\r\n')+'\r\n';
}
export function downloadText(text:string,name:string,type:string) { const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
export async function scheduleExistingPush(event:ShareEvent) {
 if(!('serviceWorker' in navigator)||!('PushManager' in window))throw Error('Push unavailable; import ICS instead.');
 if(await Notification.requestPermission()!=='granted')throw Error('Push permission not granted.');
 async function request(path:string,body?:unknown) { const r=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});if(!r.ok)throw Error(r.status===401?'Sign in and retry.':'Push could not be scheduled.');return r.json(); }
 const {publicKey}=await request('/api/push/vapid');const padded=publicKey.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-publicKey.length%4)%4),key=Uint8Array.from(atob(padded),c=>c.charCodeAt(0));
 const reg=await navigator.serviceWorker.register('/sw.js');let subscription=await reg.pushManager.getSubscription();if(!subscription)subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
 const device=await request('/api/push/subscribe',{subscription:subscription.toJSON(),timezone:event.tz});
 return request('/api/push/jobs',{device_id:device.device_id,fire_at_utc:new Date(event.start.getTime()-(event.reminderMinutes??30)*60000).toISOString(),category:'local-timing',job_ref:crypto.randomUUID(),payload:{title:'Aafnai Patro',body:event.title+((event.reminderMinutes??30)===0?' — now':` — ${event.reminderMinutes??30} minutes`),url:event.url}});
}
