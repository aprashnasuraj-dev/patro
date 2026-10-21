/** My Time-only half-open UTC interval intersection; never alters shared Patro rules. */
export type TimedWindow = {start:string;end:string};
export function intersectWindows(a:TimedWindow,b:TimedWindow):TimedWindow|null {
 const x=Date.parse(a.start),y=Date.parse(a.end),u=Date.parse(b.start),v=Date.parse(b.end);
 if(![x,y,u,v].every(Number.isFinite)||y<=x||v<=u) return null;
 const start=Math.max(x,u),end=Math.min(y,v);
 return start<end?{start:new Date(start).toISOString(),end:new Date(end).toISOString()}:null;
}
