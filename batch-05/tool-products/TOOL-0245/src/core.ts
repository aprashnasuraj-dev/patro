import {finite,roundTo} from '../_vendor/business';
export function breakEven(fixedRaw:number,priceRaw:number,variableRaw:number,targetRaw:number,volumeRaw:number){
 const fixed=finite(fixedRaw,'Fixed cost',0,1e12),price=finite(priceRaw,'Price',0,1e12),variable=finite(variableRaw,'Variable cost',0,1e12),target=finite(targetRaw,'Target profit',-1e12,1e12),cap=Math.floor(finite(volumeRaw,'Chart volume',10,1e6));
 const contribution=price-variable;if(contribution<=0)throw new Error('Selling price must exceed variable cost for a finite break-even point.');
 const be=fixed/contribution,tp=(fixed+target)/contribution;
 const steps=Math.min(80,cap), scenarios=[] as any[];for(let i=0;i<=steps;i++){const units=cap*i/steps;scenarios.push({units:roundTo(units,2),revenue:roundTo(units*price),totalCost:roundTo(fixed+units*variable),profit:roundTo(units*contribution-fixed)})}
 return {fixed,price,variable,contribution:roundTo(contribution),contributionMarginPct:price?roundTo(contribution/price*100,4):null,breakEvenUnits:roundTo(be,4),breakEvenUnitsCeil:Math.ceil(be),targetProfitUnits:roundTo(tp,4),targetProfitUnitsCeil:Math.max(0,Math.ceil(tp)),scenarios};
}
