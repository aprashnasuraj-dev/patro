import {finite,roundTo,isoDate,addDays} from '../_vendor/business';
export type Payment={date:string;amount:number;note:string};
function spanDays(a:string,b:string){return Math.max(0,Math.round((isoDate(b).valueOf()-isoDate(a).valueOf())/86400000))}
export function lateInterest(principalRaw:number,rateRaw:number,due:string,asOf:string,graceRaw:number,basisRaw:number,method:'simple'|'daily',payments:Payment[]){
 let principal=finite(principalRaw,'Principal',0,1e15),interest=0,totalInterest=0;const rate=finite(rateRaw,'Annual rate',0,1000)/100,grace=Math.floor(finite(graceRaw,'Grace days',0,3650));
 const basis=Math.floor(finite(basisRaw,'Day-count basis',360,366));if(![360,365,366].includes(basis))throw new Error('Day-count basis must be 360, 365 or 366.');
 const effectiveDue=addDays(due,grace);if(isoDate(asOf).valueOf()<isoDate(effectiveDue).valueOf())return {effectiveDue,balance:principal,interest:0,daysLate:0,ledger:[]};
 if(method!=='simple'&&method!=='daily')throw new Error('Unsupported interest method.');
 if(!Array.isArray(payments)||payments.length>500)throw new Error('Use at most 500 payments.');
 const ps=payments.map((p,i)=>({date:p.date,amount:finite(p.amount,`Payment ${i+1}`,0,1e15),note:String(p.note||'').slice(0,120)})).filter(p=>isoDate(p.date)>=isoDate(effectiveDue)&&isoDate(p.date)<=isoDate(asOf)).sort((a,b)=>a.date.localeCompare(b.date));
 let cursor=effectiveDue;const ledger:any[]=[];
 const accrue=(to:string)=>{const days=spanDays(cursor,to);if(days<=0)return {days,added:0};let added=0;if(method==='simple')added=principal*rate*days/basis;else added=principal*((1+rate/basis)**days-1);interest+=added;totalInterest+=added;cursor=to;return {days,added};};
 for(const p of ps){const a=accrue(p.date);let remaining=p.amount;const toInterest=Math.min(interest,remaining);interest-=toInterest;remaining-=toInterest;const toPrincipal=Math.min(principal,remaining);principal-=toPrincipal;remaining-=toPrincipal;ledger.push({date:p.date,days:a.days,interestAdded:roundTo(a.added),payment:roundTo(p.amount),interestPaid:roundTo(toInterest),principalPaid:roundTo(toPrincipal),unapplied:roundTo(remaining),principalBalance:roundTo(principal),interestBalance:roundTo(interest),note:p.note});}
 const finalAccrual=accrue(asOf);ledger.push({date:asOf,days:finalAccrual.days,interestAdded:roundTo(finalAccrual.added),payment:0,interestPaid:0,principalPaid:0,unapplied:0,principalBalance:roundTo(principal),interestBalance:roundTo(interest),note:'As-of accrual'});
 return {effectiveDue,daysLate:spanDays(effectiveDue,asOf),principalBalance:roundTo(principal),interestBalance:roundTo(interest),totalInterestGenerated:roundTo(totalInterest),balance:roundTo(principal+interest),ledger};
}
