import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const rent=N(i,'rent',0,1e8),pct=N(i,'commonSharePct',0,100)/100;const raw=S(i,'rooms',4000);let list:unknown;try{list=JSON.parse(raw)}catch{throw Error('Roommate input must be valid JSON array')}
if(!Array.isArray(list)||list.length<2||list.length>12)throw Error('Include 2–12 roommates');
const names=new Set<string>();const members=list.map((o:any)=>{if(!o||typeof o!=='object'||Array.isArray(o))throw Error('Every room must be an object');const name=String(o.name??'').trim();if(!name||name.length>45||names.has(name))throw Error('Names must be unique and 1–45 characters');names.add(name);const sqft=Number(o.sqft),adjustment=Number(o.adjustment??0);if(!Number.isFinite(sqft)||sqft<=0||sqft>1e5||!Number.isFinite(adjustment)||Math.abs(adjustment)>1e6)throw Error('Invalid area or amenity adjustment');return{name,sqft,adjustment}});
const total=members.reduce((a,b)=>a+b.sqft,0),adj=members.reduce((a,b)=>a+b.adjustment,0);
const rawShares=members.map((m)=>rent*pct/members.length+rent*(1-pct)*m.sqft/total+m.adjustment-adj/members.length);
if(rawShares.some(x=>x<0))throw Error('Amenity adjustments produce negative rent for a roommate');
const cents=rawShares.map(x=>Math.floor(x*100));let balance=Math.round(rent*100)-cents.reduce((a,b)=>a+b,0);if(balance<0||balance>members.length)throw Error('Share reconciliation failed');
const order=rawShares.map((x,j)=>({j,f:x*100-cents[j]})).sort((a,b)=>b.f-a.f||a.j-b.j);for(let k=0;k<balance;k++)cents[order[k].j]++;
return R(members.map((m,j)=>({label:m.name+' · monthly rent',value:M(cents[j]/100)})),['Amenity adjustments are discretionary; agreement and utilities are not included.'],[`Common space: ${P(pct)} of rent divided equally; private area: ${P(1-pct)} by ft²; all adjustment transfers net to zero.`]);

}
