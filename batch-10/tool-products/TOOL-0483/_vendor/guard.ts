/** Browser-only finite-value validation and UTC civil-date arithmetic. */
export type Output = { label:string; value:string; detail?:string };
export type Result = { outputs:Output[]; warnings:string[]; steps:string[] };
export function N(x:Record<string,unknown>,key:string,min:number,max:number):number {
  const v=x[key]; if(v===null||v===undefined||v==='')throw Error(`${key} is required`);
  if(typeof v!=='number'&&typeof v!=='string')throw Error(`${key} must be numeric`);
  const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error(`${key} must be between ${min} and ${max}`);return n;
}
export function S(x:Record<string,unknown>,key:string,max=80):string {
  const v=x[key];if(typeof v!=='string'||v.length>max)throw Error(`${key}: invalid text or oversized input`);
  return v.trim();
}
export function D(x:Record<string,unknown>,key:string):string {
  const s=S(x,key,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error(`${key}: use YYYY-MM-DD`);
  const [y,m,d]=s.split('-').map(Number);if(y<1900||y>2100)throw Error('Dates outside 1900–2100 unsupported');
  const t=new Date(Date.UTC(y,m-1,d));if(t.getUTCFullYear()!==y||t.getUTCMonth()!==m-1||t.getUTCDate()!==d)throw Error(`${key}: impossible date`);return s;
}
export function ODate(x:Record<string,unknown>,key:string):string|null {return x[key]===''||x[key]===undefined?null:D(x,key)}
export function addDays(iso:string,days:number):string {if(!Number.isInteger(days)||days<0||days>1000)throw Error('Unsupported calendar-day increment');const y=+iso.slice(0,4),m=+iso.slice(5,7),d=+iso.slice(8,10); const t=new Date(Date.UTC(y,m-1,d+days));if(t.getUTCFullYear()>2100)throw Error('Calendar result beyond 2100 unsupported');return t.toISOString().slice(0,10)}
export function Q(n:number,dp=2):string {if(!Number.isFinite(n)||Math.abs(n)>1e13)throw Error('Unsafe output magnitude');if(!Number.isInteger(dp)||dp<0||dp>20)throw Error('Unsafe decimal precision');return n.toLocaleString('en-US',{maximumFractionDigits:dp,minimumFractionDigits:Math.min(dp,2)});}
export function M(n:number,sym='$'):string {return `${sym}${Q(n)}`;}
export function P(n:number):string{return Q(n*100)+'%'}
export function R(outputs:Output[],warnings:string[]=[],steps:string[]=[]):Result{if(outputs.length>65)throw Error('Too many outputs');return{outputs,warnings,steps};}
