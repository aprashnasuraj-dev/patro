export function finite(value: unknown, label: string, min = -Number.MAX_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return n;
}
export const roundTo = (n:number, d=2) => {
  const f = 10 ** d;
  return Math.round((n + Number.EPSILON) * f) / f;
};
export function isoDate(value:string, label='Date'): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must use YYYY-MM-DD.`);
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.valueOf()) || d.toISOString().slice(0,10) !== value) throw new Error(`${label} is invalid.`);
  return d;
}
export const daysBetween=(a:string,b:string)=>Math.round((isoDate(b).valueOf()-isoDate(a).valueOf())/86400000);
export function addDays(iso:string, days:number):string {
  const d=isoDate(iso); d.setUTCDate(d.getUTCDate()+Math.trunc(days)); return d.toISOString().slice(0,10);
}
export function inverseNormal(p:number):number {
  if (!(p>0 && p<1)) throw new Error('Probability must be between 0 and 1.');
  const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239];
  const b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572];
  const c=[-.007784894002430293,-.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783];
  const d=[.007784695709041462,.3224671290700398,2.445134137142996,3.754408661907416];
  const pl=.02425, ph=1-pl; let q:number,r:number;
  if(p<pl){ q=Math.sqrt(-2*Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  if(p>ph){ q=Math.sqrt(-2*Math.log(1-p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  q=p-.5; r=q*q; return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}
export function safeHttpUrl(raw:string):string {
  const s=raw.trim(); if(!s) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:/i.test(s)) throw new Error('Only http:// or https:// URLs are supported.');
  const candidate=/^https?:\/\//i.test(s)?s:`https://${s}`;
  const u=new URL(candidate);
  if(!['http:','https:'].includes(u.protocol)) throw new Error('Only HTTP(S) URLs are supported.');
  return u.toString();
}
