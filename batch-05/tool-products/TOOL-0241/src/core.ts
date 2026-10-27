import {finite,roundTo} from '../_vendor/business';
export type Input={takeHome:number;overhead:number;taxReservePct:number;uncollectiblePct:number;workingWeeks:number;billableHoursPerWeek:number;billableHoursPerDay:number};
export function freelanceRate(x:Input){
 const take=finite(x.takeHome,'Take-home target',0,1e12), overhead=finite(x.overhead,'Overhead',0,1e12);
 const tax=finite(x.taxReservePct,'Tax reserve',0,95)/100, reserve=finite(x.uncollectiblePct,'Uncollectible reserve',0,95)/100;
 const weeks=finite(x.workingWeeks,'Working weeks',1,53), hpw=finite(x.billableHoursPerWeek,'Billable hours/week',.25,168), hpd=finite(x.billableHoursPerDay,'Billable hours/day',.25,24);
 const retain=(1-tax)*(1-reserve); if(retain<=0)throw new Error('Combined reserves leave no retainable revenue.');
 const annualGross=(take+overhead)/retain, annualHours=weeks*hpw, hourly=annualGross/annualHours;
 return {annualGross:roundTo(annualGross),annualBillableHours:roundTo(annualHours,2),hourly:roundTo(hourly,2),dayRate:roundTo(hourly*hpd,2),monthlyRevenueTarget:roundTo(annualGross/12,2),reserveAmount:roundTo(annualGross-(take+overhead),2),formula:'gross=(takeHome+overhead)/((1-taxReserve)*(1-uncollectibleReserve)); hourly=gross/(weeks*billableHoursPerWeek)'};
}
