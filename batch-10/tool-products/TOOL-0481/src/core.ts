import {S,R} from '../_vendor/guard';
export function calculate(input:Record<string,unknown>){
 const raw=S(input,'number',80).toUpperCase();
 if(!raw||/[^A-Z0-9\s-]/.test(raw))throw Error('Enter only letters, digits, spaces or hyphens (no links).');
 const number=raw.replace(/[\s-]/g,'');
 if(number.length<7||number.length>35)throw Error('Reference must be 7–35 alphanumeric characters after normalization.');
 type Candidate={name:string;reason:string;strength:number};const matches:Candidate[]=[];
 if(/^1Z[A-Z0-9]{16}$/.test(number))matches.push({name:'UPS',reason:'UPS 1Z prefix with 18 alphanumeric characters',strength:3});
 if(/^(?:[0-9]{12}|T[0-9]{10}|[0-9]{9})$/.test(number))matches.push({name:'UPS (possible)',reason:'UPS also documents short numeric / T-prefixed references',strength:1});
 if(/^[0-9]{20,22}$/.test(number))matches.push({name:'USPS (possible)',reason:'Common US postal numeric range; numbers overlap with partner references',strength:1});
 if(/^[0-9]{10}$/.test(number))matches.push({name:'DHL Express (possible)',reason:'Common 10-digit DHL Express pattern, not a unique identifier',strength:1});
 if(/^[0-9]{12}$/.test(number)||/^[0-9]{15}$/.test(number)||/^[0-9]{20}$/.test(number))matches.push({name:'FedEx (possible)',reason:'Common numeric airway-bill patterns; service-dependent',strength:1});
 const s10=/^[A-Z]{2}([0-9]{8})([0-9])[A-Z]{2}$/.exec(number);
 if(s10){const wt=[8,6,4,2,3,5,9,7];const sum=[...s10[1]].reduce((a,c,i)=>a+Number(c)*wt[i],0);const rawCheck=11-sum%11;const check=rawCheck===10?0:rawCheck===11?5:rawCheck;if(check===Number(s10[2]))matches.push({name:'UPU S10 postal format',reason:'Postal identifier check-digit valid; cannot establish postal operator from format',strength:2});}
 matches.sort((a,b)=>b.strength-a.strength);
 const first=matches[0];const verdict=first?(matches.length>1?'Multiple plausible formats':first.name):'No supported format detected';
 return R([{label:'Identification result',value:verdict},{label:'Plausible patterns',value:String(matches.length)},{label:'Pattern notes',value:matches.map(m=>m.name+': '+m.reason).join(' | ')||'Unknown / unsupported format'}],['No carrier was contacted. Pattern detection never verifies that a shipment exists.','For status, use the official carrier site and enter the tracking number yourself; do not trust tracking links from unsolicited messages.'],['Normalize whitespace and hyphens, then compare documented patterns.','Overlapping formats are intentionally shown together instead of selecting one carrier with false confidence.']);
}
