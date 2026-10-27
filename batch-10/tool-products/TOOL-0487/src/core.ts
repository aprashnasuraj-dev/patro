import {N,Q,R,S} from '../_vendor/guard';
export function calculate(x:Record<string,unknown>){
 const unit=S(x,'unit',3),length=N(x,'length',0.1,500),width=N(x,'width',0.1,200),depth=N(x,'depth',0.05,10),beds=N(x,'beds',1,1000),compost=N(x,'compost',0,100),extra=N(x,'extra',0,40),bag=N(x,'bag',5,200);
 if(!['ft','m'].includes(unit)||!Number.isInteger(beds))throw Error('Unknown unit or fractional number of beds.');
 const cubicMeter=length*width*depth*beds*(unit==='ft'?0.028316846592:1),order=cubicMeter*(1+extra/100),compostM3=order*compost/100,topsoil=order-compostM3;
 const toYards=(m3:number)=>m3/0.764554857984;
 return R([{label:'Bed fill without allowance',value:`${Q(cubicMeter,3)} m³`},{label:'Total volume including allowance',value:`${Q(order,3)} m³`},{label:'Bulk order',value:`${Q(toYards(order),3)} yd³`},{label:'Compost',value:`${Q(compostM3,3)} m³`},{label:'Topsoil',value:`${Q(topsoil,3)} m³`},{label:'Equivalent bags of total mix',value:`${Math.ceil(order*1000/bag)} bags (${bag} L each)`}],['Verify the source topsoil and compost quality; compost rich in manure can lead to excess salts or phosphorus.','Actual settlement, irregular bed geometry and bag compressibility can change needs.',...(compost<33||compost>50?['Compost share differs from the approximate 33–50% UMN Extension starting range; adjust to soil test and crop needs.']:[])],['Volume = inside length × width × fill depth × number of beds.','Convert ft³ to m³ at 0.028316846592; add the stated purchase buffer, then split by volume fraction.']);
}
