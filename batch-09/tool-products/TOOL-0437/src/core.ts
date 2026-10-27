import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const quarter=S(i,'quarter',12);if(!/^\d{4}-Q[1-4]$/.test(quarter))throw Error('Quarter must follow YYYY-Qn');const consumed=N(i,'fuelGallons',.01,1e8);const raw=S(i,'records',4000);let rows:unknown;try{rows=JSON.parse(raw)}catch{throw Error('Jurisdictions must be a JSON array')};if(!Array.isArray(rows)||rows.length<1||rows.length>60)throw Error('Expected 1–60 jurisdiction rows');
const keys=new Set<string>();const data=rows.map((r:any)=>{if(!r||typeof r!=='object'||Array.isArray(r))throw Error('Invalid jurisdiction object');const code=String(r.code??'').trim();if(!/^[A-Za-z0-9_-]{1,12}$/.test(code)||keys.has(code))throw Error('Invalid or duplicate code');keys.add(code);const miles=Number(r.miles),rate=Number(r.ratePerGallon),paid=Number(r.taxedGallonsPurchased);if(![miles,rate,paid].every(Number.isFinite)||miles<0||miles>1e9||rate<0||rate>100||paid<0||paid>1e8)throw Error('Invalid mileage, rate or tax-paid volume');return{code,miles,rate,paid}});
const miles=data.reduce((s,r)=>s+r.miles,0);if(miles<=0)throw Error('Total taxable mileage must be positive');const mpg=miles/consumed;let net=0;const outputs=data.map(r=>{const taxable=r.miles/mpg,liability=taxable*r.rate-r.paid*r.rate;net+=liability;return{label:r.code+' · tax less paid-fuel credit',value:M(liability)}});
return R([{label:'Fleet quarter economy (US MPG)',value:Q(mpg)},...outputs,{label:'Combined estimated net fuel tax',value:M(net)}],[`Rates are manually entered for ${quarter} and have NOT been checked against the IFTA quarterly matrix.`,`Official jurisdiction filing includes surcharges, different tax-credit treatments, unit conversion, rounding, exempt miles, penalties and credits.`],[`Fuel allocated to each jurisdiction = jurisdiction miles / (total miles / total consumed US gallons).`]);

}
