import {N,Q,R,S} from '../_vendor/guard';
const factors:Record<string,number>={'Standing concentrated':5,'Chairs only':7,'Tables and chairs':15};
export function calculate(x:Record<string,unknown>){
 const length=N(x,'length',1,2000),width=N(x,'width',1,2000),unavailable=N(x,'unavailable',0,1e6),layout=S(x,'layout',40),planning=N(x,'planning',2,100),approved=N(x,'approved',0,100000);
 if(!(layout in factors))throw Error('Unsupported arrangement.');
 const gross=length*width,usable=gross-unavailable;if(usable<=0)throw Error('No net usable space after obstacles/stage.');
 const factor=factors[layout],code=Math.floor(usable/factor),practical=Math.floor(usable/planning),effective=Math.min(code,practical,...(approved>0?[Math.floor(approved)]:[]));
 return R([{label:'Gross room area',value:`${Q(gross,1)} ft²`},{label:'Usable area',value:`${Q(usable,1)} ft²`},{label:'Reference occupant-load factor',value:`${factor} ft²/person`},{label:'Factor-based number',value:String(code)},{label:'Planning number',value:String(practical)},{label:'Conservative screening count',value:String(effective)}],['Not a legal occupancy certificate. Fire authorities may apply different editions, fixed-seat rules, egress and accessibility limits.','When the venue-approved occupancy is unknown, obtain it before selling tickets or admitting guests.'],['Usable area = room length × width − stage/obstructions.','Compare floor(usable ÷ reference factor), floor(usable ÷ planning factor), and any entered verified legal limit.']);
}
