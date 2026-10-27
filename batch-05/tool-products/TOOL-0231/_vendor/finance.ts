export type ScheduleRow={period:number,payment:number,interest:number,principal:number,balance:number};
export function finite(v:number,label:string){if(!Number.isFinite(v))throw new Error(`${label} must be a finite number.`);return v;}
export function range(v:number,min:number,max:number,label:string){finite(v,label);if(v<min||v>max)throw new Error(`${label} must be between ${min} and ${max}.`);return v;}
export function money(v:number){return Math.round((v+Number.EPSILON)*100)/100;}
export function periodicPayment(principal:number,annualRatePct:number,periods:number,periodsPerYear=12){
 range(principal,0,1e12,'Principal');range(annualRatePct,0,1000,'Annual rate');range(periods,1,100000,'Periods');
 const r=annualRatePct/100/periodsPerYear;if(r===0)return principal/periods;const x=(1+r)**periods;if(!Number.isFinite(x))throw new Error('Rate/term combination overflows.');return principal*r*x/(x-1);
}
export function amortize(principal:number,annualRatePct:number,payment:number,extra=0,maxPeriods=1200,periodsPerYear=12){
 range(principal,0,1e12,'Principal');range(annualRatePct,0,1000,'Annual rate');range(payment,0,1e12,'Payment');range(extra,0,1e12,'Extra payment');
 const r=annualRatePct/100/periodsPerYear;let bal=principal,totalInterest=0,totalPaid=0;const schedule:ScheduleRow[]=[];
 for(let period=1;period<=maxPeriods && bal>1e-8;period++){
   const interest=bal*r;let pay=Math.min(bal+interest,payment+extra);
   if(pay<=interest+1e-12)throw new Error('Payment is not high enough to reduce principal.');
   const principalPaid=pay-interest;bal=Math.max(0,bal-principalPaid);totalInterest+=interest;totalPaid+=pay;schedule.push({period,payment:money(pay),interest:money(interest),principal:money(principalPaid),balance:money(bal)});
 }
 if(bal>1e-6)throw new Error('Payoff exceeds the supported 1,200-period horizon.');
 return {schedule,totalInterest:money(totalInterest),totalPaid:money(totalPaid),periods:schedule.length};
}
export function futureValueMonthly(initial:number,monthly:number,annualRatePct:number,months:number,contributionAtStart=false){
 range(initial,0,1e15,'Initial amount');range(monthly,-1e12,1e12,'Monthly contribution');range(annualRatePct,-99.99,1000,'Annual rate');range(months,0,12000,'Months');
 const r=annualRatePct/100/12;let v=initial;for(let m=0;m<months;m++){if(contributionAtStart)v+=monthly;v*=1+r;if(!contributionAtStart)v+=monthly;if(!Number.isFinite(v))throw new Error('Projection overflowed.');}return v;
}
export function solvePeriodicRate(netAdvance:number,payments:number[],lo=-0.999999,hi=10){
 if(!(netAdvance>0))throw new Error('Net advance must be positive.');if(!payments.length)throw new Error('At least one payment is required.');
 const f=(r:number)=>{let pv=0;for(let i=0;i<payments.length;i++)pv+=payments[i]/((1+r)**(i+1));return pv-netAdvance;};
 let flo=f(lo),fhi=f(hi);if(!Number.isFinite(flo)||!Number.isFinite(fhi)||flo*fhi>0)throw new Error('Could not bracket an implied periodic rate for these cash flows.');
 for(let i=0;i<160;i++){const mid=(lo+hi)/2,fm=f(mid);if(Math.abs(fm)<1e-10)return mid;if(flo*fm<=0){hi=mid;fhi=fm}else{lo=mid;flo=fm}}return (lo+hi)/2;
}
export function addMonthsISO(iso:string,months:number){const d=new Date(`${iso}T00:00:00Z`);if(Number.isNaN(d.valueOf()))throw new Error('Invalid date.');const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);}
