import {finite,roundTo} from '../_vendor/business';
export type CashEvent={month:number;amount:number;label:string};
export function startupRunway(cashRaw:number,revenueRaw:number,expenseRaw:number,revGrowthRaw:number,expGrowthRaw:number,events:CashEvent[]){
 let cash=finite(cashRaw,'Opening cash',0,1e15),rev=finite(revenueRaw,'Monthly revenue',0,1e15),exp=finite(expenseRaw,'Monthly expense',0,1e15);
 const rg=finite(revGrowthRaw,'Revenue growth',-100,1000)/100,eg=finite(expGrowthRaw,'Expense growth',-100,1000)/100;
 if(!Array.isArray(events)||events.length>500)throw new Error('Use at most 500 one-time events.');
 const map=new Map<number,{amount:number;labels:string[]}>();for(const e of events){const m=Math.floor(finite(e.month,'Event month',1,120)),amount=finite(e.amount,'Event amount',-1e15,1e15);const v=map.get(m)||{amount:0,labels:[]};v.amount+=amount;if(e.label)v.labels.push(String(e.label).slice(0,120));map.set(m,v)}
 const currentNetBurn=Math.max(0,exp-rev),simpleRunway=currentNetBurn>0?cash/currentNetBurn:null,rows=[] as any[];let depletion:number|null=null;
 for(let m=1;m<=120;m++){const start=cash,evt=map.get(m)||{amount:0,labels:[]};cash+=rev-exp+evt.amount;rows.push({month:m,openingCash:roundTo(start),revenue:roundTo(rev),expense:roundTo(exp),eventAmount:roundTo(evt.amount),eventLabel:evt.labels.join('; '),endingCash:roundTo(cash)});if(cash<=0&&depletion===null){depletion=m;break}rev*=1+rg;exp*=1+eg}
 return {currentNetBurn:roundTo(currentNetBurn),simpleRunwayMonths:simpleRunway===null?null:roundTo(simpleRunway,2),depletionMonth:depletion,projection:rows};
}
