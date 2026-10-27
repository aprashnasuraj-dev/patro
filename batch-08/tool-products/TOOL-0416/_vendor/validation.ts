
export function finite(name:string,v:number,min=-Infinity,max=Infinity){
  if(!Number.isFinite(v)||v<min||v>max) throw new Error(`${name} must be between ${min} and ${max}.`);
  return v;
}
export function pct(name:string,v:number){return finite(name,v,0,100)/100}
export function clamp(v:number,a:number,b:number){return Math.max(a,Math.min(b,v))}
export function round(v:number,d=2){const p=10**d;return Math.round((v+Number.EPSILON)*p)/p}
export function ceilDiv(a:number,b:number){if(!(b>0)) throw new Error('Divisor must be positive.');return Math.ceil(a/b)}
export function parseLines(text:string,max=200){
  const lines=text.replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
  if(lines.length>max) throw new Error(`Too many rows; maximum ${max}.`);
  return lines;
}
export function isoDate(s:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new Error('Use YYYY-MM-DD.');const d=new Date(s+'T00:00:00Z');if(Number.isNaN(d.valueOf()))throw new Error('Invalid date.');return d}
export function daysBetween(a:Date,b:Date){return Math.round((b.valueOf()-a.valueOf())/86400000)}
