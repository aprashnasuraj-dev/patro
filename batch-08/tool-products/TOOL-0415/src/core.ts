import {finite,round} from "../_vendor/validation";
export function calculate(i:any){
 const gross=finite("Eligible supplies incl tax",i.grossEligibleInclTax,0,1e12), taxRate=finite("Tax rate",Number(i.taxRatePct),0,30)/100;
 const quick=finite("Quick remittance rate",i.quickRatePct,0,30)/100, itcs=finite("Regular-method ITCs",i.itcs,0,1e12);
 const ineligibleTax=finite("Tax on ineligible supplies",i.ineligibleTax,0,1e12), creditUsed=finite("Eligible revenue for 1% credit",i.creditEligibleRevenue,0,30000);
 const collected=gross*taxRate/(1+taxRate);
 const regular=Math.max(0,collected+ineligibleTax-itcs);
 const quickRemit=Math.max(0,gross*quick+ineligibleTax-creditUsed*.01);
 return {"Estimated tax embedded in eligible gross":round(collected,2),"Regular-method net tax":round(regular,2),"Quick-method net tax":round(quickRemit,2),
 "Quick minus regular":round(quickRemit-regular,2),"1% credit applied":round(creditUsed*.01,2),
 "Caution":"Eligibility, PE location, supply location, business type, excluded supplies and ITC rules must be checked against CRA guidance."}
}
