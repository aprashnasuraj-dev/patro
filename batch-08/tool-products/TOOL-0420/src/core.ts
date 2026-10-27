import {finite,round} from "../_vendor/validation";
export function calculate(i:any){
 const priorBasis=finite("Prior basis",i.priorBasis,0,1e15), currentND=finite("Current nondeductible contribution",i.currentNondeductible,0,1e15);
 const conversion=finite("Roth conversion",i.conversion,0,1e15), otherDist=finite("Other distributions",i.otherDistributions,0,1e15), yearEnd=finite("Year-end IRA value",i.yearEndTraditionalSepSimple,0,1e15);
 const basis=priorBasis+currentND, denom=yearEnd+conversion+otherDist;
 if(denom<=0) throw new Error("The Form 8606 denominator must be positive.");
 const pct=Math.min(1,basis/denom), nonTaxConv=conversion*pct, taxableConv=conversion-nonTaxConv;
 const nonTaxAll=(conversion+otherDist)*pct, endingBasis=Math.max(0,basis-nonTaxAll);
 return {"Total IRA basis before distribution":round(basis,2),"Pro-rata nontaxable percentage":round(pct*100,4)+"%",
 "Estimated nontaxable conversion":round(nonTaxConv,2),"Estimated taxable conversion":round(taxableConv,2),"Estimated basis carried forward":round(endingBasis,2),
 "Denominator used":round(denom,2),"Reminder":"Year-end value includes all traditional, traditional SEP and traditional SIMPLE IRAs plus applicable outstanding rollovers. This is a planning abstraction of Form 8606 Part I."}
}
