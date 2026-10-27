import {finite,roundTo} from '../_vendor/business';
export type EmployeeCostInput={salary:number;bonusPct:number;payrollPct:number;retirementPct:number;benefits:number;insurance:number;equipment:number;training:number;monthlySoftwareWorkspace:number;recruitingCost:number;recruitingAmortMonths:number;productivePct:number;weeks:number;hoursPerWeek:number};
export function employeeCost(x:EmployeeCostInput){
 const salary=finite(x.salary,'Salary',0,1e12),bonus=salary*finite(x.bonusPct,'Bonus %',0,1000)/100,payroll=salary*finite(x.payrollPct,'Payroll burden %',0,1000)/100,retirement=salary*finite(x.retirementPct,'Retirement %',0,1000)/100;
 const fixed=[['Benefits',x.benefits],['Insurance',x.insurance],['Equipment',x.equipment],['Training',x.training]] as const;const components:any[]=[{name:'Base salary',annual:salary},{name:'Bonus',annual:bonus},{name:'Payroll burden',annual:payroll},{name:'Retirement / pension',annual:retirement}];
 for(const [name,v] of fixed)components.push({name,annual:finite(v,name,0,1e12)});
 components.push({name:'Software / workspace',annual:finite(x.monthlySoftwareWorkspace,'Monthly software/workspace',0,1e9)*12});
 const amort=finite(x.recruitingAmortMonths,'Recruiting amortization months',1,120),recruitAnnual=finite(x.recruitingCost,'Recruiting cost',0,1e12)*12/amort;components.push({name:'Recruiting amortization',annual:recruitAnnual});
 const total=components.reduce((s,c)=>s+c.annual,0),weeks=finite(x.weeks,'Working weeks',1,53),hours=finite(x.hoursPerWeek,'Hours/week',.25,168),productive=finite(x.productivePct,'Productive time %',1,100)/100,scheduledHours=weeks*hours;
 return {components:components.map(c=>({...c,annual:roundTo(c.annual)})),annualLoadedCost:roundTo(total),burdenAboveSalary:roundTo(total-salary),burdenPct:salary?roundTo((total/salary-1)*100,2):null,scheduledHours:roundTo(scheduledHours,2),scheduledHourlyCost:scheduledHours?roundTo(total/scheduledHours,2):null,productiveHours:roundTo(scheduledHours*productive,2),productiveHourlyCost:scheduledHours*productive?roundTo(total/(scheduledHours*productive),2):null};
}
